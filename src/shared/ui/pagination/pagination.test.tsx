import { describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { Pagination, buildPaginationItems } from "./pagination";

describe("buildPaginationItems", () => {
  it("returns no items when there are no pages", () => {
    expect(buildPaginationItems(1, 0)).toEqual([]);
  });

  it("returns every page when the page count fits", () => {
    expect(buildPaginationItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("uses both gaps around the current page window", () => {
    expect(buildPaginationItems(6, 55)).toEqual([1, "gap", 4, 5, 6, 7, 8, "gap", 55]);
  });

  it("uses one gap near the start", () => {
    expect(buildPaginationItems(2, 55)).toEqual([1, 2, 3, 4, 5, 6, "gap", 55]);
  });

  it("uses one gap near the end", () => {
    expect(buildPaginationItems(54, 55)).toEqual([1, "gap", 50, 51, 52, 53, 54, 55]);
  });
});

describe("Pagination", () => {
  it("does not render when only one page exists", async () => {
    const screen = await page.render(
      <Pagination aria-label="Pages" currentPage={1} pageCount={1} onPageChange={() => null} />,
    );

    await expect.element(screen.getByRole("navigation", { name: "Pages" })).not.toBeInTheDocument();
  });

  it("emits page changes from digits and word controls", async () => {
    const onPageChange = vi.fn();
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    const screen = await page.render(
      <Pagination aria-label="Pages" currentPage={6} pageCount={55} onPageChange={onPageChange} />,
    );

    await expect
      .element(screen.getByRole("button", { name: "Page 6" }))
      .toHaveAttribute("aria-current", "page");

    await userEvent.click(screen.getByRole("button", { name: "Page 7" }));
    await expect(onPageChange).toHaveBeenLastCalledWith(7);
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0);

    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    await expect(onPageChange).toHaveBeenLastCalledWith(5);
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0);

    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await expect(onPageChange).toHaveBeenLastCalledWith(7);
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0);
  });

  it("renders page links when hrefs are provided", async () => {
    const onPageChange = vi.fn();
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    const screen = await page.render(
      <Pagination
        aria-label="Pages"
        currentPage={2}
        pageCount={3}
        hrefForPage={(pageNumber) => `/items/page/${pageNumber}/`}
        onPageChange={onPageChange}
      />,
    );

    await expect
      .element(screen.getByRole("link", { name: "Page 3" }))
      .toHaveAttribute("href", "/items/page/3/");

    // Previous/Next are real links too when hrefs are provided.
    await expect
      .element(screen.getByRole("link", { name: "Previous page" }))
      .toHaveAttribute("href", "/items/page/1/");
    await expect
      .element(screen.getByRole("link", { name: "Next page" }))
      .toHaveAttribute("href", "/items/page/3/");

    await userEvent.click(screen.getByRole("link", { name: "Page 3" }));
    await expect(onPageChange).toHaveBeenLastCalledWith(3);
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0);

    await userEvent.click(screen.getByRole("link", { name: "Previous page" }));
    await expect(onPageChange).toHaveBeenLastCalledWith(1);
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0);
  });

  it("keeps an edge control a button even when hrefs are provided", async () => {
    const screen = await page.render(
      <Pagination
        aria-label="Pages"
        currentPage={1}
        pageCount={3}
        hrefForPage={(pageNumber) => `/items/page/${pageNumber}/`}
        onPageChange={() => null}
      />,
    );

    // Disabled Previous at the first page has no navigable href, so it stays a button.
    await expect.element(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await expect
      .element(screen.getByRole("link", { name: "Next page" }))
      .toHaveAttribute("href", "/items/page/2/");
  });
});
