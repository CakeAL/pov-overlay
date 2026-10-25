use std::{path::Path, time::Duration};
#[derive(Clone, Copy)]
pub enum TileSource {
    OpenStreetMap,
    Mapterhorn,
}
pub fn load(root: &Path, source: TileSource, z: u8, x: u32, y: u32) -> Result<Vec<u8>, String> {
    let (folder, extension, max_zoom, days, url) = match source {
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
    super::cached_resources::get(
        root,
        &path,
        Duration::from_secs(days * 86400),
        valid,
        || super::map_http::download(&url, &[]),
    )
}
