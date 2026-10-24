use time::{OffsetDateTime, format_description::well_known::Rfc3339};
/// Offset is positive when the video starts AFTER the GPX recording starts.
pub fn alignment_offset_seconds(track_start_ms: i64, video_start_ms: i64) -> f64 {
    (video_start_ms - track_start_ms) as f64 / 1000.0
}

/// Accept only timestamps with an explicit timezone; local wall-clock metadata is ambiguous.
pub fn parse_recording_time(value: &str) -> Option<i64> {
    let value = value.trim();
    // Apple QuickTime commonly stores explicit offsets as +0800.
    let normalized;
    let bytes = value.as_bytes();
    let value = if bytes.len() >= 5 {
        let index = bytes.len() - 5;
        if matches!(bytes[index], b'+' | b'-') && bytes[index + 1..].iter().all(u8::is_ascii_digit)
        {
            normalized = format!(
                "{}:{}",
                &value[..value.len() - 2],
                &value[value.len() - 2..]
            );
            normalized.as_str()
        } else {
            value
        }
    } else {
        value
    };
    OffsetDateTime::parse(value, &Rfc3339)
        .ok()
        .map(|time| (time.unix_timestamp_nanos() / 1_000_000) as i64)
}
