use serde::Serialize;
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoMetadata {
    pub name: String,
    pub path: String,
    pub captured_at_ms: Option<i64>,
    pub time_source: Option<String>,
    pub warning: Option<String>,
    pub duration: f64,
}

#[derive(Default)]
pub struct VideoTiming {
    pub captured_at_ms: Option<i64>,
    pub time_source: Option<String>,
    pub duration: f64,
}
