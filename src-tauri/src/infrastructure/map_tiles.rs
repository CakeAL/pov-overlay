use super::tile_cache::{self, TileSource};
use base64::{Engine, engine::general_purpose::STANDARD};
use std::path::Path;
pub fn load(root: &Path, z: u8, x: u32, y: u32) -> Result<String, String> {
    Ok(format!(
        "data:image/png;base64,{}",
        STANDARD.encode(tile_cache::load(root, TileSource::OpenStreetMap, z, x, y)?)
    ))
}
