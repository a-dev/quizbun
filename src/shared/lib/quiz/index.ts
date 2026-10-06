export { checkAnswer, parseNumericInput } from "./check-answer";
export { computeContentHash } from "./content-hash";
export { downloadQuizJson } from "./export-quiz";
export { formatQuizValidationErrors } from "./format-errors";
export {
  checkImportQuestionCount,
  checkImportSize,
  formatImportQuestionCountReport,
  formatImportSizeReport,
  MAX_IMPORT_BYTES,
  MAX_IMPORT_QUESTIONS,
  utf8ByteLength,
} from "./import-limits";
export { parseQuizJson } from "./parse-quiz-json";

export {
  ASSET_FILE_NAME_PATTERN,
  imageSchema,
  ID_PATTERN,
  inputQuestionSchema,
  inputValidationSchema,
  multipleChoiceQuestionSchema,
  numericInputValidationSchema,
  optionSchema,
  questionSchema,
  quizSchema,
  singleChoiceQuestionSchema,
  textInputValidationSchema,
  videoSchema,
} from "./schema";

export type {
  Image,
  InputQuestion,
  InputValidation,
  MediaPlacement,
  MultipleChoiceQuestion,
  NumericInputValidation,
  Option,
  Question,
  Quiz,
  SingleChoiceQuestion,
  TextInputValidation,
  Video,
} from "./schema";
