use crate::application::documents;
use std::path::Path;
#[tauri::command]
pub async fn read_document(path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || documents::read_json(Path::new(&path)))
        .await
        .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn write_document(path: String, content: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || documents::write_json(Path::new(&path), &content))
        .await
        .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn read_svg(path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || documents::read_svg(Path::new(&path)))
        .await
        .map_err(|e| e.to_string())?
}
