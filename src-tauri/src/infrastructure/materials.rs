use std::{
    fs,
    path::{Path, PathBuf},
};

pub fn read_gpx(path: &Path) -> Result<String, String> {
    let metadata = fs::metadata(path).map_err(|error| format!("无法读取轨迹：{error}"))?;
    if metadata.len() > 50 * 1024 * 1024 {
        return Err("GPX 文件超过 50 MB，请先裁剪轨迹。".into());
    }
    fs::read_to_string(path).map_err(|error| format!("无法读取轨迹：{error}"))
}

pub fn resolve_video(path: &Path) -> Result<PathBuf, String> {
    let path = path
        .canonicalize()
        .map_err(|error| format!("无法读取视频：{error}"))?;
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_lowercase();
    if !["mp4", "mov", "m4v", "webm", "mkv", "avi", "mts", "m2ts"].contains(&extension.as_str()) {
        return Err("请选择 MP4、MOV、WebM 等视频文件。".into());
    }
    if !path.is_file() {
        return Err("选择的路径不是视频文件。".into());
    }
    Ok(path)
}
