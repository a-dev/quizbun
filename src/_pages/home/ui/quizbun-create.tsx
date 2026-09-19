import type { ReactNode } from "react";

import { ArrowRight, ChevronDown, CircleCheck, FileJson2, Sparkles } from "lucide-react";

import { withBase } from "@/shared/lib/routing";

import { cx, shape } from "#styles";
import styles from "./quizbun-create.module.css";

type Props = {
  copyPrompt?: ReactNode;
};

export function QuizbunCreate({ copyPrompt }: Readonly<Props>) {
  return (
    <div className={styles.root}>
      <p className={styles.eyebrow}>
        <Sparkles className={styles.eyebrowIcon} size="16" aria-hidden="true" />
        ...with the AI you already use
      </p>

      <details className={styles.disclosure}>
        <summary className={styles.headline}>
          <h2 className={styles.title}>
            Nothing on your topic? <em className={styles.accent}>Write it in a minute.</em>
          </h2>
          <span className={styles.marker} aria-hidden="true">
            <ChevronDown size="24" />
          </span>
        </summary>

        <p className={styles.lead}>
          You can quickly create a quiz with the AI you use every day. Choose a quiz topic and
          describe it to your AI.
        </p>

        <ol className={styles.thread}>
          <li className={styles.beat}>
            <span className={styles.who}>You</span>
            <div className={styles.body}>
              <p className={cx(styles.bubble, shape.roundedS)}>
                Make me a quiz on <mark className={styles.topic}>the water cycle</mark> — 12
                questions, and add images or a video where they help.
              </p>

              <div className={styles.tools}>
                <div className={styles.tool}>
                  <p className={styles.toolLabel}>Send it with the Quizbun prompt:</p>
                  <div className={styles.copySlot}>{copyPrompt}</div>
                </div>

                <div className={styles.tool}>
                  <p className={styles.toolLabel}>
                    Or, if your agent runs Agent Skills, just{" "}
                    <code className={styles.command}>/create-quiz</code>
                  </p>
                  <details className={styles.details}>
                    <summary className={styles.summary}>What is a skill?</summary>
                    <p className={styles.note}>
                      A folder of instructions an agent installs once and runs on demand.{" "}
                      <a className={styles.link} href={withBase("docs/prompt/")}>
                        create-quiz
                      </a>{" "}
                      hands yours the whole Standard plus a validator, so it checks its own answer
                      sheet before you ever see the file.
                    </p>
                  </details>
                </div>
              </div>
            </div>
          </li>

          <li className={styles.beat}>
            <span className={styles.who}>Your AI</span>
            <div className={styles.body}>
              <p className={cx(styles.file, shape.roundedS)}>
                <FileJson2 className={styles.fileIcon} size="28" aria-hidden="true" />
                <span className={styles.fileName}>water-cycle.json</span>
                <span className={styles.fileMeta}>
                  <CircleCheck className={styles.fileCheck} size="16" aria-hidden="true" />
                  12 questions, every one explained
                </span>
              </p>
            </div>
          </li>

          <li className={styles.beat}>
            <span className={styles.who}>Quizbun</span>
            <div className={styles.body}>
              <p className={styles.outcome}>
                Drop that file{" "}
                <a href={withBase("import/")} className={styles.cta}>
                  here
                </a>{" "}
                and start. Quizbun will save your progress on this device, so you can stop
                mid-question and come back to the same spot.
              </p>
              <a href={withBase("import/")} className={styles.cta}>
                Import a quiz
                <ArrowRight className={styles.ctaIcon} size="16" aria-hidden="true" />
              </a>
            </div>
          </li>
        </ol>
      </details>
    </div>
  );
}
