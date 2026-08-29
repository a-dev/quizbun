import { readFileSync } from "node:fs";
import { extname } from "node:path";

/**
 * Intrinsic Image dimensions read from file headers, shared by the Catalog
 * loader and the `quiz:sizes` generator/check.
 *
 * Every format the Standard allows in an Image `src` is covered here, and an
 * unreadable file throws rather than returning a guess: a wrong `width` makes a
 * Renderer reserve the wrong box, which is worse than reserving nothing. Each
 * reader takes the file into memory and inspects its header — no decoding and
 * no dependencies, which measures at a few milliseconds for the whole Catalog.
 */

export interface ImageDimensions {
  height: number;
  width: number;
}

/** Extensions of `ASSET_FILE_NAME_PATTERN`, each with a reader below. */
const SUPPORTED_EXTENSIONS = [".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"] as const;

/** CSS absolute length units, in px. Percentages and font-relative units are not absolute. */
const PIXELS_PER_UNIT: Record<string, number> = {
  "": 1,
  cm: 96 / 2.54,
  in: 96,
  mm: 96 / 25.4,
  pc: 16,
  pt: 96 / 72,
  px: 1,
  q: 96 / 25.4 / 4,
};

export function isSupportedImageExtension(fileName: string): boolean {
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(extname(fileName).toLowerCase());
}

export function readImageDimensions(filePath: string): ImageDimensions {
  const extension = extname(filePath).toLowerCase();

  if (!isSupportedImageExtension(filePath)) {
    throw new Error(
      `Cannot measure "${extension || filePath}": supported formats are ${SUPPORTED_EXTENSIONS.join(", ")}.`,
    );
  }

  const bytes = readFileSync(filePath);

  if (extension === ".svg") {
    return parseSvgDimensions(bytes.toString("utf8"));
  }

  if (extension === ".png") return parsePngDimensions(bytes);
  if (extension === ".gif") return parseGifDimensions(bytes);
  if (extension === ".webp") return parseWebpDimensions(bytes);
  if (extension === ".avif") return parseAvifDimensions(bytes);

  return parseJpegDimensions(bytes);
}

/**
 * An SVG's intrinsic size is its `width`/`height` attributes when both carry
 * absolute lengths, and its `viewBox` extent otherwise — the same order a
 * browser resolves. A percentage width means "as wide as the box you put me
 * in", which is not an intrinsic size, so it falls through to the `viewBox`.
 */
export function parseSvgDimensions(source: string): ImageDimensions {
  const rootTag = findSvgRootTag(source);

  if (rootTag === undefined) {
    throw new Error("SVG has no root `<svg>` element.");
  }

  const width = parseSvgLength(readAttribute(rootTag, "width"));
  const height = parseSvgLength(readAttribute(rootTag, "height"));

  if (width !== undefined && height !== undefined) {
    return toDimensions(width, height);
  }

  const viewBox = readAttribute(rootTag, "viewBox");
  const viewBoxNumbers = viewBox
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);

  if (viewBoxNumbers?.length === 4 && viewBoxNumbers.every((value) => Number.isFinite(value))) {
    const [, , viewBoxWidth, viewBoxHeight] = viewBoxNumbers as [number, number, number, number];

    if (viewBoxWidth > 0 && viewBoxHeight > 0) {
      return toDimensions(viewBoxWidth, viewBoxHeight);
    }
  }

  throw new Error(
    "SVG has no intrinsic size: add a `viewBox`, or `width` and `height` in absolute units.",
  );
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function parsePngDimensions(bytes: Buffer): ImageDimensions {
  const hasSignature = bytes.length >= 24 && bytes.subarray(0, 8).equals(PNG_SIGNATURE);

  if (!hasSignature || bytes.subarray(12, 16).toString("latin1") !== "IHDR") {
    throw new Error("PNG is missing its signature or IHDR header chunk.");
  }

  return toDimensions(bytes.readUInt32BE(16), bytes.readUInt32BE(20));
}

export function parseGifDimensions(bytes: Buffer): ImageDimensions {
  const header = bytes.length >= 10 ? bytes.subarray(0, 6).toString("latin1") : "";

  if (header !== "GIF87a" && header !== "GIF89a") {
    throw new Error("GIF is missing its `GIF87a`/`GIF89a` header.");
  }

  return toDimensions(bytes.readUInt16LE(6), bytes.readUInt16LE(8));
}

/**
 * Walks JPEG marker segments to the first Start-of-Frame, which carries the
 * frame size for every JPEG flavour (baseline, progressive, lossless). Anything
 * before it — EXIF, ICC profiles, comments — is skipped by segment length.
 */
export function parseJpegDimensions(bytes: Buffer): ImageDimensions {
  if (bytes.length < 4 || bytes.readUInt16BE(0) !== 0xff_d8) {
    throw new Error("JPEG is missing its Start-of-Image marker.");
  }

  let offset = 2;

  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      throw new Error(`JPEG marker segment expected at byte ${offset}.`);
    }

    // Any number of 0xFF fill bytes may precede a marker.
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;

    const marker = bytes[offset];
    offset += 1;

    if (marker === undefined) break;
    // Standalone markers: no length, no payload.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) continue;
    if (offset + 2 > bytes.length) break;

    const segmentLength = bytes.readUInt16BE(offset);

    if (isStartOfFrameMarker(marker)) {
      if (segmentLength < 7 || offset + 7 > bytes.length) {
        throw new Error("JPEG Start-of-Frame segment is truncated.");
      }

      return toDimensions(bytes.readUInt16BE(offset + 5), bytes.readUInt16BE(offset + 3));
    }

    // Start-of-Scan: entropy-coded data follows, so a Start-of-Frame can no
    // longer appear ahead of us.
    if (marker === 0xda) break;

    offset += segmentLength;
  }

  throw new Error("JPEG has no Start-of-Frame segment.");
}

/**
 * WebP is a RIFF container. The size lives in whichever of the three image
 * chunks comes first: `VP8X` (extended, and always first when present) states
 * the canvas size, while `VP8 ` (lossy) and `VP8L` (lossless) each encode it in
 * their own bitstream header.
 */
export function parseWebpDimensions(bytes: Buffer): ImageDimensions {
  const isRiffWebp =
    bytes.length >= 16 &&
    bytes.subarray(0, 4).toString("latin1") === "RIFF" &&
    bytes.subarray(8, 12).toString("latin1") === "WEBP";

  if (!isRiffWebp) {
    throw new Error("WebP is missing its RIFF/WEBP header.");
  }

  let offset = 12;

  while (offset + 8 <= bytes.length) {
    const chunkType = bytes.subarray(offset, offset + 4).toString("latin1");
    const chunkSize = bytes.readUInt32LE(offset + 4);
    const data = offset + 8;

    if (chunkType === "VP8X" && data + 10 <= bytes.length) {
      return toDimensions(readUInt24LE(bytes, data + 4) + 1, readUInt24LE(bytes, data + 7) + 1);
    }

    if (chunkType === "VP8 " && data + 10 <= bytes.length) {
      const hasKeyFrameSignature =
        bytes[data + 3] === 0x9d && bytes[data + 4] === 0x01 && bytes[data + 5] === 0x2a;

      if (!hasKeyFrameSignature) {
        throw new Error("WebP `VP8 ` chunk has no key-frame header.");
      }

      // 14-bit dimensions; the top two bits are the upscaling hint.
      return toDimensions(
        bytes.readUInt16LE(data + 6) & 0x3f_ff,
        bytes.readUInt16LE(data + 8) & 0x3f_ff,
      );
    }

    if (chunkType === "VP8L" && data + 5 <= bytes.length) {
      if (bytes[data] !== 0x2f) {
        throw new Error("WebP `VP8L` chunk has no lossless signature byte.");
      }

      const header = bytes.readUInt32LE(data + 1);

      return toDimensions((header & 0x3f_ff) + 1, ((header >>> 14) & 0x3f_ff) + 1);
    }

    // Chunks are padded to an even length.
    offset = data + chunkSize + (chunkSize % 2);
  }

  throw new Error("WebP has no `VP8X`, `VP8 `, or `VP8L` chunk.");
}

/**
 * AVIF stores the size in an `ispe` property inside the ISOBMFF metadata boxes.
 * A file may hold several images (thumbnails, alpha, gain maps), each with its
 * own `ispe`, so the reader follows `pitm` → `ipma` → `ipco` to the primary
 * item's property rather than taking the first one it finds.
 */
export function parseAvifDimensions(bytes: Buffer): ImageDimensions {
  const meta = findBox(bytes, 0, bytes.length, "meta");

  if (meta === undefined) {
    throw new Error("AVIF has no `meta` box.");
  }

  // `meta` is a FullBox: four bytes of version and flags before its children.
  const metaChildrenStart = meta.contentStart + 4;
  const properties = findBox(bytes, metaChildrenStart, meta.contentEnd, "iprp");
  const propertyContainer =
    properties && findBox(bytes, properties.contentStart, properties.contentEnd, "ipco");

  if (!properties || !propertyContainer) {
    throw new Error("AVIF has no `iprp`/`ipco` property boxes.");
  }

  const propertyBoxes = listBoxes(
    bytes,
    propertyContainer.contentStart,
    propertyContainer.contentEnd,
  );
  const primaryItemId = readPrimaryItemId(bytes, metaChildrenStart, meta.contentEnd);
  const association = findBox(bytes, properties.contentStart, properties.contentEnd, "ipma");
  const associatedIndexes =
    association && primaryItemId !== undefined
      ? readPropertyIndexes(bytes, association, primaryItemId)
      : undefined;

  const spatialExtents =
    associatedIndexes
      ?.map((index) => propertyBoxes[index - 1])
      .find((box) => box?.type === "ispe") ??
    // A file we cannot walk item-by-item still yields a usable answer from the
    // first `ispe`: in a single-image AVIF it is the primary item's.
    propertyBoxes.find((box) => box.type === "ispe");

  if (spatialExtents === undefined || spatialExtents.contentStart + 12 > bytes.length) {
    throw new Error("AVIF has no `ispe` box for its primary item.");
  }

  return toDimensions(
    bytes.readUInt32BE(spatialExtents.contentStart + 4),
    bytes.readUInt32BE(spatialExtents.contentStart + 8),
  );
}

interface IsoBox {
  contentEnd: number;
  contentStart: number;
  end: number;
  type: string;
}

function listBoxes(bytes: Buffer, start: number, end: number): IsoBox[] {
  const boxes: IsoBox[] = [];
  let offset = start;

  while (offset + 8 <= end) {
    const box = readBox(bytes, offset, end);

    if (box === undefined) break;

    boxes.push(box);
    offset = box.end;
  }

  return boxes;
}

function findBox(bytes: Buffer, start: number, end: number, type: string): IsoBox | undefined {
  return listBoxes(bytes, start, end).find((box) => box.type === type);
}

function readBox(bytes: Buffer, offset: number, end: number): IsoBox | undefined {
  const declaredSize = bytes.readUInt32BE(offset);
  const type = bytes.subarray(offset + 4, offset + 8).toString("latin1");
  let contentStart = offset + 8;
  let size = declaredSize;

  if (declaredSize === 1) {
    if (offset + 16 > end) return undefined;

    // 64-bit size. Files this large are not images we can hold in a Buffer, so
    // the high word is only read to reject it honestly.
    const high = bytes.readUInt32BE(offset + 8);

    if (high !== 0) return undefined;

    size = bytes.readUInt32BE(offset + 12);
    contentStart = offset + 16;
  } else if (declaredSize === 0) {
    size = end - offset;
  }

  const boxEnd = offset + size;

  if (size < contentStart - offset || boxEnd > end) return undefined;

  return { contentEnd: boxEnd, contentStart, end: boxEnd, type };
}

function readPrimaryItemId(bytes: Buffer, start: number, end: number): number | undefined {
  const primaryItem = findBox(bytes, start, end, "pitm");

  if (primaryItem === undefined) return undefined;

  const version = bytes[primaryItem.contentStart];
  const idStart = primaryItem.contentStart + 4;

  if (version === 0) {
    return idStart + 2 <= end ? bytes.readUInt16BE(idStart) : undefined;
  }

  return idStart + 4 <= end ? bytes.readUInt32BE(idStart) : undefined;
}

/** 1-based indexes into `ipco`'s child list, for one item. */
function readPropertyIndexes(bytes: Buffer, association: IsoBox, itemId: number) {
  const version = bytes[association.contentStart] ?? 0;
  const flags = readUInt24BE(bytes, association.contentStart + 1);
  const usesWideIndexes = (flags & 1) === 1;
  let offset = association.contentStart + 4;

  if (offset + 4 > association.contentEnd) return undefined;

  const entryCount = bytes.readUInt32BE(offset);
  offset += 4;

  for (let entry = 0; entry < entryCount; entry += 1) {
    if (offset + 3 > association.contentEnd) return undefined;

    const entryItemId = version < 1 ? bytes.readUInt16BE(offset) : bytes.readUInt32BE(offset);
    offset += version < 1 ? 2 : 4;

    const associationCount = bytes[offset] ?? 0;
    offset += 1;

    const indexes: number[] = [];

    for (let index = 0; index < associationCount; index += 1) {
      if (offset >= association.contentEnd) return undefined;

      if (usesWideIndexes) {
        indexes.push(bytes.readUInt16BE(offset) & 0x7f_ff);
        offset += 2;
      } else {
        indexes.push((bytes[offset] ?? 0) & 0x7f);
        offset += 1;
      }
    }

    if (entryItemId === itemId) return indexes;
  }

  return undefined;
}

function isStartOfFrameMarker(marker: number) {
  // 0xC4 (Huffman tables), 0xC8 (JPEG extension), and 0xCC (arithmetic coding
  // tables) share the range but are not frame headers.
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

function readUInt24LE(bytes: Buffer, offset: number) {
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8) | ((bytes[offset + 2] ?? 0) << 16);
}

function readUInt24BE(bytes: Buffer, offset: number) {
  return ((bytes[offset] ?? 0) << 16) | ((bytes[offset + 1] ?? 0) << 8) | (bytes[offset + 2] ?? 0);
}

/** The `<svg>` start tag, ignoring any XML declaration, doctype, or comments before it. */
function findSvgRootTag(source: string) {
  const withoutComments = source.replaceAll(/<!--[\S\s]*?-->/g, "");
  return /<svg\b[^>]*>/i.exec(withoutComments)?.[0];
}

function readAttribute(tag: string, name: string) {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i");
  const match = pattern.exec(tag);

  return match?.[2] ?? match?.[3];
}

/** A CSS absolute length in px, or `undefined` for `50%`, `2em`, and other relative values. */
function parseSvgLength(value: string | undefined) {
  if (value === undefined) return undefined;

  const match = /^\s*([+-]?[\d.]+(?:e[+-]?\d+)?)\s*([a-z%]*)\s*$/i.exec(value);

  if (match === null) return undefined;

  const amount = Number(match[1]);
  const pixelsPerUnit = PIXELS_PER_UNIT[(match[2] ?? "").toLowerCase()];

  if (!Number.isFinite(amount) || amount <= 0 || pixelsPerUnit === undefined) return undefined;

  return amount * pixelsPerUnit;
}

/**
 * The Standard stores whole pixels at or above 1, so a fractional intrinsic
 * size (an SVG `viewBox` of `0 0 100.5 40`) rounds. The aspect ratio a Renderer
 * derives is within half a pixel of the real one.
 */
function toDimensions(width: number, height: number): ImageDimensions {
  const rounded = {
    height: Math.max(1, Math.round(height)),
    width: Math.max(1, Math.round(width)),
  };

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error(`Read a non-positive image size (${width}×${height}).`);
  }

  return rounded;
}
