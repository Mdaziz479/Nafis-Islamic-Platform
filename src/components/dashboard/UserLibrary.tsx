"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type SyntheticEvent } from "react";
import { Button } from "@/components/ui/Button";
import {
  getGuestUserDataSnapshot,
  getServerGuestUserDataSnapshot,
  saveGuestUserData,
  subscribeToGuestUserData,
  type ReaderBookmark,
  type ReaderCollection,
  type ReaderNote,
} from "@/components/quran/guest-user-data";
import { createAyahIdentifier } from "@/services/quran/identifiers";

interface SavedBookmark extends ReaderBookmark {
  readonly id?: string;
}

interface SavedNote extends ReaderNote {
  readonly id?: string;
}

interface SavedCollection extends ReaderCollection {
  readonly id?: string;
}

interface UserLibraryProps {
  readonly authenticated: boolean;
  readonly initialBookmarks?: SavedBookmark[];
  readonly initialNotes?: SavedNote[];
  readonly initialCollections?: SavedCollection[];
}

interface ResourceResult {
  readonly data?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readBookmarks(value: unknown): SavedBookmark[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.verseKey !== "string") return [];
    const [surahId, ayahNumber] = item.verseKey.split(":").map(Number);
    if (!Number.isInteger(surahId) || !Number.isInteger(ayahNumber)) return [];
    return [{ verseKey: item.verseKey, surahId, ayahNumber, ...(typeof item._id === "string" ? { id: item._id } : {}) }];
  });
}

function readNotes(value: unknown): SavedNote[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.verseKey !== "string" || typeof item.content !== "string") return [];
    const [surahId, ayahNumber] = item.verseKey.split(":").map(Number);
    if (!Number.isInteger(surahId) || !Number.isInteger(ayahNumber)) return [];
    return [{
      verseKey: item.verseKey,
      surahId,
      ayahNumber,
      content: item.content,
      ...(typeof item._id === "string" ? { id: item._id } : {}),
    }];
  });
}

function readCollections(value: unknown): SavedCollection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.name !== "string" || !Array.isArray(item.verseKeys)) return [];
    const verseKeys = item.verseKeys.filter((verseKey): verseKey is string => typeof verseKey === "string");
    return [{ name: item.name, verseKeys, ...(typeof item._id === "string" ? { id: item._id } : {}) }];
  });
}

async function sendRequest(path: string, method: string, body?: unknown) {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Saved items could not be updated. Please try again.");
  return response.status === 204 ? null : response.json() as Promise<ResourceResult>;
}

function verseHref(bookmark: ReaderBookmark) {
  return `/quran/surah/${bookmark.surahId}#${createAyahIdentifier(bookmark.surahId, bookmark.ayahNumber)}`;
}

export function UserLibrary({
  authenticated,
  initialBookmarks = [],
  initialNotes = [],
  initialCollections = [],
}: UserLibraryProps) {
  const [accountBookmarks, setAccountBookmarks] = useState<SavedBookmark[]>(initialBookmarks);
  const [accountNotes, setAccountNotes] = useState<SavedNote[]>(initialNotes);
  const [accountCollections, setAccountCollections] = useState<SavedCollection[]>(initialCollections);
  const guestData = useSyncExternalStore(
    subscribeToGuestUserData,
    getGuestUserDataSnapshot,
    getServerGuestUserDataSnapshot,
  );
  const bookmarks = authenticated ? accountBookmarks : guestData.bookmarks;
  const notes = authenticated ? accountNotes : guestData.notes;
  const collections = authenticated ? accountCollections : guestData.collections;
  const [collectionName, setCollectionName] = useState("");
  const [collectionEditKey, setCollectionEditKey] = useState<string | null>(null);
  const [collectionDraft, setCollectionDraft] = useState("");
  const [collectionSelection, setCollectionSelection] = useState("");
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [confirmDeleteNote, setConfirmDeleteNote] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function refreshAuthenticatedData() {
    const [bookmarkResponse, noteResponse, collectionResponse] = await Promise.all([
      fetch("/api/user-data/bookmarks", { cache: "no-store" }),
      fetch("/api/user-data/notes", { cache: "no-store" }),
      fetch("/api/user-data/collections", { cache: "no-store" }),
    ]);
    if (!bookmarkResponse.ok || !noteResponse.ok || !collectionResponse.ok) {
      throw new Error("Saved items could not be loaded. Please refresh the page.");
    }
    const [bookmarkResult, noteResult, collectionResult] = await Promise.all([
      bookmarkResponse.json() as Promise<ResourceResult>,
      noteResponse.json() as Promise<ResourceResult>,
      collectionResponse.json() as Promise<ResourceResult>,
    ]);
    setAccountBookmarks(readBookmarks(bookmarkResult.data));
    setAccountNotes(readNotes(noteResult.data));
    setAccountCollections(readCollections(collectionResult.data));
  }

  function saveGuestData(next: {
    bookmarks?: SavedBookmark[];
    notes?: SavedNote[];
    collections?: SavedCollection[];
  }) {
    const current = getGuestUserDataSnapshot();
    saveGuestUserData({
      bookmarks: next.bookmarks ?? current.bookmarks,
      notes: next.notes ?? current.notes,
      collections: next.collections ?? current.collections,
      progress: current.progress,
      goals: current.goals,
    });
  }

  async function runMutation(action: () => Promise<void>, successMessage: string) {
    setPending(true);
    setMessage(null);
    try {
      await action();
      setMessage(successMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Saved items could not be updated.");
    } finally {
      setPending(false);
    }
  }

  function createCollection(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = collectionName.trim();
    if (!name) {
      setMessage("Enter a collection name.");
      return;
    }
    void runMutation(async () => {
      if (authenticated) {
        await sendRequest("/api/user-data/collections", "POST", { name, verseKeys: [] });
        await refreshAuthenticatedData();
      } else {
        const duplicate = collections.some((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase());
        if (duplicate) throw new Error("A collection with this name already exists.");
        saveGuestData({ collections: [...collections, { name, verseKeys: [] }] });
      }
      setCollectionName("");
    }, "Collection created.");
  }

  function saveCollection(event: SyntheticEvent<HTMLFormElement>, collection: SavedCollection) {
    event.preventDefault();
    const name = collectionDraft.trim();
    if (!name) {
      setMessage("Enter a collection name.");
      return;
    }
    void runMutation(async () => {
      const updated = { ...collection, name };
      if (authenticated && collection.id) {
        await sendRequest(`/api/user-data/collections/${collection.id}`, "PATCH", updated);
        await refreshAuthenticatedData();
      } else {
        const duplicate = collections.some((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase() && item.name !== collection.name);
        if (duplicate) throw new Error("A collection with this name already exists.");
        saveGuestData({ collections: collections.map((item) => item.name === collection.name ? updated : item) });
      }
      setCollectionEditKey(null);
    }, "Collection renamed.");
  }

  function deleteCollection(collection: SavedCollection) {
    const key = collection.id ?? collection.name;
    void runMutation(async () => {
      if (authenticated && collection.id) {
        await sendRequest(`/api/user-data/collections/${collection.id}`, "DELETE");
        await refreshAuthenticatedData();
      } else {
        saveGuestData({ collections: collections.filter((item) => item.name !== collection.name) });
      }
      setConfirmDeleteKey(null);
    }, "Collection deleted.");
    setConfirmDeleteKey(null);
    return key;
  }

  function updateCollectionVerse(collection: SavedCollection, verseKey: string, add: boolean) {
    const verseKeys = add
      ? [...new Set([...collection.verseKeys, verseKey])]
      : collection.verseKeys.filter((item) => item !== verseKey);
    const updated = { ...collection, verseKeys };
    void runMutation(async () => {
      if (authenticated && collection.id) {
        await sendRequest(`/api/user-data/collections/${collection.id}`, "PATCH", updated);
        await refreshAuthenticatedData();
      } else {
        saveGuestData({ collections: collections.map((item) => item.name === collection.name ? updated : item) });
      }
    }, add ? "Ayah added to collection." : "Ayah removed from collection.");
  }

  function removeBookmark(bookmark: SavedBookmark) {
    void runMutation(async () => {
      if (authenticated && bookmark.id) {
        await sendRequest(`/api/user-data/bookmarks/${bookmark.id}`, "DELETE");
        await refreshAuthenticatedData();
      } else {
        saveGuestData({ bookmarks: bookmarks.filter((item) => item.verseKey !== bookmark.verseKey) });
      }
    }, "Bookmark removed.");
  }

  function saveNote(event: SyntheticEvent<HTMLFormElement>, note: SavedNote) {
    event.preventDefault();
    if (!noteDraft.trim()) {
      setMessage("Write a note before saving.");
      return;
    }
    void runMutation(async () => {
      const updated = { ...note, content: noteDraft.trim() };
      if (authenticated && note.id) {
        await sendRequest(`/api/user-data/notes/${note.id}`, "PATCH", updated);
        await refreshAuthenticatedData();
      } else {
        saveGuestData({ notes: notes.map((item) => item.verseKey === note.verseKey ? updated : item) });
      }
      setEditingNote(null);
    }, "Note saved.");
  }

  function removeNote(note: SavedNote) {
    void runMutation(async () => {
      if (authenticated && note.id) {
        await sendRequest(`/api/user-data/notes/${note.id}`, "DELETE");
        await refreshAuthenticatedData();
      } else {
        saveGuestData({ notes: notes.filter((item) => item.verseKey !== note.verseKey) });
      }
      setConfirmDeleteNote(null);
    }, "Note deleted.");
  }

  return (
    <section className="dashboard-library" aria-labelledby="saved-items-title">
      <div className="dashboard-library-heading">
        <div>
          <span className="eyebrow">{authenticated ? "Your library" : "On this device"}</span>
          <h2 id="saved-items-title">Saved items</h2>
        </div>
        {!authenticated ? <Link className="button button-secondary" href="/account">Sign in to sync</Link> : null}
      </div>

      <section className="dashboard-library-section" aria-labelledby="bookmarks-title">
        <h3 id="bookmarks-title">Bookmarks <span>{bookmarks.length}</span></h3>
        {bookmarks.length ? (
          <ul className="dashboard-saved-list">
            {bookmarks.map((bookmark) => (
              <li key={bookmark.verseKey}>
                <Link href={verseHref(bookmark)}>Surah {bookmark.surahId}, Ayah {bookmark.ayahNumber}</Link>
                <Button type="button" variant="quiet" disabled={pending} onClick={() => removeBookmark(bookmark)}>Remove</Button>
              </li>
            ))}
          </ul>
        ) : <p className="compact-placeholder">No bookmarks saved yet.</p>}
      </section>

      <section className="dashboard-library-section" aria-labelledby="notes-title">
        <h3 id="notes-title">Notes <span>{notes.length}</span></h3>
        {notes.length ? (
          <ul className="dashboard-saved-list dashboard-note-list">
            {notes.map((note) => (
              <li key={note.verseKey}>
                <Link href={verseHref(note)}>Surah {note.surahId}, Ayah {note.ayahNumber}</Link>
                {editingNote === note.verseKey ? (
                  <form onSubmit={(event) => saveNote(event, note)}>
                    <label className="visually-hidden" htmlFor={`dashboard-note-${note.verseKey}`}>Edit note</label>
                    <textarea id={`dashboard-note-${note.verseKey}`} value={noteDraft} maxLength={5000} onChange={(event) => setNoteDraft(event.currentTarget.value)} />
                    <Button type="submit" disabled={pending}>Save</Button>
                    <Button type="button" variant="quiet" disabled={pending} onClick={() => setEditingNote(null)}>Cancel</Button>
                  </form>
                ) : <p>{note.content}</p>}
                {confirmDeleteNote === note.verseKey ? (
                  <div className="dashboard-confirm-actions">
                    <span>Delete this note?</span>
                    <Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirmDeleteNote(null)}>Keep</Button>
                    <Button type="button" variant="primary" disabled={pending} onClick={() => removeNote(note)}>Delete</Button>
                  </div>
                ) : (
                  <div className="dashboard-saved-actions">
                    <Button type="button" variant="quiet" disabled={pending} onClick={() => { setEditingNote(note.verseKey); setNoteDraft(note.content); }}>Edit</Button>
                    <Button type="button" variant="quiet" disabled={pending} onClick={() => setConfirmDeleteNote(note.verseKey)}>Delete</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : <p className="compact-placeholder">No notes saved yet.</p>}
      </section>

      <section className="dashboard-library-section" aria-labelledby="collections-title">
        <div className="dashboard-collection-heading">
          <h3 id="collections-title">Collections <span>{collections.length}</span></h3>
          <form className="dashboard-create-collection" onSubmit={createCollection}>
            <label className="visually-hidden" htmlFor="new-collection-name">Collection name</label>
            <input id="new-collection-name" value={collectionName} maxLength={120} onChange={(event) => setCollectionName(event.currentTarget.value)} placeholder="New collection" />
            <Button type="submit" disabled={pending}>Create</Button>
          </form>
        </div>
        {collections.length ? (
          <ul className="dashboard-collection-list">
            {collections.map((collection) => {
              const key = collection.id ?? collection.name;
              const availableBookmarks = bookmarks.filter((bookmark) => !collection.verseKeys.includes(bookmark.verseKey));
              return (
                <li key={key}>
                  {collectionEditKey === key ? (
                    <form className="dashboard-rename-collection" onSubmit={(event) => saveCollection(event, collection)}>
                      <label className="visually-hidden" htmlFor={`collection-name-${key}`}>Collection name</label>
                      <input id={`collection-name-${key}`} value={collectionDraft} maxLength={120} onChange={(event) => setCollectionDraft(event.currentTarget.value)} />
                      <Button type="submit" disabled={pending}>Save</Button>
                      <Button type="button" variant="quiet" disabled={pending} onClick={() => setCollectionEditKey(null)}>Cancel</Button>
                    </form>
                  ) : (
                    <div className="dashboard-collection-title">
                      <strong>{collection.name}</strong><span>{collection.verseKeys.length} ayahs</span>
                      <Button type="button" variant="quiet" disabled={pending} onClick={() => { setCollectionEditKey(key); setCollectionDraft(collection.name); }}>Rename</Button>
                      {confirmDeleteKey === key ? (
                        <>
                          <span>Delete collection?</span>
                          <Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirmDeleteKey(null)}>Keep</Button>
                          <Button type="button" variant="primary" disabled={pending} onClick={() => deleteCollection(collection)}>Delete</Button>
                        </>
                      ) : (
                        <Button type="button" variant="quiet" disabled={pending} onClick={() => setConfirmDeleteKey(key)}>Delete</Button>
                      )}
                    </div>
                  )}
                  {collection.verseKeys.length ? (
                    <ul className="dashboard-collection-items">
                      {collection.verseKeys.map((verseKey) => {
                        const [surahId, ayahNumber] = verseKey.split(":").map(Number);
                        const item = { verseKey, surahId, ayahNumber };
                        return (
                          <li key={verseKey}>
                            <Link href={verseHref(item)}>Surah {surahId}, Ayah {ayahNumber}</Link>
                            <Button type="button" variant="quiet" disabled={pending} onClick={() => updateCollectionVerse(collection, verseKey, false)}>Remove</Button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : <p className="compact-placeholder">No ayahs in this collection yet.</p>}
                  {availableBookmarks.length ? (
                    <div className="dashboard-add-to-collection">
                      <label className="visually-hidden" htmlFor={`collection-add-${key}`}>Choose a bookmark to add</label>
                      <select id={`collection-add-${key}`} value={collectionSelection} onChange={(event) => setCollectionSelection(event.currentTarget.value)}>
                        <option value="">Add a bookmark</option>
                        {availableBookmarks.map((bookmark) => <option key={bookmark.verseKey} value={bookmark.verseKey}>Surah {bookmark.surahId}, Ayah {bookmark.ayahNumber}</option>)}
                      </select>
                      <Button type="button" disabled={pending || !collectionSelection} onClick={() => updateCollectionVerse(collection, collectionSelection, true)}>Add</Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : <p className="compact-placeholder">Create a collection to organize saved ayahs.</p>}
      </section>

      {message ? <output className="dashboard-library-message" aria-live="polite">{message}</output> : null}
    </section>
  );
}