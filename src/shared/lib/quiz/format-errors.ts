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

  if (issue.code === "invalid_type" && issue.message === "Required field missing.") {
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
