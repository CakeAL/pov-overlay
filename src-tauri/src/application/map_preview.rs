use crate::{domain::track::Sample, infrastructure::map_renderer};
use std::path::Path;

pub async fn save_map_preview(sample: &Sample, destination: &Path) -> Result<(), String> {
    let image = map_renderer::render_map(sample)
        .await
        .map_err(|error| error.to_string())?;
    std::fs::write(destination, image).map_err(|error| error.to_string())
}
