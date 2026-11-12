use pov_overlay_desktop::application::{
    track_import::import_track,
    video_gps::{extract, save_gpx},
};
use std::fs;

fn atom(name: &[u8; 4], payload: &[u8]) -> Vec<u8> {
    let size = payload.len() + 8;
    let mut result = (size as u32).to_be_bytes().to_vec();
    result.extend(name);
    result.extend(payload);
    result
}

fn concat(parts: Vec<Vec<u8>>) -> Vec<u8> {
    parts.concat()
}

fn varint(mut value: u64) -> Vec<u8> {
    let mut result = Vec::new();
    while value >= 0x80 {
        result.push((value as u8 & 0x7f) | 0x80);
        value >>= 7;
    }
    result.push(value as u8);
    result
}

fn key(field: u32, wire: u8) -> Vec<u8> {
    varint((u64::from(field) << 3) | u64::from(wire))
}

fn uint(field: u32, value: u64) -> Vec<u8> {
    concat(vec![key(field, 0), varint(value)])
}

fn double(field: u32, value: f64) -> Vec<u8> {
    concat(vec![key(field, 1), value.to_bits().to_le_bytes().to_vec()])
}

fn float(field: u32, value: f32) -> Vec<u8> {
    concat(vec![key(field, 5), value.to_bits().to_le_bytes().to_vec()])
}

fn message(field: u32, payload: Vec<u8>) -> Vec<u8> {
    concat(vec![key(field, 2), varint(payload.len() as u64), payload])
}

fn text(field: u32, value: &str) -> Vec<u8> {
    message(field, value.as_bytes().to_vec())
}

fn gps_point(latitude: f64, longitude: f64, altitude_mm: u32, datetime: &str) -> Vec<u8> {
    let info = concat(vec![uint(1, 1), double(2, latitude), double(3, longitude)]);
    let coordinates = concat(vec![
        message(1, info),
        uint(2, u64::from(altitude_mm)),
        message(6, text(1, datetime)),
    ]);
    message(3, message(4, message(2, coordinates)))
}

/// A `djmd` track with five one-second samples and one GPS fix per sample.
fn djmd_mp4(proto_name: &str) -> Vec<u8> {
    let metadata = concat(vec![
        message(
            1,
            message(
                1,
                concat(vec![
                    text(1, proto_name),
                    text(5, "9KRVP8A00B06LC"),
                    text(10, "DJI OsmoAction6"),
                ]),
            ),
        ),
        message(2, message(3, float(3, 30.0))),
    ]);
    let fixes = [
        (22.708_072_2, 114.248_571_8, 52_287, "2026-11-05 02:42:52"),
        (22.708_080_0, 114.248_580_0, 52_300, "2026-11-05 02:42:53"),
        (22.708_090_0, 114.248_590_0, 52_320, "2026-11-05 02:42:54"),
        (22.708_100_0, 114.248_600_0, 52_340, "2026-11-05 02:42:55"),
        (22.708_110_0, 114.248_610_0, 52_360, "2026-11-05 02:42:56"),
    ];
    let samples: Vec<Vec<u8>> = fixes
        .iter()
        .enumerate()
        .map(|(index, (latitude, longitude, altitude, datetime))| {
            let point = gps_point(*latitude, *longitude, *altitude, datetime);
            if index == 0 {
                concat(vec![metadata.clone(), point])
            } else {
                point
            }
        })
        .collect();
    let sizes: Vec<Vec<u8>> = samples
        .iter()
        .map(|sample| (sample.len() as u32).to_be_bytes().to_vec())
        .collect();

    let ftyp = atom(b"ftyp", b"isom\0\0\0\0isommp41");
    let chunk_offset = (ftyp.len() + 8) as u32;
    let mdat = atom(b"mdat", &concat(samples.clone()));

    let stsd = atom(
        b"stsd",
        &concat(vec![
            vec![0; 4],
            1_u32.to_be_bytes().to_vec(),
            16_u32.to_be_bytes().to_vec(),
            b"djmd".to_vec(),
            vec![0; 8],
        ]),
    );
    let stsz = atom(
        b"stsz",
        &concat(vec![
            vec![0; 4],
            0_u32.to_be_bytes().to_vec(),
            (samples.len() as u32).to_be_bytes().to_vec(),
            concat(sizes),
        ]),
    );
    let stco = atom(
        b"stco",
        &concat(vec![
            vec![0; 4],
            1_u32.to_be_bytes().to_vec(),
            chunk_offset.to_be_bytes().to_vec(),
        ]),
    );
    let stsc = atom(
        b"stsc",
        &concat(vec![
            vec![0; 4],
            1_u32.to_be_bytes().to_vec(),
            1_u32.to_be_bytes().to_vec(),
            (samples.len() as u32).to_be_bytes().to_vec(),
            1_u32.to_be_bytes().to_vec(),
        ]),
    );
    // Version 0 mdhd: creation, modification, timescale, duration, language.
    let mdhd = atom(
        b"mdhd",
        &concat(vec![
            vec![0; 4],
            0_u32.to_be_bytes().to_vec(),
            0_u32.to_be_bytes().to_vec(),
            1000_u32.to_be_bytes().to_vec(),
            5000_u32.to_be_bytes().to_vec(),
            0_u16.to_be_bytes().to_vec(),
            0_u16.to_be_bytes().to_vec(),
        ]),
    );
    let stts = atom(
        b"stts",
        &concat(vec![
            vec![0; 4],
            1_u32.to_be_bytes().to_vec(),
            (samples.len() as u32).to_be_bytes().to_vec(),
            1000_u32.to_be_bytes().to_vec(),
        ]),
    );
    let moov = atom(
        b"moov",
        &atom(
            b"trak",
            &atom(
                b"mdia",
                &concat(vec![
                    mdhd,
                    atom(
                        b"minf",
                        &atom(b"stbl", &concat(vec![stsd, stsz, stco, stsc, stts])),
                    ),
                ]),
            ),
        ),
    );
    concat(vec![ftyp, mdat, moov])
}

fn empty_mp4() -> Vec<u8> {
    concat(vec![atom(b"ftyp", &[0; 16]), atom(b"moov", &[])])
}

#[test]
fn extracts_dji_gps_into_the_project_and_saves_optional_gpx() {
    let directory = tempfile::tempdir().unwrap();
    let video = directory.path().join("DJI_0001.MP4");
    fs::write(&video, djmd_mp4("dvtm_ac206.proto")).unwrap();

    let result = extract(&video).unwrap();

    assert_eq!(fs::read_dir(directory.path()).unwrap().count(), 1);
    assert_eq!(result.raw_point_count, 5);
    assert_eq!(result.point_count, 9);
    assert_eq!(result.track.samples.len(), 9);
    assert_eq!(result.track.start_ms, 1_793_846_572_500);
    assert_eq!(result.proto_name, "dvtm_ac206.proto");
    assert!(result.supported_model);
    assert_eq!(result.gpx.matches("<trkpt").count(), 9);
    assert!(result.gpx.contains("lat=\"22.7080722\""));
    assert!(
        result
            .gpx
            .contains("<time>2026-11-05T02:42:52.500000000Z</time>")
    );
    assert!(
        result
            .gpx
            .contains("<time>2026-11-05T02:42:56.500000000Z</time>")
    );

    let json = serde_json::to_value(&result).unwrap();
    assert_eq!(json["track"]["startMs"], 1_793_846_572_500_i64);
    assert_eq!(json["pointCount"], 9);
    assert!(json["gpx"].as_str().unwrap().contains("<gpx"));

    let output = directory.path().join("DJI_0001.gpx");
    save_gpx(&output, &result.gpx).unwrap();
    let track = import_track(&output).unwrap();
    assert_eq!(track.samples.len(), 9);
    assert_eq!(track.start_ms, result.track.start_ms);
}

#[test]
fn marks_unverified_dji_metadata_but_still_adds_the_track() {
    let directory = tempfile::tempdir().unwrap();
    let video = directory.path().join("clip.mp4");
    fs::write(&video, djmd_mp4("dvtm_other.proto")).unwrap();

    let result = extract(&video).unwrap();

    assert!(!result.supported_model);
    assert_eq!(result.track.samples.len(), 9);
    assert!(!result.gpx.is_empty());
}

#[test]
fn requires_a_gpx_destination_and_keeps_existing_content() {
    let directory = tempfile::tempdir().unwrap();
    let output = directory.path().join("clip.srt");
    fs::write(&output, "existing").unwrap();
    let error = save_gpx(&output, "<gpx/>").unwrap_err();
    assert!(error.contains(".gpx"));
    assert_eq!(fs::read_to_string(output).unwrap(), "existing");
}

#[test]
fn reports_missing_dji_metadata() {
    let directory = tempfile::tempdir().unwrap();
    let video = directory.path().join("clip.mp4");
    fs::write(&video, empty_mp4()).unwrap();
    let error = extract(&video).unwrap_err();
    assert!(error.contains("DJI Osmo Action 4/5/6"));
}
