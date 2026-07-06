/**
 * Shared type definitions for the multiple-select Combobox.
 */

import type { ReactNode, ComponentProps } from "react";

import { Combobox as ComboboxBaseUI } from "@base-ui/react/combobox";
const { Root, Positioner } = ComboboxBaseUI;

export type ComboboxOptionValue = string | number;

/** Resolved value type for the public multiple-select API. */
export type ComboboxValue<T extends ComboboxOptionValue> = ComboboxOption<T>[] | undefined;

export type ComboboxOption<V extends ComboboxOptionValue = string> = {
  value: V;
  label: string;
  disabled?: boolean;
} & Record<string, unknown>;

export type ComboboxRootProps<T extends ComboboxOptionValue> = ComponentProps<
  typeof Root<ComboboxOption<T>, true>
>;

/** CSS class overrides for combobox sub-elements. */
export type ComboboxClassNames = {
  trigger?: string;
  placeholder?: string;
  popup?: string;
  list?: string;
  item?: string;
};

export type ComboboxProps<T extends ComboboxOptionValue> = Omit<
  ComboboxRootProps<T>,
  | "items"
  | "value"
  | "defaultValue"
  | "onValueChange"
  | "multiple"
  | "filteredItems"
  | "inputValue"
  | "onInputValueChange"
> & {
  options: ComboboxOption<T>[];
  label?: ReactNode;
  placeholder?: string;
  isClearable?: boolean;
  classNames?: ComboboxClassNames;
  positioner?: ComponentProps<typeof Positioner>;
  onChange: (value: ComboboxValue<T>) => void;
  slice?: number;
} & (
    | {
        value: ComboboxValue<T>;
        defaultValue?: never;
      }
    | {
        value?: never;
        defaultValue?: ComboboxValue<T>;
      }
  );
