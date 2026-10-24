use serde::Deserialize;
#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ElevationCoordinate {
    pub latitude: f64,
    pub longitude: f64,
}
pub fn tile_fraction(point: &ElevationCoordinate, zoom: u8) -> Result<(f64, f64), String> {
    if zoom > 12
        || !point.latitude.is_finite()
        || !point.longitude.is_finite()
        || point.latitude.abs() > 90.0
        || point.longitude.abs() > 180.0
    {
        return Err("海拔采样坐标无效。".into());
    }
    let latitude = point.latitude.clamp(-85.05112878, 85.05112878).to_radians();
    let n = (1u32 << zoom) as f64;
    let x = ((point.longitude + 180.0) / 360.0 * n).rem_euclid(n);
    let y = ((1.0 - latitude.tan().asinh() / std::f64::consts::PI) / 2.0 * n).clamp(0.0, n - 1e-9);
    Ok((x, y))
}
/// Terrarium metres: R * 256 + G + B / 256 - 32768, bilinearly sampled.
pub fn sample(rgba: &[u8], width: u32, height: u32, u: f64, v: f64) -> Option<f64> {
    if width == 0
        || height == 0
        || rgba.len() != width as usize * height as usize * 4
        || !u.is_finite()
        || !v.is_finite()
    {
        return None;
    }
    let x = (u * width as f64).clamp(0.0, (width - 1) as f64);
    let y = (v * height as f64).clamp(0.0, (height - 1) as f64);
    let x0 = x.floor() as u32;
    let y0 = y.floor() as u32;
    let x1 = (x0 + 1).min(width - 1);
    let y1 = (y0 + 1).min(height - 1);
    let dx = x - x0 as f64;
    let dy = y - y0 as f64;
    let mut result = 0.0;
    for (px, py, weight) in [
        (x0, y0, (1.0 - dx) * (1.0 - dy)),
        (x1, y0, dx * (1.0 - dy)),
        (x0, y1, (1.0 - dx) * dy),
        (x1, y1, dx * dy),
    ] {
        if weight == 0.0 {
            continue;
        }
        let i = ((py * width + px) * 4) as usize;
        if rgba[i + 3] == 0 {
            return None;
        }
        let value =
            rgba[i] as f64 * 256.0 + rgba[i + 1] as f64 + rgba[i + 2] as f64 / 256.0 - 32768.0;
        if !(-12000.0..=10000.0).contains(&value) {
            return None;
        }
        result += value * weight;
    }
    Some(result)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn terrarium_preserves_zero_and_interpolates_without_turning_missing_into_zero() {
        let mut pixels = vec![
            128, 0, 0, 255, 128, 10, 0, 255, 128, 20, 0, 255, 128, 30, 0, 255,
        ];
        assert_eq!(sample(&pixels, 2, 2, 0.0, 0.0), Some(0.0));
        assert_eq!(sample(&pixels, 2, 2, 0.25, 0.25), Some(15.0));
        pixels[3] = 0;
        assert_eq!(sample(&pixels, 2, 2, 0.25, 0.25), None);
        assert_eq!(sample(&pixels, 2, 2, 1.0, 1.0), Some(30.0));
    }
}
