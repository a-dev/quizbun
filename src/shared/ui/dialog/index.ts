import type { DialogTriggerProps, DialogRootProps } from "@base-ui/react";

export { Dialog, type DialogTrigger } from "./dialog";
export type { DialogRootProps, DialogPopupProps } from "@base-ui/react";

export type DialogHandle = DialogRootProps["handle"];
export type DialogTriggerRender = DialogTriggerProps["render"];
