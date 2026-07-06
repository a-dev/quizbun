import {
  ToggleGroup as ToggleGroupPrimitive,
  type ToggleGroupProps,
} from "@base-ui/react/toggle-group";

import { cx } from "#styles";
import styles from "./toggle-group.module.css";

type Props<Value extends string = string> = ToggleGroupProps<Value> & {
  className?: string;
};

export function ToggleGroup<Value extends string = string>({ className, ...props }: Props<Value>) {
  return <ToggleGroupPrimitive<Value> {...props} className={cx(styles.root, className)} />;
}
