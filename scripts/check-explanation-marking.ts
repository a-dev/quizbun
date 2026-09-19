import { collectJsonFiles, readQuizFiles } from "./quiz-validation";

import type {
  MultipleChoiceQuestion,
  Question,
  Quiz,
  SingleChoiceQuestion,
} from "../src/shared/lib/quiz";

/**
 * Teaching-quality gate, judged rather than parsed: does a Question's
 * `explanation` argue for a different answer than the one its `isCorrect`
 * flags mark? Schema validation, the Markdown audit, and the Public catalog
 * profile all pass on that mistake — it is a claim about meaning, not shape,
 * and it is the failure an AI-generated Quiz makes most often.
 *
 * One TypeSafe noul per choice Question. Code owns the loop, the threshold,
 * and the report; the model only answers the one question code cannot.
 *
 * Needs `TYPESAFE_API_KEY` and network access, so it stays out of CI alongside
 * the other optional analysers:
 *
 *   bun run quiz:explanations:check content/quizzes/foo.json
 *   bun run quiz:explanations:check content/quizzes --all
 *
 * `--all` prints every probability rather than only the flagged Questions —
 * the calibration view for retuning `FLAG_THRESHOLD` against real content.
 */

const API_URL = "https://api.typesafe.ai/v1/systemone";
const MODEL = "jev-latest";

/** Above this the report calls it a problem; below it the pair reads as consistent. */
const FLAG_THRESHOLD = 0.5;
/** Printed as context even when they stay under the flag line, to show the margin. */
const NOTICE_THRESHOLD = 0.15;

/** Well under the documented 1,200 requests/minute, and kind to a laptop run. */
const CONCURRENCY = 6;

interface Judgement {
  contradicts: number;
  inputTokens: number;
  path: string;
  questionId: string;
  title: string;
}

const CONTRADICTION_QUESTION = {
  type: "noul",
  instructions:
    "Does `explanation` argue that a different answer is correct than the options listed in `marked_correct`?",
  criteria: {
    true: "The explanation's reasoning supports an option that is not in `marked_correct`, or argues against one that is. This includes an explanation that names a correct answer whose text does not match any option in `marked_correct`.",
    false:
      "The explanation's reasoning supports exactly the options in `marked_correct`. It may add background, caveats, or discuss why other options are wrong, as long as it endorses the marked set.",
  },
} as const;

type ChoiceQuestion = MultipleChoiceQuestion | SingleChoiceQuestion;

function isChoiceQuestion(question: Question): question is ChoiceQuestion {
  return question.type === "single-choice" || question.type === "multiple-choice";
}

/**
 * Only what the judgement needs. Option identity is JSON order everywhere in
 * the Standard, so `marked_correct` carries indexes and the model reads the
 * matching texts out of `options`.
 */
function buildState(question: ChoiceQuestion) {
  const { options } = question;

  return {
    question_title: question.title,
    question_description: question.description,
    options: options.map((option, index) => ({ index, text: option.text })),
    marked_correct: options.flatMap((option, index) => (option.isCorrect ? [index] : [])),
    explanation: question.explanation,
  };
}

async function judge(quiz: Quiz, question: ChoiceQuestion, index: number): Promise<Judgement> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TYPESAFE_API_KEY ?? ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      state: buildState(question),
      questions: { explanation_contradicts_marking: CONTRADICTION_QUESTION },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `TypeSafe ${response.status} on ${quiz.id}#${question.id}: ${await response.text()}`,
    );
  }

  const body = (await response.json()) as {
    answers: { explanation_contradicts_marking: { noul: number } };
    usage: { input_tokens: number };
  };

  return {
    contradicts: body.answers.explanation_contradicts_marking.noul,
    inputTokens: body.usage.input_tokens,
    path: `questions[${index}]`,
    questionId: question.id,
    title: question.title,
  };
}

/** Bounded fan-out: the questions are independent, so only the rate limit orders them. */
async function judgeAll(quiz: Quiz): Promise<Judgement[]> {
  const targets = quiz.questions.flatMap((question, index) =>
    isChoiceQuestion(question) ? [{ question, index }] : [],
  );
  const results: Judgement[] = [];
  let next = 0;

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, targets.length) }, async () => {
      while (next < targets.length) {
        const target = targets[next++];

        if (target === undefined) return;

        results.push(await judge(quiz, target.question, target.index));
      }
    }),
  );

  return results.sort((a, b) => b.contradicts - a.contradicts);
}

function formatIssue(item: Judgement, position: number): string[] {
  return [
    `${position + 1}. Problem at path: \`${item.path}\` (\`${item.questionId}\`)`,
    `   Contradiction probability: ${item.contradicts.toFixed(3)}`,
    "   Problem: The Explanation argues for an answer other than the one marked `isCorrect`.",
    "   Fix: Re-read the Explanation against the marked Options. Move the `isCorrect` flag, or rewrite the Explanation to defend the marked answer.",
    `   Question: ${item.title}`,
    "",
  ];
}

function formatReport(fileLabel: string, judgements: Judgement[], showAll: boolean): string {
  const flagged = judgements.filter((item) => item.contradicts >= FLAG_THRESHOLD);
  const notable = judgements.filter(
    (item) => item.contradicts >= NOTICE_THRESHOLD && item.contradicts < FLAG_THRESHOLD,
  );
  const lines = flagged.flatMap(formatIssue);

  // `--all` is the calibration view: every probability, so a maintainer can see
  // where the real distribution sits before trusting the threshold.
  if (showAll) {
    lines.push("Every Question, highest first:");

    for (const item of judgements) {
      lines.push(`   ${item.contradicts.toFixed(3)}  ${item.questionId}`);
    }

    lines.push("");
  } else if (notable.length > 0) {
    lines.push("Below the flag line, highest first:");

    for (const item of notable) {
      lines.push(`   ${item.contradicts.toFixed(3)}  ${item.questionId}`);
    }

    lines.push("");
  }

  return [
    `Explanation/marking check for ${fileLabel}:`,
    "",
    ...lines,
    `${flagged.length} flagged of ${judgements.length} choice Question(s) at threshold ${FLAG_THRESHOLD}.`,
    `${judgements.reduce((total, item) => total + item.inputTokens, 0)} input tokens.`,
  ].join("\n");
}

const showAll = process.argv.includes("--all");
const target = process.argv.slice(2).find((argument) => !argument.startsWith("--"));

if (target === undefined) {
  console.error("Usage: bun run quiz:explanations:check <quiz.json|dir> [--all]");
  process.exit(1);
}

if (process.env.TYPESAFE_API_KEY === undefined) {
  console.error("TYPESAFE_API_KEY is not set.");
  process.exit(1);
}

for (const { quiz, fileLabel } of readQuizFiles(collectJsonFiles(target))) {
  const judgements = await judgeAll(quiz);

  console.log(`${formatReport(fileLabel, judgements, showAll)}\n`);
}
