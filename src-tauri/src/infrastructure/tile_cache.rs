use std::{path::Path, time::Duration};
#[derive(Clone, Copy)]
pub enum TileSource {
    OpenStreetMap,
    Mapterhorn,
    CartoLight,
    CartoDark,
    CartoVoyager,
}
pub fn load(root: &Path, source: TileSource, z: u8, x: u32, y: u32) -> Result<Vec<u8>, String> {
    load_with_keys(root, None, source, z, x, y)
}
pub fn load_with_keys(
    root: &Path,
    config: Option<&Path>,
    source: TileSource,
    z: u8,
    x: u32,
    y: u32,
) -> Result<Vec<u8>, String> {
    let (folder, extension, max_zoom, days, url, carto) = match source {
        TileSource::OpenStreetMap => (
            "map-tiles",
            "png",
            19,
            7,
            format!("https://tile.openstreetmap.org/{z}/{x}/{y}.png"),
            false,
        ),
        TileSource::Mapterhorn => (
            "terrain-tiles",
            "webp",
            12,
            30,
            format!("https://tiles.mapterhorn.com/{z}/{x}/{y}.webp"),
            false,
        ),
        TileSource::CartoLight => (
            "carto-light",
            "png",
            20,
            7,
            format!("https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png"),
            true,
        ),
        TileSource::CartoDark => (
            "carto-dark",
            "png",
            20,
            7,
            format!("https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png"),
            true,
        ),
        TileSource::CartoVoyager => (
            "carto-voyager",
            "png",
            20,
            7,
            format!("https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"),
            true,
        ),
    };
    if z > max_zoom || x >= (1u32 << z) || y >= (1u32 << z) {
        return Err("瓦片坐标无效。".into());
    }
    let path = root
        .join(folder)
        .join(z.to_string())
        .join(x.to_string())
        .join(format!("{y}.{extension}"));
    let valid: fn(&[u8]) -> bool = if matches!(source, TileSource::Mapterhorn) {
        |bytes| bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP")
    } else {
        super::map_http::png
    };
    super::cached_images::get(
        root,
        &path,
        Duration::from_secs(days * 86400),
        valid,
        || {
            let query = if carto {
                vec![(
                    "key".into(),
                    super::api_keys::read(config.ok_or("请在设置配置 CARTO API Key。")?, "carto")?,
                )]
            } else {
                vec![]
            };
            super::map_http::download(&url, &query)
        },
    )
}
