use crate::{
    domain::overlay_export::ExportSettings,
    infrastructure::overlay_encoder::{OverlayEncoder, detect_encoder},
};
use std::{
    collections::HashMap,
    path::Path,
    sync::{
        Arc, Mutex,
        atomic::{AtomicU64, Ordering},
    },
    time::{SystemTime, UNIX_EPOCH},
};

type OwnedJobs = HashMap<String, (String, Arc<OverlayEncoder>)>;
#[derive(Clone, Default)]
pub struct ExportManager {
    jobs: Arc<Mutex<OwnedJobs>>,
}
impl ExportManager {
    pub fn start(
        &self,
        owner: &str,
        path: &Path,
        settings: ExportSettings,
        protected_video: Option<&Path>,
    ) -> Result<String, String> {
        static SERIAL: AtomicU64 = AtomicU64::new(0);
        let mut jobs = self.jobs.lock().map_err(|e| e.to_string())?;
        if jobs.values().any(|(window, _)| window == owner) {
            return Err("当前窗口已有导出任务。".into());
        }
        let info = detect_encoder()?;
        let id = format!(
            "{}-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map_err(|e| e.to_string())?
                .as_nanos(),
            SERIAL.fetch_add(1, Ordering::Relaxed)
        );
        let encoder = OverlayEncoder::start(&info.path, settings, path, &id, protected_video)?;
        jobs.insert(id.clone(), (owner.into(), Arc::new(encoder)));
        Ok(id)
    }
    fn job(&self, owner: &str, id: &str) -> Result<Arc<OverlayEncoder>, String> {
        self.jobs
            .lock()
            .map_err(|e| e.to_string())?
            .get(id)
            .filter(|(window, _)| window == owner)
            .map(|(_, job)| Arc::clone(job))
            .ok_or_else(|| "导出任务不存在。".into())
    }
    pub fn append(
        &self,
        owner: &str,
        id: &str,
        index: u64,
        count: u64,
        bytes: &[u8],
    ) -> Result<(), String> {
        self.job(owner, id)?.append(index, count, bytes)
    }
    pub fn selection(&self, owner: &str, id: &str) -> Result<(String, bool), String> {
        let selection = self.job(owner, id)?.selection;
        Ok((selection.name.into(), selection.hardware))
    }
    pub fn finish(&self, owner: &str, id: &str) -> Result<(), String> {
        let job = self.job(owner, id)?;
        let result = job.finish();
        if result.is_err() {
            job.cancel();
        }
        self.jobs.lock().map_err(|e| e.to_string())?.remove(id);
        result
    }
    pub fn cancel(&self, owner: &str, id: &str) -> Result<(), String> {
        let job = self.job(owner, id)?;
        job.cancel();
        self.jobs.lock().map_err(|e| e.to_string())?.remove(id);
        Ok(())
    }
    pub fn cancel_window(&self, owner: &str) {
        if let Ok(mut jobs) = self.jobs.lock() {
            jobs.retain(|_, (window, job)| {
                if window == owner {
                    job.cancel();
                    false
                } else {
                    true
                }
            });
        }
    }
}
