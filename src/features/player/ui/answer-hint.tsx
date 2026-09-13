import { CircleDot, ListChecks } from "lucide-react";

import type { Question } from "@/shared/lib/quiz";

import styles from "./answer-hint.module.css";

/** The Question types that present a set of Options to choose between. */
type ChoiceType = Extract<Question["type"], "single-choice" | "multiple-choice">;

interface Props {
  type: ChoiceType;
  /** Referenced by the Option group's `aria-describedby`. */
  id: string;
}

const HINT_TEXT = {
  "single-choice": "Select one",
  "multiple-choice": "Select all that apply",
} satisfies Record<ChoiceType, string>;

const HINT_ICON = {
  "single-choice": CircleDot,
  "multiple-choice": ListChecks,
} satisfies Record<ChoiceType, typeof CircleDot>;

export function AnswerHint({ type, id }: Props) {
  const Icon = HINT_ICON[type];

  return (
    <p id={id} className={styles.root}>
      <Icon className={styles.icon} size={16} aria-hidden="true" />
      {HINT_TEXT[type]}
    </p>
  );
}
