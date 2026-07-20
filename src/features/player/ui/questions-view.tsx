import type { Ref } from "react";

import type { Question, Quiz } from "@/shared/lib/quiz";
import type { PageSize, SubmittedAnswer } from "@/shared/lib/storage";
import { quizTransitionStyle } from "@/shared/lib/view-transition";
import { Button } from "@/shared/ui/button";
import { Note } from "@/shared/ui/note";
import { Pagination } from "@/shared/ui/pagination";

import type { OptionOrderByQuestionId } from "../model/option-order";
import type { PlayerPage } from "../model/run-engine";
import { PageSizeControl } from "./page-size-control";
import { PlayerFrame } from "./player-frame";
import { QuestionCard } from "./question-card";

import styles from "./questions-view.module.css";

interface QuestionsViewProps {
  quiz: Quiz;
  pages: PlayerPage[];
  currentPage: PlayerPage;
  pageSize: PageSize;
  submitted: number;
  /** Every Question answered — the only state in which Finish appears (T6.6). */
  complete: boolean;
  optionOrderByQuestionId: OptionOrderByQuestionId;
  /** Inline, recoverable error from a failed submit. */
  error: string | undefined;
  headingRef: Ref<HTMLHeadingElement>;
  onSubmit: (question: Question, answer: SubmittedAnswer, isCorrect: boolean) => void;
  onChangePageSize: (pageSize: PageSize) => void;
  onGoToPage: (pageNumber: number) => void;
  onFinish: () => void;
  onExit: () => void;
}

/** The active-Run screen: status bar, the current page of cards, and paging. */
export function QuestionsView({
  quiz,
  pages,
  currentPage,
  pageSize,
  submitted,
  complete,
  optionOrderByQuestionId,
  error,
  headingRef,
  onSubmit,
  onChangePageSize,
  onGoToPage,
  onFinish,
  onExit,
}: QuestionsViewProps) {
  return (
    <PlayerFrame
      quiz={quiz}
      headingRef={headingRef}
      onExit={onExit}
      statusBar={
        <div className={styles.statusBar}>
          {submitted > 0 ? (
            <div
              className={styles.submittedCounter}
              // Pairs with the detail header's progress line for the swap morph.
              style={quizTransitionStyle("progress", quiz.id)}
            >
              {submitted} of {quiz.questions.length} answered
            </div>
          ) : null}
          <div className={styles.pageCounter}>
            page {currentPage.index + 1} of {pages.length}
          </div>
          <PageSizeControl value={pageSize} onChange={onChangePageSize} />
        </div>
      }
    >
      {error !== undefined && <Note type="error">{error}</Note>}

      {currentPage.questions.map(({ question, index, progress }) => (
        <QuestionCard
          key={question.id}
          question={question}
          index={index}
          progress={progress}
          optionOrder={optionOrderByQuestionId[question.id]}
          onSubmit={onSubmit}
        />
      ))}

      <Pagination
        aria-label="Run pages"
        currentPage={currentPage.index + 1}
        pageCount={pages.length}
        onPageChange={onGoToPage}
      />

      {complete && (
        <Button size="l" variant="primary" onClick={onFinish} className={styles.finishButton}>
          Finish
        </Button>
      )}
    </PlayerFrame>
  );
}
