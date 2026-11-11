use pov_overlay_desktop::application::{track_import::import_track, video_gps::export_gpx};
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

/// A one-sample `djmd` track carrying five GPS fixes over one second.
fn djmd_mp4(proto_name: &str) -> Vec<u8> {
    let sample = concat(vec![
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
        gps_point(22.708_072_2, 114.248_571_8, 52_287, "2026-11-05 02:42:52"),
        gps_point(
            22.708_080_0,
            114.248_580_0,
            52_300,
            "2026-11-05 02:42:52.25",
        ),
        gps_point(22.708_090_0, 114.248_590_0, 52_320, "2026-11-05 02:42:52.5"),
        gps_point(
            22.708_100_0,
            114.248_600_0,
            52_340,
            "2026-11-05 02:42:52.75",
        ),
        gps_point(22.708_110_0, 114.248_610_0, 52_360, "2026-11-05 02:42:53"),
    ]);

    let ftyp = atom(b"ftyp", b"isom\0\0\0\0isommp41");
    let chunk_offset = (ftyp.len() + 8) as u32;
    let mdat = atom(b"mdat", &sample);

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
            1_u32.to_be_bytes().to_vec(),
            (sample.len() as u32).to_be_bytes().to_vec(),
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
            1_u32.to_be_bytes().to_vec(),
            1_u32.to_be_bytes().to_vec(),
        ]),
    );
    let moov = atom(
        b"moov",
        &atom(
            b"trak",
            &atom(
                b"mdia",
                &atom(
                    b"minf",
                    &atom(b"stbl", &concat(vec![stsd, stsz, stco, stsc])),
                ),
            ),
        ),
    );
    concat(vec![ftyp, mdat, moov])
}

fn empty_mp4() -> Vec<u8> {
    concat(vec![atom(b"ftyp", &[0; 16]), atom(b"moov", &[])])
}

#[test]
fn extracts_dji_gps_and_writes_resampled_gpx() {
    let directory = tempfile::tempdir().unwrap();
    let video = directory.path().join("DJI_0001.MP4");
    let output = directory.path().join("DJI_0001.gpx");
    fs::write(&video, djmd_mp4("dvtm_ac206.proto")).unwrap();

    let result = export_gpx(&video, &output).unwrap();

    assert_eq!(result.raw_point_count, 5);
    assert_eq!(result.point_count, 3);
    assert_eq!(result.proto_name, "dvtm_ac206.proto");
    assert!(result.supported_model);
    let gpx = fs::read_to_string(&output).unwrap();
    assert_eq!(gpx.matches("<trkpt").count(), 3);
    assert!(gpx.contains("lat=\"22.7080722\""));
    assert!(gpx.contains("<time>2026-11-05T02:42:52.000000000Z</time>"));
    assert!(gpx.contains("<time>2026-11-05T02:42:53.000000000Z</time>"));
    let track = import_track(&output).unwrap();
    assert_eq!(track.samples.len(), 3);
    assert_eq!(track.start_ms, 1_793_846_572_000);
}

#[test]
fn marks_unverified_dji_metadata_but_still_exports() {
    let directory = tempfile::tempdir().unwrap();
    let video = directory.path().join("clip.mp4");
    let output = directory.path().join("clip.gpx");
    fs::write(&video, djmd_mp4("dvtm_other.proto")).unwrap();

    let result = export_gpx(&video, &output).unwrap();

    assert!(!result.supported_model);
    assert!(output.is_file());
}

#[test]
fn requires_a_gpx_destination() {
    let directory = tempfile::tempdir().unwrap();
    let video = directory.path().join("clip.mp4");
    fs::write(&video, empty_mp4()).unwrap();
    let output = directory.path().join("clip.srt");
    let error = export_gpx(&video, &output).unwrap_err();
    assert!(error.contains(".gpx"));
    assert!(!output.exists());
}

#[test]
fn reports_missing_dji_metadata_without_touching_an_existing_gpx() {
    let directory = tempfile::tempdir().unwrap();
    let video = directory.path().join("clip.mp4");
    let output = directory.path().join("track.gpx");
    fs::write(&video, empty_mp4()).unwrap();
    fs::write(&output, "existing").unwrap();
    let error = export_gpx(&video, &output).unwrap_err();
    assert!(error.contains("DJI Osmo Action 4/5/6"));
    assert_eq!(fs::read_to_string(output).unwrap(), "existing");
}
