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

#[tauri::command]
pub async fn list_library_documents(
    app: tauri::AppHandle,
    kind: String,
) -> Result<Vec<crate::application::document_library::LibraryEntry>, String> {
    use tauri::Manager;
    let root = app.path().app_config_dir().map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        crate::application::document_library::list(&root, &kind)
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn read_library_document(
    app: tauri::AppHandle,
    kind: String,
    id: String,
) -> Result<String, String> {
    use tauri::Manager;
    let root = app.path().app_config_dir().map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        crate::application::document_library::read(&root, &kind, &id)
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn save_library_document(
    app: tauri::AppHandle,
    kind: String,
    id: String,
    content: String,
) -> Result<(), String> {
    use tauri::Manager;
    let root = app.path().app_config_dir().map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        crate::application::document_library::save(&root, &kind, &id, &content)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn write_svg(path: String, content: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || documents::write_svg(Path::new(&path), &content))
        .await
        .map_err(|e| e.to_string())?
}
