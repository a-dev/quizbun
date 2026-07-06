import { useDeferredValue, useMemo, useState } from "react";

import Prism from "prismjs";
import "prismjs/components/prism-json.js";

import { Textarea, type TextareaProps } from "./textarea";

import { cx, cssVars } from "#styles";
import styles from "./code-textarea.module.css";

export type CodeTextareaProps = Omit<TextareaProps, "wrap">;

type ScrollPosition = {
  block: number;
  inline: number;
};

function asText(value: TextareaProps["value"] | TextareaProps["defaultValue"]): string {
  if (Array.isArray(value)) return value.join("\n");

  return value === undefined ? "" : String(value);
}

export function CodeTextarea({
  className,
  value,
  defaultValue,
  onInput,
  onScroll,
  ...props
}: CodeTextareaProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(() => asText(defaultValue));
  const [scrollPosition, setScrollPosition] = useState<ScrollPosition>({ block: 0, inline: 0 });
  const text = value === undefined ? uncontrolledValue : asText(value);
  // Highlighting re-tokenizes the whole document, which is too costly to run
  // synchronously on every keystroke. Deferring lets React keep typing and the
  // caret responsive while the syntax layer catches up at a lower priority.
  const deferredText = useDeferredValue(text);
  const highlightedJson = useMemo(() => highlightJson(deferredText), [deferredText]);

  const handleInput: NonNullable<TextareaProps["onInput"]> = (event) => {
    if (value === undefined) setUncontrolledValue(event.currentTarget.value);

    onInput?.(event);
  };

  const handleScroll: NonNullable<TextareaProps["onScroll"]> = (event) => {
    setScrollPosition({
      block: event.currentTarget.scrollTop,
      inline: event.currentTarget.scrollLeft,
    });
    onScroll?.(event);
  };

  return (
    <div className={styles.root}>
      <pre
        aria-hidden="true"
        className={styles.code}
        style={cssVars({
          "--_scroll-block": `-${scrollPosition.block}px`,
          "--_scroll-inline": `-${scrollPosition.inline}px`,
        })}
      >
        <code className={styles.content} dangerouslySetInnerHTML={{ __html: highlightedJson }} />
      </pre>
      <Textarea
        {...props}
        className={cx(styles.textarea, className)}
        defaultValue={defaultValue}
        value={value}
        wrap="soft"
        onInput={handleInput}
        onScroll={handleScroll}
      />
    </div>
  );
}

function highlightJson(value: string): string {
  const grammar = Prism.languages.json;

  return grammar === undefined ? escapeHtml(value) : Prism.highlight(value, grammar, "json");
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
