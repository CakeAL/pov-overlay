use std::{
    fs,
    io::Read,
    path::Path,
    sync::{Mutex, OnceLock},
    time::Duration,
};
static DOWNLOAD: Mutex<()> = Mutex::new(());
static CLIENT: OnceLock<reqwest::blocking::Client> = OnceLock::new();
#[derive(Clone, Copy)]
pub enum TileSource {
    OpenStreetMap,
    Mapterhorn,
}
pub fn load(root: &Path, source: TileSource, z: u8, x: u32, y: u32) -> Result<Vec<u8>, String> {
    let (folder_name, extension, max_zoom, days, url) = match source {
        TileSource::OpenStreetMap => (
            "map-tiles",
            "png",
            19,
            7,
            format!("https://tile.openstreetmap.org/{z}/{x}/{y}.png"),
        ),
        TileSource::Mapterhorn => (
            "terrain-tiles",
            "webp",
            12,
            30,
            format!("https://tiles.mapterhorn.com/{z}/{x}/{y}.webp"),
        ),
    };
    if z > max_zoom || x >= (1u32 << z) || y >= (1u32 << z) {
        return Err("瓦片坐标无效。".into());
    }
    let _guard = DOWNLOAD.lock().map_err(|e| e.to_string())?;
    let folder = root
        .join(folder_name)
        .join(z.to_string())
        .join(x.to_string());
    let path = folder.join(format!("{y}.{extension}"));
    let cached = fs::read(&path).ok().filter(|bytes| valid(bytes, source));
    let fresh = fs::metadata(&path)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.elapsed().ok())
        .is_some_and(|age| age < Duration::from_secs(days * 86400));
    if fresh && let Some(bytes) = cached.as_ref() {
        return Ok(bytes.clone());
    }
    let fetch = || -> Result<Vec<u8>, String> {
        let client = CLIENT.get_or_init(|| {
            reqwest::blocking::Client::builder()
                .user_agent("POV-Overlay/0.1 (studio.pov-overlay.desktop)")
                .timeout(Duration::from_secs(20))
                .build()
                .expect("HTTP client")
        });
        let response = client
            .get(url)
            .send()
            .map_err(|e| format!("瓦片连接失败：{e}"))?
            .error_for_status()
            .map_err(|e| format!("瓦片请求失败：{e}"))?;
        let mut bytes = Vec::new();
        response
            .take(4 * 1024 * 1024 + 1)
            .read_to_end(&mut bytes)
            .map_err(|e| e.to_string())?;
        if !valid(&bytes, source) {
            return Err("瓦片内容无效。".into());
        }
        fs::create_dir_all(&folder).map_err(|e| e.to_string())?;
        let temp = path.with_extension(format!("{}.tmp", std::process::id()));
        let result = fs::write(&temp, &bytes).and_then(|()| fs::rename(&temp, &path));
        if result.is_err() {
            let _ = fs::remove_file(&temp);
        }
        result.map_err(|e| e.to_string())?;
        Ok(bytes)
    };
    fetch().or_else(|error| cached.ok_or(error))
}
fn valid(bytes: &[u8], source: TileSource) -> bool {
    if bytes.len() > 4 * 1024 * 1024 {
        return false;
    }
    match source {
        TileSource::OpenStreetMap => bytes.starts_with(b"\x89PNG\r\n\x1a\n"),
        TileSource::Mapterhorn => bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP"),
    }
}
