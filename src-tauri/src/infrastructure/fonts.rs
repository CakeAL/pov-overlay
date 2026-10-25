/// Ask the platform font system (CoreText / DirectWrite / Fontconfig), including user fonts.
pub fn families() -> Result<Vec<String>, String> {
    let mut names = font_kit::source::SystemSource::new()
        .all_families()
        .map_err(|e| format!("无法读取系统字体：{e}"))?;
    names.retain(|name| {
        !name.trim().is_empty()
            && name.chars().count() <= 256
            && !name.chars().any(char::is_control)
    });
    names.sort();
    names.dedup();
    Ok(names)
}
