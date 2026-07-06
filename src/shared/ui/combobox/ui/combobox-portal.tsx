/**
 * ComboboxPortal — Dropdown popup rendered via portal.
 * Contains search input, empty state, and the fuzzy-search option list.
 */

import type { ComponentProps, ReactNode } from "react";

import { Combobox as ComboboxBaseUI } from "@base-ui/react/combobox";
import { Check } from "lucide-react";

import type { ComboboxClassNames } from "../types";
import { ComboboxSearchInput } from "./combobox-search-input";

import { cx } from "#styles";
import styles from "../combobox.module.css";

const { Portal, Positioner, Popup, Empty, List, Item, ItemIndicator } = ComboboxBaseUI;

export function ComboboxPortal({
  positioner,
  classNames,
}: {
  positioner?: ComponentProps<typeof ComboboxBaseUI.Positioner>;
  classNames?: ComboboxClassNames;
}) {
  return (
    <Portal>
      <Positioner {...positioner}>
        <Popup className={cx(styles.popup, classNames?.popup)} data-testid="combobox-popup">
          <ComboboxSearchInput />
          <Empty className={styles.empty}>
            <div>No results found</div>
          </Empty>
          <div className={cx(styles.list, classNames?.list)}>
            <div className={styles.edge} />
            <List className={styles.items}>
              {(v) => (
                <Item
                  key={v.value}
                  value={v}
                  className={cx(styles.item, classNames?.item)}
                  disabled={v.disabled}
                  data-testid="combobox-item"
                >
                  <div className={styles.itemLabel}>
                    {(v.displayLabel as ReactNode | undefined) ?? v.label}
                  </div>
                  <ItemIndicator
                    className={styles.indicator}
                    render={<Check size="16" stroke-width="3" />}
                  />
                </Item>
              )}
            </List>
            <div className={styles.edge} />
          </div>
        </Popup>
      </Positioner>
    </Portal>
  );
}
