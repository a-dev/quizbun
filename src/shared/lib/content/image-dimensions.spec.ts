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
    expect(parseSvgDimensions('<svg width="1cm" height="1q"></svg>')).toEqual({
      height: 1,
      width: 38,
    });
    expect(parseSvgDimensions('<svg width="6pc" height="72pt"></svg>')).toEqual({
      height: 96,
      width: 96,
    });
    // The unit is case-insensitive, and whitespace may sit between the two.
    expect(parseSvgDimensions('<svg width="2 IN" height="1e2px"></svg>')).toEqual({
      height: 100,
      width: 192,
    });
  });

  test("falls through to the viewBox for relative or unusable lengths", () => {
    const viewBox = 'viewBox="0 0 800 600"';

    for (const size of ['width="50%" height="50%"', 'width="2em" height="2em"']) {
      expect(parseSvgDimensions(`<svg ${size} ${viewBox}></svg>`)).toEqual({
        height: 600,
        width: 800,
      });
    }

    // Only one of the two: an intrinsic size needs both.
    expect(parseSvgDimensions(`<svg width="320" ${viewBox}></svg>`)).toEqual({
      height: 600,
      width: 800,
    });
  });

  test("rejects non-positive and unparseable lengths", () => {
    const viewBox = 'viewBox="0 0 800 600"';

    for (const size of ['width="0" height="0"', 'width="-10" height="-10"', 'width="" height=""']) {
      expect(parseSvgDimensions(`<svg ${size} ${viewBox}></svg>`)).toEqual({
        height: 600,
        width: 800,
      });
    }
  });

  test("reads single-quoted attributes and ignores lookalike attribute names", () => {
    expect(parseSvgDimensions("<svg width='320' height='180'></svg>")).toEqual({
      height: 180,
      width: 320,
    });
    // `stroke-width` must not be mistaken for `width`.
    expect(parseSvgDimensions('<svg stroke-width="4" viewBox="0 0 200 100"></svg>')).toEqual({
      height: 100,
      width: 200,
    });
  });

  test("skips an XML declaration, doctype, and comments before the root tag", () => {
    const source = [
      '<?xml version="1.0"?>',
      '<!-- <svg width="1" height="1"> a decoy in a comment -->',
      '<svg viewBox="0 0 40 20"></svg>',
    ].join("\n");

    expect(parseSvgDimensions(source)).toEqual({ height: 20, width: 40 });
  });

  test("accepts a comma-separated viewBox and rounds fractional extents", () => {
    expect(parseSvgDimensions('<svg viewBox="0,0,100.5,40.4"></svg>')).toEqual({
      height: 40,
      width: 101,
    });
  });

  test("rejects a viewBox with the wrong arity, a non-number, or a non-positive extent", () => {
    for (const viewBox of ["0 0 100", "0 0 100 40 20", "0 0 wide 40", "0 0 0 40", "0 0 100 -40"]) {
      expect(() => parseSvgDimensions(`<svg viewBox="${viewBox}"></svg>`)).toThrow(
        "SVG has no intrinsic size",
      );
    }
  });

  test("accepts a signed, fractional, or exponent length", () => {
    expect(parseSvgDimensions('<svg width="+320" height="+180"></svg>')).toEqual({
      height: 180,
      width: 320,
    });
    expect(parseSvgDimensions('<svg width="10.25" height="10.75"></svg>')).toEqual({
      height: 11,
      width: 10,
    });
    expect(parseSvgDimensions('<svg width=".25" height="2e1"></svg>')).toEqual({
      height: 20,
      // Rounds to the Standard's minimum of one whole pixel.
      width: 1,
    });
  });

  test("rejects a length with anything before or after the number and unit", () => {
    const viewBox = 'viewBox="0 0 800 600"';

    for (const size of [
      'width="x320" height="x180"',
      'width="320px!" height="180px!"',
      'width="320 180" height="320 180"',
    ]) {
      expect(parseSvgDimensions(`<svg ${size} ${viewBox}></svg>`)).toEqual({
        height: 600,
        width: 800,
      });
    }
  });

  test("rejects a document with no root `<svg>` element", () => {
    expect(() => parseSvgDimensions("<html><body></body></html>")).toThrow(
      "SVG has no root `<svg>` element.",
    );
  });

  test("rejects an SVG with neither absolute lengths nor a viewBox", () => {
    expect(() => parseSvgDimensions("<svg></svg>")).toThrow(
      "SVG has no intrinsic size: add a `viewBox`, or `width` and `height` in absolute units.",
    );
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

  test("rejects anything that is not a RIFF/WEBP container", () => {
    const notRiff = makeWebp("VP8X", Buffer.alloc(10));
    notRiff.write("RIFX", 0, "latin1");
    const notWebp = makeWebp("VP8X", Buffer.alloc(10));
    notWebp.write("WEBQ", 8, "latin1");

    expect(() => parseWebpDimensions(notRiff)).toThrow(/RIFF\/WEBP header/);
    expect(() => parseWebpDimensions(notWebp)).toThrow(/RIFF\/WEBP header/);
    expect(() => parseWebpDimensions(Buffer.alloc(15))).toThrow(/RIFF\/WEBP header/);
  });

  test("skips chunks that carry no size and reports a container with none", () => {
    const withoutImageChunk = makeWebp("VP8X", Buffer.alloc(10));
    withoutImageChunk.write("ICCP", 12, "latin1");

    expect(() => parseWebpDimensions(withoutImageChunk)).toThrow(
      "WebP has no `VP8X`, `VP8 `, or `VP8L` chunk.",
    );
  });

  test("rejects a lossy chunk with no key-frame header", () => {
    const payload = Buffer.alloc(10);
    payload.set([0x9d, 0x01, 0x2b], 3);

    expect(() => parseWebpDimensions(makeWebp("VP8 ", payload))).toThrow(
      /`VP8 ` chunk has no key-frame header/,
    );
  });

  test("rejects a lossless chunk with no signature byte", () => {
    const payload = Buffer.alloc(5);
    payload[0] = 0x2e;

    expect(() => parseWebpDimensions(makeWebp("VP8L", payload))).toThrow(
      /`VP8L` chunk has no lossless signature byte/,
    );
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

  test("rejects a wrong signature and a header cut short", () => {
    const wrongSignature = makePng(10, 10);
    wrongSignature[0] = 0x88;

    expect(() => parsePngDimensions(wrongSignature)).toThrow(/signature or IHDR/);
    // 23 bytes: the signature and IHDR tag are there, the sizes are not.
    expect(() => parsePngDimensions(makePng(10, 10).subarray(0, 23))).toThrow(/signature or IHDR/);
  });

  test("rejects a header that declares a zero dimension", () => {
    expect(() => parsePngDimensions(makePng(0, 10))).toThrow(
      "Read a non-positive image size (0×10).",
    );
    expect(() => parsePngDimensions(makePng(10, 0))).toThrow(
      "Read a non-positive image size (10×0).",
    );
  });
});

describe("parseGifDimensions", () => {
  test.each(["GIF87a", "GIF89a"] as const)("reads a %s logical screen", (version) => {
    expect(parseGifDimensions(makeGif(version, 640, 480))).toEqual({ height: 480, width: 640 });
  });

  test("rejects an unknown header", () => {
    expect(() => parseGifDimensions(makeGif("GIF88a", 10, 10))).toThrow(/GIF87a/);
  });

  test("rejects a buffer too short to hold the logical screen descriptor", () => {
    expect(() => parseGifDimensions(makeGif("GIF89a", 10, 10).subarray(0, 9))).toThrow(/GIF87a/);
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
    // Two bytes is a Start-of-Image and nothing else.
    expect(() => parseJpegDimensions(Buffer.from([0xff, 0xd8]))).toThrow(/Start-of-Image/);
  });

  test("walks past standalone markers, which carry no length", () => {
    const bytes = makeJpeg({
      height: 120,
      marker: 0xc0,
      standaloneMarkers: [0x01, 0xd0, 0xd9],
      width: 160,
    });

    expect(parseJpegDimensions(bytes)).toEqual({ height: 120, width: 160 });
  });

  test("does not mistake table segments in the 0xC0–0xCF range for a frame", () => {
    // 0xC4 (Huffman), 0xC8 (extension) and 0xCC (arithmetic) sit in the frame
    // marker range but describe tables; the real frame follows them.
    const bytes = makeJpeg({
      decoyMarkers: [0xc4, 0xc8, 0xcc],
      height: 240,
      marker: 0xc1,
      width: 320,
    });

    expect(parseJpegDimensions(bytes)).toEqual({ height: 240, width: 320 });
  });

  test("stops at Start-of-Scan rather than reading entropy-coded bytes", () => {
    const bytes = makeJpeg({ height: 10, marker: 0xda, width: 10 });

    expect(() => parseJpegDimensions(bytes)).toThrow(/no Start-of-Frame segment/);
  });

  test("rejects a Start-of-Frame segment that is truncated", () => {
    const bytes = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xc0]),
      // A declared segment length of 6 cannot hold the 7 bytes a frame needs.
      Buffer.from([0x00, 0x06, 0x08, 0x00, 0x10, 0x00, 0x10]),
    ]);

    expect(() => parseJpegDimensions(bytes)).toThrow(/Start-of-Frame segment is truncated/);
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

  test("reads a version 1 `pitm`/`ipma` pair with 32-bit item ids", () => {
    const bytes = makeAvif({
      associations: [
        { itemId: 1, propertyIndexes: [1] },
        { itemId: 70_000, propertyIndexes: [2] },
      ],
      ipmaVersion: 1,
      pitmVersion: 1,
      primaryItemId: 70_000,
      spatialExtents: [
        { height: 64, width: 64 },
        { height: 800, width: 1200 },
      ],
    });

    expect(parseAvifDimensions(bytes)).toEqual({ height: 800, width: 1200 });
  });

  test("reads an `ipma` whose flags ask for 15-bit property indexes", () => {
    const bytes = makeAvif({
      associations: [
        { itemId: 1, propertyIndexes: [1] },
        { itemId: 2, propertyIndexes: [2] },
      ],
      primaryItemId: 2,
      spatialExtents: [
        { height: 64, width: 64 },
        { height: 300, width: 400 },
      ],
      wideIndexes: true,
    });

    expect(parseAvifDimensions(bytes)).toEqual({ height: 300, width: 400 });
  });

  test("rejects a file with no `meta` box", () => {
    expect(() => parseAvifDimensions(makeBox("ftyp", Buffer.alloc(8)))).toThrow(/`meta` box/);
  });

  test("rejects a `meta` box with no `iprp`/`ipco` property boxes", () => {
    const meta = makeBox(
      "meta",
      Buffer.concat([Buffer.alloc(4), makeBox("iinf", Buffer.alloc(4))]),
    );

    expect(() => parseAvifDimensions(meta)).toThrow("AVIF has no `iprp`/`ipco` property boxes.");

    // `iprp` present but empty: still no `ipco` to read properties from.
    const emptyIprp = makeBox(
      "meta",
      Buffer.concat([Buffer.alloc(4), makeBox("iprp", Buffer.alloc(0))]),
    );

    expect(() => parseAvifDimensions(emptyIprp)).toThrow(
      "AVIF has no `iprp`/`ipco` property boxes.",
    );
  });

  test("rejects a property container that holds no `ispe`", () => {
    expect(() => parseAvifDimensions(makeAvif({ spatialExtents: [] }))).toThrow(
      "AVIF has no `ispe` box for its primary item.",
    );
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
  decoyMarkers = [],
  fillBytes = 0,
  height,
  marker,
  standaloneMarkers = [],
  width,
  withMetadata = false,
}: {
  decoyMarkers?: number[];
  fillBytes?: number;
  height: number;
  marker: number;
  standaloneMarkers?: number[];
  width: number;
  withMetadata?: boolean;
}): Buffer {
  const parts = [Buffer.from([0xff, 0xd8])];

  for (const standalone of standaloneMarkers) {
    parts.push(Buffer.from([0xff, standalone]));
  }

  for (const decoy of decoyMarkers) {
    // A length-carrying segment whose payload would read as a frame header if
    // the marker were mistaken for a Start-of-Frame.
    const segment = Buffer.alloc(8);
    segment.writeUInt16BE(segment.length, 0);
    parts.push(Buffer.from([0xff, decoy]), segment);
  }

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
  ipmaVersion = 0,
  pitmVersion = 0,
  primaryItemId,
  spatialExtents,
  wideIndexes = false,
}: {
  associations?: Array<{ itemId: number; propertyIndexes: number[] }>;
  /** `ipma` version 1 addresses items with 32 bits instead of 16. */
  ipmaVersion?: 0 | 1;
  /** `pitm` version 1 addresses the primary item with 32 bits instead of 16. */
  pitmVersion?: 0 | 1;
  primaryItemId?: number;
  spatialExtents: Array<{ height: number; width: number }>;
  /** `ipma` flag bit 0: property indexes are 15-bit, not 7-bit. */
  wideIndexes?: boolean;
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
    const primaryItem = Buffer.alloc(pitmVersion === 0 ? 6 : 8);
    primaryItem[0] = pitmVersion;
    if (pitmVersion === 0) primaryItem.writeUInt16BE(primaryItemId, 4);
    else primaryItem.writeUInt32BE(primaryItemId, 4);
    metaChildren.unshift(makeBox("pitm", primaryItem));

    const entries = associations.map(({ itemId, propertyIndexes }) =>
      Buffer.concat([
        ipmaVersion === 0 ? makeUInt16BE(itemId) : makeUInt32BE(itemId),
        Buffer.from([propertyIndexes.length]),
        wideIndexes
          ? Buffer.concat(propertyIndexes.map((index) => makeUInt16BE(index)))
          : Buffer.from(propertyIndexes),
      ]),
    );
    const versionAndFlags = Buffer.from([ipmaVersion, 0, 0, wideIndexes ? 1 : 0]);
    const association = Buffer.concat([versionAndFlags, makeUInt32BE(entries.length), ...entries]);

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
