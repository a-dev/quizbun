import { useState } from "react";

import { MarkdownRender } from "@/shared/ui/markdown";

import { cx } from "#styles";
import styles from "./media-figure.module.css";

interface MediaFigureProps {
  /** A URL already resolved by the caller. */
  src: string;
  alt: string;
  /** Caption HTML already rendered through its Markdown tier by the caller. */
  captionHtml?: string;
  className?: string;
}

/** An Image with an optional caption and a visible alt-text fallback. */
export function MediaFigure({ src, alt, captionHtml, className }: MediaFigureProps) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const failed = failedSrc === src;

  return (
    <figure className={cx(styles.root, className)}>
      {failed ? (
        <div className={styles.placeholder} role="img" aria-label={alt}>
          <span aria-hidden="true" className={styles.placeholderText}>
            {alt}
          </span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={styles.image}
          onError={() => setFailedSrc(src)}
        />
      )}
      {captionHtml !== undefined && (
        <figcaption className={styles.caption}>
          <MarkdownRender content={captionHtml} size="xs" as="span" />
        </figcaption>
      )}
    </figure>
  );
}
