use crate::domain::location::{Coordinate, LocationAddress, LocationQuery, resolve_address};
use crate::infrastructure::geocoding;
use std::path::Path;
pub fn lookup(
    config: &Path,
    cache: &Path,
    query: &LocationQuery,
) -> Result<LocationAddress, String> {
    let point = Coordinate {
        latitude: query.latitude,
        longitude: query.longitude,
    };
    point.validate()?;
    if let Some(approach) = &query.approach {
        approach.validate()?;
    }
    let current = geocoding::lookup(config, cache, &point)?;
    // Do not charge an approach lookup unless the current response actually contains a junction.
    let near_intersection = current.intersections.iter().any(|i| i.distance <= 35.);
    let approach = if near_intersection {
        query
            .approach
            .as_ref()
            .map(|p| geocoding::lookup(config, cache, p))
            .transpose()?
    } else {
        None
    };
    Ok(resolve_address(&current, approach.as_ref()))
}
