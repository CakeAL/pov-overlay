use serde::{Deserialize, Serialize};
#[derive(Clone, Deserialize, Serialize)]
#[serde(default, rename_all = "camelCase")]
pub struct AppSettings {
    pub default_map_provider: String,
    pub map_debounce_ms: u64,
    pub map_concurrent_requests: usize,
    pub amap_min_interval_ms: u64,
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
            || !(1..=365).contains(&self.amap_cache_days)
            || !(64..=8192).contains(&self.cache_limit_mb)
        {
            return Err("应用设置超出允许范围。".into());
        }
        Ok(())
    }
}
