use std::{io::Read, sync::OnceLock, time::Duration};
static CLIENT: OnceLock<reqwest::blocking::Client> = OnceLock::new();
pub fn download(url: &str, query: &[(String, String)]) -> Result<Vec<u8>, String> {
    let client = CLIENT.get_or_init(|| {
        reqwest::blocking::Client::builder()
            .user_agent("POV-Overlay/0.1 (studio.pov-overlay.desktop)")
            .connect_timeout(Duration::from_secs(4))
            .timeout(Duration::from_secs(10))
            .pool_max_idle_per_host(4)
            .build()
            .expect("HTTP client")
    });
    let response = client
        .get(url)
        .query(query)
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
        return Err("地图图像过大。".into());
    }
    Ok(bytes)
}
pub fn png(bytes: &[u8]) -> bool {
    bytes.starts_with(b"\x89PNG\r\n\x1a\n")
}
pub fn raster(bytes: &[u8]) -> bool {
    png(bytes) || bytes.starts_with(b"\xff\xd8\xff")
}
