use pov_overlay_desktop::application::{
    subtitle_export::export_srt, track_import::import_track, video_import::import_video,
};
use std::fs;

const GPX: &str = r#"<gpx version="1.1" creator="pov-test" xmlns="http://www.topografix.com/GPX/1/1"><trk><trkseg><trkpt lat="0" lon="0"><ele>12.5</ele><time>2026-10-24T00:00:00Z</time></trkpt><trkpt lat="0" lon="0.00001"><ele>13</ele><time>2026-10-24T00:00:01Z</time></trkpt></trkseg></trk></gpx>"#;

#[test]
fn imports_gpx_and_exports_subtitles_to_an_explicit_destination() {
    let directory = tempfile::tempdir().unwrap();
    let input = directory.path().join("track.gpx");
    let output = directory.path().join("track.srt");
    fs::write(&input, GPX).unwrap();
    let track = import_track(&input).unwrap();
    assert_eq!(track.samples.len(), 2);
    export_srt(&track, &output).unwrap();
    let text = fs::read_to_string(output).unwrap();
    assert!(text.contains("00:00:00,000 --> 00:00:01,000"));
    assert!(text.contains("海拔：12.50 m"));
    assert!(text.contains("速度：4.00 km/h"));
}

#[test]
fn reports_file_and_parse_failures_through_application_services() {
    let directory = tempfile::tempdir().unwrap();
    let missing = directory.path().join("missing.gpx");
    assert!(import_track(&missing).unwrap_err().contains("无法读取轨迹"));
    fs::write(&missing, "invalid XML").unwrap();
    assert!(import_track(&missing).unwrap_err().contains("无法解析 GPX"));
    assert!(import_video(&missing).is_err());
}
