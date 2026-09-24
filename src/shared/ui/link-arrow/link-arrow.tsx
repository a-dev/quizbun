import type { SVGProps } from "react";

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
  motion?: Motion;
  direction?: Direction;
} & Omit<SVGProps<SVGSVGElement>, "children">;

/**
 * Lucide's `arrow-right` (lucide-react 1.48), inlined so the shaft and the head
 * are separate paths; `direction="left"` mirrors it into `arrow-left`. When the
 * enclosing link or button is hovered or keyboard-focused, the head shoots
 * forward with the chosen `motion` and the shaft stretches after it.
 */
export function LinkArrow({
  size = 24,
  motion = "bounce",
  direction = "right",
  className,
  ...props
}: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
      className={cx(styles.root, MOTION_CLASS[motion], DIRECTION_CLASS[direction], className)}
    >
      {/* The shaft's round tail, drawn apart so the shaft can stretch without it. */}
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <path d="M5 12h14" strokeLinecap="butt" className={styles.shaft} />
      <path d="m12 5 7 7-7 7" className={styles.head} />
    </svg>
  );
}
