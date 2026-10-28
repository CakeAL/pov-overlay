use serde::{Deserialize, Serialize};
#[derive(Clone, Deserialize, Serialize)]
#[serde(default, rename_all = "camelCase")]
pub struct AppSettings {
    pub default_map_provider: String,
    pub map_debounce_ms: u64,
    pub map_concurrent_requests: usize,
    pub amap_min_interval_ms: u64,
    pub location_refresh_seconds: f64,
    pub amap_cache_days: u64,
    pub cache_limit_mb: u64,
}
impl Default for AppSettings {
    fn default() -> Self {
        Self {
            default_map_provider: "osm".into(),
            map_debounce_ms: 180,
            map_concurrent_requests: 2,
            amap_min_interval_ms: 500,
            location_refresh_seconds: 5.0,
            amap_cache_days: 30,
            cache_limit_mb: 512,
        }
    }
}
impl AppSettings {
    pub fn validate(&self) -> Result<(), String> {
        if !["osm", "amap"].contains(&self.default_map_provider.as_str())
            || !(50..=1500).contains(&self.map_debounce_ms)
            || !(1..=4).contains(&self.map_concurrent_requests)
            || !(250..=5000).contains(&self.amap_min_interval_ms)
            || !self.location_refresh_seconds.is_finite()
            || !(1.0..=300.0).contains(&self.location_refresh_seconds)
            || !(1..=365).contains(&self.amap_cache_days)
            || !(64..=8192).contains(&self.cache_limit_mb)
        {
            return Err("应用设置超出允许范围。".into());
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn old_settings_default_to_five_second_address_sampling() {
        let settings: AppSettings = serde_json::from_str(r#"{"amapMinIntervalMs":750}"#).unwrap();
        assert_eq!(settings.location_refresh_seconds, 5.0);
        assert_eq!(settings.amap_min_interval_ms, 750);
        assert!(settings.validate().is_ok());
        let saved = serde_json::to_value(&settings).unwrap();
        assert_eq!(saved["locationRefreshSeconds"], 5.0);
    }

    #[test]
    fn address_sampling_accepts_one_to_three_hundred_seconds() {
        for value in [1.0, 1.5, 5.0, 300.0] {
            let settings = AppSettings {
                location_refresh_seconds: value,
                ..Default::default()
            };
            assert!(settings.validate().is_ok());
        }
        for value in [0.99, 300.1, f64::NAN, f64::INFINITY] {
            let settings = AppSettings {
                location_refresh_seconds: value,
                ..Default::default()
            };
            assert!(settings.validate().is_err());
        }
    }
}
