import { useEffect, useState } from "react";

import { createPortal } from "react-dom";

import styles from "./line-loader.module.css";

export function LineLoader() {
  return <div className={styles.root} data-testid="line-loader" />;
}

export function TopLineLoader() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(<LineLoader />, document.body);
}
