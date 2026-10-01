"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import {
  clearGuestUserData,
  getGuestUserDataSnapshot,
} from "@/components/quran/guest-user-data";
import { getQuranReaderPreferencesSnapshot } from "@/components/quran/reader-preferences";
import { Button } from "@/components/ui/Button";

const STORAGE_KEY = "sakinah:guest-sync-pending";
const CHANGE_EVENT = "sakinah-guest-sync-state-change";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot() {
  return window.sessionStorage.getItem(STORAGE_KEY) === "1";
}

export function GuestSyncNotice() {
  const auth = useAuth();
  const isPending = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const retrySync = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/user-data/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...getGuestUserDataSnapshot(),
          settings: getQuranReaderPreferencesSnapshot(),
        }),
      });
      if (!response.ok) throw new Error("Saved items could not sync yet. Please try again.");
      clearGuestUserData();
      window.sessionStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new Event(CHANGE_EVENT));
      setMessage("Your saved items and preferences are synced.");
    } catch {
      setMessage("Saved items could not sync yet. They remain on this device.");
    } finally {
      setBusy(false);
    }
  }, []);

  if (!auth?.user || (!isPending && !message)) return null;

  return (
    <aside className="guest-sync-notice" aria-live="polite">
      <p>{message ?? "Some guest items are still saved only on this device."}</p>
      {isPending ? (
        <Button type="button" variant="secondary" disabled={busy} onClick={() => void retrySync()}>
          {busy ? "Syncing..." : "Retry sync"}
        </Button>
      ) : null}
      {message ? <button className="guest-sync-dismiss" type="button" onClick={() => setMessage(null)}>Dismiss</button> : null}
    </aside>
  );
}