#[tauri::command]
pub async fn list_system_fonts() -> Result<Vec<String>, String> {
    tauri::async_runtime::spawn_blocking(crate::infrastructure::fonts::families)
        .await
        .map_err(|e| e.to_string())?
}
