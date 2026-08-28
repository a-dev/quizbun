import { describe, expect, test } from "vitest";

import { parseSvgDimensions, parseWebpDimensions } from "./image-dimensions";

describe("parseSvgDimensions", () => {
  test("reads a viewBox when the SVG has no absolute dimensions", () => {
    expect(parseSvgDimensions('<svg viewBox="0 0 720 480"></svg>')).toEqual({
      height: 480,
      width: 720,
    });
  });

  test("reads unitless width and height attributes", () => {
    expect(parseSvgDimensions('<svg width="320" height="180"></svg>')).toEqual({
      height: 180,
      width: 320,
    });
  });

  test("prefers absolute width and height over the viewBox", () => {
    expect(
      parseSvgDimensions('<svg width="640" height="360" viewBox="0 0 1280 720"></svg>'),
    ).toEqual({ height: 360, width: 640 });
  });

  test("converts absolute CSS length units to pixels", () => {
    expect(parseSvgDimensions('<svg width="2in" height="25.4mm"></svg>')).toEqual({
      height: 96,
      width: 192,
    });
  });
});

describe("parseWebpDimensions", () => {
  test("reads a lossy VP8 header", () => {
    const payload = Buffer.alloc(10);
    payload.set([0x9d, 0x01, 0x2a], 3);
    payload.writeUInt16LE(1200, 6);
    payload.writeUInt16LE(798, 8);

    expect(parseWebpDimensions(makeWebp("VP8 ", payload))).toEqual({
      height: 798,
      width: 1200,
    });
  });

  test("reads a lossless VP8L header", () => {
    const width = 602;
    const height = 1200;
    const payload = Buffer.alloc(5);
    payload[0] = 0x2f;
    payload.writeUInt32LE((width - 1) | ((height - 1) << 14), 1);

    expect(parseWebpDimensions(makeWebp("VP8L", payload))).toEqual({ height, width });
  });

  test("reads an extended VP8X canvas", () => {
    const width = 675;
    const height = 1200;
    const payload = Buffer.alloc(10);
    writeUInt24LE(payload, width - 1, 4);
    writeUInt24LE(payload, height - 1, 7);

    expect(parseWebpDimensions(makeWebp("VP8X", payload))).toEqual({ height, width });
  });
});

function makeWebp(chunkType: "VP8 " | "VP8L" | "VP8X", payload: Buffer): Buffer {
  const padding = payload.length % 2;
  const bytes = Buffer.alloc(12 + 8 + payload.length + padding);

  bytes.write("RIFF", 0, "latin1");
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WEBP", 8, "latin1");
  bytes.write(chunkType, 12, "latin1");
  bytes.writeUInt32LE(payload.length, 16);
  payload.copy(bytes, 20);

  return bytes;
}

function writeUInt24LE(bytes: Buffer, value: number, offset: number) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
}
