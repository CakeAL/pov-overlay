use crate::domain::app_settings::AppSettings;
use std::path::Path;
pub fn read(root: &Path) -> Result<AppSettings, String> {
    let path = root.join("app-settings.json");
    if !path.exists() {
        return Ok(AppSettings::default());
    }
    let text = super::documents::read_text(&path, 32 * 1024)?;
    let settings: AppSettings = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    settings.validate()?;
    Ok(settings)
}
pub fn save(root: &Path, settings: &AppSettings) -> Result<(), String> {
    settings.validate()?;
    std::fs::create_dir_all(root).map_err(|e| e.to_string())?;
    super::documents::atomic_write(
        &root.join("app-settings.json"),
        &serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?,
    )
}
