use super::tile_cache::{self, TileSource};
use std::path::Path;
pub struct TerrainImage {
    pub rgba: Vec<u8>,
    pub width: u32,
    pub height: u32,
}
pub fn load(root: &Path, z: u8, x: u32, y: u32) -> Result<TerrainImage, String> {
    let bytes = tile_cache::load(root, TileSource::Mapterhorn, z, x, y)?;
    let image = image::load_from_memory(&bytes)
        .map_err(|e| e.to_string())?
        .to_rgba8();
    if image.width() != 512 || image.height() != 512 {
        return Err("海拔瓦片尺寸无效。".into());
    }
    Ok(TerrainImage {
        width: image.width(),
        height: image.height(),
        rgba: image.into_raw(),
    })
}
