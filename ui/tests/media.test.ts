import { Blob } from "node:buffer";
import { describe, expect, it } from "vitest";
import { readMp4CreationTime } from "../infrastructure/mp4";
function box(name: string, payload: Uint8Array, large = false) {
  const data = new Uint8Array(payload.length + (large ? 16 : 8)),
    view = new DataView(data.buffer);
  view.setUint32(0, large ? 1 : data.length);
  data.set(
    Array.from(name, (letter) => letter.charCodeAt(0)),
    4,
  );
  if (large) view.setBigUint64(8, BigInt(data.length));
  data.set(payload, large ? 16 : 8);
  return data;
}
function movie(version: number, seconds: bigint, large = false) {
  const payload = new Uint8Array(24),
    view = new DataView(payload.buffer);
  view.setUint8(0, version);
  if (version === 1) view.setBigUint64(4, seconds);
  else view.setUint32(4, Number(seconds));
  const moov = box("moov", box("mvhd", payload), large);
  return new Blob([
    box("ftyp", new Uint8Array(16)),
    box("mdat", new Uint8Array(128)),
    moov,
  ]) as unknown as globalThis.Blob;
}
describe("MP4 movie timestamps", () => {
  it("finds moov after media payload and converts the 1904 epoch to UTC", async () => {
    const unixSeconds = 1792800012;
    expect(
      await readMp4CreationTime(movie(0, BigInt(unixSeconds + 2082844800))),
    ).toBe(unixSeconds * 1000);
  });
  it("supports version 1 movie headers and extended 64-bit box sizes", async () => {
    expect(await readMp4CreationTime(movie(1, 3875644812n, true))).toBe(
      1792800012000,
    );
  });
  it("does not invent a recording date for absent or zero metadata", async () => {
    expect(await readMp4CreationTime(movie(0, 0n))).toBeNull();
    expect(
      await readMp4CreationTime(
        new Blob(["not an mp4"]) as unknown as globalThis.Blob,
      ),
    ).toBeNull();
  });
  it("rejects truncated and undersized boxes without an infinite scan", async () => {
    const invalid = new Uint8Array(16);
    new DataView(invalid.buffer).setUint32(0, 4);
    expect(
      await readMp4CreationTime(
        new Blob([invalid]) as unknown as globalThis.Blob,
      ),
    ).toBeNull();
  });
});
