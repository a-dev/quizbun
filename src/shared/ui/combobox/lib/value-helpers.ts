import type {
  ComboboxOption,
  ComboboxOptionValue,
  ComboboxRootProps,
  ComboboxValue,
} from "../types";

/**
 * Compares options by stable option value.
 */
function isSameOption<T extends ComboboxOptionValue>(
  left: ComboboxOption<T> | undefined,
  right: ComboboxOption<T> | undefined,
): boolean {
  return Boolean(left && right && left.value === right.value);
}

/**
 * Decides whether selecting the same item should clear current value.
 * It clears in the deterministic case where both states have one identical item.
 */
export function shouldClearOnRepeat<T extends ComboboxOptionValue>({
  isClearable,
  currentValue,
  nextValue,
}: {
  isClearable: boolean | undefined;
  currentValue: ComboboxValue<T>;
  nextValue: ComboboxValue<T>;
}): boolean {
  if (!isClearable) {
    return false;
  }

  const currentValues = currentValue ?? [];
  const nextValues = nextValue ?? [];

  return (
    currentValues.length === 1 &&
    nextValues.length === 1 &&
    isSameOption(currentValues[0], nextValues[0])
  );
}

/**
 * Converts app-facing combobox value to Base UI root value shape.
 */
export function toRootValue<T extends ComboboxOptionValue>(
  value: ComboboxValue<T>,
): ComboboxRootProps<T>["value"] {
  return value ?? [];
}

/**
 * Converts Base UI root value shape to app-facing combobox value.
 */
export function fromRootValue<T extends ComboboxOptionValue>(
  value: ComboboxOption<T>[] | ComboboxOption<T> | null | undefined,
): ComboboxValue<T> {
  return Array.isArray(value) ? value : value ? [value] : undefined;
}
