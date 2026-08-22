import type { ZodError } from "zod";

type QuizValidationIssue = ZodError["issues"][number];

export function formatQuizValidationErrors(error: ZodError): string {
  const issueReports = error.issues.map(formatIssueReport);

  return [
    "Quiz JSON is invalid. Please revise it to satisfy the Quiz Object Standard.",
    "",
    ...issueReports,
  ].join("\n");
}

function formatIssueReport(issue: QuizValidationIssue, index: number) {
  const { path, problem, fix } = explainIssue(issue);

  return [`${index + 1}. Path: \`${path}\``, `   Problem: ${problem}`, `   Fix: ${fix}`].join("\n");
}

function explainIssue(issue: QuizValidationIssue) {
  if (issue.code === "unrecognized_keys") {
    const keys = issue.keys.map((key) => `\`${key}\``).join(", ");
    const path =
      issue.keys.length === 1
        ? formatPath([...issue.path, issue.keys[0] ?? ""])
        : formatPath(issue.path);

    return {
      path,
      problem: `Unknown field${issue.keys.length === 1 ? "" : "s"} ${keys}.`,
      fix: "Remove unknown fields; the Standard is strict at every level.",
    };
  }

  if (isPath(issue.path, ["schemaVersion"])) {
    return {
      path: formatPath(issue.path),
      problem: issue.message,
      fix: 'Use `"schemaVersion": 1`. Version strings such as `"1.0"` are invalid.',
    };
  }

  // Media issues are matched by path suffix, so they must not shadow the
  // generic missing-field report below: a `src` that is absent is a different
  // problem from a `src` that is malformed.
  if (!isMissingField(issue)) {
    const mediaExplanation = explainMediaIssue(issue);

    if (mediaExplanation !== undefined) {
      return mediaExplanation;
    }
  }

  if (issue.code === "invalid_union" && "options" in issue && issue.options !== undefined) {
    const options = issue.options.map((option) => `\`${String(option)}\``).join(", ");

    return {
      path: formatPath(issue.path),
      problem: issue.message,
      fix: `Use one of: ${options}.`,
    };
  }

  if (isPathEnding(issue.path, ["validation"])) {
    return {
      path: formatPath(issue.path),
      problem: issue.message,
      fix: 'Add a `validation` object with `mode: "text"` or `mode: "numeric"` and at least one accepted answer.',
    };
  }

  if (isMissingField(issue)) {
    return {
      path: formatPath(issue.path),
      problem: "Required field is missing.",
      fix: "Add this required field using the shape defined by the Standard.",
    };
  }

  if (issue.code === "invalid_format" && isIdLikePath(issue.path)) {
    return {
      path: formatPath(issue.path),
      problem: issue.message,
      fix: "Use lowercase latin letters, digits, and single hyphens; do not use spaces, underscores, or leading/trailing hyphens.",
    };
  }

  if (issue.code === "too_small" && "origin" in issue && issue.origin === "array") {
    return {
      path: formatPath(issue.path),
      problem: issue.message,
      fix: "Add the required item or remove the incomplete object.",
    };
  }

  if (issue.code === "custom" && isPathEnding(issue.path, ["options"])) {
    return {
      path: formatPath(issue.path),
      problem: issue.message,
      fix: "Set the required correct Options: exactly one for `single-choice`, at least one for `multiple-choice`.",
    };
  }

  if (issue.code === "custom" && isPathEnding(issue.path, ["id"])) {
    return {
      path: formatPath(issue.path),
      problem: issue.message,
      fix: "Give each Question a unique `id` within this Quiz.",
    };
  }

  return {
    path: formatPath(issue.path),
    problem: issue.message,
    fix: "Change this value to match the Standard at the reported path.",
  };
}

/**
 * `schema.ts` emits this exact message wherever `issue.input === undefined`,
 * across several issue codes — a union reports an absent value as a failed
 * union, not as a missing field. Keying on the sentinel rather than the code
 * keeps every absent field reporting as absent.
 */
function isMissingField(issue: QuizValidationIssue) {
  return issue.message === "Required field missing.";
}

/** Media-specific reports, keyed on the field the issue landed on. */
function explainMediaIssue(issue: QuizValidationIssue) {
  if (isPathEnding(issue.path, ["src"])) {
    return {
      path: formatPath(issue.path),
      problem: issue.message,
      fix: "Use a bare asset filename such as `cache-tiers.svg`, or an `https://` URL. `http://`, protocol-relative, and `data:` sources are not accepted.",
    };
  }

  if (isPathEnding(issue.path, ["placement"])) {
    return {
      path: formatPath(issue.path),
      problem: issue.message,
      fix: "Use `question` or `explanation`, or omit `placement` entirely — an absent `placement` already means `question`.",
    };
  }

  if (isPathEnding(issue.path, ["provider"])) {
    return {
      path: formatPath(issue.path),
      problem: issue.message,
      fix: "`youtube` is the only video provider in version 1.",
    };
  }

  if (isVideoIdPath(issue.path)) {
    return {
      path: formatPath(issue.path),
      problem: issue.message,
      fix: "Take the 11 characters after `v=` or `youtu.be/` in the video URL and use those alone.",
    };
  }

  if (isPathEnding(issue.path, ["start"])) {
    return {
      path: formatPath(issue.path),
      problem: issue.message,
      fix: "Use a whole number of seconds, such as `90` for one minute thirty.",
    };
  }

  if (
    issue.code === "too_small" &&
    (isPathEnding(issue.path, ["images"]) || isPathEnding(issue.path, ["videos"]))
  ) {
    return {
      path: formatPath(issue.path),
      problem: issue.message,
      fix: "Both media fields are optional; omit the field instead of leaving it empty.",
    };
  }

  return undefined;
}

function formatPath(path: QuizValidationIssue["path"]) {
  if (path.length === 0) {
    return "root";
  }

  return path.reduce<string>((formattedPath, segment) => {
    if (typeof segment === "number") {
      return `${formattedPath}[${segment}]`;
    }

    const key = String(segment);

    return formattedPath.length === 0 ? key : `${formattedPath}.${key}`;
  }, "");
}

function isPath(path: QuizValidationIssue["path"], expectedPath: Array<string | number>) {
  return (
    path.length === expectedPath.length &&
    path.every((segment, index) => segment === expectedPath[index])
  );
}

function isPathEnding(path: QuizValidationIssue["path"], ending: Array<string | number>) {
  if (path.length < ending.length) {
    return false;
  }

  return ending.every((segment, index) => path[path.length - ending.length + index] === segment);
}

function isIdLikePath(path: QuizValidationIssue["path"]) {
  const lastSegment = path.at(-1);
  const parentSegment = path.at(-2);

  return lastSegment === "id" || parentSegment === "tags";
}

/** `videos[n].id` is a YouTube video id, not a kebab-case Standard id. */
function isVideoIdPath(path: QuizValidationIssue["path"]) {
  return path.at(-1) === "id" && path.at(-3) === "videos";
}
