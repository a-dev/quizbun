import type { Quiz } from "../quiz";

/** Storage envelope: the validated Quiz exactly as imported, never mutated. */
export interface StoredQuiz {
  quiz: Quiz;
  /** Import time, epoch milliseconds. */
  importedAt: number;
}

/** Metadata projection for the Library list. */
export interface QuizSummary {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  questionCount: number;
  importedAt: number;
}

/**
 * Submitted answer payload by Question type: Option index for single-choice,
 * sorted Option indexes for multiple-choice, raw input string for input.
 */
export type SubmittedAnswer = number | number[] | string;

export interface QuestionProgress {
  contentHash: string;
  submittedAnswer: SubmittedAnswer;
  isCorrect: boolean;
}

/**
 * Run namespace: Catalog and Library are separate namespaces (idea.md), so a
 * public quiz and a same-id private copy track Progress independently.
 */
export type RunSource = "catalog" | "library";

/** Exactly one saved Run per quiz per namespace; keyed by `${source}:${quizId}`. */
export interface Run {
  /** Primary key: `${source}:${quizId}`. */
  key: string;
  source: RunSource;
  quizId: string;
  /** Per-Question record keyed by question id. */
  answers: Record<string, QuestionProgress>;
  startedAt: number;
  /** Last answer save time, epoch milliseconds. */
  updatedAt: number;
  finishedAt?: number;
}

export type RunStatus =
  | { kind: "none" }
  | { kind: "in-progress"; answered: number; total: number }
  | { kind: "finished"; answered: number; total: number };
