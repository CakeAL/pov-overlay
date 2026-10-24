use crate::domain::track::Track;
use srtlib::{Subtitle, Subtitles, Timestamp};
use std::path::Path;

pub fn build_subtitles(track: &Track) -> Result<Subtitles, String> {
    let mut subtitles = Subtitles::new();
    for (index, pair) in track.samples.windows(2).enumerate() {
        let previous = &pair[0];
        let current = &pair[1];
        let start = u32::try_from(previous.timestamp_ms - track.start_ms)
            .map_err(|_| "轨迹时间超过 SRT 支持范围。")?;
        let end = u32::try_from(current.timestamp_ms - track.start_ms)
            .map_err(|_| "轨迹时间超过 SRT 支持范围。")?;
        let elevation = previous
            .elevation
            .map(|value| format!("{value:.2} m"))
            .unwrap_or_else(|| "—".into());
        let text = format!(
            "海拔：{elevation}\n速度：{:.2} km/h",
            previous.speed_mps * 3.6
        );
        subtitles.push(Subtitle::new(
            index + 1,
            Timestamp::from_milliseconds(start),
            Timestamp::from_milliseconds(end),
            text,
        ));
    }
    Ok(subtitles)
}

pub fn write_subtitles(subtitles: &Subtitles, path: &Path) -> Result<(), String> {
    subtitles
        .write_to_file(path, None)
        .map_err(|error| error.to_string())
}
