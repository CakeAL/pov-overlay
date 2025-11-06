use std::{time::Duration, vec};

use anyhow::Result;
use galileo::{
    Map, MapView, Messenger, TileSchema,
    galileo_types::{cartesian::Size, geo::Crs},
    layer::{FeatureLayer, raster_tile_layer::RasterTileLayerBuilder},
    render::WgpuRenderer,
    symbol::ArbitraryGeometrySymbol,
};
use geojson::{Feature, Geometry, Value};
use image::{ImageBuffer, Rgba};
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
    pub async fn get_map_tile(&self) -> Result<Vec<u8>> {
        let geometry = Geometry::new(Value::Point(vec![self.longitude, self.latitude]));
        let symbol = ArbitraryGeometrySymbol::default();
        let feature = Feature {
            geometry: Some(geometry),
            properties: None,
            bbox: None,
            id: None,
            foreign_members: None,
        };
        let layer = FeatureLayer::new(vec![feature], symbol, Crs::WGS84);

        let center = layer.extent_projected(&Crs::EPSG3857).unwrap().center();

        let image_size = Size::new(256, 256);
        let resolution = TileSchema::web(18)
            .lod_resolution(16)
            .expect("invalid tile schema");

        let mut osm = RasterTileLayerBuilder::new_osm()
            .with_file_cache_checked(".tile_cache")
            .build()
            .expect("Failed to create OSM layer");

        osm.set_fade_in_duration(Duration::default());

        let map_view = MapView::new_projected(&center, resolution).with_size(image_size.cast());

        osm.load_tiles(&map_view).await;

        let map = Map::new(
            map_view,
            vec![Box::new(osm), Box::new(layer)],
            None::<Box<dyn Messenger>>,
        );

        let renderer = WgpuRenderer::new_with_texture_rt(image_size)
            .await
            .expect("Failed to create renderer");
        renderer.render(&map).expect("Failed to render");
        let bitmap = renderer.get_image().await?;
        let buffer =
            ImageBuffer::<Rgba<u8>, _>::from_raw(image_size.width(), image_size.height(), bitmap)
                .expect("failed to read bitmap");
        buffer.save("output_map.png")?;
        Ok(vec![])
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
        let data = point.get_map_tile().await.unwrap();
        std::fs::write("test_tile.png", &data).unwrap();
    }
}
