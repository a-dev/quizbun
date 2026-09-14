import { type ReactNode } from "react";

import { Checkbox as CheckboxPrimitive, type CheckboxRootProps } from "@base-ui/react/checkbox";
import { Check, Minus } from "lucide-react";

import { AnswerFeedbackDescription, type AnswerFeedback } from "@/shared/ui/answer-feedback";

import { cx } from "#styles";
import styles from "./checkbox.module.css";

const { Root, Indicator } = CheckboxPrimitive;

type Props = Omit<CheckboxRootProps, "children"> & {
  className?: string;
  children: ReactNode;
  /** Post-submission answer state, rendered independently of checked state. */
  feedback?: AnswerFeedback;
};

const LABEL_FEEDBACK_CLASS = {
  correct: styles.feedbackCorrect,
  incorrect: styles.feedbackIncorrect,
} satisfies Record<AnswerFeedback, string>;

const CONTROL_FEEDBACK_CLASS = {
  correct: styles.controlFeedbackCorrect,
  incorrect: styles.controlFeedbackIncorrect,
} satisfies Record<AnswerFeedback, string>;

export function Checkbox({ className, children, feedback, ...props }: Props) {
  return (
    <label
      className={cx(
        styles.label,
        feedback === undefined ? undefined : LABEL_FEEDBACK_CLASS[feedback],
      )}
    >
      <Root
        className={cx(
          styles.root,
          feedback === undefined ? undefined : CONTROL_FEEDBACK_CLASS[feedback],
          className,
        )}
        {...props}
      >
        <Indicator
          className={styles.indicator}
          render={(props) =>
            "data-indeterminate" in props ? (
              <Minus {...props} size={14} />
            ) : (
              <Check {...props} size={14} strokeWidth={3} />
            )
          }
        />
      </Root>
      <div className={styles.text}>{children}</div>
      {feedback !== undefined && <AnswerFeedbackDescription feedback={feedback} />}
    </label>
  );
}
