import { Database, Lock, MonitorSmartphone, ShieldCheck } from "lucide-react";

import { cx } from "#styles";
import styles from "./quizbun-private.module.css";
import sharedStyles from "./shared.module.css";

export function QuizbunPrivate() {
  return (
    <section
      aria-labelledby="private-by-design"
      className={cx(sharedStyles.section, sharedStyles.narrative)}
    >
      <p className={sharedStyles.eyebrow}>
        <ShieldCheck className={sharedStyles.eyebrowIcon} size="16" aria-hidden="true" />
        Local-first
      </p>

      <h2 id="private-by-design" className={sharedStyles.title}>
        Private <em className={sharedStyles.accent}>by design</em>
      </h2>

      <p className={sharedStyles.body}>
        Your own quizzes and your progress{" "}
        <strong className={sharedStyles.highlight}>stay on your device</strong>.{" "}
        <span className={sharedStyles.muted}>There’s no account and no backend, so</span>{" "}
        <strong className={sharedStyles.aha}>your data has nowhere else to go</strong>.
      </p>

      <ul className={sharedStyles.flow}>
        <li className={sharedStyles.step}>
          <MonitorSmartphone className={sharedStyles.stepIcon} size="18" aria-hidden="true" />
          <span className={sharedStyles.stepLabel}>On your device</span>
        </li>
        <li className={sharedStyles.step}>
          <Database className={sharedStyles.stepIcon} size="18" aria-hidden="true" />
          <span className={sharedStyles.stepLabel}>In your browser</span>
        </li>
        <li className={sharedStyles.step}>
          <Lock className={sharedStyles.stepIcon} size="18" aria-hidden="true" />
          <span className={sharedStyles.stepLabel}>Never uploaded</span>
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
