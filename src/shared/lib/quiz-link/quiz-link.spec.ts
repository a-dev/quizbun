import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";

import { MAX_IMPORT_BYTES } from "../quiz";
import {
  decodeQuizLink,
  encodeQuizLink,
  MAX_QUIZ_LINK_LENGTH,
  readQuizLinkFragment,
} from "./quiz-link";

const examplesDirectory = resolve("docs/examples");
const largestCatalogQuizPath = resolve(
  "content/quizzes/master-javascript-promise-async-execution.json",
);

async function roundTrip(json: string) {
  return decodeQuizLink(await encodeQuizLink(json));
}

function toBase64Url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

async function deflate(bytes: Uint8Array) {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream("deflate"));

  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** The report of an invalid result; a decoded one yields an empty string so the match fails loudly. */
function reportOf(result: Awaited<ReturnType<typeof decodeQuizLink>>): string {
  return result.status === "invalid" ? result.report : `decoded: ${result.json}`;
}

describe("encodeQuizLink / decodeQuizLink round trips", () => {
  const exampleFiles = readdirSync(examplesDirectory).filter((name) => name.endsWith(".json"));

  test.each(exampleFiles)("round-trips docs/examples/%s", async (name) => {
    const json = JSON.stringify(JSON.parse(readFileSync(join(examplesDirectory, name), "utf8")));

    expect(await roundTrip(json)).toEqual({ status: "decoded", json });
  });

  test("round-trips the largest Catalog Quiz", async () => {
    const json = JSON.stringify(JSON.parse(readFileSync(largestCatalogQuizPath, "utf8")));
    const payload = await encodeQuizLink(json);

    expect(payload.startsWith("1.")).toBe(true);
    expect(await decodeQuizLink(payload)).toEqual({ status: "decoded", json });
  });

  test("round-trips a 200-Question Quiz built from Catalog Questions", async () => {
    const quiz = JSON.parse(readFileSync(largestCatalogQuizPath, "utf8")) as {
      questions: Array<{ id: string }>;
    };
    const source = quiz.questions;

    quiz.questions = Array.from({ length: 200 }, (_, index) => ({
      ...source[index % source.length]!,
      id: `question-${index}`,
    }));

    const json = JSON.stringify(quiz);
    const payload = await encodeQuizLink(json);

    expect(payload.length).toBeLessThan(MAX_QUIZ_LINK_LENGTH);
    expect(await decodeQuizLink(payload)).toEqual({ status: "decoded", json });
  });

  test("round-trips non-ASCII text", async () => {
    const json = JSON.stringify({ title: "Привет, мир — 日本語 🎉" });

    expect(await roundTrip(json)).toEqual({ status: "decoded", json });
  });

  test("produces only base64url characters after the version prefix", async () => {
    expect(await encodeQuizLink("a".repeat(5000) + "?>~")).toMatch(/^1\.[A-Za-z0-9_-]+$/);
  });
});

describe("decodeQuizLink failures", () => {
  test("requires the version prefix", async () => {
    const payload = await encodeQuizLink("{}");

    expect(reportOf(await decodeQuizLink(payload.slice(2)))).toMatch(
      /newer Quizbun, or is not a Quiz link/,
    );
  });

  test("reports an unknown version with the update advice", async () => {
    const payload = await encodeQuizLink("{}");

    expect(reportOf(await decodeQuizLink(`2.${payload.slice(2)}`))).toMatch(
      /made by a newer Quizbun[\s\S]*Update the quizbun skill or Import the file/,
    );
  });

  test("refuses a payload longer than the link limit", async () => {
    expect(reportOf(await decodeQuizLink(`1.${"A".repeat(MAX_QUIZ_LINK_LENGTH)}`))).toMatch(
      /characters; Quizbun opens links up to 1048576/,
    );
  });

  test("accepts a payload of exactly the link limit as far as length goes", async () => {
    const result = await decodeQuizLink(`1.${"A".repeat(MAX_QUIZ_LINK_LENGTH - 2)}`);

    expect(result.status === "invalid" && result.report).not.toMatch(/characters; Quizbun/);
  });

  test("reports bad base64url", async () => {
    expect(reportOf(await decodeQuizLink("1.not base64!"))).toMatch(/bad base64url/);
    expect(reportOf(await decodeQuizLink("1.abcde"))).toMatch(/bad base64url/);
  });

  test("reports a payload with random bytes as damaged", async () => {
    expect(reportOf(await decodeQuizLink("1.AAAAAAAAAAAAAAAA"))).toMatch(
      /checksum or deflate error/,
    );
  });

  test("catches a truncated payload", async () => {
    const payload = await encodeQuizLink(JSON.stringify({ text: "x".repeat(2000) }));

    expect(reportOf(await decodeQuizLink(payload.slice(0, payload.length - 8)))).toMatch(
      /damaged or incomplete/,
    );
  });

  test("catches a flipped byte with the checksum", async () => {
    const compressed = await deflate(new TextEncoder().encode("hello world".repeat(40)));
    compressed[compressed.length - 1] ^= 0xff;

    expect(reportOf(await decodeQuizLink(`1.${toBase64Url(compressed)}`))).toMatch(
      /checksum or deflate/,
    );
  });

  test("reports invalid UTF-8", async () => {
    const compressed = await deflate(new Uint8Array([0x7b, 0xff, 0xfe, 0x7d]));

    expect(reportOf(await decodeQuizLink(`1.${toBase64Url(compressed)}`))).toMatch(/valid UTF-8/);
  });

  test("accepts JSON of exactly the Import size limit", async () => {
    const json = " ".repeat(MAX_IMPORT_BYTES);

    expect(await roundTrip(json)).toEqual({ status: "decoded", json });
  });

  test("stops at the Import size limit and reports it like a paste does", async () => {
    expect(reportOf(await roundTrip(" ".repeat(MAX_IMPORT_BYTES + 1)))).toMatch(
      /This is a Quizbun limit, not a Standard error\.[\s\S]*over 1 MB; Quizbun imports up to 1 MB/,
    );
  });

  test("stops a decompression bomb right after the cap instead of unpacking it", async () => {
    // 20 MB of zeros deflates to about 20 KB: a tiny link with a huge payload.
    const bomb = await deflate(new Uint8Array(20 * 1024 * 1024));
    const result = await decodeQuizLink(`1.${toBase64Url(bomb)}`);

    expect(bomb.byteLength).toBeLessThan(40_000);
    expect(reportOf(result)).toMatch(/Quizbun limit/);
  });
});

describe("readQuizLinkFragment", () => {
  test("reads the payload of the qos key", () => {
    expect(readQuizLinkFragment("#qos=1.abc_-")).toBe("1.abc_-");
  });

  test("ignores unrelated keys and works without the leading #", () => {
    expect(readQuizLinkFragment("#utm=x&qos=1.abc&other=y")).toBe("1.abc");
    expect(readQuizLinkFragment("qos=1.abc")).toBe("1.abc");
  });

  test("returns undefined when there is no qos key", () => {
    expect(readQuizLinkFragment("")).toBeUndefined();
    expect(readQuizLinkFragment("#section")).toBeUndefined();
    expect(readQuizLinkFragment("#other=1")).toBeUndefined();
  });
});
