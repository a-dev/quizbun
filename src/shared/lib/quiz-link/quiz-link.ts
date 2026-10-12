import { formatImportSizeReport, MAX_IMPORT_BYTES } from "../quiz/import-limits";

/**
 * The Quiz link codec: one Quiz in a URL fragment, `qos=1.<base64url(zlib
 * deflate(UTF-8 JSON))>`. The `1.` versions this encoding, not the Standard.
 * It uses only web-platform APIs, so the site, CI and the `quizbun` skill all
 * run this one implementation.
 */

export const QUIZ_LINK_PARAM = "qos";
export const QUIZ_LINK_VERSION = 1;
/** The smallest browser URL limit (Firefox, 1 MB) bounds the payload itself. */
export const MAX_QUIZ_LINK_LENGTH = 1_048_576;

export type QuizLinkResult =
  | { status: "decoded"; json: string }
  | { status: "invalid"; report: string };

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]*$/;
const BASE64_CHUNK_SIZE = 0x8000;

export async function encodeQuizLink(json: string): Promise<string> {
  const compressed = await collect(
    new Blob([new TextEncoder().encode(json)])
      .stream()
      .pipeThrough(new CompressionStream("deflate")),
  );

  return `${QUIZ_LINK_VERSION}.${toBase64Url(compressed)}`;
}

/** The `qos` payload of a `location.hash`, or `undefined` when the hash carries none. */
export function readQuizLinkFragment(hash: string): string | undefined {
  const payload = new URLSearchParams(hash.replace(/^#/, "")).get(QUIZ_LINK_PARAM);

  return payload === null ? undefined : payload;
}

export async function decodeQuizLink(payload: string): Promise<QuizLinkResult> {
  if (payload.length > MAX_QUIZ_LINK_LENGTH) {
    return invalid(
      `The link is ${payload.length} characters; Quizbun opens links up to ${MAX_QUIZ_LINK_LENGTH}.`,
      "Import the Quiz `.json` file instead.",
    );
  }

  const separatorIndex = payload.indexOf(".");
  const version = separatorIndex === -1 ? payload : payload.slice(0, separatorIndex);

  if (version !== String(QUIZ_LINK_VERSION)) {
    return invalid(
      "This link was made by a newer Quizbun, or is not a Quiz link.",
      "Update the quizbun skill or Import the file.",
    );
  }

  const encoded = payload.slice(separatorIndex + 1);

  if (separatorIndex === -1 || !BASE64URL_PATTERN.test(encoded) || encoded.length % 4 === 1) {
    return invalid("The link is damaged or incomplete (bad base64url).", REOPEN_FIX);
  }

  return inflate(fromBase64Url(encoded));
}

const REOPEN_FIX = "Open the launcher file again, or Import the Quiz `.json` file.";

async function inflate(compressed: Uint8Array<ArrayBuffer>): Promise<QuizLinkResult> {
  const reader = new Blob([compressed])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"))
    .getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();

      if (done) break;

      total += value.byteLength;

      if (total > MAX_IMPORT_BYTES) {
        // Stop here: never unpack a decompression bomb past the cap.
        await reader.cancel();

        return { status: "invalid", report: formatImportSizeReport() };
      }

      chunks.push(value);
    }
  } catch {
    return invalid("The link is damaged or incomplete (checksum or deflate error).", REOPEN_FIX);
  }

  try {
    return {
      status: "decoded",
      json: new TextDecoder("utf-8", { fatal: true }).decode(join(chunks, total)),
    };
  } catch {
    return invalid("The link does not contain valid UTF-8 text.", REOPEN_FIX);
  }
}

function invalid(problem: string, fix: string): QuizLinkResult {
  return {
    status: "invalid",
    report: [
      "This Quiz link cannot be opened.",
      "",
      "1. Path: `link`",
      `   Problem: ${problem}`,
      `   Fix: ${fix}`,
    ].join("\n"),
  };
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<Uint8Array<ArrayBuffer>> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();

    if (done) return join(chunks, total);

    chunks.push(value);
    total += value.byteLength;
  }
}

function join(chunks: Uint8Array[], total: number): Uint8Array<ArrayBuffer> {
  const joined = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return joined;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";

  for (let index = 0; index < bytes.length; index += BASE64_CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(index, index + BASE64_CHUNK_SIZE));
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(encoded: string): Uint8Array<ArrayBuffer> {
  const binary = atob(encoded.replaceAll("-", "+").replaceAll("_", "/"));
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}
