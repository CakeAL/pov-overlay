use super::export_codec::{
    EncoderSelection, available_encoders, configure_codec, configure_device, select_encoder,
    upload_filter,
};
use crate::domain::overlay_export::{ExportBackground, ExportSettings};
use serde::Serialize;
use std::{
    collections::VecDeque,
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    process::{Child, ChildStdin, Command, Stdio},
    sync::{
        Mutex,
        atomic::{AtomicBool, Ordering},
    },
    thread::{self, JoinHandle},
    time::Duration,
};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EncoderInfo {
    pub path: String,
    pub prores4444: bool,
    pub png_mov: bool,
    pub h264_mp4: bool,
    pub webm_vp9: bool,
}
pub fn detect_encoder() -> Result<EncoderInfo, String> {
    let candidates = [
        "ffmpeg",
        "/opt/homebrew/bin/ffmpeg",
        "/usr/local/bin/ffmpeg",
    ];
    for path in candidates {
        let available = available_encoders(path);
        if available.is_empty() {
            continue;
        }
        let h264_mp4 = [
            "libx264",
            "h264_videotoolbox",
            "h264_nvenc",
            "h264_qsv",
            "h264_amf",
            "h264_vaapi",
            "h264_v4l2m2m",
        ]
        .iter()
        .any(|name| available.contains(*name));
        return Ok(EncoderInfo {
            h264_mp4,
            webm_vp9: available.contains("libvpx-vp9"),
            path: path.into(),
            prores4444: available.contains("prores_ks")
                || available.contains("prores_videotoolbox"),
            png_mov: available.contains("png"),
        });
    }
    Err("未找到 FFmpeg，请安装后重试（macOS：brew install ffmpeg）。".into())
}

struct Input {
    stdin: Option<ChildStdin>,
    frames: u64,
}
/// Independent input/child locks let cancellation kill FFmpeg while a write is blocked.
pub struct OverlayEncoder {
    settings: ExportSettings,
    pub selection: EncoderSelection,
    input: Mutex<Input>,
    child: Mutex<Child>,
    stderr: Mutex<Option<JoinHandle<String>>>,
    cancelled: AtomicBool,
    destination: PathBuf,
    temporary: PathBuf,
}
impl OverlayEncoder {
    pub fn start(
        ffmpeg: &str,
        settings: ExportSettings,
        destination: &Path,
        id: &str,
        protected_video: Option<&Path>,
    ) -> Result<Self, String> {
        settings.validate()?;
        if !destination.is_absolute()
            || !destination
                .extension()
                .is_some_and(|v| v.eq_ignore_ascii_case(settings.format.extension()))
        {
            return Err(format!(
                "请选择 .{} 文件的绝对输出路径。",
                settings.format.extension()
            ));
        }
        if let Some(video) = protected_video {
            let same = destination == video
                || destination
                    .canonicalize()
                    .ok()
                    .zip(video.canonicalize().ok())
                    .is_some_and(|(a, b)| a == b);
            if same {
                return Err("输出文件不能覆盖当前预览视频。".into());
            }
        }
        let parent = destination.parent().ok_or("输出目录无效。")?;
        let temporary = parent.join(format!(".pov-overlay-{id}.{}", settings.format.extension()));
        fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temporary)
            .map_err(|e| format!("无法写入输出目录：{e}"))?;
        let selection = select_encoder(ffmpeg, &settings);
        let region = settings.region();
        let mut command = Command::new(ffmpeg);
        configure_device(&mut command, selection);
        command
            .args([
                "-hide_banner",
                "-loglevel",
                "error",
                "-nostdin",
                "-y",
                "-f",
                "rawvideo",
                "-pixel_format",
                "rgba",
                "-video_size",
            ])
            .arg(format!("{}x{}", region.width, region.height))
            .arg("-framerate")
            .arg(settings.fps.to_string())
            .args(["-i", "pipe:0", "-an"]);
        let mut filters = Vec::new();
        if region.width != settings.width
            || region.height != settings.height
            || region.x != 0
            || region.y != 0
        {
            let color = if settings.background == ExportBackground::Green {
                "0x00ff00ff"
            } else {
                "0x00000000"
            };
            filters.push(format!(
                "pad={}:{}:{}:{}:color={}",
                settings.width, settings.height, region.x, region.y, color
            ));
        }
        if let Some(upload) = upload_filter(selection) {
            filters.push(upload.into());
        }
        if !filters.is_empty() {
            command.arg("-vf").arg(filters.join(","));
        }
        configure_codec(&mut command, &settings, selection);
        command
            .args(["-frames:v"])
            .arg(settings.validate()?.to_string())
            .args(["-f", settings.format.extension()])
            .arg(&temporary)
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .stderr(Stdio::piped());
        let mut child = match command.spawn() {
            Ok(child) => child,
            Err(error) => {
                let _ = fs::remove_file(&temporary);
                return Err(format!("无法启动 FFmpeg：{error}"));
            }
        };
        let stdin = child.stdin.take().ok_or("无法打开编码帧管道。")?;
        let mut stderr = child.stderr.take().ok_or("无法读取编码日志。")?;
        let log = thread::spawn(move || {
            let mut tail = VecDeque::new();
            let mut buffer = [0u8; 4096];
            while let Ok(count) = stderr.read(&mut buffer) {
                if count == 0 {
                    break;
                }
                tail.extend(&buffer[..count]);
                while tail.len() > 65_536 {
                    tail.pop_front();
                }
            }
            String::from_utf8_lossy(&tail.into_iter().collect::<Vec<_>>()).into_owned()
        });
        Ok(Self {
            settings,
            selection,
            input: Mutex::new(Input {
                stdin: Some(stdin),
                frames: 0,
            }),
            child: Mutex::new(child),
            stderr: Mutex::new(Some(log)),
            cancelled: AtomicBool::new(false),
            destination: destination.into(),
            temporary,
        })
    }
    pub fn append(&self, index: u64, count: u64, bytes: &[u8]) -> Result<(), String> {
        self.settings.validate_rgba(bytes)?;
        let mut input = self.input.lock().map_err(|e| e.to_string())?;
        if self.cancelled.load(Ordering::SeqCst) {
            return Err("导出已取消。".into());
        }
        let total_frames = self.settings.validate()?;
        if index != input.frames
            || !(1..=120).contains(&count)
            || index
                .checked_add(count)
                .is_none_or(|end| end > total_frames)
        {
            return Err("导出帧次序或数量无效。".into());
        }
        for _ in 0..count {
            if self.cancelled.load(Ordering::SeqCst) {
                return Err("导出已取消。".into());
            }
            input
                .stdin
                .as_mut()
                .ok_or("编码输入已关闭。")?
                .write_all(bytes)
                .map_err(|e| format!("写入编码帧失败：{e}"))?;
            input.frames += 1;
        }
        Ok(())
    }
    pub fn finish(&self) -> Result<(), String> {
        {
            let mut input = self.input.lock().map_err(|e| e.to_string())?;
            input.stdin.take();
            if input.frames != self.settings.validate()? {
                return Err("帧数不足，未保存不完整视频。".into());
            }
        }
        let status = loop {
            let status = self
                .child
                .lock()
                .map_err(|e| e.to_string())?
                .try_wait()
                .map_err(|e| e.to_string())?;
            if let Some(status) = status {
                break status;
            }
            thread::sleep(Duration::from_millis(30));
        };
        let log = self
            .stderr
            .lock()
            .map_err(|e| e.to_string())?
            .take()
            .and_then(|thread| thread.join().ok())
            .unwrap_or_default();
        if self.cancelled.load(Ordering::SeqCst) {
            return Err("导出已取消。".into());
        }
        if !status.success() {
            return Err(format!("FFmpeg 编码失败：{}", log.trim()));
        }
        fs::rename(&self.temporary, &self.destination).map_err(|e| format!("保存视频失败：{e}"))
    }
    pub fn cancel(&self) {
        self.cancelled.store(true, Ordering::SeqCst);
        if let Ok(mut child) = self.child.lock() {
            let _ = child.kill();
        }
    }
}
impl Drop for OverlayEncoder {
    fn drop(&mut self) {
        self.cancel();
        if let Ok(mut input) = self.input.lock() {
            input.stdin.take();
        }
        if let Ok(mut child) = self.child.lock() {
            let _ = child.wait();
        }
        if let Ok(mut log) = self.stderr.lock()
            && let Some(handle) = log.take()
        {
            let _ = handle.join();
        }
        let _ = fs::remove_file(&self.temporary);
    }
}
