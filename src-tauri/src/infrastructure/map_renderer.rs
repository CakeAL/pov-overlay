use std::{time::Duration, vec};

use crate::domain::track::Sample;
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
use std::io::Cursor;

pub async fn render_map(sample: &Sample) -> Result<Vec<u8>> {
    let geometry = Geometry::new(Value::Point(vec![sample.longitude, sample.latitude]));
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
    let mut encoded = Cursor::new(Vec::new());
    buffer.write_to(&mut encoded, image::ImageFormat::Png)?;
    Ok(encoded.into_inner())
}
