import { readFile } from "node:fs/promises";

export interface ImageDimensions { width: number; height: number; }

export async function getImageDimensions(filePath: string, mimeType: string): Promise<ImageDimensions> {
  const buffer = await readFile(filePath);

  if (mimeType === "image/png") {
    if (buffer.length < 24) throw new Error("Invalid PNG image");
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  if (mimeType === "image/gif") {
    if (buffer.length < 10) throw new Error("Invalid GIF image");
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  }

  if (mimeType === "image/webp") {
    if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") throw new Error("Invalid WEBP image");
    const chunk = buffer.toString("ascii", 12, 16);
    if (chunk === "VP8 ") {
      return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    }
    if (chunk === "VP8L") {
      const b0 = buffer[21]!;
      const b1 = buffer[22]!;
      const b2 = buffer[23]!;
      const b3 = buffer[24]!;
      const b4 = buffer[25]!;
      return {
        width: 1 + (((b2 & 0x3f) << 8) | b1),
        height: 1 + (((b4 & 0xf) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6)),
      };
    }
    if (chunk === "VP8X") {
      const width = 1 + (buffer[24]! | (buffer[25]! << 8) | (buffer[26]! << 16));
      const height = 1 + (buffer[27]! | (buffer[28]! << 8) | (buffer[29]! << 16));
      return { width, height };
    }
  }

  if (mimeType === "image/jpeg") {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset++; continue; }
      const marker = buffer[offset + 1]!;
      offset += 2;
      if (marker === 0xd8 || marker === 0xd9) continue;
      if (offset + 2 > buffer.length) break;
      const segmentLength = buffer.readUInt16BE(offset);
      if (segmentLength < 2 || offset + segmentLength > buffer.length) break;
      const isSOF = marker >= 0xc0 && marker <= 0xc3 || marker >= 0xc5 && marker <= 0xc7 || marker >= 0xc9 && marker <= 0xcb || marker >= 0xcd && marker <= 0xcf;
      if (isSOF && segmentLength >= 7) {
        return { width: buffer.readUInt16BE(offset + 5), height: buffer.readUInt16BE(offset + 3) };
      }
      offset += segmentLength;
    }
  }

  throw new Error("Could not determine image dimensions");
}
