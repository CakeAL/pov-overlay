use crate::domain::{alignment::parse_recording_time, video::VideoTiming};
use serde_json::Value;
use std::{
    path::{Path, PathBuf},
    process::Command,
};
fn ffprobe_path() -> Option<PathBuf> {
    if let Some(path) = crate::infrastructure::ffmpeg::sibling_probe() {
        return Some(path);
    }
    let executable = if cfg!(windows) {
        "ffprobe.exe"
    } else {
        "ffprobe"
    };
    std::env::var_os("PATH")
        .into_iter()
        .flat_map(|paths| std::env::split_paths(&paths).collect::<Vec<_>>())
        .map(|directory| directory.join(executable))
        .chain([
            PathBuf::from("/opt/homebrew/bin/ffprobe"),
            PathBuf::from("/usr/local/bin/ffprobe"),
        ])
        .find(|path| path.is_file())
}

fn parse_frame_rate(text: &str) -> Option<f64> {
    let (numerator, denominator) = text.split_once('/').unwrap_or((text, "1"));
    let numerator = numerator.trim().parse::<f64>().ok()?;
    let denominator = denominator.trim().parse::<f64>().ok()?;
    (numerator.is_finite() && denominator.is_finite() && numerator > 0.0 && denominator > 0.0)
        .then_some(numerator / denominator)
}

fn frame_rate(value: &Value) -> Option<f64> {
    value["streams"].as_array()?.iter().find_map(|stream| {
        if stream["codec_type"].as_str() != Some("video") {
            return None;
        }
        ["avg_frame_rate", "r_frame_rate"]
            .iter()
            .find_map(|key| stream[*key].as_str().and_then(parse_frame_rate))
    })
}

fn metadata_from_probe(value: &Value) -> (Option<i64>, Option<String>, f64, Option<f64>) {
    let format = &value["format"];
    let duration = format["duration"]
        .as_str()
        .and_then(|text| text.parse::<f64>().ok())
        .filter(|value| value.is_finite() && *value >= 0.0)
        .unwrap_or(0.0);
    let mut candidates = vec![
        (
            &format["tags"]["com.apple.quicktime.creationdate"],
            "QuickTime 拍摄时间",
        ),
        (
            &format["tags"]["creation_time"],
            "视频 creation_time（UTC）",
        ),
    ];
    if let Some(streams) = value["streams"].as_array() {
        for stream in streams {
            candidates.push((
                &stream["tags"]["creation_time"],
                "视频流 creation_time（UTC）",
            ));
        }
    }
    for (raw, source) in candidates {
        if let Some(timestamp) = raw
            .as_str()
            .and_then(parse_recording_time)
            .filter(|time| *time >= 0)
        {
            return (
                Some(timestamp),
                Some(source.to_owned()),
                duration,
                frame_rate(value),
            );
        }
    }
    (None, None, duration, frame_rate(value))
}

pub fn probe(path: &Path) -> VideoTiming {
    let Some(executable) = ffprobe_path() else {
        return VideoTiming::default();
    };
    let Ok(output) = Command::new(executable)
  .args(["-v", "error", "-show_entries", "format=duration:format_tags=creation_time,com.apple.quicktime.creationdate:stream=codec_type,avg_frame_rate,r_frame_rate:stream_tags=creation_time", "-of", "json", "-i"])
  .arg(path).output() else { return VideoTiming::default(); };
    if !output.status.success() {
        return VideoTiming::default();
    }
    let Ok(value) = serde_json::from_slice::<Value>(&output.stdout) else {
        return VideoTiming::default();
    };
    let (captured_at_ms, time_source, duration, fps) = metadata_from_probe(&value);
    VideoTiming {
        captured_at_ms,
        time_source,
        duration,
        fps,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn prefers_quicktime_recording_date_and_respects_timezone() {
        let data = serde_json::json!({"format":{"duration":"12.5","tags":{"creation_time":"2026-10-23T00:00:00Z","com.apple.quicktime.creationdate":"2026-10-24T08:00:12.500+08:00"}}});
        let (timestamp, source, duration, fps) = metadata_from_probe(&data);
        assert_eq!(timestamp, parse_recording_time("2026-10-24T00:00:12.500Z"));
        assert!(source.unwrap().contains("QuickTime"));
        assert_eq!(duration, 12.5);
        assert_eq!(fps, None);
    }
    #[test]
    fn ignores_ambiguous_local_time_and_uses_stream_metadata() {
        let data = serde_json::json!({"format":{"tags":{"creation_time":"2026-10-24T08:00:00"}},"streams":[{"codec_type":"video","avg_frame_rate":"30000/1001","r_frame_rate":"30000/1001","tags":{"creation_time":"2026-10-24T00:00:00Z"}}]});
        let (timestamp, _, _, fps) = metadata_from_probe(&data);
        assert_eq!(timestamp, parse_recording_time("2026-10-24T00:00:00Z"));
        assert!((fps.unwrap() - 29.970_029).abs() < 1e-6);
    }
    #[test]
    fn reads_integer_and_fractional_frame_rates_and_ignores_invalid_ones() {
        for (text, expected) in [
            ("6/1", Some(6.0)),
            ("25", Some(25.0)),
            ("0/0", None),
            ("30000/0", None),
        ] {
            assert_eq!(parse_frame_rate(text), expected);
        }
        let data = serde_json::json!({"streams":[
            {"codec_type":"audio","avg_frame_rate":"48000/1"},
            {"codec_type":"video","avg_frame_rate":"0/0","r_frame_rate":"6/1"}
        ]});
        assert_eq!(frame_rate(&data), Some(6.0));
    }
}
