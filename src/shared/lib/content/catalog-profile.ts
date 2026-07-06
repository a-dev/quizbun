import { marked, type Token } from "marked";

import type { Quiz } from "../quiz";
import { MARKDOWN_FIELD_TIERS, type MarkdownField, renderMarkdownField } from "../render";

/**
 * The Public catalog profile: a stricter rule set applied in CI on top of the
 * Standard — never a second schema. Quizzes are assumed to already be valid
 * per the Standard (the loader guarantees it); these checks only add the
 * Catalog-publishing requirements and the Markdown/sanitization audit.
 */

export interface ProfileIssue {
  severity: "error" | "warning";
  /** Field path in the same dotted/indexed notation as the M1 formatter. */
  path: string;
  problem: string;
  fix: string;
}

interface MarkdownFieldEntry {
  field: MarkdownField;
  path: string;
  value: string;
}

export function checkCatalogProfile(quiz: Quiz): ProfileIssue[] {
  const issues: ProfileIssue[] = [];

  if (quiz.description === undefined) {
    issues.push({
      severity: "error",
      path: "description",
      problem: "The Public catalog profile requires a `description`.",
      fix: "Add a short `description` explaining what the quiz covers and who it is for.",
    });
  }

  if (quiz.language === undefined) {
    issues.push({
      severity: "error",
      path: "language",
      problem: "The Public catalog profile requires a `language`.",
      fix: 'Add a BCP-47 `language` tag such as `"en"`.',
    });
  }

  if (quiz.tags.length === 0) {
    issues.push({
      severity: "error",
      path: "tags",
      problem: "The Public catalog profile requires at least one Tag.",
      fix: "Add one or more kebab-case Tags so the quiz is discoverable in the Catalog filter.",
    });
  }

  for (const entry of listMarkdownFields(quiz)) {
    issues.push(...checkMarkdownField(entry));
  }

  return issues;
}

export function formatProfileIssues(fileLabel: string, issues: readonly ProfileIssue[]): string {
  const reports = issues.map((issue, index) =>
    [
      `${index + 1}. ${issue.severity === "warning" ? "Warning" : "Problem"} at path: \`${issue.path}\``,
      `   Problem: ${issue.problem}`,
      `   Fix: ${issue.fix}`,
    ].join("\n"),
  );

  return [
    `Public quiz does not satisfy the Public catalog profile in ${fileLabel}:`,
    "",
    ...reports,
  ].join("\n");
}

function checkMarkdownField(entry: MarkdownFieldEntry): ProfileIssue[] {
  const issues: ProfileIssue[] = [];
  const tokens = marked.lexer(entry.value);

  if (containsRawHtml(tokens)) {
    issues.push({
      severity: "error",
      path: entry.path,
      problem: "Raw HTML in the source text. The renderer always strips it.",
      fix: "Rewrite the HTML as Markdown (e.g. `**bold**`, `` `code` ``, `[text](url)`).",
    });
  }

  if (MARKDOWN_FIELD_TIERS[entry.field] === "inline" && containsBlockMarkdown(tokens)) {
    issues.push({
      severity: "warning",
      path: entry.path,
      problem:
        "Block Markdown (headings, lists, code blocks, or multiple paragraphs) in a short field. It degrades to literal text.",
      fix: "Keep short fields to one line of inline Markdown, or move the long content to `description` / `explanation`.",
    });
  }

  if (renderMarkdownField(entry.field, entry.value).trim().length === 0) {
    issues.push({
      severity: "error",
      path: entry.path,
      problem: "The field is empty after Markdown rendering and sanitization.",
      fix: "Replace the content with text that survives sanitization (no raw-HTML-only values).",
    });
  }

  return issues;
}

function* listMarkdownFields(quiz: Quiz): Generator<MarkdownFieldEntry> {
  yield { field: "quizTitle", path: "title", value: quiz.title };

  if (quiz.description !== undefined) {
    yield { field: "quizDescription", path: "description", value: quiz.description };
  }

  for (const [index, question] of quiz.questions.entries()) {
    const questionPath = `questions[${index}]`;

    yield { field: "questionTitle", path: `${questionPath}.title`, value: question.title };

    if (question.description !== undefined) {
      yield {
        field: "questionDescription",
        path: `${questionPath}.description`,
        value: question.description,
      };
    }

    yield {
      field: "explanation",
      path: `${questionPath}.explanation`,
      value: question.explanation,
    };

    if (question.type === "single-choice" || question.type === "multiple-choice") {
      for (const [optionIndex, option] of question.options.entries()) {
        yield {
          field: "optionText",
          path: `${questionPath}.options[${optionIndex}].text`,
          value: option.text,
        };
      }
    }

    if (question.type === "input" && question.validation.mode === "text") {
      for (const [answerIndex, answer] of question.validation.acceptedAnswers.entries()) {
        yield {
          field: "acceptedAnswerDisplay",
          path: `${questionPath}.validation.acceptedAnswers[${answerIndex}]`,
          value: answer,
        };
      }
    }
  }
}

function containsRawHtml(tokens: readonly Token[]): boolean {
  return tokens.some((token) => {
    if (token.type === "html") {
      return true;
    }

    if ("tokens" in token && token.tokens !== undefined && containsRawHtml(token.tokens)) {
      return true;
    }

    return "items" in token && containsRawHtml(token.items);
  });
}

const INLINE_SAFE_BLOCK_TOKEN_TYPES = new Set(["paragraph", "space", "text"]);

function containsBlockMarkdown(tokens: readonly Token[]): boolean {
  const blockTokens = tokens.filter((token) => token.type !== "space");

  if (blockTokens.length > 1) {
    return true;
  }

  return blockTokens.some((token) => !INLINE_SAFE_BLOCK_TOKEN_TYPES.has(token.type));
}
