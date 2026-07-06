import type { CSSProperties } from "react";

type CssVars = Record<`--${string}`, string | number>;

export function cssVars(vars: CssVars): CSSProperties {
  return vars as CSSProperties;
}
