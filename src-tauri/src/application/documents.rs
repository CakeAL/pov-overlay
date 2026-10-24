use crate::infrastructure::documents;
use std::path::Path;
fn extension(path: &Path, wanted: &str) -> Result<(), String> {
    if path
        .extension()
        .and_then(|v| v.to_str())
        .map(str::to_lowercase)
        .as_deref()
        != Some(wanted)
    {
        return Err(format!("请选择 {wanted} 文件。"));
    }
    Ok(())
}
pub fn read_json(path: &Path) -> Result<String, String> {
    extension(path, "json")?;
    documents::read_text(path, 100 * 1024 * 1024)
}
pub fn write_json(path: &Path, content: &str) -> Result<(), String> {
    extension(path, "json")?;
    if content.len() > 100 * 1024 * 1024 {
        return Err("工程不能超过 100 MB。".into());
    }
    serde_json::from_str::<serde_json::Value>(content).map_err(|e| e.to_string())?;
    documents::atomic_write(path, content)
}
pub fn read_svg(path: &Path) -> Result<String, String> {
    extension(path, "svg")?;
    documents::read_text(path, 2 * 1024 * 1024)
}
