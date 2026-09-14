import { Button } from "@/shared/ui/button";
import { Note } from "@/shared/ui/note";

interface NoFilterMatchesProps {
  onClearFilters: () => void;
}

/**
 * The empty state for a filtered Quiz list: the filters hid everything the list
 * holds. Shared by the Catalog and the Library so both offer the same way out.
 */
export function NoFilterMatches({ onClearFilters }: NoFilterMatchesProps) {
  return (
    <Note type="warning">
      <p>
        No quizzes match the selected filters.{" "}
        <Button variant="destructive" size="s" onClick={onClearFilters}>
          Clear filters
        </Button>{" "}
        to see all quizzes.
      </p>
    </Note>
  );
}
