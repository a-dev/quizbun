import type { ComponentProps } from "react";

import { ArrowLeft } from "lucide-react";

import { cx } from "#styles";
import styles from "./back-button.module.css";

type CommonProps = {
  className?: string;
  text?: string;
};

type LinkProps = CommonProps &
  Omit<ComponentProps<"a">, "className"> & {
    href: string;
    onClick?: never;
  };

type ButtonProps = CommonProps &
  Omit<ComponentProps<"button">, "className"> & {
    href?: never;
    onClick: () => void;
  };

type Props = LinkProps | ButtonProps;

export function BackButton({ text = "Back", className, ...props }: Props) {
  const content = (
    <>
      <ArrowLeft size={16} className={styles.icon} />
      <span className={styles.text}>{text}</span>
    </>
  );

  if (props.href != null) {
    return (
      <a className={cx(styles.root, className)} {...props}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" className={cx(styles.root, className)} {...props}>
      {content}
    </button>
  );
}
