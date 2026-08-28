import { useState } from "react";

import { MarkdownRender } from "@/shared/ui/markdown";

import { cx } from "#styles";
import styles from "./media-figure.module.css";

interface MediaFigureProps {
  /** A URL already resolved by the caller. */
  src: string;
  alt: string;
  /** Intrinsic resource dimensions from the Quiz, when they were measured. */
  width?: number;
  height?: number;
  /** Caption HTML already rendered through its Markdown tier by the caller. */
  captionHtml?: string;
  /** Eagerly fetch this Image as the page's likely LCP candidate. */
  priority?: boolean;
  className?: string;
}

/** An Image with an optional caption and a visible alt-text fallback. */
export function MediaFigure({
  src,
  alt,
  width,
  height,
  captionHtml,
  priority = false,
  className,
}: MediaFigureProps) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const [loadedSrc, setLoadedSrc] = useState<string>();
  const failed = failedSrc === src;
  const hasDimensions = width !== undefined && height !== undefined;
  const sizePending = !hasDimensions && loadedSrc !== src;

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
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          data-size-pending={sizePending || undefined}
          className={styles.image}
          onLoad={() => setLoadedSrc(src)}
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
