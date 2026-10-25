use serde::{Deserialize, Serialize};
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocationQuery {
    pub latitude: f64,
    pub longitude: f64,
    pub approach: Option<Coordinate>,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Coordinate {
    pub latitude: f64,
    pub longitude: f64,
}
impl Coordinate {
    pub fn validate(&self) -> Result<(), String> {
        if !self.latitude.is_finite()
            || !self.longitude.is_finite()
            || self.latitude.abs() > 85.05113
            || self.longitude.abs() > 180.
        {
            return Err("地址查询坐标无效。".into());
        }
        Ok(())
    }
    pub fn gcj02(&self) -> Self {
        let (lat, lon) = (self.latitude, self.longitude);
        if !(72.004..=137.8347).contains(&lon) || !(0.8293..=55.8271).contains(&lat) {
            return self.clone();
        }
        let pi = std::f64::consts::PI;
        let (x, y) = (lon - 105., lat - 35.);
        let common = (20. * (6. * x * pi).sin() + 20. * (2. * x * pi).sin()) * 2. / 3.;
        let mut a =
            -100. + 2. * x + 3. * y + 0.2 * y * y + 0.1 * x * y + 0.2 * x.abs().sqrt() + common;
        a += (20. * (y * pi).sin() + 40. * (y * pi / 3.).sin()) * 2. / 3.
            + (160. * (y * pi / 12.).sin() + 320. * (y * pi / 30.).sin()) * 2. / 3.;
        let mut b = 300. + x + 2. * y + 0.1 * x * x + 0.1 * x * y + 0.1 * x.abs().sqrt() + common;
        b += (20. * (x * pi).sin() + 40. * (x * pi / 3.).sin()) * 2. / 3.
            + (150. * (x * pi / 12.).sin() + 300. * (x * pi / 30.).sin()) * 2. / 3.;
        let rad = lat * pi / 180.;
        let magic = 1. - 0.006693421622965943 * rad.sin().powi(2);
        let root = magic.sqrt();
        Self {
            latitude: lat
                + a * 180. / ((6378245. * (1. - 0.006693421622965943) / (magic * root)) * pi),
            longitude: lon + b * 180. / ((6378245. / root * rad.cos()) * pi),
        }
    }
}
#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq)]
pub struct LocationAddress {
    pub province: String,
    pub city: String,
    pub district: String,
    pub street: String,
    pub road: String,
}
#[derive(Clone, Debug, Default)]
pub struct Road {
    pub id: String,
    pub name: String,
    pub distance: f64,
}
#[derive(Clone, Debug)]
pub struct Intersection {
    pub distance: f64,
    pub roads: [Road; 2],
}
#[derive(Clone, Debug, Default)]
pub struct ReverseLocation {
    pub address: LocationAddress,
    pub roads: Vec<Road>,
    pub intersections: Vec<Intersection>,
}
fn nearest(roads: &[Road]) -> Option<&Road> {
    roads
        .iter()
        .filter(|r| {
            !r.name.is_empty() && r.distance.is_finite() && (0. ..=100.).contains(&r.distance)
        })
        .min_by(|a, b| a.distance.total_cmp(&b.distance))
}
fn same(a: &Road, b: &Road) -> bool {
    (!a.id.is_empty() && a.id == b.id) || (!a.name.is_empty() && a.name == b.name)
}
/// Seek-safe: use an earlier coordinate from the same continuous track, never playback history.
pub fn resolve_address(
    current: &ReverseLocation,
    approach: Option<&ReverseLocation>,
) -> LocationAddress {
    let mut address = current.address.clone();
    let mut road = nearest(&current.roads);
    if let Some(incoming) = approach.and_then(|p| nearest(&p.roads)) {
        let crossing = current
            .intersections
            .iter()
            .any(|i| i.distance <= 35. && i.roads.iter().any(|r| same(r, incoming)));
        if crossing && incoming.distance <= 40. {
            road = current
                .roads
                .iter()
                .find(|r| same(r, incoming) && r.distance <= 60.)
                .or_else(|| {
                    current
                        .intersections
                        .iter()
                        .filter(|i| i.distance <= 35.)
                        .flat_map(|i| &i.roads)
                        .find(|r| same(r, incoming))
                });
        }
    }
    if let Some(road) = road {
        address.road = road.name.clone();
    }
    if address.city.is_empty()
        && ["北京市", "上海市", "天津市", "重庆市"].contains(&address.province.as_str())
    {
        address.city = address.province.clone();
    }
    address
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn intersection_keeps_incoming_road_and_switches_after_leaving() {
        let incoming = Road {
            id: "a".into(),
            name: "来向路".into(),
            distance: 2.,
        };
        let cross = Road {
            id: "b".into(),
            name: "交叉路".into(),
            distance: 1.,
        };
        let approach = ReverseLocation {
            roads: vec![incoming.clone()],
            ..Default::default()
        };
        let mut current = ReverseLocation {
            roads: vec![
                cross.clone(),
                Road {
                    distance: 12.,
                    ..incoming.clone()
                },
            ],
            intersections: vec![Intersection {
                distance: 8.,
                roads: [incoming, cross],
            }],
            ..Default::default()
        };
        assert_eq!(resolve_address(&current, Some(&approach)).road, "来向路");
        current.intersections[0].distance = 50.;
        assert_eq!(resolve_address(&current, Some(&approach)).road, "交叉路");
        let coordinate = Coordinate {
            latitude: 31.2304,
            longitude: 121.4737,
        }
        .gcj02();
        assert!((coordinate.longitude - 121.478223).abs() < 0.00001);
        assert!((coordinate.latitude - 31.228458).abs() < 0.00001);
    }
}
