use std::{
    collections::hash_map::DefaultHasher,
    fs,
    hash::{Hash, Hasher},
    path::{Path, PathBuf},
};
pub fn resolve(
    root: &Path,
    source: &str,
    label: &str,
    source_path: Option<&str>,
    example_key: Option<&str>,
) -> Result<PathBuf, String> {
    if source.len() > 2 * 1024 * 1024 {
        return Err("SVG 不能超过 2 MB。".into());
    }
    if let Some(path) = source_path.map(Path::new)
        && path.is_absolute()
        && path.is_file()
        && path
            .extension()
            .is_some_and(|ext| ext.eq_ignore_ascii_case("svg"))
    {
        return Ok(path.to_owned());
    }
    let example = match example_key {
        Some("gauge") => Some((
            "speed-gauge.svg",
            include_str!("../../../ui/examples/speed-gauge.svg"),
        )),
        Some("bar") => Some((
            "speed-bar.svg",
            include_str!("../../../ui/examples/speed-bar.svg"),
        )),
        Some("ring") => Some((
            "journey-ring.svg",
            include_str!("../../../ui/examples/journey-ring.svg"),
        )),
        Some(_) => return Err("SVG 范例标识无效。".into()),
        None => None,
    };
    let (path, content) = if let Some((file, content)) = example {
        let dev = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../ui/examples")
            .join(file);
        if cfg!(debug_assertions) && dev.is_file() {
            return Ok(dev);
        }
        (root.join("svg-examples").join(file), content)
    } else {
        let mut hash = DefaultHasher::new();
        source.hash(&mut hash);
        let stem: String = label
            .chars()
            .filter(|c| !c.is_control() && !"/\\:*?\"<>|".contains(*c))
            .take(40)
            .collect();
        (
            root.join("svg-sources").join(format!(
                "{}-{:016x}.svg",
                stem.trim_start_matches('.'),
                hash.finish()
            )),
            source,
        )
    };
    fs::create_dir_all(path.parent().ok_or("SVG 目录无效。")?).map_err(|e| e.to_string())?;
    if !path.exists() {
        super::documents::atomic_write(&path, content)?;
    }
    Ok(path)
}
