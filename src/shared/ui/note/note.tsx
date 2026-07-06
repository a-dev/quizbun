import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";

import { cx, utils } from "#styles";
import styles from "./note.module.css";

export type NoteType = "info" | "warning" | "error" | "success";

type Props = ComponentPropsWithoutRef<"div"> & {
  type: NoteType;
  children: ReactNode;
};

const TYPE_CLASS = {
  info: styles.typeInfo,
  warning: styles.typeWarning,
  error: styles.typeError,
  success: styles.typeSuccess,
} as const;

const TYPE_ICON = {
  info: CircleAlert,
  warning: TriangleAlert,
  error: CircleAlert,
  success: CircleCheck,
} as const;

// Severity prefix announced to screen readers, since color/icon alone don't convey type.
const TYPE_LABEL = {
  info: "Information:",
  warning: "Warning:",
  error: "Error:",
  success: "Success:",
} as const;

// Non-urgent types announce politely; warning/error interrupt.
const DEFAULT_ROLE = {
  info: "status",
  warning: "alert",
  error: "alert",
  success: "status",
} as const;

export function Note({ type, children, className, role, ...props }: Props) {
  const Icon = TYPE_ICON[type];

  return (
    <div
      className={cx(styles.root, TYPE_CLASS[type], className)}
      role={role ?? DEFAULT_ROLE[type]}
      {...props}
    >
      <Icon className={styles.icon} />
      <span className={utils.visuallyHidden}>{TYPE_LABEL[type]}</span>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
