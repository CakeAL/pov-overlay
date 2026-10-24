use pov_overlay_desktop::{
    application::overlay_export::ExportManager,
    domain::overlay_export::{ExportBackground, ExportFormat, ExportSettings, FrameRegion},
    infrastructure::overlay_encoder::{OverlayEncoder, detect_encoder},
};
use std::{fs, path::Path, process::Command};
fn settings(format: ExportFormat) -> ExportSettings {
    ExportSettings {
        width: 64,
        height: 64,
        fps: 10.0,
        duration_seconds: 0.3,
        format,
        background: ExportBackground::Transparent,
        prefer_hardware: false,
        frame: None,
    }
}
fn frame() -> Vec<u8> {
    (0..64 * 64)
        .flat_map(|i| {
            let (x, y) = (i % 64, i / 64);
            if (16..48).contains(&x) && (16..48).contains(&y) {
                [255, 255, 255, 128]
            } else {
                [0, 0, 0, 0]
            }
        })
        .collect()
}

#[test]
fn rejects_invalid_settings_and_frame_dimensions() {
    let mut config = settings(ExportFormat::Prores4444);
    assert_eq!(config.validate().unwrap(), 3);
    config.fps = 29.97;
    assert_eq!(config.validate().unwrap(), 9);
    config.width = 65;
    assert!(config.validate().is_err());
    config.width = 64;
    config.fps = f64::NAN;
    assert!(config.validate().is_err());
    config.fps = 30.0;
    config.duration_seconds = -1.0;
    assert!(config.validate().is_err());
    config.duration_seconds = 1.0;
    config.validate_rgba(&frame()).unwrap();
    config.height = 128;
    assert!(config.validate_rgba(&frame()).is_err());
}
#[test]
#[ignore = "需要本地 FFmpeg 和 ffprobe：cargo test --test overlay_export -- --include-ignored"]
fn mov_codecs_preserve_alpha_dimensions_frame_rate_and_count() {
    let info = detect_encoder().unwrap();
    for (name, format, codec) in [
        ("prores", ExportFormat::Prores4444, "prores"),
        ("png", ExportFormat::PngMov, "png"),
    ] {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join(format!("{name}.mov"));
        let encoder =
            OverlayEncoder::start(&info.path, settings(format), &path, name, None).unwrap();
        for i in 0..3 {
            encoder.append(i, 1, &frame()).unwrap();
        }
        encoder.finish().unwrap();
        let probe = Command::new("ffprobe")
            .args([
                "-v",
                "error",
                "-count_frames",
                "-show_streams",
                "-of",
                "json",
            ])
            .arg(&path)
            .output()
            .unwrap();
        assert!(probe.status.success());
        let metadata: serde_json::Value = serde_json::from_slice(&probe.stdout).unwrap();
        let stream = &metadata["streams"][0];
        assert_eq!(stream["codec_name"], codec);
        assert_eq!(stream["width"], 64);
        assert_eq!(stream["height"], 64);
        assert_eq!(stream["r_frame_rate"], "10/1");
        assert_eq!(stream["nb_read_frames"], "3");
        let decoded = Command::new(&info.path)
            .args(["-v", "error", "-i"])
            .arg(&path)
            .args([
                "-frames:v",
                "1",
                "-f",
                "rawvideo",
                "-pix_fmt",
                "rgba",
                "pipe:1",
            ])
            .output()
            .unwrap();
        assert!(decoded.status.success());
        assert_eq!(decoded.stdout.len(), 64 * 64 * 4);
        assert_eq!(decoded.stdout[3], 0, "transparent corner in {name}");
        let alpha = decoded.stdout[(32 * 64 + 32) * 4 + 3];
        assert!(
            (126..=130).contains(&alpha),
            "half-transparent pixel in {name}: {alpha}"
        );
    }
}
#[test]
#[ignore = "需要本地 FFmpeg"]
fn cancellation_and_incomplete_frames_leave_existing_file_untouched() {
    let info = detect_encoder().unwrap();
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("existing.mov");
    fs::write(&path, b"original").unwrap();
    {
        let encoder = OverlayEncoder::start(
            &info.path,
            settings(ExportFormat::PngMov),
            &path,
            "cancel",
            None,
        )
        .unwrap();
        assert!(encoder.append(1, 1, &frame()).is_err());
        encoder.append(0, 1, &frame()).unwrap();
        encoder.cancel();
        assert!(encoder.finish().is_err());
    }
    assert_eq!(fs::read(&path).unwrap(), b"original");
    assert_eq!(fs::read_dir(directory.path()).unwrap().count(), 1);
    assert!(
        OverlayEncoder::start(
            &info.path,
            settings(ExportFormat::PngMov),
            &path,
            "protect",
            Some(&path)
        )
        .is_err()
    );
    let manager = ExportManager::default();
    let id = manager
        .start("one", &path, settings(ExportFormat::PngMov), None)
        .unwrap();
    assert!(manager.append("another", &id, 0, 1, &frame()).is_err());
    manager.cancel("one", &id).unwrap();
    assert_eq!(fs::read(&path).unwrap(), b"original");
    assert_eq!(fs::read_dir(directory.path()).unwrap().count(), 1);
    assert!(
        manager
            .start(
                "one",
                Path::new("relative.mov"),
                settings(ExportFormat::PngMov),
                None
            )
            .is_err()
    );
}

#[test]
#[ignore = "需要本地 FFmpeg 和 ffprobe"]
fn green_mp4_is_opaque_and_keeps_frame_settings() {
    let info = detect_encoder().unwrap();
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("green.mp4");
    let mut config = settings(ExportFormat::H264Mp4);
    assert!(config.validate().is_err());
    config.background = ExportBackground::Green;
    config.width = 128;
    config.height = 128;
    config.frame = Some(FrameRegion {
        x: 32,
        y: 32,
        width: 64,
        height: 64,
    });
    config.prefer_hardware = true;
    let pixels: Vec<u8> = (0..64 * 64)
        .flat_map(|i| {
            let (x, y) = (i % 64, i / 64);
            if (16..48).contains(&x) && (16..48).contains(&y) {
                [128, 255, 128, 255]
            } else {
                [0, 255, 0, 255]
            }
        })
        .collect();
    let encoder = OverlayEncoder::start(&info.path, config, &path, "green", None).unwrap();
    eprintln!(
        "H264 encoder={}, hardware={}",
        encoder.selection.name, encoder.selection.hardware
    );
    for i in 0..3 {
        encoder.append(i, 1, &pixels).unwrap();
    }
    encoder.finish().unwrap();
    let result = Command::new(&info.path)
        .args(["-v", "error", "-i"])
        .arg(&path)
        .args([
            "-frames:v",
            "1",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "rgba",
            "pipe:1",
        ])
        .output()
        .unwrap();
    assert!(result.status.success());
    assert!(result.stdout[0] < 5);
    assert!(result.stdout[1] > 250);
    assert!(result.stdout[2] < 5);
    assert_eq!(result.stdout[3], 255);
}

#[test]
#[ignore = "需要本地 FFmpeg"]
fn cropped_repeated_frames_restore_full_canvas_and_correct_alpha() {
    let info = detect_encoder().unwrap();
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("cropped.mov");
    let mut config = settings(ExportFormat::PngMov);
    config.width = 128;
    config.height = 128;
    config.frame = Some(FrameRegion {
        x: 32,
        y: 48,
        width: 64,
        height: 64,
    });
    let encoder = OverlayEncoder::start(&info.path, config, &path, "crop", None).unwrap();
    assert!(encoder.append(0, 121, &frame()).is_err());
    encoder.append(0, 3, &frame()).unwrap();
    encoder.finish().unwrap();
    let result = Command::new(&info.path)
        .args(["-v", "error", "-i"])
        .arg(&path)
        .args(["-f", "rawvideo", "-pix_fmt", "rgba", "pipe:1"])
        .output()
        .unwrap();
    assert!(result.status.success());
    assert_eq!(result.stdout.len(), 128 * 128 * 4 * 3);
    assert_eq!(result.stdout[3], 0);
    assert_eq!(result.stdout[(80 * 128 + 64) * 4 + 3], 128);
    assert_eq!(result.stdout[(16 * 128 + 16) * 4 + 3], 0);
}
#[test]
#[ignore = "需要可用的 VideoToolbox 硬件和 FFmpeg"]
fn hardware_probe_and_encoding_preserve_alpha_or_fall_back() {
    let info = detect_encoder().unwrap();
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("hardware.mov");
    let mut config = settings(ExportFormat::Prores4444);
    config.prefer_hardware = true;
    let encoder = OverlayEncoder::start(&info.path, config, &path, "hardware", None).unwrap();
    eprintln!(
        "ProRes encoder={}, hardware={}",
        encoder.selection.name, encoder.selection.hardware
    );
    encoder.append(0, 3, &frame()).unwrap();
    encoder.finish().unwrap();
    let result = Command::new(&info.path)
        .args(["-v", "error", "-i"])
        .arg(&path)
        .args([
            "-frames:v",
            "1",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "rgba",
            "pipe:1",
        ])
        .output()
        .unwrap();
    assert!(result.status.success());
    assert_eq!(result.stdout[3], 0);
    assert!((126..=130).contains(&result.stdout[(32 * 64 + 32) * 4 + 3]));
}
