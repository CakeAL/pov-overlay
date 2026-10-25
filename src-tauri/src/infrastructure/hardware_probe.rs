use super::export_codec::{EncoderSelection, configure_codec, configure_device, upload_filter};
use crate::domain::overlay_export::{ExportFormat, ExportSettings};
use std::{
    io::{Read, Write},
    process::{Command, Output, Stdio},
    thread,
    time::{Duration, Instant},
};
/// Probe actual requested dimensions and rate. ProRes must preserve partial and zero Alpha.
pub fn probe(ffmpeg: &str, settings: &ExportSettings, selection: EncoderSelection) -> bool {
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
    command.args(["-v", "error"]);
    configure_device(&mut command, selection);
    command
        .args(["-f", "lavfi", "-i"])
        .arg(source)
        .args(["-frames:v", "1", "-an"]);
    if let Some(filter) = upload_filter(selection) {
        command.args(["-vf", filter]);
    }
    configure_codec(&mut command, settings, selection);
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
    let Some(output) = bounded_output(command) else {
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
        && decoded.is_ok_and(|output| {
            output.status.success()
                && output.stdout.len() == 2
                && (120..=136).contains(&output.stdout[0])
                && output.stdout[1] <= 2
        })
}
fn bounded_output(mut command: Command) -> Option<Output> {
    let mut child = command
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .ok()?;
    let mut stdout = child.stdout.take()?;
    let reader = thread::spawn(move || {
        let mut bytes = Vec::new();
        let _ = (&mut stdout).take(32 * 1024 * 1024).read_to_end(&mut bytes);
        bytes
    });
    let start = Instant::now();
    let status = loop {
        if let Ok(Some(status)) = child.try_wait() {
            break Some(status);
        }
        if start.elapsed() > Duration::from_secs(8) {
            let _ = child.kill();
            let _ = child.wait();
            break None;
        }
        thread::sleep(Duration::from_millis(20));
    };
    let bytes = reader.join().ok()?;
    status.map(|status| Output {
        status,
        stdout: bytes,
        stderr: Vec::new(),
    })
}
