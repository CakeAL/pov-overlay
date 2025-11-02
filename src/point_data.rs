use anyhow::{Result, anyhow};
use reqwest::Client;
use slippy_map_tiles::lat_lon_to_tile;
use time::OffsetDateTime;

#[derive(Debug)]
pub struct PointData {
    pub time: OffsetDateTime,
    pub latitude: f64,
    pub longitude: f64,
    pub elevation: f64,
    pub speed: f64, // m/s
}

impl PointData {
    pub async fn get_map_tile(&self, zoom: u8) -> Result<Vec<u8>> {
        let (x, y) = lat_lon_to_tile(self.latitude as f32, self.longitude as f32, zoom);
        let url = format!("https://tile.openstreetmap.org/{}/{}/{}.png", zoom, x, y);
        let resp = Client::new().get(url).send().await?;
        if !resp.status().is_success() {
            return Err(anyhow!(
                "Download map tile error, HTTP error: {}",
                resp.status()
            ));
        }
        let bytes = resp.bytes().await?;

        Ok(bytes.to_vec())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_get_map_tile() {
        let point = PointData {
            time: OffsetDateTime::now_utc(),
            latitude: 22.139810962823983,
            longitude: 113.54563017959701,
            elevation: 0.0,
            speed: 0.0,
        };
        let data = point.get_map_tile(16).await.unwrap();
        std::fs::write("test_tile.png", &data).unwrap();
    }
}
