import type { CSSProperties, SVGProps } from "react";

import { cx } from "#styles";
import styles from "./link-arrow.module.css";

type Motion = "bounce" | "wobbly";
type Direction = "right" | "left";

const MOTION_CLASS = {
  bounce: styles.motionBounce,
  wobbly: styles.motionWobbly,
} satisfies Record<Motion, string>;

const DIRECTION_CLASS = {
  right: undefined,
  left: styles.directionLeft,
} satisfies Record<Direction, string | undefined>;

type Props = {
  size?: number | string;
  /**
   * Icon width as a multiple of `size`; the extra goes into the shaft while the
   * height and the arrowhead stay the same. `1.3` is 30% longer.
   */
  length?: number;
  motion?: Motion;
  direction?: Direction;
} & Omit<SVGProps<SVGSVGElement>, "children">;

/**
 * Lucide's `arrow-right` (lucide-react 1.48), inlined so the shaft and the head
 * are separate paths; `direction="left"` mirrors it into `arrow-left`. When the
 * enclosing link or button is hovered or keyboard-focused, the head shoots
 * forward with the chosen `motion` and the shaft stretches after it.
 */
const VIEWBOX = 24;
const SHAFT = 14;

export function LinkArrow({
  size = 24,
  length = 1,
  motion = "bounce",
  direction = "right",
  className,
  ...props
}: Props) {
  const extra = VIEWBOX * (Math.max(length, 1) - 1);
  const width = typeof size === "number" ? size * length : `calc(${size} * ${length})`;

  return (
    <svg
      width={extra ? width : size}
      height={size}
      viewBox={`0 0 ${VIEWBOX + extra} ${VIEWBOX}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
      className={cx(styles.root, MOTION_CLASS[motion], DIRECTION_CLASS[direction], className)}
      style={
        {
          "--_shaft": SHAFT + extra,
          "--_icon-height": `${size}px`,
          ...props.style,
        } as CSSProperties
      }
    >
      {/* The shaft's round tail, drawn apart so the shaft can stretch without it. */}
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <path d={`M5 12h${SHAFT + extra}`} strokeLinecap="butt" className={styles.shaft} />
      <path d={`m${12 + extra} 5 7 7-7 7`} className={styles.head} />
    </svg>
  );
}
