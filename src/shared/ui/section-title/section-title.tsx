import { cx, utils } from "#styles";
import styles from "./section-title.module.css";

type Props = {
  title: string;
  counter?: string;
};

export function SectionTitle({ title, counter }: Props) {
  return (
    <div className={styles.root}>
      <h2 className={cx(styles.title, utils.cellBackgroundContained)}>
        {title}
        {counter !== undefined && (
          <span className={styles.counter} aria-hidden="true">
            {counter}
          </span>
        )}
      </h2>
    </div>
  );
}
