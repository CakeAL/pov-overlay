use crate::domain::{alignment::parse_recording_time, video::VideoTiming};
use serde_json::Value;
use std::{
    path::{Path, PathBuf},
    process::Command,
};
fn ffprobe_path() -> Option<PathBuf> {
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

fn metadata_from_probe(value: &Value) -> (Option<i64>, Option<String>, f64) {
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
            return (Some(timestamp), Some(source.to_owned()), duration);
        }
    }
    (None, None, duration)
}

pub fn probe(path: &Path) -> VideoTiming {
    let Some(executable) = ffprobe_path() else {
        return VideoTiming::default();
    };
    let Ok(output) = Command::new(executable)
  .args(["-v", "error", "-show_entries", "format=duration:format_tags=creation_time,com.apple.quicktime.creationdate:stream_tags=creation_time", "-of", "json", "-i"])
  .arg(path).output() else { return VideoTiming::default(); };
    if !output.status.success() {
        return VideoTiming::default();
    }
    let Ok(value) = serde_json::from_slice::<Value>(&output.stdout) else {
        return VideoTiming::default();
    };
    let (captured_at_ms, time_source, duration) = metadata_from_probe(&value);
    VideoTiming {
        captured_at_ms,
        time_source,
        duration,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn prefers_quicktime_recording_date_and_respects_timezone() {
        let data = serde_json::json!({"format":{"duration":"12.5","tags":{"creation_time":"2026-10-23T00:00:00Z","com.apple.quicktime.creationdate":"2026-10-24T08:00:12.500+08:00"}}});
        let (timestamp, source, duration) = metadata_from_probe(&data);
        assert_eq!(timestamp, parse_recording_time("2026-10-24T00:00:12.500Z"));
        assert!(source.unwrap().contains("QuickTime"));
        assert_eq!(duration, 12.5);
    }
    #[test]
    fn ignores_ambiguous_local_time_and_uses_stream_metadata() {
        let data = serde_json::json!({"format":{"tags":{"creation_time":"2026-10-24T08:00:00"}},"streams":[{"tags":{"creation_time":"2026-10-24T00:00:00Z"}}]});
        assert_eq!(
            metadata_from_probe(&data).0,
            parse_recording_time("2026-10-24T00:00:00Z")
        );
    }
}
