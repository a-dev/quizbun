import { useMemo } from "react";

import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
import type { ComboboxOption, ComboboxValue } from "@/shared/ui/combobox";
import { InputField } from "@/shared/ui/input";

import type { TagFilterMode } from "../model/tag-filter";

import styles from "./tag-filter.module.css";

export interface TagFilterProps {
  /** All tags offered for filtering; the data source is injected by the caller. */
  availableTags: string[];
  selectedTags: string[];
  onSelectedTagsChange: (selectedTags: string[]) => void;
  tagMatchMode: TagFilterMode;
  onTagMatchModeChange: (tagMatchMode: TagFilterMode) => void;
  titleQuery: string;
  onTitleQueryChange: (titleQuery: string) => void;
  /** Optional per-tag quiz counts, shown next to each tag (Catalog use). */
  tagCounts?: Record<string, number>;
}

/**
 * Reusable tag filter: storage-agnostic by design so the M3 Catalog can host
 * the same component over build-time data.
 */
export function TagFilter({
  availableTags,
  selectedTags,
  onSelectedTagsChange,
  tagMatchMode,
  onTagMatchModeChange,
  titleQuery,
  onTitleQueryChange,
  tagCounts,
}: TagFilterProps) {
  const options = useMemo<ComboboxOption<string>[]>(
    () =>
      availableTags.map((tag) => ({
        value: tag,
        label: tagCounts?.[tag] === undefined ? tag : `${tag} (${tagCounts[tag]})`,
      })),
    [availableTags, tagCounts],
  );

  const value = useMemo<ComboboxValue<string>>(
    () => options.filter((option) => selectedTags.includes(option.value)),
    [options, selectedTags],
  );

  function handleSelectedTagsChange(nextValue: ComboboxValue<string>) {
    onSelectedTagsChange(nextValue?.map((option) => option.value) ?? []);
  }

  const hasTags = availableTags.length > 0;

  return (
    <div className={styles.root}>
      <div className={styles.field}>
        <InputField
          label="Filter by title"
          type="search"
          placeholder="Search titles"
          value={titleQuery}
          onChange={(event) => onTitleQueryChange(event.currentTarget.value)}
        />
      </div>

      {hasTags && (
        <div className={styles.field}>
          <Combobox
            label={
              <div className={styles.filterLabel}>
                <div className={styles.filterLabelText}>Filter by tags</div>
                {hasTags && (
                  <div className={styles.filterLabelButtons}>
                    <Button
                      variant="link"
                      size="s"
                      className={styles.filterLabelButton}
                      disabled={tagMatchMode === "and"}
                      onClick={() => onTagMatchModeChange("and")}
                    >
                      and
                    </Button>
                    <span className={styles.filterLabelSeparator}>/</span>
                    <Button
                      variant="link"
                      size="s"
                      className={styles.filterLabelButton}
                      disabled={tagMatchMode === "or"}
                      onClick={() => onTagMatchModeChange("or")}
                    >
                      or
                    </Button>
                  </div>
                )}
              </div>
            }
            placeholder="Select tags"
            options={options}
            value={value}
            onChange={handleSelectedTagsChange}
            slice={3}
          />
        </div>
      )}
    </div>
  );
}
