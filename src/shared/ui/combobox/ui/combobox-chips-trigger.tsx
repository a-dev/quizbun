/**
 * ComboboxChipsTrigger — Trigger for multi-select combobox.
 * Renders selected values as removable chips with an optional clear-all button.
 * Supports slicing to limit visible chips with a "+N" overflow indicator.
 */
import { Combobox } from "@base-ui/react/combobox";
import { ChevronDown, CircleX, X } from "lucide-react";

import { Popover } from "../../popover";
import type { ComboboxClassNames, ComboboxOption } from "../types";
import { ComboboxPlaceholder } from "./combobox-placeholder";

import { cx } from "#styles";
import styles from "../combobox.module.css";

const { Trigger, Chips, Chip, ChipRemove, Clear, Value, Icon } = Combobox;

/**
 * One selected value, shared by the visible chip row and the overflow popover
 * so the two cannot drift apart. Being its own component also keeps the
 * trigger's nested render callbacks from stacking another level deep.
 */
function SelectedChip({ option, removable }: { option: ComboboxOption; removable: boolean }) {
  return (
    <Chip className={styles.chip}>
      <span className={styles.truncate}>{option.label}</span>
      {removable && (
        <ChipRemove
          // The rendered element is an icon, not a `<button>`, so Base UI has
          // to supply the button role and tab stop itself.
          nativeButton={false}
          className={styles.chipRemove}
          aria-label="Remove"
          render={<CircleX className={styles.removeIcon} size="14" />}
        />
      )}
    </Chip>
  );
}

export function ComboboxChipsTrigger({
  placeholder,
  classNames,
  isClearable,
  disabled,
  slice,
}: {
  placeholder?: string;
  classNames?: ComboboxClassNames;
  isClearable?: boolean;
  disabled?: boolean;
  slice: number;
}) {
  return (
    <Trigger
      nativeButton={false}
      data-testid="combobox-trigger"
      render={(props) => (
        <Chips {...props} className={cx(styles.trigger, classNames?.trigger)}>
          <Value>
            {(value) => {
              const shown = value.slice(0, slice);
              const hidden = value.slice(slice);

              return (
                <>
                  <div className={styles.chips} data-clearable={isClearable || undefined}>
                    {!value.length && (
                      <ComboboxPlaceholder placeholder={placeholder} classNames={classNames} />
                    )}
                    {shown.map((option: ComboboxOption) => (
                      <SelectedChip key={option.value} option={option} removable={!disabled} />
                    ))}
                    {Boolean(hidden.length) && (
                      <Popover
                        openOnHover={false}
                        triggerIsNativeButton
                        trigger={
                          <button
                            type="button"
                            className={cx(styles.chip, styles.overflowChip)}
                            data-testid="combobox-overflow-trigger"
                            aria-label={`Show ${hidden.length} more selected options`}
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            <span>{`+${hidden.length}`}</span>
                          </button>
                        }
                        classNames={{
                          content: styles.overflowPopover,
                        }}
                        positioner={{
                          align: "end",
                        }}
                      >
                        {hidden.map((option: ComboboxOption) => (
                          <SelectedChip key={option.value} option={option} removable={!disabled} />
                        ))}
                      </Popover>
                    )}
                  </div>
                  <div className={styles.triggerIcons}>
                    {isClearable && !disabled && Boolean(value?.length) && (
                      <Clear
                        nativeButton={false}
                        data-testid="combobox-clear"
                        render={(props) => (
                          <>
                            <X className={styles.removeIcon} size="16" {...props} />
                            <div className={styles.divider} />
                          </>
                        )}
                      />
                    )}
                    {!disabled && (
                      <Icon
                        render={(props) => (
                          <ChevronDown className={styles.chevron} size="18" {...props} />
                        )}
                      />
                    )}
                  </div>
                </>
              );
            }}
          </Value>
        </Chips>
      )}
    />
  );
}
