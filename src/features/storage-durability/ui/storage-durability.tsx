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

import styles from "./storage-durability.module.css";

type Props = {
  showWhenEmpty?: boolean;
};

/**
 * `"granted"` exists only to confirm an explicit request for the rest of the
 * session; `"idle"` covers "not asked yet" and any grant the user didn't ask for.
 */
type PersistenceRequest = "idle" | "pending" | "granted" | "declined";

export function StorageDurability({ showWhenEmpty = false }: Props) {
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

  // The one place `persist()` fires without a click, and the only place it
  // reliably succeeds. T3's "never call persist() on page load" rule exists
  // because Firefox raises a permission prompt — and Firefox has no standalone
  // display mode, so it can never reach this branch. Chromium and WebKit decide
  // by heuristic with no prompt at all, and being installed is the criterion
  // they weigh most, so asking here is asking at the only moment it works.
  useEffect(() => {
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
  // Protected is the quiet state: there is nothing left to ask of the user and
  // nothing worth a permanent line of text, so the whole thing disappears. The
  // one exception is the moment right after an explicit request — vanishing
  // silently would leave the click with no visible outcome, which is the bug the
  // refusal copy exists to avoid. It is session-only: the next visit shows
  // nothing, and a grant the user never asked for (standalone) says nothing.
  if (persisted && request !== "granted") return null;

  // Plain language on purpose. The spec's own words for these states are
  // "persistent" and "best-effort" storage, and a byte figure from `estimate()`
  // used to sit here — all of it unreadable to anyone who hadn't read the
  // Storage Standard, and the byte figure covered the whole origin so it never
  // meant "your quizzes" either.
  const status =
    request === "granted"
      ? "Saved — this browser won't delete your quizzes and progress automatically."
      : "Your quizzes and progress are saved only in this browser, which may delete them to free up space.";
  const dismissed = isDurabilityNoticeDismissed(dismissal, hasData);
  const showNotice = !persisted && !dismissed && !standalone;
  const installPath = resolveInstallPath(installPrompt !== null);
  const pending = request === "pending";

  async function protectStorage() {
    setRequest("pending");

    const granted = await requestStoragePersistence();
    setPersisted(granted);
    // A refusal is the ordinary outcome, not an error state — but it has to be
    // visible, or the click looks like it did nothing at all. Only Firefox turns
    // this into a question the user can answer; Chromium and WebKit decide by
    // heuristic, which is why the copy points at installing instead of retrying.
    setRequest(granted ? "granted" : "declined");
  }

  async function install() {
    if (installPrompt === null) return;

    try {
      await installPrompt.prompt();
    } catch {
      // `prompt()` is single-use and throws once spent. Nothing to recover: the
      // browser's own install path stays available either way.
    }

    setInstallPrompt(null);
  }

  function dismiss() {
    const nextDismissal: DurabilityDismissal = hasData ? "data-stored" : "nothing-stored";

    setDurabilityDismissal(nextDismissal);
    setDismissal(nextDismissal);
  }

  return (
    <div className={styles.root}>
      <p className={styles.status} aria-live="polite">
        {status}
      </p>

      {showNotice && (
        // `role="status"` overrides Note's assertive default for warnings. This
        // is standing advice rendered on load rather than a response to an
        // action, so it must not interrupt a screen reader on every Library
        // visit; it stays a live region so the outcome of "Protect storage" is
        // still announced.
        <Note type="warning" role="status">
          <div className={styles.noticeContent}>
            <p className={styles.copy}>
              {hasData
                ? "Don't lose your quizzes and progress. "
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
                  ? "so what you've saved in Safari won't appear there — you'd add it again in the app."
                  : "so installing before you save anything saves you doing it twice."}
              </p>
            )}

            {installPath === "browser-menu" && (
              <p className={styles.copy}>Install Quizbun from your browser's app or page menu.</p>
            )}

            {request === "declined" && (
              <p className={styles.copy}>
                {installPath === "none"
                  ? "The browser turned that down, so this data stays deletable."
                  : "The browser turned that down. Installing Quizbun is the reliable way to get it — browsers grant this to installed apps."}
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
                  size="s"
                  variant="secondary"
                  onClick={() => void protectStorage()}
                  disabled={pending}
                  aria-busy={pending || undefined}
                >
                  Ask browser to keep this data
                </Button>
              ) : (
                <Button size="s" onClick={() => void install()}>
                  Install Quizbun
                </Button>
              )}
              <Button size="s" variant="ghost" onClick={dismiss}>
                Dismiss
              </Button>
            </div>
          </div>
        </Note>
      )}
    </div>
  );
}
