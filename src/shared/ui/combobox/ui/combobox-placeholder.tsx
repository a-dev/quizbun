import { cx } from "#styles";
import styles from "../combobox.module.css";

/** Renders placeholder text when no value is selected. */
export function ComboboxPlaceholder({
  placeholder,
  classNames,
}: {
  placeholder?: string;
  classNames?: { placeholder?: string };
}) {
  if (!placeholder) {
    return null;
  }

  return <span className={cx(styles.placeholder, classNames?.placeholder)}>{placeholder}</span>;
}
