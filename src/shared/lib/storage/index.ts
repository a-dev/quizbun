export {
  DEFAULT_PAGE_SIZE,
  getPageSize,
  getVoicePreference,
  PAGE_SIZES,
  setPageSize,
  setVoicePreference,
} from "./preferences";
export type { PageSize } from "./preferences";

export {
  isStorageApiAvailable,
  isStoragePersisted,
  requestStoragePersistence,
} from "./persistence";

export { hasStoredData } from "./local-data";

export {
  deleteQuiz,
  getQuiz,
  listQuizzes,
  quizExists,
  replaceQuiz,
  saveQuiz,
} from "./quiz-repository";

export {
  getRun,
  getRunStatus,
  listUnfinishedRuns,
  reconcileRunWithQuiz,
  resetRun,
  saveAnswer,
} from "./run-repository";

export type {
  QuestionProgress,
  QuizSummary,
  Run,
  RunSource,
  RunStatus,
  StoredQuiz,
  SubmittedAnswer,
} from "./types";
