#[tauri::command]
pub async fn list_system_fonts() -> Result<Vec<String>, String> {
    tauri::async_runtime::spawn_blocking(crate::infrastructure::fonts::families)
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn load_sign_font(app: tauri::AppHandle, kind: String) -> Result<Vec<u8>, String> {
    use tauri::Manager;
    if !["A", "B", "C"].contains(&kind.as_str()) {
        return Err("字体类型无效。".into());
    }
    let path = app
        .path()
        .resolve(
            format!("resources/fonts/jtbz_{kind}.ttf"),
            tauri::path::BaseDirectory::Resource,
        )
        .map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || std::fs::read(path).map_err(|e| e.to_string()))
        .await
        .map_err(|e| e.to_string())?
}
