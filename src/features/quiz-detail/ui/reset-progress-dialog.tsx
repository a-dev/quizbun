import { useMemo } from "react";

import { renderMarkdownFieldText } from "@/shared/lib/render";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";

interface ResetProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Raw Quiz title; rendered to plain text for the confirmation copy. */
  quizTitle: string;
  onConfirm: () => void;
}

/**
 * Destructive-action confirmation: resetting a Run deletes its saved answers,
 * so the user confirms first. Closing (Cancel / overlay / Escape) is a no-op.
 */
export function ResetProgressDialog({
  open,
  onOpenChange,
  quizTitle,
  onConfirm,
}: ResetProgressDialogProps) {
  const title = useMemo(() => renderMarkdownFieldText("quizTitle", quizTitle), [quizTitle]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Reset progress?"
      description={<>Your saved answers for “{title}” will be deleted. This cannot be undone.</>}
      footer={
        <>
          <Dialog.Close
            render={
              <Button variant="outline" size="m">
                Cancel
              </Button>
            }
          />
          <Button variant="destructive" size="m" onClick={onConfirm}>
            Reset progress
          </Button>
        </>
      }
    />
  );
}
