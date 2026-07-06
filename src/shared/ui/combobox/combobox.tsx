/**
 * Combobox — multiple-select combobox with client-side fuzzy search via fuzzysort.
 * Highlights matching text in the dropdown items.
 */

import { useState } from "react";

import { Combobox as ComboboxBaseUI } from "@base-ui/react/combobox";
import fuzzysort from "fuzzysort";

import { fromRootValue, shouldClearOnRepeat, toRootValue } from "./lib/value-helpers";
import type { ComboboxOptionValue, ComboboxProps, ComboboxRootProps } from "./types";
import { ComboboxChipsTrigger } from "./ui/combobox-chips-trigger";
import { ComboboxPortal } from "./ui/combobox-portal";

import styles from "./combobox.module.css";

const { Root, Label } = ComboboxBaseUI;

export function Combobox<T extends ComboboxOptionValue>({
  onChange,
  options,
  label,
  placeholder,
  positioner = {
    sideOffset: 12,
  },
  isClearable = true,
  disabled,
  slice = 2,
  classNames,
  defaultValue,
  ...rest
}: ComboboxProps<T>) {
  const isControlled = Object.hasOwn(rest, "value");
  const { value } = rest;

  const preparedItems = options.map((option) => {
    return {
      ...option,
      prepared: fuzzysort.prepare(option.label),
    };
  });

  const normalizedControlledValue = isControlled
    ? (Array.isArray(value) ? value : [])
        .map((selectedOption) => {
          return preparedItems.find((option) => option.value === selectedOption.value);
        })
        .filter((option): option is (typeof preparedItems)[number] => Boolean(option))
    : undefined;

  const normalizedValue = isControlled ? toRootValue(normalizedControlledValue) : undefined;
  const normalizedDefaultValue = isControlled
    ? undefined
    : (defaultValue as ComboboxRootProps<T>["defaultValue"]);

  const [inputValue, setInputValue] = useState("");

  const filteredItems = (() => {
    if (!preparedItems.length || !inputValue) {
      return preparedItems;
    }

    return fuzzysort
      .go(inputValue, preparedItems, {
        key: "prepared",
      })
      .map((result) => ({
        ...result.obj,
        displayLabel: result.highlight((match, index) => (
          <mark key={index} className={styles.mark}>
            {match}
          </mark>
        )),
      }));
  })();

  return (
    <Root
      multiple
      items={preparedItems}
      value={normalizedValue}
      defaultValue={normalizedDefaultValue}
      onValueChange={(nextValueRaw) => {
        const normalizedNext = fromRootValue<T>(nextValueRaw);
        const normalizedCurrent = fromRootValue<T>(normalizedValue);

        if (
          shouldClearOnRepeat({
            isClearable,
            currentValue: normalizedCurrent,
            nextValue: normalizedNext,
          })
        ) {
          return onChange(undefined);
        }

        onChange(normalizedNext);
      }}
      filteredItems={filteredItems}
      inputValue={inputValue}
      onInputValueChange={setInputValue}
      disabled={disabled}
    >
      {label !== undefined && <Label>{label}</Label>}
      <ComboboxChipsTrigger
        isClearable={isClearable}
        placeholder={placeholder}
        disabled={disabled}
        slice={slice}
        classNames={classNames}
      />
      <ComboboxPortal positioner={positioner} classNames={classNames} />
    </Root>
  );
}
