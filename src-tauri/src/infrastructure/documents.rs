use std::{
    fs,
    io::Write,
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};
pub fn read_text(path: &Path, max_bytes: u64) -> Result<String, String> {
    if fs::metadata(path).map_err(|e| e.to_string())?.len() > max_bytes {
        return Err("文件过大。".into());
    }
    fs::read_to_string(path).map_err(|e| e.to_string())
}
pub fn atomic_write(path: &Path, content: &str) -> Result<(), String> {
    atomic_write_bytes(path, content.as_bytes())
}
pub fn atomic_write_bytes(path: &Path, content: &[u8]) -> Result<(), String> {
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();
    let name = path.file_name().ok_or("文件名无效。")?.to_string_lossy();
    let temp = path.with_file_name(format!(".{name}.{}.{stamp}.tmp", std::process::id()));
    let result = (|| {
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp)?;
        file.write_all(content)?;
        file.sync_all()?;
        fs::rename(&temp, path)
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temp);
    }
    result.map_err(|e: std::io::Error| e.to_string())
}
