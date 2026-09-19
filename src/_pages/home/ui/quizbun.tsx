import type { ReactNode } from "react";

import { QuizbunCreate } from "./quizbun-create";

import styles from "./quizbun.module.css";

type Props = {
  copyPrompt?: ReactNode;
};

export function Quizbun({ copyPrompt }: Readonly<Props>) {
  return (
    <section className={styles.root}>
      <div className={styles.inner}>
        <p className={styles.body}>
          With Quizbun, every answer comes with an explanation, so you learn something new with each
          try.
          {/* Browse{" "}
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
          . */}
        </p>

        <QuizbunCreate copyPrompt={copyPrompt} />
      </div>
    </section>
  );
}
