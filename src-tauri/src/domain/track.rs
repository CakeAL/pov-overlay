use geo::{Distance, Haversine, Point};
use serde::{Deserialize, Serialize};
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

impl Track {
    pub fn from_samples(
        name: String,
        mut samples: Vec<Sample>,
        mut skipped_points: usize,
    ) -> Result<Self, String> {
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
