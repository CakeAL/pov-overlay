use crate::{
    domain::video::VideoGpsExport,
    infrastructure::{documents, materials},
};
use osmo_gps_extract_gpx::{ResampleMethod, extract_gps, resample, write_gpx};
use std::path::Path;

/// Library defaults: interpolate the raw GPS samples on a fixed 2 Hz grid.
const OUTPUT_FREQUENCY_HZ: f64 = 2.0;

pub fn export_gpx(video: &Path, output: &Path) -> Result<VideoGpsExport, String> {
    if output
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_lowercase)
        .as_deref()
        != Some("gpx")
    {
        return Err("请选择 .gpx 文件。".into());
    }
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
    documents::atomic_write_bytes(output, &content)
        .map_err(|error| format!("无法保存 GPX：{error}"))?;

    let supported_model = extraction.is_supported_model();
    Ok(VideoGpsExport {
        gpx_path: output.to_string_lossy().into_owned(),
        point_count: points.len(),
        raw_point_count,
        camera_name: extraction.camera_name,
        proto_name: extraction.proto_name,
        skipped_samples: extraction.skipped_samples,
        supported_model,
    })
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
