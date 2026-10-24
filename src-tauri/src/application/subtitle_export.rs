use crate::{domain::track::Track, infrastructure::subtitles};
use std::path::Path;

/// Preserves the original SRT utility as an explicit library operation, not a UI export.
pub fn export_srt(track: &Track, destination: &Path) -> Result<(), String> {
    if track.samples.len() < 2 {
        return Err("至少需要两个轨迹点才能导出字幕。".into());
    }
    subtitles::write_subtitles(&subtitles::build_subtitles(track)?, destination)
}
