use crate::{
    domain::track::Track,
    infrastructure::{gpx, materials},
};
use std::path::Path;

pub fn import_track(path: &Path) -> Result<Track, String> {
    gpx::parse_gpx(&materials::read_gpx(path)?)
}
