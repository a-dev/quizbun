import { describe, expect, test } from "vitest";

import {
  parseAvifDimensions,
  parseGifDimensions,
  parseJpegDimensions,
  parsePngDimensions,
  parseSvgDimensions,
  parseWebpDimensions,
  readImageDimensions,
} from "./image-dimensions";

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

describe("parsePngDimensions", () => {
  test("reads the IHDR header", () => {
    expect(parsePngDimensions(makePng(1200, 798))).toEqual({ height: 798, width: 1200 });
  });

  test("rejects a file that only looks like a PNG", () => {
    const bytes = makePng(10, 10);
    bytes.write("IDAT", 12, "latin1");

    expect(() => parsePngDimensions(bytes)).toThrow(/signature or IHDR/);
  });
});

describe("parseGifDimensions", () => {
  test.each(["GIF87a", "GIF89a"] as const)("reads a %s logical screen", (version) => {
    expect(parseGifDimensions(makeGif(version, 640, 480))).toEqual({ height: 480, width: 640 });
  });

  test("rejects an unknown header", () => {
    expect(() => parseGifDimensions(makeGif("GIF88a", 10, 10))).toThrow(/GIF87a/);
  });
});

describe("parseJpegDimensions", () => {
  test("skips metadata segments to reach the Start-of-Frame", () => {
    const bytes = makeJpeg({ height: 480, marker: 0xc0, width: 640, withMetadata: true });

    expect(parseJpegDimensions(bytes)).toEqual({ height: 480, width: 640 });
  });

  test("reads a progressive Start-of-Frame", () => {
    const bytes = makeJpeg({ height: 300, marker: 0xc2, width: 200 });

    expect(parseJpegDimensions(bytes)).toEqual({ height: 300, width: 200 });
  });

  test("tolerates fill bytes before a marker", () => {
    const bytes = makeJpeg({ fillBytes: 3, height: 90, marker: 0xc0, width: 160 });

    expect(parseJpegDimensions(bytes)).toEqual({ height: 90, width: 160 });
  });

  test("rejects a file with no Start-of-Image marker", () => {
    expect(() => parseJpegDimensions(Buffer.from([0x00, 0x01, 0x02, 0x03]))).toThrow(
      /Start-of-Image/,
    );
  });
});

describe("parseAvifDimensions", () => {
  test("reads the primary item's `ispe` rather than the first one in the file", () => {
    const bytes = makeAvif({
      associations: [
        { itemId: 1, propertyIndexes: [1] },
        { itemId: 2, propertyIndexes: [2] },
      ],
      primaryItemId: 2,
      spatialExtents: [
        { height: 64, width: 64 },
        { height: 800, width: 1200 },
      ],
    });

    expect(parseAvifDimensions(bytes)).toEqual({ height: 800, width: 1200 });
  });

  test("falls back to the only `ispe` when the file has no `pitm`", () => {
    const bytes = makeAvif({ spatialExtents: [{ height: 480, width: 640 }] });

    expect(parseAvifDimensions(bytes)).toEqual({ height: 480, width: 640 });
  });

  test("rejects a file with no `meta` box", () => {
    expect(() => parseAvifDimensions(makeBox("ftyp", Buffer.alloc(8)))).toThrow(/`meta` box/);
  });
});

describe("readImageDimensions", () => {
  test("names the supported formats when handed something else", () => {
    expect(() => readImageDimensions("diagram.bmp")).toThrow(/\.bmp.*\.avif, \.gif/s);
  });
});

function makePng(width: number, height: number): Buffer {
  const bytes = Buffer.alloc(24);

  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "latin1");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);

  return bytes;
}

function makeGif(header: string, width: number, height: number): Buffer {
  const bytes = Buffer.alloc(10);

  bytes.write(header, 0, "latin1");
  bytes.writeUInt16LE(width, 6);
  bytes.writeUInt16LE(height, 8);

  return bytes;
}

function makeJpeg({
  fillBytes = 0,
  height,
  marker,
  width,
  withMetadata = false,
}: {
  fillBytes?: number;
  height: number;
  marker: number;
  width: number;
  withMetadata?: boolean;
}): Buffer {
  const parts = [Buffer.from([0xff, 0xd8])];

  if (withMetadata) {
    // An APP0 segment long enough that a reader which ignored segment lengths
    // would walk into its payload instead of the frame header.
    const app0 = Buffer.alloc(16);
    app0.writeUInt16BE(app0.length, 0);
    app0.write("JFIF\0", 2, "latin1");
    parts.push(Buffer.from([0xff, 0xe0]), app0);
  }

  const frame = Buffer.alloc(8);
  frame.writeUInt16BE(8, 0);
  frame[2] = 8;
  frame.writeUInt16BE(height, 3);
  frame.writeUInt16BE(width, 5);

  parts.push(Buffer.alloc(fillBytes, 0xff), Buffer.from([0xff, marker]), frame);

  return Buffer.concat(parts);
}

function makeAvif({
  associations = [],
  primaryItemId,
  spatialExtents,
}: {
  associations?: Array<{ itemId: number; propertyIndexes: number[] }>;
  primaryItemId?: number;
  spatialExtents: Array<{ height: number; width: number }>;
}): Buffer {
  const properties = spatialExtents.map(({ height, width }) => {
    const payload = Buffer.alloc(12);
    payload.writeUInt32BE(width, 4);
    payload.writeUInt32BE(height, 8);

    return makeBox("ispe", payload);
  });

  const metaChildren = [
    makeBox("iprp", Buffer.concat([makeBox("ipco", Buffer.concat(properties))])),
  ];

  if (primaryItemId !== undefined) {
    const primaryItem = Buffer.alloc(6);
    primaryItem.writeUInt16BE(primaryItemId, 4);
    metaChildren.unshift(makeBox("pitm", primaryItem));

    const entries = associations.map(({ itemId, propertyIndexes }) =>
      Buffer.concat([
        makeUInt16BE(itemId),
        Buffer.from([propertyIndexes.length]),
        Buffer.from(propertyIndexes),
      ]),
    );
    const association = Buffer.concat([Buffer.alloc(4), makeUInt32BE(entries.length), ...entries]);

    // `ipma` lives beside `ipco` inside `iprp`.
    metaChildren[metaChildren.length - 1] = makeBox(
      "iprp",
      Buffer.concat([makeBox("ipco", Buffer.concat(properties)), makeBox("ipma", association)]),
    );
  }

  // `meta` is a FullBox, so its children start after four version/flag bytes.
  return Buffer.concat([
    makeBox("ftyp", Buffer.from("avif    ", "latin1")),
    makeBox("meta", Buffer.concat([Buffer.alloc(4), ...metaChildren])),
  ]);
}

function makeBox(type: string, payload: Buffer): Buffer {
  return Buffer.concat([makeUInt32BE(payload.length + 8), Buffer.from(type, "latin1"), payload]);
}

function makeUInt16BE(value: number): Buffer {
  const bytes = Buffer.alloc(2);
  bytes.writeUInt16BE(value);

  return bytes;
}

function makeUInt32BE(value: number): Buffer {
  const bytes = Buffer.alloc(4);
  bytes.writeUInt32BE(value);

  return bytes;
}
