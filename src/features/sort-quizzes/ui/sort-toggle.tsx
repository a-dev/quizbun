import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { ListSort, ListSortKey, ListSortOrder } from "@/shared/lib/routing";
import { DEFAULT_SORT_ORDER } from "@/shared/lib/routing";
import { Button } from "@/shared/ui/button";

import styles from "./sort-toggle.module.css";

export interface SortToggleProps {
  sort: ListSort;
  onSortChange: (sort: ListSort) => void;
}

const KEY_LABEL: Record<ListSortKey, string> = { abc: "abc", date: "date" };
const KEY_DESCRIPTION: Record<ListSortKey, string> = { abc: "title", date: "date added" };
const ORDER_ICON: Record<ListSortOrder, LucideIcon> = {
  asc: ArrowBigUp,
  desc: ArrowBigDown,
};
const ORDER_DESCRIPTION: Record<ListSortOrder, string> = {
  asc: "ascending",
  desc: "descending",
};

/**
 * `Sorting: abc ↑ / date ↓`. Clicking the active key flips its direction;
 * clicking the other key switches to it in its default direction.
 */
export function SortToggle({ sort, onSortChange }: Readonly<SortToggleProps>) {
  function handleClick(key: ListSortKey) {
    if (key === sort.key) {
      onSortChange({ key, order: sort.order === "asc" ? "desc" : "asc" });
    } else {
      onSortChange({ key, order: DEFAULT_SORT_ORDER[key] });
    }
  }

  // The active key is filled and in full color; the other is muted and shows
  // the direction it would open in. Nothing is ever unselected: with no sort
  // params the default (abc ↑) renders active.
  function renderButton(key: ListSortKey) {
    const isActive = key === sort.key;
    const order: ListSortOrder = isActive ? sort.order : DEFAULT_SORT_ORDER[key];
    const OrderIcon = ORDER_ICON[order];

    return (
      <Button
        variant="link"
        size="s"
        className={styles.button}
        aria-pressed={isActive}
        aria-label={`Sort by ${KEY_DESCRIPTION[key]}, ${ORDER_DESCRIPTION[order]}`}
        onClick={() => handleClick(key)}
      >
        {KEY_LABEL[key]}
        <OrderIcon className={styles.icon} aria-hidden="true" size="12" />
      </Button>
    );
  }

  return (
    <div className={styles.root}>
      <span className={styles.label}>Sorting:</span>
      {renderButton("abc")}
      <span className={styles.separator} aria-hidden="true">
        /
      </span>
      {renderButton("date")}
    </div>
  );
}
