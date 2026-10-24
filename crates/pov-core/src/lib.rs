//! Shared, platform-independent GPX timeline and video alignment logic.
use geo::{Distance, Haversine, Point};
use serde::{Deserialize, Serialize};
use std::io::Cursor;
use time::{OffsetDateTime, format_description::well_known::Rfc3339};

/// Never interpolate across a recording pause or a long GPS outage.
pub const MAX_INTERPOLATION_GAP_MS: i64 = 30_000;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Sample {
    pub timestamp_ms: i64,
    pub latitude: f64,
    pub longitude: f64,
    pub elevation: Option<f64>,
    pub speed_mps: f64,
    pub segment: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Track {
    pub name: String,
    pub samples: Vec<Sample>,
    pub start_ms: i64,
    pub end_ms: i64,
    pub distance_meters: f64,
    pub skipped_points: usize,
}

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
    samples.sort_by_key(|point| point.timestamp_ms);
    let count = samples.len();
    samples.dedup_by_key(|point| point.timestamp_ms);
    skipped_points += count - samples.len();
    if samples.len() < 2 {
        return Err("GPX 至少需要两个带有效时间戳的不同轨迹点。".to_owned());
    }
    let mut distance_meters = 0.0;
    for index in 1..samples.len() {
        let previous = &samples[index - 1];
        let current = &samples[index];
        let delta = current.timestamp_ms - previous.timestamp_ms;
        if current.segment != previous.segment || delta > MAX_INTERPOLATION_GAP_MS {
            continue;
        }
        let distance = Haversine.distance(
            Point::new(previous.longitude, previous.latitude),
            Point::new(current.longitude, current.latitude),
        );
        distance_meters += distance;
        samples[index].speed_mps = distance / (delta as f64 / 1000.0);
        // Use the first observed interval as the segment's initial speed.
        if index == 1
            || samples[index - 2].segment != samples[index - 1].segment
            || samples[index - 1].timestamp_ms - samples[index - 2].timestamp_ms
                > MAX_INTERPOLATION_GAP_MS
        {
            samples[index - 1].speed_mps = samples[index].speed_mps;
        }
    }
    Ok(Track {
        name,
        start_ms: samples[0].timestamp_ms,
        end_ms: samples.last().unwrap().timestamp_ms,
        samples,
        distance_meters,
        skipped_points,
    })
}

impl Track {
    /// Returns no data outside coverage, between segments, or inside a GPS outage.
    pub fn sample_at(&self, timestamp_ms: i64) -> Option<Sample> {
        if timestamp_ms < self.start_ms || timestamp_ms > self.end_ms {
            return None;
        }
        match self
            .samples
            .binary_search_by_key(&timestamp_ms, |sample| sample.timestamp_ms)
        {
            Ok(index) => Some(self.samples[index].clone()),
            Err(index) => {
                let previous = self.samples.get(index.checked_sub(1)?)?;
                let next = self.samples.get(index)?;
                let delta = next.timestamp_ms - previous.timestamp_ms;
                if next.segment != previous.segment || delta > MAX_INTERPOLATION_GAP_MS {
                    return None;
                }
                let progress = (timestamp_ms - previous.timestamp_ms) as f64 / delta as f64;
                let mix = |a: f64, b: f64| a + (b - a) * progress;
                let longitude_delta =
                    (next.longitude - previous.longitude + 540.0).rem_euclid(360.0) - 180.0;
                let longitude = (previous.longitude + longitude_delta * progress + 540.0)
                    .rem_euclid(360.0)
                    - 180.0;
                Some(Sample {
                    timestamp_ms,
                    latitude: mix(previous.latitude, next.latitude),
                    longitude,
                    elevation: previous
                        .elevation
                        .zip(next.elevation)
                        .map(|(a, b)| mix(a, b)),
                    speed_mps: mix(previous.speed_mps, next.speed_mps),
                    segment: previous.segment,
                })
            }
        }
    }
}

/// Offset is positive when the video starts AFTER the GPX recording starts.
pub fn alignment_offset_seconds(track_start_ms: i64, video_start_ms: i64) -> f64 {
    (video_start_ms - track_start_ms) as f64 / 1000.0
}

/// Accept only timestamps with an explicit timezone; local wall-clock metadata is ambiguous.
pub fn parse_recording_time(value: &str) -> Option<i64> {
    let value = value.trim();
    // Apple QuickTime commonly stores explicit offsets as +0800.
    let normalized;
    let bytes = value.as_bytes();
    let value = if bytes.len() >= 5 {
        let index = bytes.len() - 5;
        if matches!(bytes[index], b'+' | b'-') && bytes[index + 1..].iter().all(u8::is_ascii_digit)
        {
            normalized = format!(
                "{}:{}",
                &value[..value.len() - 2],
                &value[value.len() - 2..]
            );
            normalized.as_str()
        } else {
            value
        }
    } else {
        value
    };
    OffsetDateTime::parse(value, &Rfc3339)
        .ok()
        .map(|time| (time.unix_timestamp_nanos() / 1_000_000) as i64)
}

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
