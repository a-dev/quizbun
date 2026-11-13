import type { Quiz } from "../src/shared/lib/quiz";

import type { LabelledQuiz } from "./quiz-validation";

// The only network code in the validator. The Quizbun plugin build replaces
// this module with a stub, so the plugin's validator never makes requests.

const MAX_MEDIA_CHECK_CONCURRENCY = 4;
const MEDIA_CHECK_TIMEOUT_MS = 15_000;

type RemoteMediaCheck =
  | { fileLabel: string; kind: "image"; path: string; value: string }
  | { fileLabel: string; kind: "youtube"; path: string; value: string };

/**
 * Opt-in network verification (`--check-media`). It requests only the
 * `https://` Image URLs and YouTube ids the Quiz itself names, so the target
 * list is author-supplied: keep it opt-in rather than wiring it into a gate
 * that runs over untrusted contributions.
 */
export async function validateRemoteMedia(quizzes: LabelledQuiz[]): Promise<void> {
  const checks = quizzes.flatMap(({ fileLabel, quiz }) => listRemoteMediaChecks(fileLabel, quiz));
  const problems: string[] = [];

  for (let index = 0; index < checks.length; index += MAX_MEDIA_CHECK_CONCURRENCY) {
    const batch = checks.slice(index, index + MAX_MEDIA_CHECK_CONCURRENCY);
    const results = await Promise.all(batch.map(runRemoteMediaCheck));

    for (const result of results) {
      if (result !== undefined) problems.push(result);
    }
  }

  if (problems.length > 0) {
    throw new Error(
      [
        `Remote media verification failed with ${problems.length} problem(s):`,
        "",
        ...problems.map((problem, index) => `${index + 1}. ${problem}`),
      ].join("\n"),
    );
  }
}

function listRemoteMediaChecks(fileLabel: string, quiz: Quiz): RemoteMediaCheck[] {
  const checks: RemoteMediaCheck[] = [];

  for (const [questionIndex, question] of quiz.questions.entries()) {
    for (const [imageIndex, image] of (question.images ?? []).entries()) {
      if (!image.src.startsWith("https://")) continue;

      checks.push({
        fileLabel,
        kind: "image",
        path: `questions[${questionIndex}].images[${imageIndex}].src`,
        value: image.src,
      });
    }

    for (const [videoIndex, video] of (question.videos ?? []).entries()) {
      checks.push({
        fileLabel,
        kind: "youtube",
        path: `questions[${questionIndex}].videos[${videoIndex}].id`,
        value: video.id,
      });
    }
  }

  return checks;
}

async function runRemoteMediaCheck(check: RemoteMediaCheck): Promise<string | undefined> {
  try {
    if (check.kind === "image") {
      const response = await fetch(check.value, {
        redirect: "follow",
        signal: AbortSignal.timeout(MEDIA_CHECK_TIMEOUT_MS),
      });
      const contentType = response.headers.get("content-type") ?? "";
      await response.body?.cancel();

      if (!response.ok) {
        return formatMediaProblem(
          check,
          `Image request returned HTTP ${response.status}.`,
          "Use an existing public HTTPS Image URL, or omit the Image.",
        );
      }

      if (!contentType.toLowerCase().startsWith("image/")) {
        return formatMediaProblem(
          check,
          `Image request returned content type ${JSON.stringify(contentType || "unknown")}.`,
          "Use a URL that responds with an Image content type, or omit the Image.",
        );
      }

      return undefined;
    }

    const oEmbedUrl = new URL("https://www.youtube.com/oembed");
    oEmbedUrl.searchParams.set("url", `https://www.youtube.com/watch?v=${check.value}`);
    oEmbedUrl.searchParams.set("format", "json");
    const response = await fetch(oEmbedUrl, {
      signal: AbortSignal.timeout(MEDIA_CHECK_TIMEOUT_MS),
    });
    await response.body?.cancel();

    return response.ok
      ? undefined
      : formatMediaProblem(
          check,
          `YouTube oEmbed returned HTTP ${response.status}.`,
          "Use a verified public YouTube video id, or omit the Video.",
        );
  } catch (error) {
    return formatMediaProblem(
      check,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      "Check network access and the media identifier, then retry or omit the media.",
    );
  }
}

function formatMediaProblem(check: RemoteMediaCheck, problem: string, fix: string): string {
  return [
    `Path: \`${check.fileLabel}:${check.path}\``,
    `   Problem: ${problem}`,
    `   Fix: ${fix}`,
  ].join("\n");
}
