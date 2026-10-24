use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
    time::UNIX_EPOCH,
};
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryEntry {
    pub id: String,
    pub name: String,
    pub modified_ms: u64,
}
fn directory(root: &Path, kind: &str) -> Result<PathBuf, String> {
    let folder = match kind {
        "project" => "projects",
        "preset" => "presets",
        _ => return Err("文档类型无效。".into()),
    };
    let path = root.join(folder);
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path)
}
pub(crate) fn file(root: &Path, kind: &str, id: &str) -> Result<PathBuf, String> {
    if id.is_empty()
        || id.len() > 240
        || id.contains(['/', '\\'])
        || !id.ends_with(".json")
        || id.starts_with('.')
    {
        return Err("文档名称无效。".into());
    }
    let path = directory(root, kind)?.join(id);
    if fs::symlink_metadata(&path).is_ok_and(|m| m.file_type().is_symlink()) {
        return Err("不支持链接文件。".into());
    }
    Ok(path)
}
pub fn list(root: &Path, kind: &str) -> Result<Vec<LibraryEntry>, String> {
    let mut entries = Vec::new();
    for entry in fs::read_dir(directory(root, kind)?).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let id = entry.file_name().to_string_lossy().into_owned();
        if !entry.file_type().map_err(|e| e.to_string())?.is_file()
            || !id.ends_with(".json")
            || id.starts_with('.')
        {
            continue;
        }
        let meta = entry.metadata().map_err(|e| e.to_string())?;
        let modified_ms = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        let name = id
            .trim_end_matches(".json")
            .trim_end_matches(".pov")
            .trim_end_matches(".preset")
            .to_owned();
        entries.push(LibraryEntry {
            id,
            name,
            modified_ms,
        });
    }
    entries.sort_by(|a, b| b.modified_ms.cmp(&a.modified_ms));
    Ok(entries)
}
