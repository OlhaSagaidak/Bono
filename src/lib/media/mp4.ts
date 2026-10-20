// Reads what Bono needs from an MP4 (or QuickTime .mov) file's own boxes:
// that it really is one, how long it is, and its display size. The server has
// no ffmpeg, and the browser-sent type and duration can't be trusted, so this
// small parser is the check. It never decodes video.
//
// An MP4 is a list of boxes: [size: u32][type: 4 chars][content]. We need
//   ftyp                 (first box: the file type)
//   moov > mvhd          (timescale and duration of the whole movie)
//   moov > trak > tkhd   (each track's width and height, plus rotation)
//   moov > trak > mdia > hdlr ("vide" marks the video track)
// "Fragmented" MP4s (common from phones and stock sites) leave the movie
// duration at 0 and describe the video in moof fragments instead; for those
// the duration is the sum of the video track's sample durations.

export type Mp4Info = { contentType: "video/mp4" | "video/quicktime"; durationMs: number; width: number; height: number };

type Box = { type: string; start: number; end: number }; // start = first content byte

function* boxes(buf: Buffer, from: number, to: number): Generator<Box> {
  let at = from;
  while (at + 8 <= to) {
    let size = buf.readUInt32BE(at);
    const type = buf.toString("latin1", at + 4, at + 8);
    let header = 8;
    if (size === 1) {
      if (at + 16 > to) return;
      size = Number(buf.readBigUInt64BE(at + 8));
      header = 16;
    } else if (size === 0) {
      size = to - at; // runs to the end
    }
    if (size < header || at + size > to) return; // truncated or corrupt
    yield { type, start: at + header, end: at + size };
    at += size;
  }
}

const child = (buf: Buffer, box: Box, type: string) => [...boxes(buf, box.start, box.end)].find((b) => b.type === type);

export function readMp4(buf: Buffer): Mp4Info | null {
  try {
    const top = [...boxes(buf, 0, buf.length)];
    if (top[0]?.type !== "ftyp") return null;
    const brand = buf.toString("latin1", top[0].start, top[0].start + 4);
    const moov = top.find((b) => b.type === "moov");
    if (!moov) return null;

    const mvhd = child(buf, moov, "mvhd");
    if (!mvhd) return null;
    const v1 = buf[mvhd.start] === 1;
    const timescale = buf.readUInt32BE(mvhd.start + (v1 ? 20 : 12));
    const duration = v1 ? Number(buf.readBigUInt64BE(mvhd.start + 24)) : buf.readUInt32BE(mvhd.start + 16);
    if (!timescale) return null;

    let durationMs = Math.round((duration / timescale) * 1000);
    for (const trak of boxes(buf, moov.start, moov.end)) {
      if (trak.type !== "trak") continue;
      const mdia = child(buf, trak, "mdia");
      const hdlr = mdia && child(buf, mdia, "hdlr");
      if (!hdlr || buf.toString("latin1", hdlr.start + 8, hdlr.start + 12) !== "vide") continue;
      const tkhd = child(buf, trak, "tkhd");
      if (!tkhd) return null;
      // After version/flags, times, ids and duration (longer in version 1): 52 bytes of
      // layer, volume and the 3x3 transform matrix, then width and height (16.16 fixed point).
      const matrix = tkhd.start + (buf[tkhd.start] === 1 ? 52 : 40);
      let width = buf.readUInt32BE(matrix + 36) / 65536;
      let height = buf.readUInt32BE(matrix + 40) / 65536;
      // Phones often store portrait video as landscape plus a 90° rotation.
      if (buf.readInt32BE(matrix) === 0 && Math.abs(buf.readInt32BE(matrix + 4)) === 65536) [width, height] = [height, width];
      if (durationMs === 0) durationMs = fragmentedDurationMs(buf, top, moov, tkhd, mdia);
      return {
        contentType: brand === "qt  " ? "video/quicktime" : "video/mp4",
        durationMs,
        width: Math.round(width),
        height: Math.round(height),
      };
    }
    return null; // no video track
  } catch {
    return null; // a read past the end: not a usable file
  }
}

/** Sums the video track's sample durations over all moof > traf > trun boxes. */
function fragmentedDurationMs(buf: Buffer, top: Box[], moov: Box, tkhd: Box, mdia: Box): number {
  const trackId = buf.readUInt32BE(tkhd.start + (buf[tkhd.start] === 1 ? 20 : 12));
  const mdhd = child(buf, mdia, "mdhd");
  if (!mdhd) return 0;
  const timescale = buf.readUInt32BE(mdhd.start + (buf[mdhd.start] === 1 ? 20 : 12));
  if (!timescale) return 0;

  // The track's fallback sample duration, from mvex > trex.
  let trexDefault = 0;
  const mvex = child(buf, moov, "mvex");
  for (const trex of mvex ? boxes(buf, mvex.start, mvex.end) : []) {
    if (trex.type === "trex" && buf.readUInt32BE(trex.start + 4) === trackId) trexDefault = buf.readUInt32BE(trex.start + 12);
  }

  let total = 0;
  for (const moof of top) {
    if (moof.type !== "moof") continue;
    for (const traf of boxes(buf, moof.start, moof.end)) {
      if (traf.type !== "traf") continue;
      const tfhd = child(buf, traf, "tfhd");
      if (!tfhd || buf.readUInt32BE(tfhd.start + 4) !== trackId) continue;
      const tfFlags = buf.readUInt32BE(tfhd.start) & 0xffffff;
      // tfhd: flags, track id, then optional fields in this order.
      let at = tfhd.start + 8 + (tfFlags & 0x01 ? 8 : 0) + (tfFlags & 0x02 ? 4 : 0);
      const fallback = tfFlags & 0x08 ? buf.readUInt32BE(at) : trexDefault;
      for (const trun of boxes(buf, traf.start, traf.end)) {
        if (trun.type !== "trun") continue;
        const flags = buf.readUInt32BE(trun.start) & 0xffffff;
        const count = buf.readUInt32BE(trun.start + 4);
        if (!(flags & 0x100)) {
          total += count * fallback;
          continue;
        }
        // Per-sample fields: duration, size, flags, composition offset (each if flagged).
        const stride = 4 * [0x100, 0x200, 0x400, 0x800].filter((f) => flags & f).length;
        at = trun.start + 8 + (flags & 0x01 ? 4 : 0) + (flags & 0x04 ? 4 : 0);
        for (let i = 0; i < count; i++) total += buf.readUInt32BE(at + i * stride);
      }
    }
  }
  return Math.round((total / timescale) * 1000);
}
