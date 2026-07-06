import { RadioGroup as Root, type RadioGroupProps } from "@base-ui/react/radio-group";

import { cx } from "#styles";
import styles from "./radio-group.module.css";

type Props = RadioGroupProps & {
  className?: string;
};

export function RadioGroup({ className, children, ...props }: Props) {
  return (
    <Root className={cx(styles.root, className)} {...props}>
      {children}
    </Root>
  );
}
