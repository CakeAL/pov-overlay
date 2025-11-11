use crate::point_data::PointData;
use anyhow::Result;
use srtlib::{Subtitle, Subtitles, Timestamp};

pub fn export_srt(data: Vec<PointData>) -> Result<()> {
    if data.len() < 2 {
        return Err(anyhow::anyhow!("Not enough points"));
    }
    let start_time = data[0].time;
    let mut subs = Subtitles::new();
    // for (i, point) in data.iter().enumerate() {
    //     let start_offset = point.time - start_time;
    //     let start_secs = start_offset.whole_milliseconds();

    // }
    for (i, pair) in data.windows(2).enumerate() {
        let prev = &pair[0];
        let curr = &pair[1];
        let start_offset = prev.time - start_time;
        let end_offset = curr.time - start_time;
        let start_ts = Timestamp::from_milliseconds(start_offset.whole_milliseconds() as u32);
        let end_ts = Timestamp::from_milliseconds(end_offset.whole_milliseconds() as u32);
        let text = format!("海拔：{:.2} m\n速度：{:.2} km/h", curr.elevation, curr.speed * 3.6);
        let subtitle = Subtitle::new(i + 1, start_ts, end_ts, text);
        subs.push(subtitle);
    }
    subs.write_to_file("output.srt", None)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    // use std::{fs::OpenOptions, io::Write};

    use crate::handle_file::handle_gpx;
    use super::*;

    #[test] 
    fn test_export_srt() {
        let data = handle_gpx("/Users/cakeal/Downloads/20251111-125534.gpx").unwrap();
        // let str = data.iter().map(|point | format!("{:?}\n", point)).collect::<String>();
        // let mut file = OpenOptions::new()
        //     .write(true)
        //     .create(true)
        //     .open("points.txt")
        //     .unwrap();
        // file.write(str.as_bytes());
        export_srt(data).unwrap();
    }
}