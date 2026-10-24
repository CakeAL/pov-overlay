pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            crate::commands::materials::load_gpx,
            crate::commands::materials::load_video
        ])
        .run(tauri::generate_context!())
        .expect("无法启动 POV Overlay");
}
