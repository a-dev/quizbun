import { BookOpenText, Lightbulb, MousePointerClick, Sparkles } from "lucide-react";

import { cx } from "#styles";
import sharedStyles from "./shared.module.css";

export function QuizbunLearning() {
  return (
    <section
      aria-labelledby="learning-before-testing"
      className={cx(sharedStyles.section, sharedStyles.narrative)}
    >
      <p className={sharedStyles.eyebrow}>
        <Sparkles className={sharedStyles.eyebrowIcon} size="16" aria-hidden="true" />
        Learn, don’t grade
      </p>

      <h2 id="learning-before-testing" className={sharedStyles.title}>
        Learning <em className={sharedStyles.accent}>before</em> testing
      </h2>

      <p className={sharedStyles.body}>
        This is not an exam. Pick an answer (right or wrong) and the{" "}
        <strong className={sharedStyles.highlight}>explanation opens immediately</strong>.{" "}
        <span className={sharedStyles.muted}>The score is a side effect;</span> the{" "}
        <strong className={sharedStyles.aha}>“aha”</strong> is the point.
      </p>

      <ol className={sharedStyles.flow}>
        <li className={sharedStyles.step}>
          <MousePointerClick className={sharedStyles.stepIcon} size="18" aria-hidden="true" />
          <span className={sharedStyles.stepLabel}>Pick an answer</span>
        </li>
        <li className={sharedStyles.step}>
          <BookOpenText className={sharedStyles.stepIcon} size="18" aria-hidden="true" />
          <span className={sharedStyles.stepLabel}>Explanation opens</span>
        </li>
        <li className={sharedStyles.step}>
          <Lightbulb className={sharedStyles.stepIcon} size="18" aria-hidden="true" />
          <span className={sharedStyles.stepLabel}>The “aha”</span>
        </li>
      </ol>
    </section>
  );
}
