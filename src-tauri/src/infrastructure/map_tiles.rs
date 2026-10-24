use base64::{Engine, engine::general_purpose::STANDARD};
use std::{
    fs,
    io::Read,
    path::Path,
    sync::{Mutex, OnceLock},
    time::Duration,
};
static DOWNLOAD: Mutex<()> = Mutex::new(());
static CLIENT: OnceLock<reqwest::blocking::Client> = OnceLock::new();
pub fn load(root: &Path, z: u8, x: u32, y: u32) -> Result<String, String> {
    if z > 19 || x >= (1u32 << z) || y >= (1u32 << z) {
        return Err("地图瓦片坐标无效。".into());
    }
    let _guard = DOWNLOAD.lock().map_err(|e| e.to_string())?;
    let folder = root
        .join("map-tiles")
        .join(z.to_string())
        .join(x.to_string());
    let path = folder.join(format!("{y}.png"));
    let fresh = fs::metadata(&path)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.elapsed().ok())
        .is_some_and(|age| age < Duration::from_secs(7 * 86400));
    let bytes = if fresh {
        fs::read(&path).map_err(|e| e.to_string())?
    } else {
        let client = CLIENT.get_or_init(|| {
            reqwest::blocking::Client::builder()
                .user_agent("POV-Overlay/0.1 (studio.pov-overlay.desktop)")
                .timeout(Duration::from_secs(20))
                .build()
                .expect("HTTP client")
        });
        let response = client
            .get(format!("https://tile.openstreetmap.org/{z}/{x}/{y}.png"))
            .send()
            .map_err(|e| format!("地图连接失败：{e}"))?
            .error_for_status()
            .map_err(|e| format!("地图请求失败：{e}"))?;
        let mut bytes = Vec::new();
        response
            .take(4 * 1024 * 1024 + 1)
            .read_to_end(&mut bytes)
            .map_err(|e| e.to_string())?;
        if bytes.len() > 4 * 1024 * 1024 || !bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
            return Err("地图瓦片无效。".into());
        }
        fs::create_dir_all(&folder).map_err(|e| e.to_string())?;
        let temp = path.with_extension(format!("{}.tmp", std::process::id()));
        fs::write(&temp, &bytes)
            .and_then(|()| fs::rename(&temp, &path))
            .map_err(|e| e.to_string())?;
        bytes
    };
    Ok(format!("data:image/png;base64,{}", STANDARD.encode(bytes)))
}
