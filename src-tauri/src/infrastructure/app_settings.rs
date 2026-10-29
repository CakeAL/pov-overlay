use crate::domain::app_settings::AppSettings;
use std::path::Path;
pub fn read(root: &Path) -> Result<AppSettings, String> {
    let path = root.join("app-settings.json");
    if !path.exists() {
        return Ok(AppSettings::default());
    }
    let text = super::documents::read_text(&path, 32 * 1024)?;
    let mut settings: AppSettings = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    if !["osm", "amap"].contains(&settings.default_map_provider.as_str()) {
        settings.default_map_provider = "osm".into();
    }
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

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn persists_custom_ffmpeg_paths_and_keeps_old_settings_compatible() {
        let root = tempfile::tempdir().unwrap();
        let settings = AppSettings {
            ffmpeg_path: "C:\\Program Files\\FFmpeg\\bin\\ffmpeg.exe".into(),
            ..Default::default()
        };
        save(root.path(), &settings).unwrap();
        assert_eq!(read(root.path()).unwrap().ffmpeg_path, settings.ffmpeg_path);
        std::fs::write(root.path().join("app-settings.json"), "{}").unwrap();
        assert!(read(root.path()).unwrap().ffmpeg_path.is_empty());
    }
}
