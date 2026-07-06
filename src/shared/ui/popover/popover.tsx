import type { CSSProperties, ReactNode } from "react";

import {
  Popover as PopoverPrimitive,
  type PopoverRootProps,
  type PopoverTriggerProps,
  type PopoverPositionerProps,
} from "@base-ui/react";
import { CircleX } from "lucide-react";

import { cx, cssVars } from "#styles";
import styles from "./popover.module.css";

export type PopoverTrigger = PopoverTriggerProps["render"];

type Props = {
  trigger?: PopoverTrigger;
  triggerIsNativeButton?: boolean;
  handle?: PopoverRootProps["handle"];
  modal?: PopoverRootProps["modal"];
  openOnHover?: PopoverTriggerProps["openOnHover"];
  delay?: PopoverTriggerProps["delay"];
  closeDelay?: PopoverTriggerProps["closeDelay"];
  children?: ReactNode;
  defaultOpen?: boolean;
  onClose?: () => void;
  showArrow?: boolean;
  showCloseButton?: boolean;
  positioner?: PopoverPositionerProps;
  classNames?: {
    content?: string;
  };
  maxWidth?: CSSProperties["maxWidth"];
};

function PopoverRoot({
  modal = false,
  handle,
  openOnHover = true,
  delay = 200,
  closeDelay,
  children,
  trigger,
  triggerIsNativeButton = false,
  defaultOpen,
  showCloseButton,
  positioner,
  showArrow = true,
  classNames,
  maxWidth,
  onClose,
}: Props) {
  return (
    <PopoverPrimitive.Root
      modal={modal}
      defaultOpen={defaultOpen}
      handle={handle}
      onOpenChange={(v) => {
        if (v === false) onClose?.();
      }}
    >
      {trigger && (
        <PopoverPrimitive.Trigger
          nativeButton={triggerIsNativeButton}
          openOnHover={openOnHover}
          delay={delay}
          closeDelay={closeDelay}
          render={trigger}
        />
      )}
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          sideOffset={8}
          {...positioner}
          className={styles.popoverPositioner}
          style={maxWidth !== undefined ? cssVars({ "--_max-width": maxWidth }) : undefined}
        >
          <PopoverPrimitive.Popup
            className={cx(styles.popoverPopup, classNames?.content)}
            data-testid="ui-popover-popup"
          >
            {showArrow && (
              <PopoverPrimitive.Arrow
                className={styles.popoverArrow}
                render={
                  <svg width="20" height="10" viewBox="0 0 20 10" fill="none">
                    <path d="M0 0 L10 10 L20 0" strokeWidth="1" strokeLinejoin="round" />
                  </svg>
                }
                style={cssVars({
                  "--offset": `${positioner?.sideOffset ?? 8}px`,
                })}
              />
            )}
            {children}
            {showCloseButton && (
              <PopoverPrimitive.Close
                aria-label="Close"
                className={styles.popoverClose}
                data-testid="ui-popover-content-close"
                onClick={(e) => e.stopPropagation()}
                nativeButton={false}
                render={<CircleX size={20} />}
              />
            )}
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export type PopoverPayload = {
  title?: string;
  description?: string;
  children?: ReactNode;
};

export function PopoverWithPayload({
  handle,
  positioner,
  maxWidth,
  classNames,
  showArrow = true,
}: Omit<Props, "handle" | "delay" | "trigger" | "openOnHover" | "closeDelay"> & {
  handle: NonNullable<PopoverRootProps<PopoverPayload>["handle"]>;
}) {
  return (
    <PopoverPrimitive.Root<PopoverPayload> handle={handle}>
      {({ payload }) => (
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Positioner
            sideOffset={8}
            {...positioner}
            className={styles.popoverPositioner}
            style={maxWidth !== undefined ? cssVars({ "--_max-width": maxWidth }) : undefined}
          >
            <PopoverPrimitive.Popup
              className={cx(styles.popoverPopup, classNames?.content)}
              data-testid="ui-popover-popup"
            >
              {showArrow && (
                <PopoverPrimitive.Arrow
                  className={styles.popoverArrow}
                  render={
                    <svg width="20" height="10" viewBox="0 0 20 10" fill="none">
                      <path d="M0 0 L10 10 L20 0" strokeWidth="1" strokeLinejoin="round" />
                    </svg>
                  }
                  style={cssVars({
                    "--offset": `${positioner?.sideOffset ?? 8}px`,
                  })}
                />
              )}
              <PopoverPrimitive.Viewport className={styles.popoverViewport}>
                {payload?.children}
              </PopoverPrimitive.Viewport>
            </PopoverPrimitive.Popup>
          </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
      )}
    </PopoverPrimitive.Root>
  );
}

/* ─── Exports ────────────────────────────────────────── */

export const Popover = Object.assign(PopoverRoot, {
  Trigger: PopoverPrimitive.Trigger,
  createHandle: PopoverPrimitive.createHandle,
}) as typeof PopoverRoot & {
  Trigger: typeof PopoverPrimitive.Trigger;
  createHandle: typeof PopoverPrimitive.createHandle;
};
