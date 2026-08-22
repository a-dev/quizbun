import { createReadStream } from "node:fs";
import { copyFile, lstat, mkdir, readdir } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { AstroIntegration } from "astro";

import { ASSET_FILE_NAME_PATTERN, ID_PATTERN } from "./src/shared/lib/quiz/index.ts";

const ASSET_MIME_TYPES = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
} as const;

const QUIZ_ASSETS_PATH = "/quiz-assets/";

/** Serves vendored Quiz Images in development and copies them into static builds. */
export function quizAssets(): AstroIntegration {
  let base = "/";
  let contentDirectory = fileURLToPath(new URL("./content/quizzes/", import.meta.url));

  return {
    name: "quiz-assets",
    hooks: {
      "astro:config:done": ({ config }) => {
        base = config.base;
        contentDirectory = fileURLToPath(new URL("content/quizzes/", config.root));
      },
      "astro:server:setup": ({ server }) => {
        server.middlewares.use(async (request, response, next) => {
          if (request.method !== "GET" || request.url === undefined) {
            next();
            return;
          }

          const asset = parseAssetRequest(request.url, base);
          if (asset === undefined) {
            next();
            return;
          }

          if (asset === null) {
            response.statusCode = 404;
            response.end();
            return;
          }

          const filePath = resolve(contentDirectory, asset.quizId, asset.fileName);

          try {
            const fileStats = await lstat(filePath);
            if (!fileStats.isFile()) {
              response.statusCode = 404;
              response.end();
              return;
            }

            response.statusCode = 200;
            response.setHeader("Content-Type", mimeTypeFor(asset.fileName));
            response.setHeader("Content-Length", fileStats.size);
            createReadStream(filePath).pipe(response);
          } catch (error) {
            if (isMissingFileError(error)) {
              response.statusCode = 404;
              response.end();
              return;
            }

            next(error as Error);
          }
        });
      },
      "astro:build:done": async ({ dir }) => {
        await copyQuizAssets(contentDirectory, fileURLToPath(dir));
      },
    },
  };
}

async function copyQuizAssets(contentDirectory: string, outputDirectory: string) {
  const quizEntries = await readdir(contentDirectory, { withFileTypes: true });

  await Promise.all(
    quizEntries
      .filter((entry) => entry.isDirectory() && ID_PATTERN.test(entry.name))
      .map(async (quizEntry) => {
        const sourceDirectory = resolve(contentDirectory, quizEntry.name);
        const assetEntries = await readdir(sourceDirectory, { withFileTypes: true });
        // Same allowlist the schema and the Catalog validator use: the copy step
        // must not widen what counts as an asset, or a stray editor or OS file
        // would ship in `dist/`.
        const files = assetEntries.filter(
          (entry) => entry.isFile() && ASSET_FILE_NAME_PATTERN.test(entry.name),
        );

        if (files.length === 0) return;

        const destinationDirectory = resolve(outputDirectory, "quiz-assets", quizEntry.name);
        await mkdir(destinationDirectory, { recursive: true });
        await Promise.all(
          files.map((file) =>
            copyFile(resolve(sourceDirectory, file.name), resolve(destinationDirectory, file.name)),
          ),
        );
      }),
  );
}

/**
 * Splits an incoming request into the Quiz id and asset filename it addresses.
 *
 * Three outcomes: an object for a well-formed asset request, `null` for an
 * asset request that names something unservable (respond 404), and `undefined`
 * for a URL outside the asset route (hand back to the next middleware). Both
 * segments are validated *after* decoding and before any filesystem access, so
 * traversal is impossible by construction rather than by normalization.
 */
export function parseAssetRequest(
  requestUrl: string,
  base: string,
): { fileName: string; quizId: string } | null | undefined {
  const pathname = new URL(requestUrl, "http://localhost").pathname;
  const normalizedBase = base === "/" ? "" : `/${base.replace(/^\/+|\/+$/g, "")}`;
  const baseAssetPath = `${normalizedBase}${QUIZ_ASSETS_PATH}`;
  const acceptedAssetPaths =
    baseAssetPath === QUIZ_ASSETS_PATH ? [QUIZ_ASSETS_PATH] : [baseAssetPath, QUIZ_ASSETS_PATH];
  const prefix = acceptedAssetPaths.find((assetPath) => pathname.startsWith(assetPath));

  if (prefix === undefined) return undefined;

  const encodedParts = pathname.slice(prefix.length).split("/");
  if (encodedParts.length !== 2) return null;

  try {
    const [quizId, fileName] = encodedParts.map((part) => decodeURIComponent(part));

    if (
      quizId === undefined ||
      fileName === undefined ||
      !ID_PATTERN.test(quizId) ||
      !ASSET_FILE_NAME_PATTERN.test(fileName)
    ) {
      return null;
    }

    return { fileName, quizId };
  } catch {
    return null;
  }
}

function mimeTypeFor(fileName: string) {
  const extension = extname(fileName).toLowerCase() as keyof typeof ASSET_MIME_TYPES;
  return ASSET_MIME_TYPES[extension] ?? "application/octet-stream";
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
