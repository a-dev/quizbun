export type PlayerUrlMode = "detail" | "run" | "summary";

export interface PlayerUrlState {
  mode: PlayerUrlMode;
  questionId?: string;
}

const MODE_PARAM = "mode";
const QUESTION_PARAM = "question";

export function parsePlayerUrlState(
  search: string,
  availableQuestionIds: readonly string[],
): PlayerUrlState {
  const params = new URLSearchParams(search);
  const mode = parseMode(params.get(MODE_PARAM));
  const questionId = params.get(QUESTION_PARAM) ?? undefined;

  return {
    mode,
    questionId:
      mode === "run" && questionId !== undefined && availableQuestionIds.includes(questionId)
        ? questionId
        : undefined,
  };
}

export function updatePlayerUrlSearch(search: string, state: PlayerUrlState): string {
  const params = new URLSearchParams(search);

  params.delete(MODE_PARAM);
  params.delete(QUESTION_PARAM);

  if (state.mode !== "detail") params.set(MODE_PARAM, state.mode);
  if (state.mode === "run" && state.questionId !== undefined) {
    params.set(QUESTION_PARAM, state.questionId);
  }

  const nextSearch = params.toString();

  return nextSearch === "" ? "" : `?${nextSearch}`;
}

function parseMode(value: string | null): PlayerUrlMode {
  if (value === "run" || value === "summary") return value;

  return "detail";
}
