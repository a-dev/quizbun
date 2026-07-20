import type { ReactNode, Ref } from "react";

import type { Quiz } from "@/shared/lib/quiz";
import { renderMarkdownFieldText } from "@/shared/lib/render";
import { quizTransitionStyle } from "@/shared/lib/view-transition";
import { BackButton } from "@/shared/ui/breadcrumbs";

import { cx, typography } from "#styles";
import styles from "./player-frame.module.css";

interface PlayerFrameProps {
  quiz: Quiz;
  headingRef?: Ref<HTMLHeadingElement>;
  /** Rendered inside the header, under the title (status bar, controls). */
  statusBar?: ReactNode;
  onExit: () => void;
  children: ReactNode;
}

/**
 * Shared chrome for the player's states: back control, the quiz title, and an
 * optional status bar above the state's own content. Extracted so the loading
 * state shows the same header as the loaded questions view — the title (and
 * its `view-transition-name`, pairing it with the detail header) must exist
 * from the first frame for the detail → player morph to connect.
 */
export function PlayerFrame({ quiz, headingRef, statusBar, onExit, children }: PlayerFrameProps) {
  return (
    <section aria-labelledby="player-page-title" className={styles.root}>
      <BackButton onClick={onExit} text="Back to quiz details" />
      <header className={styles.header}>
        <h1
          id="player-page-title"
          ref={headingRef}
          // Quiz titles allow inline Markdown only; raw HTML is always stripped.
          dangerouslySetInnerHTML={{ __html: renderMarkdownFieldText("quizTitle", quiz.title) }}
          className={cx(typography.h1, styles.title)}
          style={quizTransitionStyle("title", quiz.id)}
        />
        {statusBar}
      </header>
      {children}
    </section>
  );
}
