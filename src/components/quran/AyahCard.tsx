"use client";

"use client";

import { useState, type SyntheticEvent } from "react";
import { Button } from "@/components/ui/Button";
import { useAudioPlayer } from "@/components/quran/AudioContext";
import type { ReaderNote } from "@/components/quran/guest-user-data";
import { useReaderUserData } from "@/components/quran/ReaderUserDataContext";
import { TranslationLine } from "@/components/quran/TranslationLine";
import { WordByWordText } from "@/components/quran/WordByWordText";
import { TafsirText } from "@/components/quran/TafsirText";
import { createAyahIdentifier } from "@/services/quran/identifiers";
import type { Ayah } from "@/types/quran";

export interface AyahCardProps {
  readonly surahId: number;
  readonly ayah: Ayah;
}

export function AyahCard({ surahId, ayah }: AyahCardProps) {
  const identifier = createAyahIdentifier(surahId, ayah.numberInSurah);

  return (
    <article
      id={identifier}
      className="ayah-card"
      data-surah-id={surahId}
      data-ayah-id={ayah.id}
      data-ayah-number={ayah.numberInSurah}
      data-ayah-key={identifier}
      aria-labelledby={`${identifier}-number`}
    >
      <header className="ayah-card-header">
        <h2 id={`${identifier}-number`} className="ayah-number">
          Ayah {ayah.numberInSurah}
        </h2>
      </header>
      <div className="ayah-text-content">
        <WordByWordText verseKey={ayah.verseKey} arabicText={ayah.arabicText} />
        <TranslationLine verseKey={ayah.verseKey} />
        <TafsirText verseKey={ayah.verseKey} />
      </div>
      <AyahActions ayah={ayah} identifier={identifier} surahId={surahId} />
    </article>
  );
}

function AyahActions({
  ayah,
  identifier,
  surahId,
}: {
  readonly ayah: Ayah;
  readonly identifier: string;
  readonly surahId: number;
}) {
  const audio = useAudioPlayer();
  const userData = useReaderUserData();
  const [noteOpen, setNoteOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);
  const verseKey = `${surahId}:${ayah.numberInSurah}`;
  const bookmark = userData?.bookmarks.find((item) => item.verseKey === verseKey);
  const note = userData?.notes.find((item) => item.verseKey === verseKey);
  const readerBookmark = { verseKey, surahId, ayahNumber: ayah.numberInSurah };
  const canPlay = Boolean(audio?.currentReciter && audio.recitationsLoaded);

  async function runAction(action: () => Promise<string | void>, successMessage: string, errorMessage: string) {
    setPending(true);
    setFeedback(null);
    try {
      const actionMessage = await action();
      setFeedback({ text: actionMessage ?? successMessage, error: false });
      return true;
    } catch {
      setFeedback({ text: errorMessage, error: true });
      return false;
    } finally {
      setPending(false);
    }
  }

  function toggleBookmark() {
    if (!userData) return;
    void runAction(
      () => userData.toggleBookmark(readerBookmark),
      bookmark ? "Bookmark removed." : "Ayah saved to bookmarks.",
      "Bookmark could not be updated. Please try again.",
    );
  }

  function shareAyah() {
    const url = new URL(window.location.href);
    url.hash = identifier;
    void runAction(
      async () => {
        if (navigator.share) {
          await navigator.share({ title: `Quran, Surah ${surahId}, Ayah ${ayah.numberInSurah}`, url: url.toString() });
          return "Ayah link shared.";
        }
        await navigator.clipboard.writeText(url.toString());
        return "Ayah link copied.";
      },
      "Ayah link shared.",
      "This device could not share the Ayah link.",
    );
  }

  return (
    <>
      <fieldset className="ayah-actions">
        <legend className="sr-only">Actions for Ayah {ayah.numberInSurah}</legend>
        <Button
          type="button"
          variant={bookmark ? "primary" : "secondary"}
          disabled={!userData || userData.isLoading || pending}
          aria-label={bookmark ? `Remove bookmark for Ayah ${ayah.numberInSurah}` : `Bookmark Ayah ${ayah.numberInSurah}`}
          aria-pressed={Boolean(bookmark)}
          onClick={toggleBookmark}
        >
          {bookmark ? "Saved" : "Bookmark"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!userData || userData.isLoading || pending}
          aria-expanded={noteOpen}
          aria-controls={`${identifier}-note-panel`}
          onClick={() => setNoteOpen((open) => !open)}
        >
          {note ? "Edit note" : "Add note"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!canPlay}
          aria-label={`Play audio for Ayah ${ayah.numberInSurah}`}
          onClick={() => {
            if (audio?.currentReciter) audio.playAyah(ayah.verseKey, audio.currentReciter);
          }}
        >
          Audio
        </Button>
        <Button
          type="button"
          variant="secondary"
          aria-label={`Share Ayah ${ayah.numberInSurah}`}
          onClick={shareAyah}
        >
          Share
        </Button>
      </fieldset>
      {noteOpen ? (
        <AyahNoteEditor
          key={note?.id ?? note?.content ?? "new"}
          id={`${identifier}-note-panel`}
          note={note}
          pending={pending}
          onSave={(content) => userData ? runAction(
            () => userData.saveNote(readerBookmark, content),
            "Note saved.",
            "Note could not be saved. Please try again.",
          ) : Promise.resolve(false)}
          onDelete={() => userData && note ? runAction(
            () => userData.deleteNote(note),
            "Note deleted.",
            "Note could not be deleted. Please try again.",
          ) : Promise.resolve(false)}
          onClose={() => setNoteOpen(false)}
        />
      ) : null}
      {feedback ? (
        <p className={`ayah-action-feedback${feedback.error ? " is-error" : ""}`} role={feedback.error ? "alert" : "status"}>
          {feedback.text}
        </p>
      ) : null}
    </>
  );
}

function AyahNoteEditor({
  id,
  note,
  pending,
  onSave,
  onDelete,
  onClose,
}: {
  readonly id: string;
  readonly note?: ReaderNote;
  readonly pending: boolean;
  readonly onSave: (content: string) => Promise<boolean>;
  readonly onDelete: () => Promise<boolean>;
  readonly onClose: () => void;
}) {
  const [draft, setDraft] = useState(note?.content ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) {
      setValidationMessage("Write a note before saving.");
      return;
    }
    if (await onSave(draft)) onClose();
  }

  async function handleDelete() {
    if (await onDelete()) onClose();
  }

  return (
    <form className="ayah-note-editor" id={id} onSubmit={handleSubmit}>
      <label htmlFor={`${id}-input`}>Personal note</label>
      <textarea
        id={`${id}-input`}
        value={draft}
        maxLength={5000}
        rows={4}
        disabled={pending}
        onChange={(event) => {
          setDraft(event.currentTarget.value);
          setValidationMessage(null);
        }}
      />
      <div className="ayah-note-actions">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save note"}
        </Button>
        <Button type="button" variant="quiet" disabled={pending} onClick={onClose}>
          Cancel
        </Button>
        {note && !confirmDelete ? (
          <Button type="button" variant="quiet" disabled={pending} onClick={() => setConfirmDelete(true)}>
            Delete note
          </Button>
        ) : null}
      </div>
      {validationMessage ? <p className="ayah-action-feedback is-error" role="alert">{validationMessage}</p> : null}
      {confirmDelete ? (
        <fieldset className="ayah-note-confirm">
          <legend>Delete this note?</legend>
          <Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirmDelete(false)}>
            Keep note
          </Button>
          <Button type="button" variant="primary" disabled={pending} onClick={() => void handleDelete()}>
            Delete
          </Button>
        </fieldset>
      ) : null}
    </form>
  );
}
