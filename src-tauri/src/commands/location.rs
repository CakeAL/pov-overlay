use crate::domain::location::{LocationAddress, LocationQuery};
use tauri::Manager;
#[tauri::command]
pub async fn lookup_location(
    app: tauri::AppHandle,
    query: LocationQuery,
) -> Result<LocationAddress, String> {
    let config = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let cache = app.path().app_cache_dir().map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        crate::application::location::lookup(&config, &cache, &query)
    })
    .await
    .map_err(|e| e.to_string())?
}
