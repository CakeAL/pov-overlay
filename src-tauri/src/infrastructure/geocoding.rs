use crate::domain::location::{Coordinate, Intersection, LocationAddress, ReverseLocation, Road};
use serde_json::Value;
use std::{
    path::Path,
    sync::Mutex,
    time::{Duration, Instant},
};
static LAST_REQUEST: Mutex<Option<Instant>> = Mutex::new(None);
fn text(value: &Value) -> String {
    value
        .as_str()
        .unwrap_or("")
        .trim()
        .chars()
        .take(128)
        .collect()
}
fn distance(value: &Value) -> f64 {
    value
        .as_f64()
        .or_else(|| value.as_str().and_then(|s| s.parse().ok()))
        .filter(|v| v.is_finite() && *v >= 0.)
        .unwrap_or(f64::INFINITY)
}
fn valid(bytes: &[u8]) -> bool {
    serde_json::from_slice::<Value>(bytes)
        .is_ok_and(|v| v["status"] == "1" && v["regeocode"].is_object())
}
fn parse(bytes: &[u8]) -> Result<ReverseLocation, String> {
    let value: Value = serde_json::from_slice(bytes).map_err(|_| "地址响应无法解析。")?;
    if !valid(bytes) {
        return Err(format!("高德地址查询：{}", text(&value["info"])));
    }
    let result = &value["regeocode"];
    let parts = &result["addressComponent"];
    let roads = result["roads"]
        .as_array()
        .map(|v| {
            v.iter()
                .map(|r| Road {
                    id: text(&r["id"]),
                    name: text(&r["name"]),
                    distance: distance(&r["distance"]),
                })
                .collect()
        })
        .unwrap_or_default();
    let intersections = result["roadinters"]
        .as_array()
        .map(|v| {
            v.iter()
                .map(|r| Intersection {
                    distance: distance(&r["distance"]),
                    roads: [
                        Road {
                            id: text(&r["first_id"]),
                            name: text(&r["first_name"]),
                            distance: 0.,
                        },
                        Road {
                            id: text(&r["second_id"]),
                            name: text(&r["second_name"]),
                            distance: 0.,
                        },
                    ],
                })
                .collect()
        })
        .unwrap_or_default();
    Ok(ReverseLocation {
        address: LocationAddress {
            province: text(&parts["province"]),
            city: text(&parts["city"]),
            district: text(&parts["district"]),
            street: text(&parts["township"]),
            road: text(&parts["streetNumber"]["street"]),
        },
        roads,
        intersections,
    })
}
pub fn lookup(
    config: &Path,
    cache: &Path,
    coordinate: &Coordinate,
) -> Result<ReverseLocation, String> {
    coordinate.validate()?;
    let point = coordinate.gcj02();
    let path = cache
        .join("amap-address")
        .join(format!("{:.6}_{:.6}.json", point.longitude, point.latitude));
    let bytes =
        super::cached_resources::get(cache, &path, Duration::from_secs(30 * 86400), valid, || {
            let key = super::api_keys::read(config, "amap")?;
            let interval =
                Duration::from_millis(super::app_settings::read(config)?.amap_min_interval_ms);
            {
                let mut last = LAST_REQUEST.lock().map_err(|e| e.to_string())?;
                if let Some(time) = *last {
                    std::thread::sleep(interval.saturating_sub(time.elapsed()));
                }
                *last = Some(Instant::now());
            }
            let bytes = super::map_http::download(
                "https://restapi.amap.com/v3/geocode/regeo",
                &[
                    ("key".into(), key),
                    (
                        "location".into(),
                        format!("{:.6},{:.6}", point.longitude, point.latitude),
                    ),
                    ("extensions".into(), "all".into()),
                    ("radius".into(), "100".into()),
                    ("roadlevel".into(), "0".into()),
                    ("output".into(), "JSON".into()),
                ],
            )?;
            parse(&bytes)?;
            Ok(bytes)
        })?;
    parse(&bytes)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn empty_arrays_and_municipal_city_are_handled() {
        let value = parse(br#"{"status":"1","regeocode":{"addressComponent":{"province":"test","city":[],"district":[],"township":[],"streetNumber":[]},"roads":[],"roadinters":[]}}"#).unwrap();
        assert_eq!(value.address.city, "");
        assert_eq!(value.address.road, "");
        assert!(parse(br#"{"status":"0","info":"INVALID_USER_KEY"}"#).is_err());
    }
}
