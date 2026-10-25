use super::tile_cache::{self, TileSource};
use base64::{Engine, engine::general_purpose::STANDARD};
use std::path::Path;
pub fn load_source(
    root: &Path,
    config: &Path,
    provider: &str,
    z: u8,
    x: u32,
    y: u32,
) -> Result<String, String> {
    let source = match provider {
        "osm" => TileSource::OpenStreetMap,
        "cartoLight" => TileSource::CartoLight,
        "cartoDark" => TileSource::CartoDark,
        "cartoVoyager" => TileSource::CartoVoyager,
        _ => return Err("瓦片来源无效。".into()),
    };
    Ok(format!(
        "data:image/png;base64,{}",
        STANDARD.encode(tile_cache::load_with_keys(
            root,
            Some(config),
            source,
            z,
            x,
            y
        )?)
    ))
}
