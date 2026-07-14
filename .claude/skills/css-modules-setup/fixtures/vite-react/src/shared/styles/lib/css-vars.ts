import type { CSSProperties } from "react";

type CssVariables = Record<`--${string}`, string | number>;

export function cssVars(variables: CssVariables): CSSProperties {
  return variables as CSSProperties;
}
