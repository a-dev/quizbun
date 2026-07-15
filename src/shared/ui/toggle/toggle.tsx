import { Toggle as TogglePrimitive, type ToggleProps } from "@base-ui/react/toggle";

import { cx } from "#styles";
import styles from "./toggle.module.css";

type ToggleSize = "xs" | "s" | "m" | "icon-s" | "icon-m";
type ToggleVariant = "ghost" | "outline" | "soft";

type Props = Omit<ToggleProps<string>, "className"> & {
  size?: ToggleSize;
  variant?: ToggleVariant;
  className?: string;
};

const VARIANT_CLASS = {
  ghost: styles.variantGhost,
  outline: styles.variantOutline,
  soft: styles.variantSoft,
} satisfies Record<ToggleVariant, string>;

const SIZE_CLASS = {
  xs: styles.sizeXs,
  s: styles.sizeS,
  m: styles.sizeM,
  "icon-s": styles.sizeIconS,
  "icon-m": styles.sizeIconM,
} satisfies Record<ToggleSize, string>;

export function Toggle({ size = "icon-m", variant = "ghost", className, ...props }: Props) {
  return (
    <TogglePrimitive
      className={cx(styles.root, VARIANT_CLASS[variant], SIZE_CLASS[size], className)}
      {...props}
    />
  );
}
