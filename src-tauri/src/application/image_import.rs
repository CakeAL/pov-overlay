pub use crate::domain::image::ImageAsset;
use std::path::Path;
pub fn import_image(path: &Path) -> Result<ImageAsset, String> {
    crate::infrastructure::images::read_image(path)
}
