import { useState } from "react";

import { describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import type { TagFilterMode } from "../model/tag-filter";
import { TagFilter } from "./tag-filter";

function TestTagFilter({
  onTitleQueryChange,
  onTagMatchModeChange,
}: {
  onTitleQueryChange: (titleQuery: string) => void;
  onTagMatchModeChange: (tagMatchMode: TagFilterMode) => void;
}) {
  const [titleQuery, setTitleQuery] = useState("");
  const [tagMatchMode, setTagMatchMode] = useState<TagFilterMode>("and");

  return (
    <TagFilter
      availableTags={["css", "react"]}
      selectedTags={["css", "react"]}
      onSelectedTagsChange={() => null}
      tagMatchMode={tagMatchMode}
      onTagMatchModeChange={(nextTagMatchMode) => {
        setTagMatchMode(nextTagMatchMode);
        onTagMatchModeChange(nextTagMatchMode);
      }}
      titleQuery={titleQuery}
      onTitleQueryChange={(nextTitleQuery) => {
        setTitleQuery(nextTitleQuery);
        onTitleQueryChange(nextTitleQuery);
      }}
    />
  );
}

describe("TagFilter", () => {
  it("emits title query and tag match mode changes", async () => {
    const onTitleQueryChange = vi.fn();
    const onTagMatchModeChange = vi.fn();
    const screen = await page.render(
      <TestTagFilter
        onTitleQueryChange={onTitleQueryChange}
        onTagMatchModeChange={onTagMatchModeChange}
      />,
    );

    await userEvent.type(screen.getByRole("searchbox", { name: "Filter by title" }), "grid");
    await expect(onTitleQueryChange).toHaveBeenLastCalledWith("grid");

    await userEvent.click(screen.getByRole("button", { name: "OR" }));
    await expect(onTagMatchModeChange).toHaveBeenLastCalledWith("or");
  });
});
