use base64::{Engine, engine::general_purpose::STANDARD};
use std::{path::Path, time::Duration};
pub fn configured(root: &Path) -> bool {
    super::api_keys::configured(root, "amap")
}
pub fn configure(root: &Path, key: &str) -> Result<(), String> {
    super::api_keys::save(root, "amap", Some(key))
}
pub fn load(
    root: &Path,
    cache: &Path,
    latitude: f64,
    longitude: f64,
    zoom: u8,
) -> Result<String, String> {
    if !latitude.is_finite()
        || !longitude.is_finite()
        || latitude.abs() > 85.1
        || longitude.abs() > 180.0
        || !(1..=17).contains(&zoom)
    {
        return Err("高德地图参数无效。".into());
    }
    let settings = super::app_settings::read(root)?;
    let location = format!("{longitude:.6},{latitude:.6}");
    let path = cache
        .join("amap-static")
        .join(zoom.to_string())
        .join(format!("{longitude:.6}_{latitude:.6}.image"));
    let bytes = super::cached_images::get(
        cache,
        &path,
        Duration::from_secs(settings.amap_cache_days * 86400),
        super::map_http::raster,
        || {
            let key = super::api_keys::read(root, "amap")?;
            let bytes = super::map_http::download(
                "https://restapi.amap.com/v3/staticmap",
                &[
                    ("location".into(), location),
                    ("zoom".into(), zoom.to_string()),
                    ("size".into(), "512*512".into()),
                    ("scale".into(), "1".into()),
                    ("key".into(), key),
                ],
            )?;
            if !super::map_http::raster(&bytes) {
                let info = serde_json::from_slice::<serde_json::Value>(&bytes)
                    .ok()
                    .and_then(|v| v["info"].as_str().map(str::to_owned))
                    .unwrap_or("无有效地图图像".into());
                return Err(format!("高德地图：{info}"));
            }
            Ok(bytes)
        },
    )?;
    let mime = if super::map_http::png(&bytes) {
        "png"
    } else {
        "jpeg"
    };
    Ok(format!(
        "data:image/{mime};base64,{}",
        STANDARD.encode(bytes)
    ))
}
