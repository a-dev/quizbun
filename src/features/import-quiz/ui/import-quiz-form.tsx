import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";

import { messageFromError } from "@/shared/lib/errors";
import type { Quiz } from "@/shared/lib/quiz";
import { withBase } from "@/shared/lib/routing";
import { quizExists, replaceQuiz, saveQuiz } from "@/shared/lib/storage";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { Note } from "@/shared/ui/note";
import { CodeTextarea } from "@/shared/ui/textarea";

import { QuizCard } from "@/entities/quiz";

import { validateQuizJson } from "../model/validate-quiz-json";
import type { QuizJsonValidationResult } from "../model/validate-quiz-json";

import styles from "./import-quiz-form.module.css";

export function ImportQuizForm() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<QuizJsonValidationResult | undefined>(undefined);
  const [saveError, setSaveError] = useState<string | undefined>(undefined);
  const [isCollisionDialogOpen, setIsCollisionDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateText(nextText: string) {
    setText(nextText);
    setResult(undefined);
    setSaveError(undefined);
  }

  function validate() {
    setResult(validateQuizJson(text));
  }

  async function fillFromFile(file: File | undefined) {
    if (file === undefined) return;

    updateText(await file.text());
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    void fillFromFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLTextAreaElement>) {
    event.preventDefault();

    const file = event.dataTransfer.files[0];

    if (file !== undefined) {
      void fillFromFile(file);
      return;
    }

    const droppedText = event.dataTransfer.getData("text/plain");

    if (droppedText !== "") updateText(droppedText);
  }

  async function confirmSave(quiz: Quiz) {
    try {
      if (await quizExists(quiz.id)) {
        setIsCollisionDialogOpen(true);
        return;
      }

      await saveQuiz(quiz);
      openQuizDetail(quiz.id);
    } catch (error) {
      setSaveError(messageFromError(error));
    }
  }

  async function replaceExisting(quiz: Quiz) {
    setIsCollisionDialogOpen(false);

    try {
      await replaceQuiz(quiz);
      openQuizDetail(quiz.id);
    } catch (error) {
      setSaveError(messageFromError(error));
    }
  }

  return (
    <section aria-label="Import a quiz" className={styles.root}>
      <div className={styles.actions}>
        <label htmlFor="quiz-json" className={styles.label}>
          Paste quiz JSON (or pick a file / drop it onto the text area):
        </label>
        <div className={styles.buttons}>
          <Button
            type="button"
            variant="outline"
            size="m"
            onClick={() => fileInputRef.current?.click()}
          >
            Load file
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={onFileChange}
            className={styles.fileInput}
          />
          <Button variant="primary" size="m" onClick={validate} disabled={text.trim() === ""}>
            Validate
          </Button>
        </div>
        <div className={styles.reports}>
          {result?.status === "invalid" && <ValidationReport report={result.report} />}
          {result?.status === "valid" && (
            <QuizCard
              size="m"
              summary={{
                id: result.quiz.id,
                title: result.quiz.title,
                questionCount: result.quiz.questions.length,
                tags: result.quiz.tags,
                description: result.quiz.description,
              }}
              href=""
              showDescription={true}
              isPreview={true}
              actions={
                <Button
                  variant="secondary"
                  size="m"
                  onClick={() => void confirmSave(result.quiz)}
                  style={{ backgroundColor: "var(--color-state-success-bg)" }}
                >
                  Save to Library
                </Button>
              }
            />
          )}
        </div>
        {saveError !== undefined && <Note type="error">Could not save the quiz: {saveError}</Note>}
      </div>
      <CodeTextarea
        id="quiz-json"
        rows={16}
        value={text}
        onChange={(event) => updateText(event.target.value)}
        onDrop={onDrop}
        onDragOver={(event) => event.preventDefault()}
        spellCheck={false}
      />

      <Dialog
        open={isCollisionDialogOpen}
        onOpenChange={setIsCollisionDialogOpen}
        title="A quiz with this id already exists"
        footer={
          result?.status === "valid" && (
            <>
              <Dialog.Close
                render={
                  <Button variant="outline" size="m">
                    Cancel
                  </Button>
                }
              />
              <Button
                variant="destructive"
                size="m"
                onClick={() => void replaceExisting(result.quiz)}
              >
                Replace
              </Button>
            </>
          )
        }
      >
        {result?.status === "valid" && (
          <>
            <p>
              Your Library already has a quiz with the id <code>{result.quiz.id}</code>. Replace it?
            </p>
            <p>
              Replacing keeps your progress on questions that are unchanged; answers to changed or
              removed questions are discarded.
            </p>
          </>
        )}
      </Dialog>
    </section>
  );
}

function ValidationReport({ report }: { report: string }) {
  const [copied, setCopied] = useState(false);

  async function copyReport() {
    await navigator.clipboard.writeText(report);
    setCopied(true);
  }

  return (
    <section aria-label="Validation errors" id="errors" className={styles.reportSection}>
      <pre role="alert" className={styles.errorReport}>
        {report}
      </pre>
      <Button
        variant="outline"
        size="s"
        onClick={() => {
          setCopied(false);
          void copyReport();
        }}
        className={styles.reportCopyButton}
      >
        Copy errors
        {copied && <span className={styles.reportCopyStatus}>copied</span>}
      </Button>
    </section>
  );
}

function openQuizDetail(id: string) {
  window.location.assign(withBase(`library/quiz/?id=${encodeURIComponent(id)}`));
}
