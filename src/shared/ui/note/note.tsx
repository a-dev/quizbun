import type { HTMLAttributes, ReactNode } from "react";

import { CircleAlert, CircleCheck, CircleX, TriangleAlert } from "lucide-react";

import { Button } from "../button";

import { cx, utils } from "#styles";
import styles from "./note.module.css";

export type NoteType = "info" | "warning" | "error" | "success";

type Props = Omit<HTMLAttributes<HTMLElement>, "onClose"> & {
  type: NoteType;
  children: ReactNode;
  /** Shows a close button and runs this callback when the button is activated. */
  onClose?: () => void;
  /**
   * `"output"` for a Note that is a live region: the element exposes `status`
   * natively, so no explicit `role` is needed to announce it politely.
   */
  as?: "div" | "output";
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

export function Note({
  type,
  children,
  className,
  role,
  as: Tag = "div",
  onClose,
  ...props
}: Props) {
  const Icon = TYPE_ICON[type];
  // Only a bare `div` needs the role spelled out; `output` already has it.
  const resolvedRole = role ?? (Tag === "output" ? undefined : DEFAULT_ROLE[type]);

  return (
    <Tag
      className={cx(styles.root, TYPE_CLASS[type], className)}
      role={resolvedRole}
      data-closable={onClose === undefined ? undefined : ""}
      {...props}
    >
      <Icon className={styles.icon} />
      <span className={utils.visuallyHidden}>{TYPE_LABEL[type]}</span>
      <div className={styles.content}>{children}</div>
      {onClose !== undefined && (
        <Button
          type="button"
          variant="icon"
          size="icon-s"
          className={styles.close}
          aria-label="Close note"
          onClick={onClose}
        >
          <CircleX size={24} aria-hidden="true" strokeWidth={2} />
        </Button>
      )}
    </Tag>
  );
}
