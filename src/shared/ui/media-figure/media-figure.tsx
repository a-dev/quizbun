import { useCallback, useState } from "react";

import { MarkdownRender } from "@/shared/ui/markdown";

import { cssVars, cx } from "#styles";
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

  // A server-rendered Image can finish loading before this island hydrates, and
  // React then never fires `onLoad` for an event that already happened. Ask the
  // element itself on attach so a settled Image is never stuck in either
  // pending or unresolved state.
  const settleOnAttach = useCallback(
    (image: HTMLImageElement | null) => {
      if (image === null || !image.complete) return;

      // A complete Image with no intrinsic width never decoded.
      if (image.naturalWidth === 0) setFailedSrc(src);
      else setLoadedSrc(src);
    },
    [src],
  );

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
          ref={settleOnAttach}
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          data-size-pending={sizePending || undefined}
          className={styles.image}
          // Caps the box to the Image's own shape, so clamping a tall Image
          // shrinks its width too instead of leaving `object-fit` gutters.
          style={hasDimensions ? cssVars({ "--_aspect": `${width} / ${height}` }) : undefined}
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
