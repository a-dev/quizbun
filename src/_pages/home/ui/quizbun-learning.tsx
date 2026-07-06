import { BookOpenText, Lightbulb, MousePointerClick, Sparkles } from "lucide-react";

import { cx } from "#styles";
import styles from "./quizbun-learning.module.css";
import sharedStyles from "./shared.module.css";

export function QuizbunLearning() {
  return (
    <section
      aria-labelledby="learning-before-testing"
      className={cx(sharedStyles.section, styles.root)}
    >
      <p className={styles.eyebrow}>
        <Sparkles className={styles.eyebrowIcon} size="16" aria-hidden="true" />
        Learn, don’t grade
      </p>

      <h2 id="learning-before-testing" className={styles.title}>
        Learning <em className={styles.accent}>before</em> testing
      </h2>

      <p className={styles.body}>
        This is not an exam. Pick an answer (right or wrong) and the{" "}
        <strong className={styles.highlight}>explanation opens immediately</strong>.{" "}
        <span className={styles.muted}>The score is a side effect;</span> the{" "}
        <strong className={styles.aha}>“aha”</strong> is the point.
      </p>

      <ol className={styles.flow}>
        <li className={styles.step}>
          <MousePointerClick className={styles.stepIcon} size="18" aria-hidden="true" />
          <span className={styles.stepLabel}>Pick an answer</span>
        </li>
        <li className={styles.step}>
          <BookOpenText className={styles.stepIcon} size="18" aria-hidden="true" />
          <span className={styles.stepLabel}>Explanation opens</span>
        </li>
        <li className={styles.step}>
          <Lightbulb className={styles.stepIcon} size="18" aria-hidden="true" />
          <span className={styles.stepLabel}>The “aha”</span>
        </li>
      </ol>
    </section>
  );
}
