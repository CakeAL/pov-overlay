use crate::{
    application::documents,
    infrastructure::document_library::{self, file},
};
pub use document_library::LibraryEntry;
use std::path::Path;
pub fn list(root: &Path, kind: &str) -> Result<Vec<LibraryEntry>, String> {
    document_library::list(root, kind)
}
pub fn read(root: &Path, kind: &str, id: &str) -> Result<String, String> {
    documents::read_json(&file(root, kind, id)?)
}
pub fn save(root: &Path, kind: &str, id: &str, content: &str) -> Result<(), String> {
    let value: serde_json::Value = serde_json::from_str(content).map_err(|e| e.to_string())?;
    if value["type"] != format!("pov-overlay/{kind}") || value["version"] != 1 {
        return Err("文档类型或版本无效。".into());
    }
    documents::write_json(&file(root, kind, id)?, content)
}
