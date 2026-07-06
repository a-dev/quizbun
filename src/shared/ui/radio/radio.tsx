import { type ReactNode } from "react";

import { Radio as RadioPrimitive, type RadioRootProps } from "@base-ui/react/radio";

import { cx, utils } from "#styles";
import styles from "./radio.module.css";

const { Root, Indicator } = RadioPrimitive;

type Feedback = "correct" | "incorrect";

type Props = RadioRootProps & {
  className?: string;
  children?: ReactNode;
  /** Post-submission answer state, rendered independently of checked state. */
  feedback?: Feedback;
};

const LABEL_FEEDBACK_CLASS = {
  correct: styles.feedbackCorrect,
  incorrect: styles.feedbackIncorrect,
} satisfies Record<Feedback, string>;

const CONTROL_FEEDBACK_CLASS = {
  correct: styles.controlFeedbackCorrect,
  incorrect: styles.controlFeedbackIncorrect,
} satisfies Record<Feedback, string>;

const FEEDBACK_DESCRIPTION = {
  correct: "Correct Option",
  incorrect: "Your selection is incorrect",
} satisfies Record<Feedback, string>;

export function Radio({ className, children, feedback, ...props }: Props) {
  return (
    <label
      className={cx(
        styles.label,
        feedback === undefined ? undefined : LABEL_FEEDBACK_CLASS[feedback],
        className,
      )}
    >
      <Root
        {...props}
        className={cx(
          styles.input,
          feedback === undefined ? undefined : CONTROL_FEEDBACK_CLASS[feedback],
        )}
      >
        <Indicator className={styles.indicator} />
      </Root>
      {children != null && <span className={styles.text}>{children}</span>}
      {feedback !== undefined && (
        <span className={utils.visuallyHidden}>. {FEEDBACK_DESCRIPTION[feedback]}</span>
      )}
    </label>
  );
}
