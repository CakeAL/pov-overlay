use tauri::Manager;
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(crate::application::overlay_export::ExportManager::default())
        .setup(|app| {
            if let Ok(config) = app.path().app_config_dir()
                && let Ok(settings) = crate::infrastructure::app_settings::read(&config)
            {
                crate::infrastructure::cached_images::set_limit(settings.cache_limit_mb);
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::Destroyed) {
                window
                    .state::<crate::application::overlay_export::ExportManager>()
                    .cancel_window(window.label());
            }
        })
        .invoke_handler(tauri::generate_handler![
            crate::commands::settings::load_app_settings,
            crate::commands::settings::save_app_settings,
            crate::commands::settings::set_map_api_key,
            crate::commands::settings::clear_map_cache,
            crate::commands::settings::open_map_cache_folder,
            crate::commands::system::reveal_svg_source,
            crate::commands::system::open_preset_folder,
            crate::commands::system::open_external_url,
            crate::commands::fonts::list_system_fonts,
            crate::commands::maps::amap_key_status,
            crate::commands::maps::configure_amap_key,
            crate::commands::maps::load_amap_map,
            crate::commands::maps::load_map_tile,
            crate::commands::maps::sample_terrain_tile,
            crate::commands::materials::load_gpx,
            crate::commands::documents::list_library_documents,
            crate::commands::documents::read_library_document,
            crate::commands::documents::save_library_document,
            crate::commands::documents::read_document,
            crate::commands::documents::write_document,
            crate::commands::documents::read_svg,
            crate::commands::materials::load_image,
            crate::commands::materials::load_video,
            crate::commands::overlay_export::export_encoder_info,
            crate::commands::overlay_export::start_overlay_export,
            crate::commands::overlay_export::append_overlay_frame,
            crate::commands::overlay_export::finish_overlay_export,
            crate::commands::overlay_export::cancel_overlay_export
        ])
        .run(tauri::generate_context!())
        .expect("无法启动 POV Overlay");
}
