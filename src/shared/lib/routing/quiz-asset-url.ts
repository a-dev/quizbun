import { withBase } from "./with-base";

/** Returns the deployed URL for an Image vendored with a public Quiz. */
export function quizAssetUrl(quizId: string, fileName: string): string {
  return withBase(`quiz-assets/${quizId}/${fileName}`);
}

/** Keeps remote Library Image URLs intact and resolves bare asset filenames locally. */
export function resolveImageSrc(quizId: string, src: string): string {
  return src.startsWith("https://") ? src : quizAssetUrl(quizId, src);
}
