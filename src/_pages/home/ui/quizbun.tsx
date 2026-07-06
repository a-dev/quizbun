import { withBase } from "@/shared/lib/routing";

import { cx } from "#styles";
import styles from "./quizbun.module.css";

export function Quizbun() {
  return (
    <section className={styles.root}>
      <div className={styles.inner}>
        <p className={styles.body}>
          Quizbun gives you quizzes where every answer comes with an explanation, so you learn
          something even when you guess wrong. Browse{" "}
          <a href={withBase("quizzes/")} className={cx(styles.link, styles.catalog)}>
            the Catalog
          </a>
          , bring{" "}
          <a href={withBase("library/")} className={cx(styles.link, styles.library)}>
            your
          </a>{" "}
          <a href={withBase("library/")} className={cx(styles.link, styles.library)}>
            own
          </a>{" "}
          <a href={withBase("library/")} className={cx(styles.link, styles.library)}>
            quizzes
          </a>
          , or ask your AI to{" "}
          <a href={withBase("docs/prompt/")} className={cx(styles.link, styles.prompt)}>
            write one for you
          </a>
          .
        </p>
      </div>
    </section>
  );
}
