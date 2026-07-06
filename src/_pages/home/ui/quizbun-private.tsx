import { Database, Lock, MonitorSmartphone, ShieldCheck } from "lucide-react";

import { cx } from "#styles";
import styles from "./quizbun-private.module.css";
import sharedStyles from "./shared.module.css";

export function QuizbunPrivate() {
  return (
    <section aria-labelledby="private-by-design" className={cx(sharedStyles.section, styles.root)}>
      <p className={styles.eyebrow}>
        <ShieldCheck className={styles.eyebrowIcon} size="16" aria-hidden="true" />
        Local-first
      </p>

      <h2 id="private-by-design" className={styles.title}>
        Private <em className={styles.accent}>by design</em>
      </h2>

      <p className={styles.body}>
        Your own quizzes and your progress{" "}
        <strong className={styles.highlight}>stay on your device</strong>.{" "}
        <span className={styles.muted}>There’s no account and no backend, so</span>{" "}
        <strong className={styles.aha}>your data has nowhere else to go</strong>.
      </p>

      <ul className={styles.flow}>
        <li className={styles.step}>
          <MonitorSmartphone className={styles.stepIcon} size="18" aria-hidden="true" />
          <span className={styles.stepLabel}>On your device</span>
        </li>
        <li className={styles.step}>
          <Database className={styles.stepIcon} size="18" aria-hidden="true" />
          <span className={styles.stepLabel}>In your browser</span>
        </li>
        <li className={styles.step}>
          <Lock className={styles.stepIcon} size="18" aria-hidden="true" />
          <span className={styles.stepLabel}>Never uploaded</span>
        </li>
      </ul>

      <details className={styles.details}>
        <summary className={styles.summary}>How it works, technically</summary>
        <p className={styles.note}>
          Quizbun bakes the public Catalog into the site at build time; your private quizzes and
          progress live in your browser’s IndexedDB. What happens in IndexedDB stays in IndexedDB.
        </p>
      </details>
    </section>
  );
}
