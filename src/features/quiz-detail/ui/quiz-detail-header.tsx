import { memo, useMemo } from "react";

import { Download } from "lucide-react";

import { downloadQuizJson } from "@/shared/lib/quiz";
import type { Quiz } from "@/shared/lib/quiz";
import { renderMarkdownField } from "@/shared/lib/render";
import type { RunStatus } from "@/shared/lib/storage";
import { quizTransitionStyle } from "@/shared/lib/view-transition";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { MarkdownRender } from "@/shared/ui/markdown";

import { typography } from "#styles";
import styles from "./quiz-detail-header.module.css";

interface QuizDetailHeaderProps {
  quiz: Quiz;
  runStatus: RunStatus | undefined;
}

/**
 * `memo` + `useMemo`: the parent re-renders on each progress load, dialog
 * toggle and error, but the header's only changing input is `runStatus`. The
 * quiz is stable, so its Markdown title/description are parsed (`marked` +
 * `sanitize-html`) once and reused instead of on every render.
 */
function QuizDetailHeaderComponent({ quiz, runStatus }: QuizDetailHeaderProps) {
  const titleHtml = useMemo(() => renderMarkdownField("quizTitle", quiz.title), [quiz.title]);
  const descriptionHtml = useMemo(
    () =>
      quiz.description === undefined
        ? undefined
        : renderMarkdownField("quizDescription", quiz.description),
    [quiz.description],
  );

  return (
    // View-transition names are inline by necessity (per-quiz dynamic idents).
    // They pair this header with the Catalog/home card (cross-document) and
    // with the player header (same-document swap).
    <header className={styles.root}>
      {quiz.tags.length > 0 && (
        <div className={styles.tags} aria-label="Tags" style={quizTransitionStyle("tags", quiz.id)}>
          {quiz.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      )}
      <h1
        id="quiz-detail-title"
        className={typography.h1}
        dangerouslySetInnerHTML={{ __html: titleHtml }}
        style={quizTransitionStyle("title", quiz.id)}
      />
      <div className={styles.meta} aria-label="Quiz metadata">
        <span style={quizTransitionStyle("count", quiz.id)}>
          {quiz.questions.length} {quiz.questions.length === 1 ? "question" : "questions"}
        </span>
        {quiz.author !== undefined && <> · by {quiz.author}</>}
        {/* Progress lives in the header meta, not the button label (idea.md). */}
        {runStatus !== undefined && runStatus.kind !== "none" && runStatus.answered > 0 && (
          <div className={styles.progress} style={quizTransitionStyle("progress", quiz.id)}>
            {`${runStatus.answered} of ${runStatus.total} answered`}
          </div>
        )}
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={() => downloadQuizJson(quiz)}
          title="Download quiz JSON"
        >
          <Download size="16" />
        </Button>
      </div>

      {descriptionHtml !== undefined && (
        <MarkdownRender
          content={descriptionHtml}
          size="m"
          className={styles.description}
          style={quizTransitionStyle("description", quiz.id)}
        />
      )}
    </header>
  );
}

export const QuizDetailHeader = memo(QuizDetailHeaderComponent);
