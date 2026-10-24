use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ExportFormat {
    Prores4444,
    PngMov,
    H264Mp4,
}
impl ExportFormat {
    pub fn extension(self) -> &'static str {
        match self {
            Self::H264Mp4 => "mp4",
            _ => "mov",
        }
    }
}
#[derive(Debug, Clone, Copy, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ExportBackground {
    #[default]
    Transparent,
    Green,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportSettings {
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub duration_seconds: f64,
    pub format: ExportFormat,
    #[serde(default)]
    pub background: ExportBackground,
}
impl ExportSettings {
    pub fn validate(&self) -> Result<u64, String> {
        if !(64..=7680).contains(&self.width)
            || !(64..=7680).contains(&self.height)
            || u64::from(self.width) * u64::from(self.height) > 33_177_600
            || !self.width.is_multiple_of(2)
            || !self.height.is_multiple_of(2)
        {
            return Err("分辨率须为 64–7680 之间的偶数，且不超过 8K 像素总量。".into());
        }
        if !self.fps.is_finite() || !(1.0..=120.0).contains(&self.fps) {
            return Err("帧率须为 1–120 fps。".into());
        }
        if !self.duration_seconds.is_finite()
            || self.duration_seconds <= 0.0
            || self.duration_seconds > 86_400.0
        {
            return Err("导出时长须大于 0 且不超过 24 小时。".into());
        }
        if matches!(self.format, ExportFormat::H264Mp4)
            && self.background != ExportBackground::Green
        {
            return Err("H.264 MP4 不保留透明通道，请选择绿幕或 MOV 格式。".into());
        }
        Ok((self.duration_seconds * self.fps).ceil() as u64)
    }
    pub fn encoder(&self) -> &'static str {
        match self.format {
            ExportFormat::Prores4444 => "prores_ks",
            ExportFormat::PngMov => "png",
            ExportFormat::H264Mp4 => "libx264",
        }
    }
    pub fn validate_png(&self, bytes: &[u8]) -> Result<(), String> {
        let limit = u64::from(self.width) * u64::from(self.height) * 4 + 1_048_576;
        if bytes.len() < 33
            || bytes.len() as u64 > limit
            || &bytes[..8] != b"\x89PNG\r\n\x1a\n"
            || &bytes[12..16] != b"IHDR"
            || u32::from_be_bytes(bytes[16..20].try_into().unwrap()) != self.width
            || u32::from_be_bytes(bytes[20..24].try_into().unwrap()) != self.height
        {
            return Err("导出帧的 PNG 数据或尺寸无效。".into());
        }
        Ok(())
    }
}
