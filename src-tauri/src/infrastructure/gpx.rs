use crate::domain::track::{Sample, Track};
use std::io::Cursor;
use time::OffsetDateTime;
pub fn parse_gpx(xml: &str) -> Result<Track, String> {
    let gpx =
        gpx::read(Cursor::new(xml.as_bytes())).map_err(|error| format!("无法解析 GPX：{error}"))?;
    let name = gpx
        .tracks
        .iter()
        .find_map(|track| track.name.clone())
        .unwrap_or_else(|| "未命名轨迹".to_owned());
    let mut samples = Vec::new();
    let mut skipped_points = 0;
    let mut segment_id = 0;
    for track in &gpx.tracks {
        for segment in &track.segments {
            for point in &segment.points {
                let Some(timestamp) = point.time.map(OffsetDateTime::from) else {
                    skipped_points += 1;
                    continue;
                };
                let latitude = point.point().y();
                let longitude = point.point().x();
                if !latitude.is_finite()
                    || !longitude.is_finite()
                    || !(-90.0..=90.0).contains(&latitude)
                    || !(-180.0..=180.0).contains(&longitude)
                {
                    skipped_points += 1;
                    continue;
                }
                samples.push(Sample {
                    timestamp_ms: (timestamp.unix_timestamp_nanos() / 1_000_000) as i64,
                    latitude,
                    longitude,
                    elevation: point.elevation.filter(|value| value.is_finite()),
                    speed_mps: 0.0,
                    segment: segment_id,
                });
            }
            segment_id += 1;
        }
    }
    Track::from_samples(name, samples, skipped_points)
}
