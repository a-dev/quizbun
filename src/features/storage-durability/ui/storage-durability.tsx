import { useEffect, useState } from "react";

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
import {
  type BeforeInstallPromptEvent,
  isStandaloneDisplay,
  resolveInstallPath,
} from "../model/install-environment";

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

export function StorageDurability({ showWhenEmpty = false, needInlineMargin = false }: Props) {
  const [storageAvailable] = useState(isStorageApiAvailable);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [hasData, setHasData] = useState<boolean | null>(null);
  const [dismissal, setDismissal] = useState(getDurabilityDismissal);
  const [standalone, setStandalone] = useState(isStandaloneDisplay);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
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

  useEffect(() => {
    if (standalone) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setStandalone(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [standalone]);

  if (!storageAvailable || persisted === null || hasData === null) return null;
  if (!hasData && !showWhenEmpty) return null;

  if (persisted && request !== "granted") return null;

  const dismissed = isDurabilityNoticeDismissed(dismissal, hasData);
  const showNotice = !persisted && !dismissed && !standalone;
  const installPath = resolveInstallPath(installPrompt !== null);
  const pending = request === "pending";

  async function protectStorage() {
    setRequest("pending");

    const granted = await requestStoragePersistence();
    setPersisted(granted);
    setRequest(granted ? "granted" : "declined");
  }

  async function install() {
    if (installPrompt === null) return;

    try {
      await installPrompt.prompt();
    } catch {}

    setInstallPrompt(null);
  }

  function dismiss() {
    const nextDismissal: DurabilityDismissal = hasData ? "data-stored" : "nothing-stored";

    setDurabilityDismissal(nextDismissal);
    setDismissal(nextDismissal);
  }

  return (
    <div className={cx(styles.root, needInlineMargin && styles.rootInlineMargin)}>
      {showNotice && (
        <Note type="warning" role="status">
          <div className={styles.noticeContent}>
            <p className={styles.copy}>
              {hasData
                ? "Don't lose your quizzes and progress "
                : "Before you start, one thing worth knowing. "}
              Browsers delete stored data to free up space, and Safari deletes it after seven days
              without a visit.{" "}
              {installPath === "none"
                ? "Allowing persistent storage reduces that risk."
                : "Installing Quizbun and allowing persistent storage both reduce that risk."}
            </p>

            {/* The separate storage jar is WebKit-only — a Chromium PWA shares
                storage with the browser — so "install first" is advice that only
                belongs on this branch. */}
            {installPath === "ios-safari" && (
              <p className={styles.copy}>
                Open Safari's Share menu, then choose <strong>Add to Home Screen</strong>. The
                installed app gets its own separate storage,{" "}
                {hasData
                  ? "so what you've saved in Safari won't appear there — you'd add it again in the app"
                  : "so installing before you save anything saves you doing it twice"}
              </p>
            )}

            {installPath === "browser-menu" && (
              <p className={styles.copy}>Install Quizbun from your browser's app or page menu</p>
            )}

            {request === "declined" && (
              <p className={styles.copy}>
                {installPath === "none"
                  ? "The browser turned that down, so this data stays deletable"
                  : "The browser turned that down. Installing Quizbun is the reliable way to get it — browsers grant this to installed apps"}
              </p>
            )}

            {/* One main action at a time. Installing is what actually works, and
                it makes the request unnecessary: once the app runs installed, the
                effect above asks for persistence with no clicks at all. The
                request button therefore only appears when there is no install
                button to offer. */}
            <div className={styles.actions}>
              {installPrompt === null ? (
                <Button
                  size="m"
                  onClick={() => void protectStorage()}
                  disabled={pending}
                  aria-busy={pending || undefined}
                >
                  Ask browser to keep this data
                </Button>
              ) : (
                <Button size="m" onClick={() => void install()}>
                  Install Quizbun
                </Button>
              )}
              <Button size="s" variant="outline" onClick={dismiss}>
                Dismiss
              </Button>
            </div>
          </div>
        </Note>
      )}
    </div>
  );
}
