use crate::{
    application::overlay_export::ExportManager,
    domain::overlay_export::ExportSettings,
    infrastructure::overlay_encoder::{EncoderInfo, detect_encoder},
};
use std::path::Path;
use tauri::{
    State, Window,
    ipc::{InvokeBody, Request},
};

#[tauri::command]
pub async fn export_encoder_info() -> Result<EncoderInfo, String> {
    tauri::async_runtime::spawn_blocking(detect_encoder)
        .await
        .map_err(|e| e.to_string())?
}
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartedExport {
    id: String,
    encoder: String,
    hardware: bool,
}
#[tauri::command]
pub async fn start_overlay_export(
    window: Window,
    state: State<'_, ExportManager>,
    path: String,
    settings: ExportSettings,
    protected_video: Option<String>,
) -> Result<StartedExport, String> {
    let manager = state.inner().clone();
    let owner = window.label().to_string();
    tauri::async_runtime::spawn_blocking(move || {
        let id = manager.start(
            &owner,
            Path::new(&path),
            settings,
            protected_video.as_deref().map(Path::new),
        )?;
        let (encoder, hardware) = manager.selection(&owner, &id)?;
        Ok(StartedExport {
            id,
            encoder,
            hardware,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn append_overlay_frame(
    window: Window,
    state: State<'_, ExportManager>,
    request: Request<'_>,
) -> Result<(), String> {
    let header = |name| {
        request
            .headers()
            .get(name)
            .and_then(|v| v.to_str().ok())
            .map(str::to_string)
            .ok_or("导出帧请求头无效。")
    };
    let id = header("x-export-id")?;
    let index = header("x-frame-index")?
        .parse::<u64>()
        .map_err(|e| e.to_string())?;
    let count = request
        .headers()
        .get("x-frame-count")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("1")
        .parse::<u64>()
        .map_err(|e| e.to_string())?;
    let bytes = match request.body() {
        InvokeBody::Raw(bytes) => bytes.clone(),
        _ => return Err("导出帧必须为二进制 RGBA。".into()),
    };
    let manager = state.inner().clone();
    let owner = window.label().to_string();
    tauri::async_runtime::spawn_blocking(move || manager.append(&owner, &id, index, count, &bytes))
        .await
        .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn finish_overlay_export(
    window: Window,
    state: State<'_, ExportManager>,
    id: String,
) -> Result<(), String> {
    let manager = state.inner().clone();
    let owner = window.label().to_string();
    tauri::async_runtime::spawn_blocking(move || manager.finish(&owner, &id))
        .await
        .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn cancel_overlay_export(
    window: Window,
    state: State<'_, ExportManager>,
    id: String,
) -> Result<(), String> {
    let manager = state.inner().clone();
    let owner = window.label().to_string();
    tauri::async_runtime::spawn_blocking(move || manager.cancel(&owner, &id))
        .await
        .map_err(|e| e.to_string())?
}
