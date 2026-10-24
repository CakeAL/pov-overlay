use crate::{
    application::{track_import, video_import},
    domain::{track::Track, video::VideoMetadata},
};
use std::path::Path;
use tauri::Manager;

#[tauri::command]
pub async fn load_gpx(path: String) -> Result<Track, String> {
    tauri::async_runtime::spawn_blocking(move || track_import::import_track(Path::new(&path)))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn load_video(app: tauri::AppHandle, path: String) -> Result<VideoMetadata, String> {
    let video =
        tauri::async_runtime::spawn_blocking(move || video_import::import_video(Path::new(&path)))
            .await
            .map_err(|error| error.to_string())??;
    app.asset_protocol_scope()
        .allow_file(&video.path)
        .map_err(|error| error.to_string())?;
    Ok(video)
}

#[tauri::command]
pub async fn load_image(
    path: String,
) -> Result<crate::application::image_import::ImageAsset, String> {
    tauri::async_runtime::spawn_blocking(move || {
        crate::application::image_import::import_image(Path::new(&path))
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn read_svg(path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let path = Path::new(&path);
        if path
            .extension()
            .and_then(|v| v.to_str())
            .map(str::to_lowercase)
            .as_deref()
            != Some("svg")
        {
            return Err("请选择 SVG 文件。".into());
        }
        if std::fs::metadata(path).map_err(|e| e.to_string())?.len() > 2 * 1024 * 1024 {
            return Err("SVG 不能超过 2 MB。".into());
        }
        std::fs::read_to_string(path).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}
