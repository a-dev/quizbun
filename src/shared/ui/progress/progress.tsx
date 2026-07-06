import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

import styles from "./progress.module.css";

const { Root, Label, Value, Track, Indicator } = ProgressPrimitive;

type Props = {
  value: number;
  label?: string;
};

export function Progress({ value, label }: Props) {
  return (
    <Root className={styles.root} value={value}>
      <Label className={styles.label}>{label}</Label>
      <Value className={styles.value} />
      <Track className={styles.track}>
        <Indicator className={styles.indicator} />
      </Track>
    </Root>
  );
}
