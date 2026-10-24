use crate::{
    domain::video::VideoMetadata,
    infrastructure::{
        materials,
        video::{ffprobe, mp4},
    },
};
use std::path::Path;

pub fn import_video(path: &Path) -> Result<VideoMetadata, String> {
    let path = materials::resolve_video(path)?;
    let mut timing = ffprobe::probe(&path);
    if timing.captured_at_ms.is_none() {
        timing.captured_at_ms = mp4::read_creation_time(&path);
        if timing.captured_at_ms.is_some() {
            timing.time_source = Some("MP4 / MOV 容器时间（UTC）".into());
        }
    }
    let warning = timing
        .captured_at_ms
        .is_none()
        .then(|| "未找到带时区的拍摄时间，请手动设置视频起始时间。".into());
    Ok(VideoMetadata {
        name: path.file_name().unwrap().to_string_lossy().into_owned(),
        path: path.to_string_lossy().into_owned(),
        captured_at_ms: timing.captured_at_ms,
        time_source: timing.time_source,
        warning,
        duration: timing.duration,
    })
}
