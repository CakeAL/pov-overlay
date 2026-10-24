use std::{
    fs,
    io::{Read, Seek, SeekFrom},
    path::Path,
};
/// Skip MP4 payloads by seeking, so a multi-GB video never enters memory.
pub fn read_creation_time(path: &Path) -> Option<i64> {
    let mut file = fs::File::open(path).ok()?;
    let length = file.metadata().ok()?.len();
    creation_time(&mut file, length)
}

fn creation_time<R: Read + Seek>(file: &mut R, length: u64) -> Option<i64> {
    fn find<R: Read + Seek>(
        file: &mut R,
        start: u64,
        end: u64,
        kind: &[u8; 4],
    ) -> Option<(u64, u64)> {
        let mut offset = start;
        for _ in 0..10_000 {
            if offset.checked_add(8)? > end {
                return None;
            }
            file.seek(SeekFrom::Start(offset)).ok()?;
            let mut header = [0; 8];
            file.read_exact(&mut header).ok()?;
            let size32 = u32::from_be_bytes(header[..4].try_into().ok()?);
            let (size, header_size) = match size32 {
                0 => (end - offset, 8),
                1 => {
                    let mut large = [0; 8];
                    file.read_exact(&mut large).ok()?;
                    (u64::from_be_bytes(large), 16)
                }
                size => (u64::from(size), 8),
            };
            if size < header_size || offset.checked_add(size)? > end {
                return None;
            }
            if &header[4..] == kind {
                return Some((offset + header_size, offset + size));
            }
            offset += size;
        }
        None
    }
    let (start, end) = find(file, 0, length, b"moov")?;
    let (start, end) = find(file, start, end, b"mvhd")?;
    if end - start < 12 {
        return None;
    }
    file.seek(SeekFrom::Start(start)).ok()?;
    let mut header = [0; 12];
    file.read_exact(&mut header).ok()?;
    let seconds = match header[0] {
        0 => u64::from(u32::from_be_bytes(header[4..8].try_into().ok()?)),
        1 => u64::from_be_bytes(header[4..12].try_into().ok()?),
        _ => return None,
    };
    let timestamp = i64::try_from(seconds)
        .ok()?
        .checked_sub(2_082_844_800)?
        .checked_mul(1000)?;
    (0..4_102_444_800_000_i64)
        .contains(&timestamp)
        .then_some(timestamp)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;
    fn atom(name: &[u8; 4], payload: &[u8], large: bool) -> Vec<u8> {
        let size = payload.len() + if large { 16 } else { 8 };
        let mut result = if large { 1_u32 } else { size as u32 }
            .to_be_bytes()
            .to_vec();
        result.extend(name);
        if large {
            result.extend((size as u64).to_be_bytes());
        }
        result.extend(payload);
        result
    }
    fn movie(version: u8, seconds: u64, large: bool) -> Vec<u8> {
        let mut payload = vec![version, 0, 0, 0];
        if version == 1 {
            payload.extend(seconds.to_be_bytes());
        } else {
            payload.extend((seconds as u32).to_be_bytes());
            payload.extend([0; 4]);
        }
        let mut result = atom(b"mdat", &[0; 40], false);
        result.extend(atom(b"moov", &atom(b"mvhd", &payload, false), large));
        result
    }
    #[test]
    fn reads_movie_headers_from_memory() {
        for (version, large) in [(0, false), (1, true)] {
            let bytes = movie(version, 3_875_644_812, large);
            assert_eq!(
                creation_time(&mut Cursor::new(&bytes), bytes.len() as u64),
                Some(1_792_800_012_000)
            );
        }
    }
    #[test]
    fn missing_zero_and_truncated_metadata_have_no_date() {
        for bytes in [
            vec![],
            movie(0, 0, false),
            vec![0, 0, 0, 4, b'm', b'o', b'o', b'v'],
        ] {
            assert_eq!(
                creation_time(&mut Cursor::new(&bytes), bytes.len() as u64),
                None
            );
        }
    }
}
