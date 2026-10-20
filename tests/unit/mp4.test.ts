import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readMp4 } from "@/lib/media/mp4";

// Tiny hand-built MP4s: just the boxes the reader looks at.
const box = (type: string, ...parts: Buffer[]) => {
  const body = Buffer.concat(parts);
  const header = Buffer.alloc(8);
  header.writeUInt32BE(8 + body.length);
  header.write(type, 4, "latin1");
  return Buffer.concat([header, body]);
};
const u32 = (...n: number[]) => {
  const b = Buffer.alloc(4 * n.length);
  n.forEach((v, i) => b.writeInt32BE(v | 0, i * 4));
  return b;
};
const IDENTITY = u32(65536, 0, 0, 0, 65536, 0, 0, 0, 0x40000000);
const ROTATED_90 = u32(0, 65536, 0, -65536, 0, 0, 0, 0, 0x40000000);

function videoTrack({ w, h, rotated = false, timescale = 30000 }: { w: number; h: number; rotated?: boolean; timescale?: number }) {
  const tkhd = box("tkhd", u32(3), u32(0, 0, 1, 0, 0), Buffer.alloc(16), rotated ? ROTATED_90 : IDENTITY, u32(w * 65536, h * 65536));
  const mdhd = box("mdhd", u32(0, 0, 0, timescale, 0, 0));
  const hdlr = box("hdlr", u32(0, 0), Buffer.from("vide"), Buffer.alloc(12));
  return box("trak", tkhd, box("mdia", mdhd, hdlr));
}
const audioTrack = box("trak", box("tkhd", Buffer.alloc(84)), box("mdia", box("hdlr", u32(0, 0), Buffer.from("soun"), Buffer.alloc(12))));
const mvhd = (timescale: number, duration: number) => box("mvhd", u32(0, 0, 0, timescale, duration), Buffer.alloc(80));
const ftyp = (brand = "isom") => box("ftyp", Buffer.from(brand), u32(0));

describe("readMp4", () => {
  it("reads length and size from a plain MP4", () => {
    const file = Buffer.concat([ftyp(), box("mdat", Buffer.alloc(100)), box("moov", mvhd(1000, 12_000), audioTrack, videoTrack({ w: 1080, h: 1920 }))]);
    assert.deepEqual(readMp4(file), { contentType: "video/mp4", durationMs: 12_000, width: 1080, height: 1920 });
  });

  it("swaps width and height for a 90° rotated phone video", () => {
    const file = Buffer.concat([ftyp(), box("moov", mvhd(600, 600 * 61), videoTrack({ w: 1920, h: 1080, rotated: true }))]);
    assert.deepEqual(readMp4(file), { contentType: "video/mp4", durationMs: 61_000, width: 1080, height: 1920 });
  });

  it("recognizes QuickTime files", () => {
    const file = Buffer.concat([ftyp("qt  "), box("moov", mvhd(1000, 5000), videoTrack({ w: 720, h: 1280 }))]);
    assert.equal(readMp4(file)?.contentType, "video/quicktime");
  });

  it("adds up sample durations in a fragmented MP4", () => {
    // mvhd says 0; three fragments of 50 samples at 1001/30000 s each = 5.005 s.
    const trex = box("trex", u32(0, 1, 1, 1001, 0, 0));
    const fragment = () =>
      box("moof", box("traf", box("tfhd", u32(0, 1)), box("trun", u32(0x100, 50), u32(...new Array(50).fill(1001)))));
    const file = Buffer.concat([
      ftyp(),
      box("moov", mvhd(1000, 0), videoTrack({ w: 1080, h: 1920 }), box("mvex", trex)),
      fragment(),
      fragment(),
      fragment(),
    ]);
    assert.equal(readMp4(file)?.durationMs, 5005);
  });

  it("rejects files that aren't MP4s or are cut short", () => {
    assert.equal(readMp4(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70])), null);
    const whole = Buffer.concat([ftyp(), box("moov", mvhd(1000, 1000), videoTrack({ w: 1, h: 2 }))]);
    assert.equal(readMp4(whole.subarray(0, 40)), null);
  });

  it("rejects audio-only files", () => {
    assert.equal(readMp4(Buffer.concat([ftyp(), box("moov", mvhd(1000, 1000), audioTrack)])), null);
  });
});
