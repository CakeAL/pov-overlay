use crate::{
    domain::video::VideoGpsExtraction,
    infrastructure::{documents, gpx, materials},
};
use osmo_gps_extract_gpx::{ResampleMethod, extract_gps, resample, write_gpx};
use std::path::Path;

/// Library defaults: interpolate the raw GPS samples on a fixed 2 Hz grid.
const OUTPUT_FREQUENCY_HZ: f64 = 2.0;
const MAX_GPX_BYTES: usize = 50 * 1024 * 1024;

pub fn extract(video: &Path) -> Result<VideoGpsExtraction, String> {
    let video = materials::resolve_video(video)?;
    let extraction = extract_gps(&video).map_err(extraction_error)?;
    let raw_point_count = extraction.points.len();
    let points = resample(
        &extraction.points,
        extraction.frame_rate,
        OUTPUT_FREQUENCY_HZ,
        ResampleMethod::Linear,
    )
    .map_err(|error| format!("无法处理视频 GPS 点：{error}"))?;

    let name = video
        .file_stem()
        .and_then(|value| value.to_str())
        .filter(|value| !value.is_empty())
        .unwrap_or("DJI GPS");
    let mut content = Vec::new();
    write_gpx(&mut content, &points, name).map_err(|error| format!("无法写入 GPX：{error}"))?;
    let text = String::from_utf8(content).map_err(|error| format!("无法生成 GPX 文本：{error}"))?;
    let track = gpx::parse_gpx(&text)?;

    let supported_model = extraction.is_supported_model();
    Ok(VideoGpsExtraction {
        track,
        gpx: text,
        point_count: points.len(),
        raw_point_count,
        camera_name: extraction.camera_name,
        proto_name: extraction.proto_name,
        skipped_samples: extraction.skipped_samples,
        supported_model,
    })
}

pub fn save_gpx(output: &Path, content: &str) -> Result<(), String> {
    if output
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_lowercase)
        .as_deref()
        != Some("gpx")
    {
        return Err("请选择 .gpx 文件。".into());
    }
    if content.len() > MAX_GPX_BYTES {
        return Err("GPX 文件不能超过 50 MB。".into());
    }
    documents::atomic_write(output, content).map_err(|error| format!("无法保存 GPX：{error}"))
}

fn extraction_error(error: osmo_gps_extract_gpx::Error) -> String {
    use osmo_gps_extract_gpx::Error;
    match error {
        Error::MissingMetadataTrack(_) => {
            "该视频没有 DJI GPS 元数据，仅支持 DJI Osmo Action 4/5/6 的 MP4。".into()
        }
        Error::NoGpsPoints => "该视频的 DJI 元数据没有 GPS 点，请确认拍摄时已定位。".into(),
        Error::Io(error) => format!("读取视频失败：{error}"),
        Error::InvalidMp4(reason) => format!("无法解析视频：{reason}"),
        other => format!("无法从视频提取 GPS：{other}"),
    }
}
