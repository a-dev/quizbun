import {
  CheckboxGroup as CheckboxGroupPrimitive,
  type CheckboxGroupProps,
} from "@base-ui/react/checkbox-group";

import { cx } from "#styles";
import styles from "./checkbox-group.module.css";

type Props = CheckboxGroupProps & {
  className?: string;
};

export function CheckboxGroup({ className, children, ...props }: Props) {
  return (
    <CheckboxGroupPrimitive className={cx(styles.root, className)} {...props}>
      {children}
    </CheckboxGroupPrimitive>
  );
}
