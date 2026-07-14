import type { ComponentPropsWithoutRef } from "react";
import { cx, cssVars } from "#styles";
import styles from "./reference-button.module.css";

type Variant = "primary" | "secondary";

type ReferenceButtonProps = Omit<ComponentPropsWithoutRef<"button">, "aria-pressed" | "style"> & {
  loading?: boolean;
  pressed: boolean;
  progress?: number;
  variant: Variant;
};

const VARIANT_CLASS = {
  primary: styles.variantPrimary,
  secondary: styles.variantSecondary,
} satisfies Record<Variant, string>;

export function ReferenceButton({
  loading = false,
  pressed,
  progress = 0,
  variant,
  className,
  disabled,
  children,
  ...buttonProps
}: ReferenceButtonProps) {
  const normalizedProgress = Math.min(1, Math.max(0, progress));

  return (
    <button
      {...buttonProps}
      aria-busy={loading || undefined}
      aria-pressed={pressed}
      className={cx(styles.root, VARIANT_CLASS[variant], className)}
      data-loading={loading || undefined}
      disabled={disabled || loading}
      style={cssVars({ "--_progress": normalizedProgress })}
    >
      <span aria-hidden="true" className={styles.spinner} />
      <span className={styles.label}>{children}</span>
    </button>
  );
}
