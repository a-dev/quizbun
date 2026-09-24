import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "#styles";
import styles from "./badge.module.css";

type Size = "s" | "m";
type Intent = "taxonomy" | "success" | "error";

const SIZE_STYLES = {
  s: styles.sizeS,
  m: styles.sizeM,
} satisfies Record<Size, string>;

const INTENT_STYLES = {
  taxonomy: styles.intentTaxonomy,
  success: styles.intentSuccess,
  error: styles.intentError,
} satisfies Record<Intent, string>;

type Props = {
  children?: ReactNode;
  size?: Size;
  intent?: Intent;
  /** Renders the badge as a link (e.g. a Tag badge linking to its filtered list). */
  href?: string;
} & HTMLAttributes<HTMLElement>;
export function Badge({
  children,
  size = "s",
  intent = "taxonomy",
  href,
  className,
  ...props
}: Props) {
  const Element = href === undefined ? "div" : "a";

  return (
    <Element
      {...props}
      href={href}
      className={cx(styles.root, SIZE_STYLES[size], INTENT_STYLES[intent], className)}
    >
      {children}
    </Element>
  );
}
