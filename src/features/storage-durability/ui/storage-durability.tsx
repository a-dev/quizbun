import { useEffect, useState } from "react";

import { Database, ScrollText } from "lucide-react";

import { withBase } from "@/shared/lib/routing";
import {
  hasStoredData,
  isStorageApiAvailable,
  isStoragePersisted,
  requestStoragePersistence,
} from "@/shared/lib/storage";
import { Button } from "@/shared/ui/button";
import { Note } from "@/shared/ui/note";

import {
  type DurabilityDismissal,
  getDurabilityDismissal,
  isDurabilityNoticeDismissed,
  setDurabilityDismissal,
} from "../model/durability-preference";
import { isStandaloneDisplay } from "../model/install-environment";

import { cx } from "#styles";
import styles from "./storage-durability.module.css";

type Props = {
  showWhenEmpty?: boolean;
  needInlineMargin?: boolean;
};

/**
 * `"granted"` exists only to confirm an explicit request for the rest of the
 * session; `"idle"` covers "not asked yet" and any grant the user didn't ask for.
 */
type PersistenceRequest = "idle" | "pending" | "granted" | "declined";

export function StorageDurability({
  showWhenEmpty = false,
  needInlineMargin = false,
}: Readonly<Props>) {
  const [storageAvailable] = useState(isStorageApiAvailable);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [hasData, setHasData] = useState<boolean | null>(null);
  const [dismissal, setDismissal] = useState(getDurabilityDismissal);
  const [standalone] = useState(isStandaloneDisplay);
  const [request, setRequest] = useState<PersistenceRequest>("idle");

  useEffect(() => {
    if (!storageAvailable) return;

    let cancelled = false;

    // "Can't tell" counts as nothing stored: if IndexedDB is unreadable the
    // Library is broken anyway, and claiming data is at risk of being stranded
    // would be worse than staying quiet about it.
    void Promise.all([isStoragePersisted(), hasStoredData().catch(() => false)]).then(
      ([nextPersisted, nextHasData]) => {
        if (cancelled) return;
        setPersisted(nextPersisted);
        setHasData(nextHasData);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [storageAvailable]);

  useEffect(() => {
    // Only Firefox prompts, other browsers grant persistence automatically when installed. If the user has already granted persistence, don't ask again.
    if (!standalone || persisted !== false) return;

    let cancelled = false;

    void requestStoragePersistence().then((granted) => {
      if (!cancelled && granted) setPersisted(true);
    });

    return () => {
      cancelled = true;
    };
  }, [persisted, standalone]);

  if (!storageAvailable || persisted === null || hasData === null) return null;
  if (!hasData && !showWhenEmpty) return null;

  if (persisted && request !== "granted") return null;

  const dismissed = isDurabilityNoticeDismissed(dismissal, hasData);
  const showNotice = !persisted && !dismissed && !standalone;
  const pending = request === "pending";

  async function protectStorage() {
    setRequest("pending");

    const granted = await requestStoragePersistence();
    setPersisted(granted);
    setRequest(granted ? "granted" : "declined");
  }

  function dismiss() {
    const nextDismissal: DurabilityDismissal = hasData ? "data-stored" : "nothing-stored";

    setDurabilityDismissal(nextDismissal);
    setDismissal(nextDismissal);
  }

  return (
    <div className={cx(styles.root, needInlineMargin && styles.rootInlineMargin)}>
      {showNotice && (
        <Note type="warning" as="output" onClose={dismiss}>
          <p className={styles.copy}>
            Browsers may delete a site's stored data to free up space. For example, Safari deletes
            it after seven days if you don't visit the site. To protect your own progress and
            quizzes, you can:
            <br /> • install Quizbun as a web app from your browser's menu (
            <a href={withBase("docs/how-to-install-app/")}>
              <ScrollText size="14" aria-hidden="true" className={styles.iconInText} />
              <span className={styles.noteActionText}>see the instructions</span>
            </a>
            ),
            <br /> • or{" "}
            <Button
              variant="link"
              size="s"
              className={styles.persistenceAction}
              onClick={() => void protectStorage()}
              disabled={pending || request === "declined"}
              aria-busy={pending || undefined}
            >
              <Database size="14" aria-hidden="true" className={styles.iconInText} />
              <span className={styles.noteActionText}>ask browser to keep this data</span>
            </Button>
            .
          </p>

          {request === "declined" && (
            <p className={styles.declinedCopy}>
              This browser didn't grant the request. Only{" "}
              <a href={withBase("docs/how-to-install-app/")}>installing Quizbun as a web app</a>{" "}
              helps you keep your data.
            </p>
          )}
        </Note>
      )}
    </div>
  );
}
