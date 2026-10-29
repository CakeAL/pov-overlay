use std::{
    path::PathBuf,
    sync::{Mutex, OnceLock},
};
static CONFIGURED: OnceLock<Mutex<String>> = OnceLock::new();

pub fn configure(path: &str) {
    if let Ok(mut configured) = CONFIGURED.get_or_init(Mutex::default).lock() {
        *configured = path.trim().to_owned();
    }
}
pub fn configured() -> Option<String> {
    CONFIGURED
        .get_or_init(Mutex::default)
        .lock()
        .ok()
        .map(|path| path.clone())
        .filter(|path| !path.is_empty())
}
pub fn candidates(custom: Option<&str>) -> Vec<String> {
    if let Some(path) = custom.filter(|path| !path.is_empty()) {
        return vec![path.to_owned()];
    }
    let executable = if cfg!(windows) {
        "ffmpeg.exe"
    } else {
        "ffmpeg"
    };
    let mut paths: Vec<String> = std::env::var_os("PATH")
        .into_iter()
        .flat_map(|paths| std::env::split_paths(&paths).collect::<Vec<_>>())
        .map(|directory| directory.join(executable))
        .filter(|path| path.is_file())
        .map(|path| path.to_string_lossy().into_owned())
        .collect();
    if cfg!(target_os = "macos") {
        paths.extend([
            "/opt/homebrew/bin/ffmpeg".into(),
            "/usr/local/bin/ffmpeg".into(),
        ]);
    }
    paths.dedup();
    paths
}
pub fn sibling_probe() -> Option<PathBuf> {
    let path = PathBuf::from(configured()?);
    let probe = path.parent()?.join(if cfg!(windows) {
        "ffprobe.exe"
    } else {
        "ffprobe"
    });
    probe.is_file().then_some(probe)
}

#[cfg(test)]
mod tests {
    #[test]
    fn custom_path_takes_precedence_even_if_unavailable() {
        assert_eq!(
            super::candidates(Some("C:\\Tools with spaces\\ffmpeg.exe")),
            vec!["C:\\Tools with spaces\\ffmpeg.exe"]
        );
    }
}
