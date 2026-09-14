import { utils } from "#styles";

/** Post-submission marking for one Option, rendered independently of checked state. */
export type AnswerFeedback = "correct" | "incorrect";

const DESCRIPTION = {
  correct: "Correct Option",
  incorrect: "Your selection is incorrect",
} satisfies Record<AnswerFeedback, string>;

/**
 * Announces the marking to assistive technology. Visual controls show it with
 * color and iconography, which a screen reader cannot convey on its own.
 */
export function AnswerFeedbackDescription({ feedback }: { feedback: AnswerFeedback }) {
  return <span className={utils.visuallyHidden}>. {DESCRIPTION[feedback]}</span>;
}
