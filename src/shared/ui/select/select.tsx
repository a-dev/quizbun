import type { ComponentProps, ComponentPropsWithRef, ReactNode } from "react";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronsUpDown } from "lucide-react";

import { cx } from "#styles";
import styles from "./select.module.css";

type SelectSize = "s" | "m";

const SIZE_CLASS = {
  s: styles.sizeS,
  m: styles.sizeM,
} satisfies Record<SelectSize, string>;

/* ─── Root ───────────────────────────────────────────── */

type SelectProps<Value, Multiple extends boolean | undefined = false> = Omit<
  SelectPrimitive.Root.Props<Value, Multiple>,
  "children"
> & {
  /** Trigger size. `m` is the default; `s` is compact. */
  size?: SelectSize;
  /**
   * Trigger content. A string renders as placeholder text shown until a value
   * is picked; any other node replaces the default selected-value display.
   */
  trigger?: ReactNode;
  /** Custom render for the selected value (Base UI `Select.Value` children). */
  renderValue?: ComponentProps<typeof SelectPrimitive.Value>["children"];
  /** Show the scroll up/down arrows for an overflowing list. */
  scrollArrows?: boolean;
  sideOffset?: number;
  alignItemWithTrigger?: boolean;
  /** The `Select.Item`s, optionally wrapped in `Select.Group`. */
  children: ReactNode;
  classNames?: {
    trigger?: string;
    positioner?: string;
    popup?: string;
    list?: string;
  };
};

function SelectRoot<Value, Multiple extends boolean | undefined = false>({
  size = "m",
  trigger,
  renderValue,
  scrollArrows = false,
  sideOffset = 8,
  alignItemWithTrigger,
  children,
  classNames,
  ...rootProps
}: SelectProps<Value, Multiple>) {
  const placeholder = typeof trigger === "string" ? trigger : undefined;
  const customTrigger = trigger != null && typeof trigger !== "string" ? trigger : null;

  return (
    <SelectPrimitive.Root<Value, Multiple> {...rootProps}>
      <SelectPrimitive.Trigger
        className={cx(styles.trigger, SIZE_CLASS[size], classNames?.trigger)}
      >
        {customTrigger ?? (
          <SelectPrimitive.Value className={styles.value} placeholder={placeholder}>
            {renderValue}
          </SelectPrimitive.Value>
        )}
        <SelectPrimitive.Icon className={styles.icon}>
          <ChevronsUpDown className={styles.iconSvg} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          className={cx(styles.positioner, classNames?.positioner)}
          sideOffset={sideOffset}
          alignItemWithTrigger={alignItemWithTrigger}
        >
          <SelectPrimitive.Popup className={cx(styles.popup, classNames?.popup)} data-size={size}>
            {scrollArrows && (
              <SelectPrimitive.ScrollUpArrow className={styles.scrollArrow}>
                ▲
              </SelectPrimitive.ScrollUpArrow>
            )}
            <SelectPrimitive.List className={cx(styles.list, classNames?.list)}>
              {children}
            </SelectPrimitive.List>
            {scrollArrows && (
              <SelectPrimitive.ScrollDownArrow className={styles.scrollArrow}>
                ▼
              </SelectPrimitive.ScrollDownArrow>
            )}
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

/* ─── Sub-components ──────────────────────────────────── */

type ItemProps = Omit<ComponentPropsWithRef<typeof SelectPrimitive.Item>, "className"> & {
  className?: string;
};

/**
 * A single option. The selected-state indicator and text wrapper are supplied
 * automatically, so callers only pass `value` and the label content.
 */
function SelectItem({ className, children, ...props }: ItemProps) {
  return (
    <SelectPrimitive.Item className={cx(styles.item, className)} {...props}>
      <SelectPrimitive.ItemIndicator className={styles.itemIndicator}>
        <Check className={styles.itemIndicatorIcon} />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText className={styles.itemText}>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

type GroupProps = Omit<ComponentPropsWithRef<typeof SelectPrimitive.Group>, "className"> & {
  className?: string;
};

function SelectGroup({ className, ...props }: GroupProps) {
  return <SelectPrimitive.Group className={cx(styles.group, className)} {...props} />;
}

type GroupLabelProps = Omit<
  ComponentPropsWithRef<typeof SelectPrimitive.GroupLabel>,
  "className"
> & {
  className?: string;
};

function SelectGroupLabel({ className, ...props }: GroupLabelProps) {
  return <SelectPrimitive.GroupLabel className={cx(styles.groupLabel, className)} {...props} />;
}

type SeparatorProps = Omit<ComponentPropsWithRef<typeof SelectPrimitive.Separator>, "className"> & {
  className?: string;
};

function SelectSeparator({ className, ...props }: SeparatorProps) {
  return <SelectPrimitive.Separator className={cx(styles.separator, className)} {...props} />;
}

/* ─── Exports ────────────────────────────────────────── */

/**
 * Styled wrapper around Base UI's Select. Drive it with props for the common
 * case — `trigger` for the placeholder/label, `Select.Item` children for the
 * options — and reach for `Select.Group` / `Select.GroupLabel` /
 * `Select.Separator` when composing grouped lists.
 *
 * @example
 * <Select trigger="Select fruit" value={value} onValueChange={setValue}>
 *   {fruits.map((f) => (
 *     <Select.Item key={f.value} value={f.value}>{f.label}</Select.Item>
 *   ))}
 * </Select>
 */
export const Select = Object.assign(SelectRoot, {
  Item: SelectItem,
  Group: SelectGroup,
  GroupLabel: SelectGroupLabel,
  Separator: SelectSeparator,
}) as typeof SelectRoot & {
  Item: typeof SelectItem;
  Group: typeof SelectGroup;
  GroupLabel: typeof SelectGroupLabel;
  Separator: typeof SelectSeparator;
};

export type { SelectProps, SelectSize };
