use std::{fs, path::Path};
fn file(provider: &str) -> Result<&'static str, String> {
    match provider {
        "amap" => Ok("amap.key"),
        _ => Err("API 提供商无效。".into()),
    }
}
pub fn read(root: &Path, provider: &str) -> Result<String, String> {
    fs::read_to_string(root.join(file(provider)?))
        .map_err(|_| "请先在设置中配置高德 Web 服务 API Key。".into())
}
pub fn configured(root: &Path, provider: &str) -> bool {
    read(root, provider).is_ok_and(|key| !key.trim().is_empty())
}
pub fn save(root: &Path, provider: &str, key: Option<&str>) -> Result<(), String> {
    let path = root.join(file(provider)?);
    let Some(key) = key else {
        if path.exists() {
            fs::remove_file(path).map_err(|e| e.to_string())?;
        }
        return Ok(());
    };
    let key = key.trim();
    if key.is_empty()
        || key.len() > 512
        || !key.is_ascii()
        || key.chars().any(char::is_whitespace)
        || key.chars().any(char::is_control)
        || (provider == "amap" && (key.len() != 32 || !key.bytes().all(|c| c.is_ascii_hexdigit())))
    {
        return Err("API Key 格式无效。".into());
    }
    fs::create_dir_all(root).map_err(|e| e.to_string())?;
    super::documents::atomic_write(&path, key)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o600)).map_err(|e| e.to_string())?;
    }
    Ok(())
}
