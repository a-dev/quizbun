import { Dialog as DialogPrimitive } from "@base-ui/react";

import { DialogRoot } from "./dialog.parts";

export type { DialogTrigger } from "./dialog.parts";

/* ─── Exports ────────────────────────────────────────── */

/**
 * Styled wrapper around Base UI's Dialog. Use the props-driven API for the
 * common case, or reach for the attached primitives (`Dialog.Trigger`,
 * `Dialog.Close`, `Dialog.createHandle`) when composing custom layouts.
 */
export const Dialog = Object.assign(DialogRoot, {
  Trigger: DialogPrimitive.Trigger,
  Close: DialogPrimitive.Close,
  createHandle: DialogPrimitive.createHandle,
}) as typeof DialogRoot & {
  Trigger: typeof DialogPrimitive.Trigger;
  Close: typeof DialogPrimitive.Close;
  createHandle: typeof DialogPrimitive.createHandle;
};
