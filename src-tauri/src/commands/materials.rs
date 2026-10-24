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
