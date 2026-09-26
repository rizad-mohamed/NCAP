import { RepositoryError } from "@/services";
const invalid = () =>
  new RepositoryError(
    "validation",
    "The uploaded file is unreadable or its metadata does not match. Export it again and retry.",
  );
const ascii = (b: Uint8Array, start: number, n: number) =>
  String.fromCharCode(...b.slice(start, start + n));
/** Bounded container inspection; this is not malware scanning. No user HTML/SVG is accepted. */
export function inspectImage(bytes: Uint8Array, mime: string) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    mime === "image/png" &&
    bytes.length >= 24 &&
    ascii(bytes, 1, 3) === "PNG" &&
    bytes[0] === 137 &&
    ascii(bytes, 12, 4) === "IHDR"
  )
    return { width: v.getUint32(16), height: v.getUint32(20) };
  if (mime === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216) {
    let p = 2;
    while (p + 9 < bytes.length) {
      if (bytes[p] !== 255) break;
      const marker = bytes[p + 1]!;
      if (marker === 255) {
        p++;
        continue;
      }
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker))
        return { width: v.getUint16(p + 7), height: v.getUint16(p + 5) };
      const length = v.getUint16(p + 2);
      if (length < 2) break;
      p += 2 + length;
    }
  }
  if (
    mime === "image/webp" &&
    bytes.length >= 30 &&
    ascii(bytes, 0, 4) === "RIFF" &&
    ascii(bytes, 8, 4) === "WEBP"
  ) {
    const type = ascii(bytes, 12, 4);
    if (type === "VP8X")
      return {
        width: 1 + bytes[24]! + (bytes[25]! << 8) + (bytes[26]! << 16),
        height: 1 + bytes[27]! + (bytes[28]! << 8) + (bytes[29]! << 16),
      };
    if (type === "VP8 " && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42)
      return { width: v.getUint16(26, true) & 16383, height: v.getUint16(28, true) & 16383 };
    if (type === "VP8L" && bytes[20] === 47)
      return {
        width: 1 + ((bytes[21]! | (bytes[22]! << 8)) & 16383),
        height: 1 + (((bytes[22]! >> 6) | (bytes[23]! << 2) | (bytes[24]! << 10)) & 16383),
      };
  }
  throw invalid();
}
export function inspectVideo(head: Uint8Array, tail: Uint8Array, mime: string) {
  let width = 0,
    height = 0,
    durationSeconds = 0;
  if (mime === "video/mp4") {
    if (ascii(head, 4, 4) !== "ftyp") throw invalid();
    for (const bytes of [head, tail]) {
      const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      // Box size and version are checked before reading metadata from bounded head/tail ranges.
      for (let p = 4; p + 32 < bytes.length; p++) {
        if (bytes[p] !== 109 && bytes[p] !== 116) continue;
        const type = ascii(bytes, p, 4),
          size = v.getUint32(p - 4),
          end = p - 4 + size;
        if (size < 12 || end > bytes.length) continue;
        if (type === "mvhd") {
          const version = bytes[p + 4];
          if (version === 0 && size >= 32)
            durationSeconds = v.getUint32(p + 20) / v.getUint32(p + 16);
          if (version === 1 && size >= 44)
            durationSeconds = Number(v.getBigUint64(p + 28)) / v.getUint32(p + 24);
        }
        if (type === "tkhd" && size >= 92) {
          const w = v.getUint32(end - 8) / 65536,
            h = v.getUint32(end - 4) / 65536;
          if (w && h) {
            width = Math.round(w);
            height = Math.round(h);
          }
        }
      }
    }
  } else {
    if (ascii(head, 0, 4) !== "\x1a\x45\xdf\xa3") throw invalid();
    const view = new DataView(head.buffer, head.byteOffset, head.byteLength);
    let scale = 1000000,
      duration = 0;
    const vint = (p: number, keep: boolean) => {
      const first = head[p]!;
      let len = 1;
      while (len <= 8 && !(first & (128 >> (len - 1)))) len++;
      if (len > 8 || p + len > head.length) throw invalid();
      let n = keep ? first : first & ((128 >> (len - 1)) - 1);
      for (let i = 1; i < len; i++) n = n * 256 + head[p + i]!;
      return { n, len };
    };
    const walk = (start: number, end: number, depth: number) => {
      if (depth > 8) return;
      let p = start;
      while (p + 2 < Math.min(end, head.length)) {
        const id = vint(p, true);
        p += id.len;
        const size = vint(p, false);
        p += size.len;
        const stop = Math.min(p + size.n, end, head.length);
        if ([0x1a45dfa3, 0x18538067, 0x1549a966, 0x1654ae6b, 0xae, 0xe0].includes(id.n))
          walk(p, stop, depth + 1);
        if ([0x2ad7b1, 0xb0, 0xba].includes(id.n) && size.n <= 4 && p + size.n <= head.length) {
          let n = 0;
          for (let i = 0; i < size.n; i++) n = n * 256 + head[p + i]!;
          if (id.n === 0x2ad7b1) scale = n;
          else if (id.n === 0xb0) width = n;
          else height = n;
        }
        if (id.n === 0x4489 && p + size.n <= head.length)
          duration = size.n === 4 ? view.getFloat32(p) : size.n === 8 ? view.getFloat64(p) : 0;
        if (stop <= p) break;
        p = stop;
      }
    };
    walk(0, head.length, 0);
    durationSeconds = (duration * scale) / 1e9;
  }
  if (!width || !height || !Number.isFinite(durationSeconds) || durationSeconds <= 0)
    throw invalid();
  return { width, height, durationSeconds };
}
