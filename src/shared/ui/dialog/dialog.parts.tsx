import type { ReactNode } from "react";

import {
  Dialog as DialogPrimitive,
  type DialogRootProps,
  type DialogTriggerProps,
  type DialogPopupProps,
} from "@base-ui/react";
import { X } from "lucide-react";

import { cx } from "#styles";
import styles from "./dialog.module.css";

export type DialogTrigger = DialogTriggerProps["render"];

type Props = {
  /** Element that opens the dialog. Omit when controlling `open` externally. */
  trigger?: DialogTrigger;
  triggerIsNativeButton?: boolean;
  handle?: DialogRootProps["handle"];
  /**
   * `true` traps focus and locks page scroll, `false` leaves the page
   * interactive, `"trap-focus"` traps focus without locking scroll.
   */
  modal?: DialogRootProps["modal"];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: DialogRootProps["onOpenChange"];
  /** Close on outside click. Base UI defaults this off; we keep it on. */
  dismissible?: boolean;
  /** Rendered as the labelling `<h2>`; wires up `aria-labelledby`. */
  title?: ReactNode;
  /** Rendered as the describing `<p>`; wires up `aria-describedby`. */
  description?: ReactNode;
  children?: ReactNode;
  /** Optional action row pinned to the bottom of the popup. */
  footer?: ReactNode;
  showCloseButton?: boolean;
  initialFocus?: DialogPopupProps["initialFocus"];
  finalFocus?: DialogPopupProps["finalFocus"];
  classNames?: {
    backdrop?: string;
    popup?: string;
  };
  onClose?: () => void;
};

export function DialogRoot({
  trigger,
  triggerIsNativeButton = false,
  handle,
  modal = true,
  open,
  defaultOpen,
  onOpenChange,
  dismissible = true,
  title,
  description,
  children,
  footer,
  showCloseButton = true,
  initialFocus,
  finalFocus,
  classNames,
  onClose,
}: Props) {
  return (
    <DialogPrimitive.Root
      handle={handle}
      modal={modal}
      open={open}
      defaultOpen={defaultOpen}
      disablePointerDismissal={!dismissible}
      onOpenChange={(value, eventDetails) => {
        onOpenChange?.(value, eventDetails);
        if (value === false) onClose?.();
      }}
    >
      {trigger && <DialogPrimitive.Trigger nativeButton={triggerIsNativeButton} render={trigger} />}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className={cx(styles.dialogBackdrop, classNames?.backdrop)} />
        <DialogPrimitive.Popup
          className={cx(styles.dialogPopup, classNames?.popup)}
          initialFocus={initialFocus}
          finalFocus={finalFocus}
          data-testid="ui-dialog-popup"
        >
          {(title || description) && (
            <header className={styles.dialogHeader}>
              {title && (
                <DialogPrimitive.Title className={styles.dialogTitle}>
                  {title}
                </DialogPrimitive.Title>
              )}
              {description && (
                <DialogPrimitive.Description className={styles.dialogDescription}>
                  {description}
                </DialogPrimitive.Description>
              )}
            </header>
          )}

          {children && <div className={styles.dialogBody}>{children}</div>}

          {footer && <footer className={styles.dialogFooter}>{footer}</footer>}

          {showCloseButton && (
            <DialogPrimitive.Close
              aria-label="Close"
              className={styles.dialogClose}
              data-testid="ui-dialog-close"
              nativeButton={false}
              render={<X size={24} />}
            />
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
