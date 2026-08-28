import { useCallback, useEffect, useLayoutEffect, useRef, type ComponentPropsWithRef } from "react";

import { cssVars, cx } from "#styles";
import styles from "./textarea.module.css";

export type TextareaProps = ComponentPropsWithRef<"textarea">;

type ScrollPosition = {
  block: number;
  inline: number;
};

const SIZES_TO_CONTENT_NATIVELY =
  typeof CSS !== "undefined" && CSS.supports("field-sizing", "content");

export function Textarea({
  className,
  ref,
  rows,
  style,
  onBeforeInput,
  onInput,
  ...props
}: TextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const minimumHeightRef = useRef<number | undefined>(undefined);
  const pageScrollPositionRef = useRef<ScrollPosition | undefined>(undefined);

  const capturePageScroll = useCallback(() => {
    pageScrollPositionRef.current = {
      block: window.scrollY,
      inline: window.scrollX,
    };
  }, []);

  const restorePageScroll = useCallback(() => {
    const position = pageScrollPositionRef.current;

    if (position === undefined) return;

    window.scrollTo(position.inline, position.block);
  }, []);

  const resize = useCallback(() => {
    const textarea = textareaRef.current;

    if (SIZES_TO_CONTENT_NATIVELY || textarea === null) return;

    // Store the rendered minimum before setting an explicit height. This preserves
    // the caller's `rows` value while allowing the field to shrink after edits.
    minimumHeightRef.current ??= textarea.offsetHeight;

    // Measure at the intrinsic height instead of collapsing a focused field to
    // zero. A zero-height textarea can make the browser scroll the caret into
    // view before the final height is restored.
    // Imperative measurement is an integration boundary: using React state here
    // would add a render to each keystroke. This private property is not a
    // caller-facing styling API, so it is intentionally managed on the element.
    textarea.style.removeProperty("--_height");

    const borderHeight = textarea.offsetHeight - textarea.clientHeight;
    const contentHeight = textarea.scrollHeight + borderHeight;
    const height = Math.max(minimumHeightRef.current, contentHeight);

    textarea.style.setProperty("--_height", `${height}px`);
  }, []);

  const setRefs = useCallback(
    (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node;

      if (typeof ref === "function") {
        ref(node);
      } else if (ref != null) {
        ref.current = node;
      }
    },
    [ref],
  );

  useLayoutEffect(resize, [resize, props.defaultValue, props.value]);

  useLayoutEffect(() => {
    restorePageScroll();
  });

  useEffect(() => {
    const textarea = textareaRef.current;

    if (SIZES_TO_CONTENT_NATIVELY || textarea === null) return;

    const observer = new ResizeObserver(resize);
    observer.observe(textarea);

    return () => observer.disconnect();
  }, [resize]);

  const handleInput: NonNullable<TextareaProps["onInput"]> = (event) => {
    if (SIZES_TO_CONTENT_NATIVELY) {
      onInput?.(event);

      return;
    }

    if (pageScrollPositionRef.current === undefined) capturePageScroll();

    resize();
    restorePageScroll();
    onInput?.(event);

    const capturedPosition = pageScrollPositionRef.current;

    requestAnimationFrame(() => {
      if (pageScrollPositionRef.current === capturedPosition) {
        restorePageScroll();
        pageScrollPositionRef.current = undefined;
      }
    });
  };

  const handleBeforeInput: NonNullable<TextareaProps["onBeforeInput"]> = (event) => {
    if (!SIZES_TO_CONTENT_NATIVELY) capturePageScroll();

    onBeforeInput?.(event);
  };

  return (
    <textarea
      ref={setRefs}
      rows={rows}
      className={cx(styles.root, className)}
      // `field-sizing: content` ignores the `rows` attribute, so hand the same
      // value to CSS as the minimum height. The attribute stays for the
      // fallback path and for the initial server-rendered size.
      style={rows === undefined ? style : { ...cssVars({ "--_rows": rows }), ...style }}
      onBeforeInput={handleBeforeInput}
      onInput={handleInput}
      {...props}
    />
  );
}
