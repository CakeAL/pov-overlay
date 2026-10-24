#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use pov_core::{Track, parse_gpx, parse_recording_time};
use serde::Serialize;
use serde_json::Value;
use std::{
    fs,
    io::{Read, Seek, SeekFrom},
    path::{Path, PathBuf},
    process::Command,
};
use tauri::Manager;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct VideoMetadata {
    name: String,
    path: String,
    captured_at_ms: Option<i64>,
    time_source: Option<String>,
    warning: Option<String>,
    duration: f64,
}

#[tauri::command]
async fn load_gpx(path: String) -> Result<Track, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let metadata = fs::metadata(&path).map_err(|error| format!("无法读取轨迹：{error}"))?;
        if metadata.len() > 50 * 1024 * 1024 {
            return Err("GPX 文件超过 50 MB，请先裁剪轨迹。".into());
        }
        let xml = fs::read_to_string(&path).map_err(|error| format!("无法读取轨迹：{error}"))?;
        parse_gpx(&xml)
    })
    .await
    .map_err(|error| error.to_string())?
}

fn ffprobe_path() -> Option<PathBuf> {
    let executable = if cfg!(windows) {
        "ffprobe.exe"
    } else {
        "ffprobe"
    };
    std::env::var_os("PATH")
        .into_iter()
        .flat_map(|paths| std::env::split_paths(&paths).collect::<Vec<_>>())
        .map(|directory| directory.join(executable))
        .chain([
            PathBuf::from("/opt/homebrew/bin/ffprobe"),
            PathBuf::from("/usr/local/bin/ffprobe"),
        ])
        .find(|path| path.is_file())
}

/// Skip MP4 payloads by seeking, so a multi-GB video never enters memory.
fn movie_creation_time(path: &Path) -> Option<i64> {
    fn find(file: &mut fs::File, start: u64, end: u64, kind: &[u8; 4]) -> Option<(u64, u64)> {
        let mut offset = start;
        for _ in 0..10_000 {
            if offset.checked_add(8)? > end {
                return None;
            }
            file.seek(SeekFrom::Start(offset)).ok()?;
            let mut header = [0; 8];
            file.read_exact(&mut header).ok()?;
            let size32 = u32::from_be_bytes(header[..4].try_into().ok()?);
            let (size, header_size) = match size32 {
                0 => (end - offset, 8),
                1 => {
                    let mut large = [0; 8];
                    file.read_exact(&mut large).ok()?;
                    (u64::from_be_bytes(large), 16)
                }
                size => (u64::from(size), 8),
            };
            if size < header_size || offset.checked_add(size)? > end {
                return None;
            }
            if &header[4..] == kind {
                return Some((offset + header_size, offset + size));
            }
            offset += size;
        }
        None
    }
    let mut file = fs::File::open(path).ok()?;
    let length = file.metadata().ok()?.len();
    let (start, end) = find(&mut file, 0, length, b"moov")?;
    let (start, end) = find(&mut file, start, end, b"mvhd")?;
    if end - start < 12 {
        return None;
    }
    file.seek(SeekFrom::Start(start)).ok()?;
    let mut header = [0; 12];
    file.read_exact(&mut header).ok()?;
    let seconds = match header[0] {
        0 => u64::from(u32::from_be_bytes(header[4..8].try_into().ok()?)),
        1 => u64::from_be_bytes(header[4..12].try_into().ok()?),
        _ => return None,
    };
    let timestamp = i64::try_from(seconds)
        .ok()?
        .checked_sub(2_082_844_800)?
        .checked_mul(1000)?;
    (0..4_102_444_800_000_i64)
        .contains(&timestamp)
        .then_some(timestamp)
}

fn metadata_from_probe(value: &Value) -> (Option<i64>, Option<String>, f64) {
    let format = &value["format"];
    let duration = format["duration"]
        .as_str()
        .and_then(|text| text.parse::<f64>().ok())
        .filter(|value| value.is_finite() && *value >= 0.0)
        .unwrap_or(0.0);
    let mut candidates = vec![
        (
            &format["tags"]["com.apple.quicktime.creationdate"],
            "QuickTime 拍摄时间",
        ),
        (
            &format["tags"]["creation_time"],
            "视频 creation_time（UTC）",
        ),
    ];
    if let Some(streams) = value["streams"].as_array() {
        for stream in streams {
            candidates.push((
                &stream["tags"]["creation_time"],
                "视频流 creation_time（UTC）",
            ));
        }
    }
    for (raw, source) in candidates {
        if let Some(timestamp) = raw
            .as_str()
            .and_then(parse_recording_time)
            .filter(|time| *time >= 0)
        {
            return (Some(timestamp), Some(source.to_owned()), duration);
        }
    }
    (None, None, duration)
}

#[tauri::command]
async fn load_video(app: tauri::AppHandle, path: String) -> Result<VideoMetadata, String> {
    let path = PathBuf::from(path)
        .canonicalize()
        .map_err(|error| format!("无法读取视频：{error}"))?;
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_lowercase();
    if !["mp4", "mov", "m4v", "webm", "mkv", "avi", "mts", "m2ts"].contains(&extension.as_str()) {
        return Err("请选择 MP4、MOV、WebM 等视频文件。".into());
    }
    if !path.is_file() {
        return Err("选择的路径不是视频文件。".into());
    }
    app.asset_protocol_scope()
        .allow_file(&path)
        .map_err(|error| error.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        let probe = ffprobe_path().and_then(|executable| {
            let output = Command::new(executable).args(["-v", "error", "-show_entries", "format=duration:format_tags=creation_time,com.apple.quicktime.creationdate:stream_tags=creation_time", "-of", "json", "-i"])
                .arg(&path).output().ok()?;
            output.status.success().then(|| serde_json::from_slice::<Value>(&output.stdout).ok()).flatten()
        });
        let (mut captured_at_ms, mut time_source, duration) = probe.as_ref().map(metadata_from_probe).unwrap_or((None, None, 0.0));
        if captured_at_ms.is_none() {
            captured_at_ms = movie_creation_time(&path);
            if captured_at_ms.is_some() { time_source = Some("MP4 / MOV 容器时间（UTC）".into()); }
        }
        let warning = captured_at_ms.is_none().then(|| "未找到带时区的拍摄时间，请手动设置视频起始时间。".into());
        Ok(VideoMetadata {
            name: path.file_name().unwrap().to_string_lossy().into_owned(),
            path: path.to_string_lossy().into_owned(), captured_at_ms, time_source, warning, duration,
        })
    }).await.map_err(|error| error.to_string())?
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![load_gpx, load_video])
        .run(tauri::generate_context!())
        .expect("无法启动 POV Overlay");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn prefers_quicktime_recording_date_and_respects_timezone() {
        let data = serde_json::json!({"format":{"duration":"12.5","tags":{"creation_time":"2026-10-23T00:00:00Z","com.apple.quicktime.creationdate":"2026-10-24T08:00:12.500+08:00"}}});
        let (timestamp, source, duration) = metadata_from_probe(&data);
        assert_eq!(timestamp, parse_recording_time("2026-10-24T00:00:12.500Z"));
        assert!(source.unwrap().contains("QuickTime"));
        assert_eq!(duration, 12.5);
    }
    #[test]
    fn reads_actual_demo_movie_header_without_ffprobe() {
        let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../public/demo/ride.mp4");
        assert_eq!(
            movie_creation_time(&path),
            parse_recording_time("2026-10-24T00:00:12Z")
        );
    }
    #[test]
    fn ignores_ambiguous_local_time_and_uses_stream_metadata() {
        let data = serde_json::json!({"format":{"tags":{"creation_time":"2026-10-24T08:00:00"}},"streams":[{"tags":{"creation_time":"2026-10-24T00:00:00Z"}}]});
        assert_eq!(
            metadata_from_probe(&data).0,
            parse_recording_time("2026-10-24T00:00:00Z")
        );
    }
}
