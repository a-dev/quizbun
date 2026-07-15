import { withBase } from "@/shared/lib/routing";

import { typography } from "#styles";
import styles from "./import-quiz-texts.module.css";

export function ImportQuizTexts() {
  return (
    <div className={styles.root}>
      <h1 className={typography.h1}>Import a quiz</h1>
      <div className={styles.texts}>
        <p className={styles.paragraph}>
          Studying something? Turn it into a quiz. Pull from your notes, a course, or any docs - and
          after each answer you get an explanation of why it's right, so you actually learn instead
          of just guessing.
        </p>
        <p className={styles.paragraph}>
          It all stays on your device. Your quizzes and progress never leave this browser and never
          go public - this is your own private space.
        </p>
        <p className={styles.paragraph}>
          The quick way: copy the <a href={withBase("docs/prompt/")}>AI prompt</a>, tell any AI chat
          what you want to study, and paste the JSON it gives you below. Rather write it yourself?
          Start from an <a href={withBase("docs/examples/")}>example</a> and look up fields in the{" "}
          <a href={withBase("docs/standard/")}>quiz format</a> as you go.
        </p>
        <p className={styles.paragraph}>
          Paste anything and it's checked right here before it's saved. If something's off, you get
          the exact spot and how to fix it - handy whether you patch it yourself or hand it back to
          the AI.
        </p>
      </div>
    </div>
  );
}
