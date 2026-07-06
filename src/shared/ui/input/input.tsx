import { useId, type InputHTMLAttributes, type ReactNode } from "react";

import { Input as InputPrimitive } from "@base-ui/react/input";

import { cx } from "#styles";
import styles from "./input.module.css";

type Size = "s" | "m" | "l";
type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  size?: Size;
  error?: string;
};

const SIZE_CLASS = {
  s: styles.sizeS,
  m: styles.sizeM,
  l: styles.sizeL,
} satisfies Record<Size, string>;

export function Input({
  className,
  size = "m",
  error,
  "aria-invalid": ariaInvalid,
  ...props
}: Props) {
  return (
    <InputPrimitive
      aria-invalid={ariaInvalid ?? (!!error || undefined)}
      className={cx(styles.root, SIZE_CLASS[size], className)}
      {...props}
    />
  );
}

export function InputField({
  label,
  error,
  id,
  "aria-describedby": ariaDescribedBy,
  ...props
}: Props & { label: ReactNode }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [ariaDescribedBy, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <label className={styles.label}>
      <span className={styles.labelText}>{label}</span>
      <Input {...props} id={inputId} error={error} aria-describedby={describedBy} />
      {!!error && (
        <span id={errorId} className={styles.error}>
          {error}
        </span>
      )}
    </label>
  );
}
