use crate::domain::overlay_export::{ExportBackground, ExportFormat, ExportSettings};
use std::{
    collections::{HashMap, HashSet},
    process::{Command, Stdio},
    sync::{Mutex, OnceLock},
};
#[derive(Clone, Copy)]
pub struct EncoderSelection {
    pub name: &'static str,
    pub hardware: bool,
    pub vaapi_device: Option<&'static str>,
}
type ProbeKey = (String, &'static str, Option<&'static str>, u32, u32, u64);
static PROBES: OnceLock<Mutex<HashMap<ProbeKey, bool>>> = OnceLock::new();
static ENCODERS: OnceLock<Mutex<HashMap<String, HashSet<String>>>> = OnceLock::new();
pub fn available_encoders(ffmpeg: &str) -> HashSet<String> {
    let cache = ENCODERS.get_or_init(Mutex::default);
    if let Ok(cache) = cache.lock()
        && let Some(names) = cache.get(ffmpeg)
    {
        return names.clone();
    }
    let names = Command::new(ffmpeg)
        .args(["-hide_banner", "-encoders"])
        .stdin(Stdio::null())
        .stderr(Stdio::null())
        .output()
        .ok()
        .filter(|output| output.status.success())
        .map(|output| {
            String::from_utf8_lossy(&output.stdout)
                .lines()
                .filter_map(|line| {
                    let mut fields = line.split_whitespace();
                    let flags = fields.next()?;
                    let name = fields.next()?;
                    flags.starts_with('V').then(|| name.to_owned())
                })
                .collect::<HashSet<_>>()
        })
        .unwrap_or_default();
    if !names.is_empty()
        && let Ok(mut cache) = cache.lock()
    {
        cache.insert(ffmpeg.to_owned(), names.clone());
    }
    names
}
pub fn select_encoder(ffmpeg: &str, settings: &ExportSettings) -> EncoderSelection {
    let software = EncoderSelection {
        name: settings.encoder(),
        hardware: false,
        vaapi_device: None,
    };
    if !settings.prefer_hardware {
        return software;
    }
    let names: &[&str] = match settings.format {
        ExportFormat::Prores4444 => &["prores_videotoolbox"],
        ExportFormat::H264Mp4 => &[
            "h264_videotoolbox",
            "h264_nvenc",
            "h264_qsv",
            "h264_amf",
            "h264_vaapi",
            "h264_v4l2m2m",
        ],
        ExportFormat::WebmVp9 if settings.background == ExportBackground::Green => {
            &["vp9_qsv", "vp9_vaapi"]
        }
        ExportFormat::WebmVp9 | ExportFormat::PngMov => return software,
    };
    let available = available_encoders(ffmpeg);
    let cache = PROBES.get_or_init(Mutex::default);
    for &name in names {
        if !available.contains(name) {
            continue;
        }
        let devices: &[Option<&'static str>] = if name.ends_with("_vaapi") {
            if !cfg!(target_os = "linux") {
                continue;
            }
            &[
                Some("/dev/dri/renderD128"),
                Some("/dev/dri/renderD129"),
                Some("/dev/dri/renderD130"),
            ]
        } else {
            &[None]
        };
        for &vaapi_device in devices {
            let selection = EncoderSelection {
                name,
                hardware: true,
                vaapi_device,
            };
            let key = (
                ffmpeg.into(),
                name,
                vaapi_device,
                settings.width,
                settings.height,
                settings.fps.to_bits(),
            );
            let existing = cache.lock().ok().and_then(|cache| cache.get(&key).copied());
            let supported = existing
                .unwrap_or_else(|| super::hardware_probe::probe(ffmpeg, settings, selection));
            if let Ok(mut cache) = cache.lock() {
                cache.insert(key, supported);
            }
            if supported {
                return selection;
            }
        }
    }
    software
}
pub fn configure_device(command: &mut Command, selection: EncoderSelection) {
    if let Some(device) = selection.vaapi_device {
        command.args(["-vaapi_device", device]);
    }
}
pub fn upload_filter(selection: EncoderSelection) -> Option<&'static str> {
    selection.vaapi_device.map(|_| "format=nv12,hwupload")
}
pub fn configure_codec(
    command: &mut Command,
    settings: &ExportSettings,
    selection: EncoderSelection,
) {
    command.args(["-c:v", selection.name]);
    match (settings.format, selection.hardware) {
        (ExportFormat::Prores4444, true) => {
            command.args(["-profile:v", "4", "-pix_fmt", "bgra", "-allow_sw", "0"]);
        }
        (ExportFormat::Prores4444, false) => {
            command.args([
                "-profile:v",
                "4",
                "-pix_fmt",
                "yuva444p10le",
                "-alpha_bits",
                "16",
            ]);
        }
        (ExportFormat::WebmVp9, false) => {
            command.args([
                "-pix_fmt",
                "yuva420p",
                "-crf",
                "30",
                "-b:v",
                "0",
                "-deadline",
                "good",
                "-cpu-used",
                "4",
                "-row-mt",
                "1",
                "-auto-alt-ref",
                "0",
            ]);
        }
        (ExportFormat::PngMov, _) => {
            command.args(["-pix_fmt", "rgba", "-pred", "mixed"]);
        }
        (ExportFormat::H264Mp4 | ExportFormat::WebmVp9, true) => {
            if selection.vaapi_device.is_none() {
                command.args([
                    "-pix_fmt",
                    if selection.name.ends_with("v4l2m2m") {
                        "yuv420p"
                    } else {
                        "nv12"
                    },
                ]);
            }
            if selection.name.ends_with("videotoolbox") {
                command.args(["-allow_sw", "0"]);
            }
            let bitrate =
                (f64::from(settings.width) * f64::from(settings.height) * settings.fps * 0.08)
                    .max(1_000_000.0) as u64;
            command.arg("-b:v").arg(bitrate.to_string());
        }
        (ExportFormat::H264Mp4, false) => {
            command.args(["-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "18"]);
        }
    }
    if matches!(settings.format, ExportFormat::H264Mp4) {
        command.args(["-movflags", "+faststart"]);
    }
}
