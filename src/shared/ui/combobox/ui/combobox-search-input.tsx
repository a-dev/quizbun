import { Combobox } from "@base-ui/react/combobox";
import { Search } from "lucide-react";

import styles from "../combobox.module.css";

const { Input } = Combobox;

/** Search input rendered inside the combobox dropdown popup. */
export function ComboboxSearchInput() {
  return (
    <div className={styles.search}>
      <Search size={16} className={styles.searchIcon} />
      <Input
        className={styles.input}
        aria-label="Search"
        data-testid="combobox-search-input"
        placeholder="Search..."
      />
    </div>
  );
}
