use tauri::Manager;
#[tauri::command]
pub async fn load_map_tile(app: tauri::AppHandle, z: u8, x: u32, y: u32) -> Result<String, String> {
    let cache = app.path().app_cache_dir().map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        crate::infrastructure::map_tiles::load(&cache, z, x, y)
    })
    .await
    .map_err(|e| e.to_string())?
}
