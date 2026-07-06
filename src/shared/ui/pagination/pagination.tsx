import type { AriaAttributes, MouseEvent, ReactNode } from "react";

import { MoveLeft, MoveRight } from "lucide-react";

import { Button, LinkAsButton } from "@/shared/ui/button";

import { cx } from "#styles";
import styles from "./pagination.module.css";

const MAX_VISIBLE_PAGE_BUTTONS = 7;
const EDGE_WINDOW_SIZE = 6;
const SIBLING_COUNT = 2;

export type PaginationItem = number | "gap";

type ControlVariant = "primary" | "secondary" | "outline" | "ghost";

interface ControlConfig {
  page: number;
  variant: ControlVariant;
  disabled: boolean;
  ariaLabel: string;
  ariaCurrent?: AriaAttributes["aria-current"];
  className?: string;
  children: ReactNode;
  size?: "s" | "m";
}

interface PaginationProps {
  currentPage: number;
  pageCount: number;
  onPageChange?: (page: number) => void;
  hrefForPage?: (page: number) => string;
  "aria-label": string;
  className?: string;
}

export function buildPaginationItems(currentPage: number, pageCount: number): PaginationItem[] {
  if (pageCount < 1) return [];
  if (pageCount <= MAX_VISIBLE_PAGE_BUTTONS) return pageRange(1, pageCount);

  const clampedPage = clampPage(currentPage, pageCount);
  const lastPage = pageCount;

  if (clampedPage <= EDGE_WINDOW_SIZE - SIBLING_COUNT) {
    return [...pageRange(1, EDGE_WINDOW_SIZE), "gap", lastPage];
  }

  if (clampedPage >= lastPage - (EDGE_WINDOW_SIZE - SIBLING_COUNT - 1)) {
    return [1, "gap", ...pageRange(lastPage - EDGE_WINDOW_SIZE + 1, lastPage)];
  }

  return [
    1,
    "gap",
    ...pageRange(clampedPage - SIBLING_COUNT, clampedPage + SIBLING_COUNT),
    "gap",
    lastPage,
  ];
}

export function Pagination({
  currentPage,
  pageCount,
  onPageChange,
  hrefForPage,
  "aria-label": ariaLabel,
  className,
}: PaginationProps) {
  if (pageCount <= 1) return null;

  const safeCurrentPage = clampPage(currentPage, pageCount);
  const items = buildPaginationItems(safeCurrentPage, pageCount);
  const changePage = (page: number) => {
    onPageChange?.(page);
    window.scrollTo(0, 0);
  };
  const handlePageClick = (event: MouseEvent<HTMLAnchorElement>, page: number) => {
    if (onPageChange === undefined) return;

    event.preventDefault();
    changePage(page);
  };
  // A disabled control (current page, or Previous/Next at an edge) is never
  // navigable, so it stays a <button> — HTML has no disabled <a>. Otherwise we
  // render a real link when hrefForPage is supplied (catalog/library, where the
  // page lives in the URL) and fall back to a plain button when it is not (the
  // ephemeral Run player).
  const renderControl = ({
    page,
    variant,
    disabled,
    ariaLabel,
    ariaCurrent,
    size = "s",
    className,
    children,
  }: ControlConfig) => {
    if (disabled || hrefForPage === undefined) {
      return (
        <Button
          type="button"
          size={size}
          variant={variant}
          aria-label={ariaLabel}
          aria-current={ariaCurrent}
          disabled={disabled}
          className={className}
          onClick={() => changePage(page)}
        >
          {children}
        </Button>
      );
    }

    return (
      <LinkAsButton
        size={size}
        variant={variant}
        href={hrefForPage(page)}
        aria-label={ariaLabel}
        className={className}
        onClick={(event) => handlePageClick(event, page)}
      >
        {children}
      </LinkAsButton>
    );
  };

  return (
    <nav className={cx(styles.root, className)} aria-label={ariaLabel}>
      <div className={styles.controls}>
        {renderControl({
          page: safeCurrentPage - 1,
          variant: "outline",
          size: "m",
          disabled: safeCurrentPage === 1,
          ariaLabel: "Previous page",
          className: styles.controlButton,
          children: (
            <>
              <MoveLeft size="14" /> Previous
            </>
          ),
        })}
        {renderControl({
          page: safeCurrentPage + 1,
          variant: "primary",
          size: "m",
          disabled: safeCurrentPage === pageCount,
          ariaLabel: "Next page",
          className: styles.controlButton,
          children: (
            <>
              Next
              <MoveRight size="14" />
            </>
          ),
        })}
      </div>
      <ol className={styles.pages}>
        {items.map((item, index) =>
          item === "gap" ? (
            <li key={`gap-${index}`} className={styles.item}>
              <span className={styles.gap} aria-hidden="true">
                ...
              </span>
            </li>
          ) : (
            <li key={item} className={styles.item}>
              {renderControl({
                page: item,
                variant: item === safeCurrentPage ? "secondary" : "outline",
                disabled: item === safeCurrentPage,
                ariaLabel: `Page ${item}`,
                ariaCurrent: item === safeCurrentPage ? "page" : undefined,
                className: styles.pageButton,
                children: item,
              })}
            </li>
          ),
        )}
      </ol>
    </nav>
  );
}

function pageRange(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function clampPage(page: number, pageCount: number): number {
  return Math.min(Math.max(page, 1), pageCount);
}
