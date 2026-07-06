import type { AriaAttributes, MouseEventHandler } from "react";

import { Button as ButtonPrimitive, type ButtonProps } from "@base-ui/react/button";

import { cx } from "#styles";
import styles from "./button.module.css";

type Size = "s" | "m" | "l" | "icon-xs" | "icon-s" | "icon-m";
type Variant = "primary" | "secondary" | "outline" | "destructive" | "ghost" | "link" | "icon";

type Props = ButtonProps & {
  size?: Size;
  variant?: Variant;
  className?: string;
};

const VARIANT_CLASS = {
  primary: styles.variantPrimary,
  secondary: styles.variantSecondary,
  outline: styles.variantOutline,
  destructive: styles.variantDestructive,
  ghost: styles.variantGhost,
  link: styles.variantLink,
  icon: styles.variantIcon,
} satisfies Record<Variant, string>;

const SIZE_CLASS = {
  s: styles.sizeS,
  m: styles.sizeM,
  l: styles.sizeL,
  "icon-xs": styles.sizeIconXs,
  "icon-s": styles.sizeIconS,
  "icon-m": styles.sizeIconM,
} satisfies Record<Size, string>;

export function Button({ children, variant = "primary", size = "m", className, ...props }: Props) {
  return (
    <ButtonPrimitive
      className={cx(styles.button, VARIANT_CLASS[variant], SIZE_CLASS[size], className)}
      {...props}
    >
      {children}
    </ButtonPrimitive>
  );
}

type LinkAsButtonProps = Omit<Props, "onClick" | "aria-current"> & {
  href: string;
  target?: "_blank";
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  "aria-current"?: AriaAttributes["aria-current"];
  "aria-label"?: string;
};

export function LinkAsButton({
  children,
  className,
  variant = "link",
  size,
  href,
  target,
  disabled,
  onClick,
  "aria-current": ariaCurrent,
  "aria-label": ariaLabel,
}: LinkAsButtonProps) {
  return (
    <a
      href={href}
      target={target}
      className={cx(styles.button, !!size && SIZE_CLASS[size], VARIANT_CLASS[variant], className)}
      aria-current={ariaCurrent}
      aria-disabled={disabled}
      aria-label={ariaLabel}
      data-disabled={disabled}
      onClick={onClick}
    >
      {children}
    </a>
  );
}
