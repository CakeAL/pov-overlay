use crate::{
    domain::app_settings::AppSettings,
    infrastructure::{api_keys, app_settings, cached_resources},
};
use serde::Serialize;
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsSnapshot {
    settings: AppSettings,
    amap_configured: bool,
    cache: cached_resources::CacheStats,
}
#[tauri::command]
pub async fn load_app_settings(app: tauri::AppHandle) -> Result<SettingsSnapshot, String> {
    let config = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let cache = app.path().app_cache_dir().map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        let settings = app_settings::read(&config)?;
        cached_resources::set_limit(settings.cache_limit_mb);
        crate::infrastructure::ffmpeg::configure(&settings.ffmpeg_path);
        Ok(SettingsSnapshot {
            settings,
            amap_configured: api_keys::configured(&config, "amap"),
            cache: cached_resources::stats(&cache),
        })
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn save_app_settings(app: tauri::AppHandle, settings: AppSettings) -> Result<(), String> {
    let config = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let cache = app.path().app_cache_dir().map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        app_settings::save(&config, &settings)?;
        cached_resources::set_limit(settings.cache_limit_mb);
        crate::infrastructure::ffmpeg::configure(&settings.ffmpeg_path);
        cached_resources::enforce_limit(&cache)
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn set_map_api_key(
    app: tauri::AppHandle,
    provider: String,
    key: Option<String>,
) -> Result<(), String> {
    let config = app.path().app_config_dir().map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || api_keys::save(&config, &provider, key.as_deref()))
        .await
        .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn clear_map_cache(
    app: tauri::AppHandle,
) -> Result<cached_resources::CacheStats, String> {
    let cache = app.path().app_cache_dir().map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        cached_resources::clear(&cache)?;
        Ok(cached_resources::stats(&cache))
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn open_map_cache_folder(app: tauri::AppHandle) -> Result<(), String> {
    let cache = app.path().app_cache_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&cache).map_err(|e| e.to_string())?;
    app.opener()
        .open_path(cache.to_string_lossy(), None::<&str>)
        .map_err(|e| e.to_string())
}
