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

#[tauri::command]
pub async fn sample_terrain_tile(
    app: tauri::AppHandle,
    z: u8,
    x: u32,
    y: u32,
    points: Vec<crate::domain::terrain::ElevationCoordinate>,
) -> Result<Vec<Option<f64>>, String> {
    let cache = app.path().app_cache_dir().map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        crate::application::elevation::sample_tile(&cache, z, x, y, &points)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn amap_key_status(app: tauri::AppHandle) -> Result<bool, String> {
    let root = app.path().app_config_dir().map_err(|e| e.to_string())?;
    Ok(crate::infrastructure::amap::configured(&root))
}
#[tauri::command]
pub async fn configure_amap_key(app: tauri::AppHandle, key: String) -> Result<(), String> {
    let root = app.path().app_config_dir().map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        crate::infrastructure::amap::configure(&root, key.trim())
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn load_amap_map(
    app: tauri::AppHandle,
    latitude: f64,
    longitude: f64,
    zoom: u8,
) -> Result<String, String> {
    let root = app.path().app_config_dir().map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        crate::infrastructure::amap::load(&root, latitude, longitude, zoom)
    })
    .await
    .map_err(|e| e.to_string())?
}
