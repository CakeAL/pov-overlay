use pov_overlay_desktop::{
    domain::alignment::{alignment_offset_seconds, parse_recording_time},
    infrastructure::gpx::parse_gpx,
};
#[cfg(test)]
mod tests {
    use super::*;

    fn fixture(points: &str) -> String {
        format!(
            r#"<?xml version="1.0"?><gpx version="1.1" creator="pov-test" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>Test ride</name><trkseg>{points}</trkseg></trk></gpx>"#
        )
    }
    fn point(time: &str, latitude: f64, longitude: f64) -> String {
        format!(r#"<trkpt lat="{latitude}" lon="{longitude}"><time>{time}</time></trkpt>"#)
    }
    #[test]
    fn parses_sorts_deduplicates_and_preserves_first_point() {
        let a = point("2026-10-24T00:00:00Z", 31.0, 121.0);
        let b = point("2026-10-24T00:00:01Z", 31.00001, 121.0);
        let track = parse_gpx(&fixture(&format!("{b}{a}{a}"))).unwrap();
        assert_eq!(track.samples.len(), 2);
        assert_eq!(track.skipped_points, 1);
        assert_eq!(track.name, "Test ride");
        assert!(track.samples[0].speed_mps > 0.0);
        assert!(track.samples[0].elevation.is_none());
        let middle = track.sample_at(track.start_ms + 500).unwrap();
        assert!((middle.latitude - 31.000005).abs() < 1e-9);
        assert!(track.sample_at(track.start_ms - 1).is_none());
        assert!(track.sample_at(track.end_ms + 1).is_none());
    }
    #[test]
    fn does_not_bridge_segments_or_long_gaps() {
        let a = point("2026-10-24T00:00:00Z", 31.0, 121.0);
        let b = point("2026-10-24T00:01:00Z", 31.1, 121.1);
        let track = parse_gpx(&fixture(&format!("{a}{b}"))).unwrap();
        assert!(track.sample_at(track.start_ms + 30_000).is_none());
        assert_eq!(track.distance_meters, 0.0);
        let b = point("2026-10-24T00:00:01Z", 31.1, 121.1);
        let track = parse_gpx(&fixture(&format!("{a}</trkseg><trkseg>{b}"))).unwrap();
        assert!(track.sample_at(track.start_ms + 500).is_none());
    }
    #[test]
    fn rejects_missing_times_and_malformed_gpx() {
        assert!(parse_gpx("not xml").is_err());
        assert!(parse_gpx(&fixture(r#"<trkpt lat="31" lon="121"/>"#)).is_err());
    }
    #[test]
    fn interpolates_across_antimeridian_without_crossing_greenwich() {
        let a = point("2026-10-24T00:00:00Z", 0.0, 179.9);
        let b = point("2026-10-24T00:00:01Z", 0.0, -179.9);
        let track = parse_gpx(&fixture(&format!("{a}{b}"))).unwrap();
        assert!(
            (track
                .sample_at(track.start_ms + 500)
                .unwrap()
                .longitude
                .abs()
                - 180.0)
                .abs()
                < 1e-8
        );
    }
    #[test]
    fn aligns_absolute_times_across_timezones_and_keeps_milliseconds() {
        let gps = parse_recording_time("2026-10-24T00:00:00Z").unwrap();
        let video = parse_recording_time("2026-10-24T08:00:12.500+08:00").unwrap();
        assert_eq!(alignment_offset_seconds(gps, video), 12.5);
        assert_eq!(
            parse_recording_time("2026-10-24T08:00:12.500+0800"),
            Some(video)
        );
        assert_eq!(alignment_offset_seconds(video, gps), -12.5);
        assert!(parse_recording_time("2026-10-24T08:00:00").is_none());
    }
}
