use anyhow::Result;
use geo::{Distance, Haversine};
use gpx::{Track, TrackSegment};
use std::{f64, fs::File, io::BufReader, path::Path};
use time::OffsetDateTime;

#[derive(Debug)]
pub struct PointData {
    pub time: OffsetDateTime,
    pub latitude: f64,
    pub longitude: f64,
    pub elevation: f64,
    pub speed: f64, // m/s
}

pub fn handle_gpx<P: AsRef<Path>>(path: P) -> Result<Vec<PointData>> {
    let file = File::open(path)?;
    let reader = BufReader::new(file);
    let gpx = gpx::read(reader)?;
    let track: &Track = &gpx.tracks[0];
    let segment: &TrackSegment = &track.segments[0];
    let mut res = vec![];
    for pair in segment.points.windows(2) {
        let prev = &pair[0];
        let curr = &pair[1];

        if let (Some(prev_time), Some(curr_time)) = (prev.time, curr.time) {
            let distance = Haversine.distance(prev.point(), curr.point());
            let duration = (OffsetDateTime::from(curr_time).unix_timestamp_nanos()
                - OffsetDateTime::from(prev_time).unix_timestamp_nanos())
                as f64
                / 1e9;
            if duration > 0.0 {
                let speed = distance / duration; // m/s
                res.push(PointData {
                    time: curr_time.into(),
                    latitude: curr.point().y(),
                    longitude: curr.point().x(),
                    elevation: curr.elevation.unwrap_or(f64::MIN),
                    speed,
                });
            }
        }
    }

    Ok(res)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_handle_gpx() {
        let path = "/Users/cakeal/Downloads/test.gpx";
        let res = handle_gpx(path).unwrap();
        dbg!(res);
    }
}