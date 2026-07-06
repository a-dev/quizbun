import { PAGE_SIZES } from "@/shared/lib/storage";
import type { PageSize } from "@/shared/lib/storage";
import { Select } from "@/shared/ui/select";

import styles from "./page-size-control.module.css";

interface PageSizeControlProps {
  value: PageSize;
  onChange: (pageSize: PageSize) => void;
}

const OPTIONS = PAGE_SIZES.map((i) => ({ value: i, label: i }));

export function PageSizeControl({ value, onChange }: PageSizeControlProps) {
  return (
    <div className={styles.root}>
      <Select
        size="s"
        items={OPTIONS}
        value={value.toString()}
        onValueChange={(size) => onChange(Number(size) as PageSize)}
        trigger="0"
        scrollArrows
      >
        {OPTIONS.map((item) => (
          <Select.Item key={item.value} value={item.value}>
            {item.label}
          </Select.Item>
        ))}
      </Select>
      per page
    </div>
  );
}
