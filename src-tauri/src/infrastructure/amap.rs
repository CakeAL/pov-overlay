use base64::{Engine, engine::general_purpose::STANDARD};
use std::{fs, io::Read, path::Path, time::Duration};
pub fn configured(root: &Path) -> bool {
    read_key(root).is_ok()
}
fn read_key(root: &Path) -> Result<String, String> {
    fs::read_to_string(root.join("amap.key"))
        .map_err(|_| "请先在右侧配置高德 Web 服务 Key。".into())
}
pub fn configure(root: &Path, key: &str) -> Result<(), String> {
    if key.len() != 32 || !key.bytes().all(|b| b.is_ascii_hexdigit()) {
        return Err("高德 Web 服务 Key 应为 32 位字符。".into());
    }
    fs::create_dir_all(root).map_err(|e| e.to_string())?;
    let path = root.join("amap.key");
    super::documents::atomic_write(&path, key)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o600)).map_err(|e| e.to_string())?;
    }
    Ok(())
}
pub fn load(root: &Path, latitude: f64, longitude: f64, zoom: u8) -> Result<String, String> {
    if !latitude.is_finite()
        || !longitude.is_finite()
        || latitude.abs() > 85.1
        || longitude.abs() > 180.0
        || !(1..=17).contains(&zoom)
    {
        return Err("高德地图参数无效。".into());
    }
    let key = read_key(root)?;
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|e| e.to_string())?;
    let response = client
        .get("https://restapi.amap.com/v3/staticmap")
        .query(&[
            ("location", format!("{longitude:.6},{latitude:.6}")),
            ("zoom", zoom.to_string()),
            ("size", "512*512".into()),
            ("scale", "1".into()),
            ("key", key),
        ])
        .send()
        .map_err(|e| e.without_url().to_string())?
        .error_for_status()
        .map_err(|e| e.without_url().to_string())?;
    let mut bytes = Vec::new();
    response
        .take(4 * 1024 * 1024 + 1)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    if bytes.len() > 4 * 1024 * 1024 {
        return Err("高德地图图像过大。".into());
    }
    if bytes.starts_with(b"\x89PNG") {
        return Ok(format!("data:image/png;base64,{}", STANDARD.encode(bytes)));
    }
    if bytes.starts_with(b"\xff\xd8\xff") {
        return Ok(format!("data:image/jpeg;base64,{}", STANDARD.encode(bytes)));
    }
    let info = serde_json::from_slice::<serde_json::Value>(&bytes)
        .ok()
        .and_then(|v| v["info"].as_str().map(str::to_owned))
        .unwrap_or("无有效地图图像".into());
    Err(format!("高德地图：{info}"))
}
