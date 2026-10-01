"use client";

import { useReaderTafsir } from "@/components/quran/ReaderTafsirContext";

interface TafsirTextProps {
  readonly verseKey: string;
}

export function TafsirText({ verseKey }: TafsirTextProps) {
  const context = useReaderTafsir();

  if (!context?.enabled) return null;
  if (context.loadState === "loading") {
    return (
      <div className="tafsir-loading" aria-live="polite">
        Loading Tafsir...
      </div>
    );
  }
  if (context.loadState === "error") {
    return (
      <div className="tafsir-error" role="alert">
        Tafsir could not be loaded.
      </div>
    );
  }
  if (context.loadState === "idle") return null;

  const tafsir = context.tafsirsByVerseKey[verseKey];
  if (!tafsir) return null;

  return (
    <aside className="tafsir-block" aria-label={`Tafsir for ${verseKey}`}>
      <div className="tafsir-header">
        <span className="tafsir-label">Tafsir</span>
        <span className="tafsir-language">{tafsir.languageName}</span>
      </div>
      <p className="tafsir-text">{tafsir.text}</p>
    </aside>
  );
}
