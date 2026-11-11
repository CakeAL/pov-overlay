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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoGpsExport {
    pub gpx_path: String,
    pub point_count: usize,
    pub raw_point_count: usize,
    pub camera_name: String,
    pub proto_name: String,
    pub skipped_samples: usize,
    pub supported_model: bool,
}

#[derive(Default)]
pub struct VideoTiming {
    pub captured_at_ms: Option<i64>,
    pub time_source: Option<String>,
    pub duration: f64,
}
