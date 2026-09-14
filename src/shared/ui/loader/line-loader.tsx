import { createPortal } from "react-dom";

import { useClientValue } from "@/shared/lib/hydration";

import styles from "./line-loader.module.css";

export function LineLoader() {
  return <div className={styles.root} data-testid="line-loader" />;
}

export function TopLineLoader() {
  // `document.body` only exists once the client takes over.
  const mounted = useClientValue(() => true, false);

  if (!mounted) {
    return null;
  }

  return createPortal(<LineLoader />, document.body);
}
