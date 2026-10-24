use crate::domain::overlay_export::{ExportFormat, ExportSettings};
use std::{
    collections::HashMap,
    io::Write,
    process::{Command, Stdio},
    sync::{Mutex, OnceLock},
};

#[derive(Clone, Copy)]
pub struct EncoderSelection {
    pub name: &'static str,
    pub hardware: bool,
}
type ProbeKey = (String, &'static str, u32, u32, u64);
static PROBES: OnceLock<Mutex<HashMap<ProbeKey, bool>>> = OnceLock::new();

pub fn select_encoder(ffmpeg: &str, settings: &ExportSettings) -> EncoderSelection {
    let software = EncoderSelection {
        name: settings.encoder(),
        hardware: false,
    };
    if !cfg!(target_os = "macos") || !settings.prefer_hardware {
        return software;
    }
    let name = match settings.format {
        ExportFormat::Prores4444 => "prores_videotoolbox",
        ExportFormat::H264Mp4 => "h264_videotoolbox",
        ExportFormat::PngMov => return software,
    };
    let key = (
        ffmpeg.into(),
        name,
        settings.width,
        settings.height,
        settings.fps.to_bits(),
    );
    let cache = PROBES.get_or_init(Mutex::default);
    if let Ok(cache) = cache.lock()
        && let Some(supported) = cache.get(&key)
    {
        return if *supported {
            EncoderSelection {
                name,
                hardware: true,
            }
        } else {
            software
        };
    }
    let supported = probe(ffmpeg, settings, name);
    if let Ok(mut cache) = cache.lock() {
        cache.insert(key, supported);
    }
    if supported {
        EncoderSelection {
            name,
            hardware: true,
        }
    } else {
        software
    }
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
        (ExportFormat::PngMov, _) => {
            command.args(["-pix_fmt", "rgba", "-pred", "mixed"]);
        }
        (ExportFormat::H264Mp4, true) => {
            let bitrate =
                (f64::from(settings.width) * f64::from(settings.height) * settings.fps * 0.08)
                    .max(1_000_000.0) as u64;
            command
                .args(["-pix_fmt", "yuv420p", "-allow_sw", "0", "-b:v"])
                .arg(bitrate.to_string());
        }
        (ExportFormat::H264Mp4, false) => {
            command.args(["-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "18"]);
        }
    }
    if matches!(settings.format, ExportFormat::H264Mp4) {
        command.args(["-movflags", "+faststart"]);
    }
}

/// Probe the requested dimensions/rate. ProRes must also pass an actual Alpha decode.
fn probe(ffmpeg: &str, settings: &ExportSettings, name: &'static str) -> bool {
    let alpha = matches!(settings.format, ExportFormat::Prores4444);
    let source = if alpha {
        format!(
            "color=c=white@0.5:s={}x{}:r={},format=rgba,pad={}:{}:0:0:color=black@0",
            settings.width / 2,
            settings.height,
            settings.fps,
            settings.width,
            settings.height
        )
    } else {
        format!(
            "color=c=green:s={}x{}:r={}",
            settings.width, settings.height, settings.fps
        )
    };
    let mut command = Command::new(ffmpeg);
    command
        .args(["-v", "error", "-f", "lavfi", "-i"])
        .arg(source)
        .args(["-frames:v", "1", "-an"]);
    configure_codec(
        &mut command,
        settings,
        EncoderSelection {
            name,
            hardware: true,
        },
    );
    if alpha {
        command.args([
            "-movflags",
            "frag_keyframe+empty_moov",
            "-f",
            "mov",
            "pipe:1",
        ]);
    } else {
        command.args(["-f", "null", "-"]);
    }
    let Ok(output) = command.stdin(Stdio::null()).stderr(Stdio::null()).output() else {
        return false;
    };
    if !output.status.success() {
        return false;
    }
    if !alpha {
        return true;
    }
    let Ok(mut decoder) = Command::new(ffmpeg)
        .args([
            "-v",
            "error",
            "-i",
            "pipe:0",
            "-frames:v",
            "1",
            "-vf",
            "alphaextract,scale=2:1:flags=neighbor",
            "-pix_fmt",
            "gray",
            "-f",
            "rawvideo",
            "pipe:1",
        ])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
    else {
        return false;
    };
    let written = decoder
        .stdin
        .take()
        .is_some_and(|mut input| input.write_all(&output.stdout).is_ok());
    let decoded = decoder.wait_with_output();
    written
        && decoded.is_ok_and(|result| {
            result.status.success()
                && result.stdout.len() == 2
                && (120..=136).contains(&result.stdout[0])
                && result.stdout[1] <= 2
        })
}
