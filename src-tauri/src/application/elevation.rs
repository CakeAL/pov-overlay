use crate::{
    domain::terrain::{self, ElevationCoordinate},
    infrastructure,
};
use std::path::Path;
pub fn sample_tile(
    root: &Path,
    z: u8,
    x: u32,
    y: u32,
    points: &[ElevationCoordinate],
) -> Result<Vec<Option<f64>>, String> {
    if points.is_empty() || points.len() > 4096 || z != 12 {
        return Err("海拔采样请求无效。".into());
    }
    let fractions = points
        .iter()
        .map(|point| {
            let (tx, ty) = terrain::tile_fraction(point, z)?;
            if tx.floor() as u32 != x || ty.floor() as u32 != y {
                return Err("采样点不属于当前海拔瓦片。".into());
            }
            Ok((tx.fract(), ty.fract()))
        })
        .collect::<Result<Vec<_>, String>>()?;
    let image = infrastructure::terrain::load(root, z, x, y)?;
    Ok(fractions
        .into_iter()
        .map(|(u, v)| terrain::sample(&image.rgba, image.width, image.height, u, v))
        .collect())
}
