use serde::Serialize;
use std::{
    collections::hash_map::DefaultHasher,
    fs,
    hash::{Hash, Hasher},
    path::{Path, PathBuf},
    sync::{
        Mutex, OnceLock, RwLock,
        atomic::{AtomicU64, AtomicUsize, Ordering},
    },
    time::Duration,
};
const FOLDERS: &[&str] = &["map-tiles", "terrain-tiles", "amap-static"];
static LOCKS: OnceLock<[Mutex<()>; 64]> = OnceLock::new();
static DISK_MUTATION: RwLock<()> = RwLock::new(());
static GENERATION: AtomicU64 = AtomicU64::new(0);
static LIMIT: AtomicU64 = AtomicU64::new(512 * 1024 * 1024);
static WRITES: AtomicUsize = AtomicUsize::new(0);
static PRUNE: Mutex<()> = Mutex::new(());
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheStats {
    pub bytes: u64,
    pub files: usize,
    pub path: String,
}
pub fn set_limit(mb: u64) {
    LIMIT.store(mb * 1024 * 1024, Ordering::Relaxed);
}
/// Fast cache reads are never held behind another location's network request.
pub fn get(
    root: &Path,
    path: &Path,
    ttl: Duration,
    valid: fn(&[u8]) -> bool,
    fetch: impl FnOnce() -> Result<Vec<u8>, String>,
) -> Result<Vec<u8>, String> {
    let generation = GENERATION.load(Ordering::SeqCst);
    let read = || {
        fs::metadata(path)
            .ok()
            .filter(|m| m.len() <= 4 * 1024 * 1024)
            .and_then(|_| fs::read(path).ok())
            .filter(|bytes| valid(bytes))
    };
    let fresh = || {
        fs::metadata(path)
            .ok()
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.elapsed().ok())
            .is_some_and(|age| age < ttl)
    };
    if fresh()
        && let Some(bytes) = read()
    {
        return Ok(bytes);
    }
    let mut hash = DefaultHasher::new();
    path.hash(&mut hash);
    let _guard = LOCKS.get_or_init(|| std::array::from_fn(|_| Mutex::new(())))
        [hash.finish() as usize % 64]
        .lock()
        .map_err(|e| e.to_string())?;
    let cached = read();
    if fresh()
        && let Some(bytes) = cached.as_ref()
    {
        return Ok(bytes.clone());
    }
    match fetch() {
        Ok(bytes) => {
            if !valid(&bytes) {
                return cached.ok_or("地图图像内容无效。".into());
            }
            let _write = DISK_MUTATION.read().map_err(|e| e.to_string())?;
            if generation == GENERATION.load(Ordering::SeqCst) {
                if let Some(folder) = path.parent() {
                    fs::create_dir_all(folder).map_err(|e| e.to_string())?;
                }
                super::documents::atomic_write_bytes(path, &bytes)?;
                if WRITES.fetch_add(1, Ordering::Relaxed).is_multiple_of(32) {
                    let root = root.to_owned();
                    std::thread::spawn(move || {
                        let _ = enforce_limit(&root);
                    });
                }
            }
            Ok(bytes)
        }
        Err(reason) => cached.ok_or(reason),
    }
}
fn entries(root: &Path) -> Vec<(PathBuf, fs::Metadata)> {
    let mut result = Vec::new();
    let mut stack: Vec<_> = FOLDERS.iter().map(|name| root.join(name)).collect();
    while let Some(folder) = stack.pop() {
        if let Ok(items) = fs::read_dir(folder) {
            for item in items.flatten() {
                let Ok(kind) = item.file_type() else {
                    continue;
                };
                if kind.is_dir() {
                    stack.push(item.path());
                } else if kind.is_file()
                    && !item.file_name().to_string_lossy().ends_with(".tmp")
                    && let Ok(meta) = item.metadata()
                {
                    result.push((item.path(), meta));
                }
            }
        }
    }
    result
}
pub fn stats(root: &Path) -> CacheStats {
    let files = entries(root);
    CacheStats {
        bytes: files.iter().map(|(_, m)| m.len()).sum(),
        files: files.len(),
        path: root.to_string_lossy().into_owned(),
    }
}
pub fn enforce_limit(root: &Path) -> Result<(), String> {
    let Ok(_guard) = PRUNE.try_lock() else {
        return Ok(());
    };
    let mut files = entries(root);
    let mut bytes: u64 = files.iter().map(|(_, m)| m.len()).sum();
    let limit = LIMIT.load(Ordering::Relaxed);
    files.sort_by_key(|(_, m)| m.modified().ok());
    for (file, meta) in files {
        if bytes <= limit {
            break;
        }
        if fs::remove_file(file).is_ok() {
            bytes = bytes.saturating_sub(meta.len());
        }
    }
    Ok(())
}
pub fn clear(root: &Path) -> Result<(), String> {
    let _clear = DISK_MUTATION.write().map_err(|e| e.to_string())?;
    GENERATION.fetch_add(1, Ordering::SeqCst);
    for folder in FOLDERS {
        let path = root.join(folder);
        if path.exists() {
            fs::remove_dir_all(path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn cache_reuses_download_and_keeps_stale_image_on_network_error() {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("map-tiles/a.png");
        let valid = |bytes: &[u8]| bytes == b"image";
        assert_eq!(
            get(root.path(), &path, Duration::from_secs(60), valid, || Ok(
                b"image".to_vec()
            ))
            .unwrap(),
            b"image"
        );
        assert_eq!(
            get(
                root.path(),
                &path,
                Duration::from_secs(60),
                valid,
                || panic!("duplicate request")
            )
            .unwrap(),
            b"image"
        );
        assert_eq!(
            get(root.path(), &path, Duration::ZERO, valid, || Err(
                "offline".into()
            ))
            .unwrap(),
            b"image"
        );
        assert_eq!(stats(root.path()).files, 1);
    }
}
