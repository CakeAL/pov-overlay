use base64::{Engine, engine::general_purpose::STANDARD};
use pov_overlay_desktop::{
    application::overlay_export::ExportManager,
    domain::overlay_export::{ExportFormat, ExportSettings},
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
    }
}
fn frame() -> Vec<u8> {
    // Generated fixture: transparent corners and a white square at alpha 128.
    STANDARD.decode("iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAVElEQVR4nO3QwQ0AMAgDMUZn83SGvhDCljJArgoAAADgU5Ke3PR/AQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBLgQAAAAAFjnAf+V9MQqYpTxAAAAAElFTkSuQmCC").unwrap()
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
    config.validate_png(&frame()).unwrap();
    config.height = 128;
    assert!(config.validate_png(&frame()).is_err());
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
            encoder.append(i, &frame()).unwrap();
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
        assert!(encoder.append(1, &frame()).is_err());
        encoder.append(0, &frame()).unwrap();
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
    assert!(manager.append("another", &id, 0, &frame()).is_err());
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
