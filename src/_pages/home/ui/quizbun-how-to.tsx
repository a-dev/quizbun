import { ArrowRight, Compass, Library, Sparkles, Upload } from "lucide-react";

import { withBase } from "@/shared/lib/routing";

import { cx } from "#styles";
import { utils } from "#styles";
import styles from "./quizbun-how-to.module.css";
import sharedStyles from "./shared.module.css";

type Props = {
  quizCount: number;
};

export function QuizbunHowTo({ quizCount }: Props) {
  return (
    <section aria-labelledby="get-quizzes" className={cx(sharedStyles.section, styles.root)}>
      <div className={styles.introFrame}>
        <div className={cx(styles.introWrapper, utils.cellBackgroundContained)}>
          <div className={styles.intro}>
            <p className={styles.eyebrow}>
              <Compass className={styles.eyebrowIcon} size="16" aria-hidden="true" />
              Where quizzes come from
            </p>

            <h2 id="get-quizzes" className={styles.title}>
              Three ways to <em className={styles.accent}>begin</em>
            </h2>

            <p className={styles.lead}>
              Take one, make one, share one. Every quiz you add sticks around for the next person,
              and sometimes the next person is <strong className={styles.aha}>future you</strong>.
            </p>
          </div>
        </div>
      </div>

      <ul className={styles.paths}>
        <li className={cx(styles.path, styles.pathCatalog)}>
          <span className={styles.step} aria-hidden="true">
            01
          </span>
          <span className={styles.pathIcon}>
            <Library size="24" aria-hidden="true" />
          </span>
          <h3 className={styles.pathTitle}>Browse the Catalog</h3>
          <p className={styles.pathBody}>
            {quizCount} ready-to-take {quizCount === 1 ? "quiz" : "quizzes"}, every answer
            explained.
          </p>
          <a href={withBase("quizzes/")} className={styles.cta}>
            Pick a quiz
            <ArrowRight className={styles.ctaIcon} size="16" aria-hidden="true" />
          </a>
        </li>

        <li className={cx(styles.path, styles.pathImport)}>
          <span className={styles.step} aria-hidden="true">
            02
          </span>
          <span className={styles.pathIcon}>
            <Upload size="24" aria-hidden="true" />
          </span>
          <h3 className={styles.pathTitle}>Bring your own</h3>
          <p className={styles.pathBody}>
            Import a quiz you made (or one a friend shared) straight into your library.
          </p>
          <a href={withBase("import/")} className={styles.cta}>
            Import a quiz
            <ArrowRight className={styles.ctaIcon} size="16" aria-hidden="true" />
          </a>
        </li>

        <li className={cx(styles.path, styles.pathAi)}>
          <span className={styles.step} aria-hidden="true">
            03
          </span>
          <span className={styles.pathIcon}>
            <Sparkles size="24" aria-hidden="true" />
          </span>
          <h3 className={styles.pathTitle}>Generate with AI</h3>
          <p className={styles.pathBody}>
            Copy our ready-made prompt into your favorite chatbot and watch a quiz appear.
          </p>
          <a href={withBase("docs/prompt/")} className={styles.cta}>
            Open the prompt
            <ArrowRight className={styles.ctaIcon} size="16" aria-hidden="true" />
          </a>
        </li>
      </ul>

      <details className={styles.details}>
        <summary className={styles.summary}>For quiz makers</summary>
        <p className={styles.note}>
          A quiz is a single JSON file that follows{" "}
          <a className={styles.link} href={withBase("docs/standard/")}>
            the published standard
          </a>
          , the same schema the AI prompt teaches a chatbot. Anything that validates can be
          imported.
        </p>
      </details>
    </section>
  );
}
