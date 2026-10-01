"use client";

import { useState } from "react";
import { useReaderWords } from "@/components/quran/ReaderWordContext";

interface WordByWordTextProps {
  readonly verseKey: string;
  readonly arabicText: string | null;
}

export function WordByWordText({ verseKey, arabicText }: WordByWordTextProps) {
  const context = useReaderWords();
  const [selectedWordId, setSelectedWordId] = useState<number | string | null>(null);

  if (!context?.enabled) return <ArabicVerseText text={arabicText} />;
  if (context.loadState !== "success") return <ArabicVerseText text={arabicText} />;

  const words = [...(context.wordsByVerseKey[verseKey] ?? [])].sort(
    (left, right) => left.position - right.position,
  );
  if (words.length === 0) return <ArabicVerseText text={arabicText} />;

  const selectedWord = words.find(({ id }) => id === selectedWordId) ?? null;

  return (
    <div className="word-by-word-block">
      <div className="word-by-word-line" lang="ar" dir="rtl">
        {words.map((word) => (
          <button
            className="quran-word"
            key={`${verseKey}:${word.id}`}
            type="button"
            aria-label={`Word ${word.position}`}
            aria-pressed={selectedWordId === word.id}
            onClick={() => setSelectedWordId((current) =>
              current === word.id ? null : word.id,
            )}
          >
            {word.arabicText ?? ""}
          </button>
        ))}
      </div>
      {selectedWord ? (
        <aside className="quran-word-details" aria-live="polite">
          <p className="quran-word-detail-arabic" lang="ar" dir="rtl">
            {selectedWord.arabicText ?? "Word text unavailable"}
          </p>
          {selectedWord.transliteration ? (
            <p>
              <span>Transliteration</span>
              {selectedWord.transliteration}
            </p>
          ) : null}
          {selectedWord.translation?.text ? (
            <p>
              <span>{selectedWord.translation.language || "Translation"}</span>
              {selectedWord.translation.text}
            </p>
          ) : (
            <p className="compact-placeholder">Word meaning unavailable.</p>
          )}
        </aside>
      ) : null}
    </div>
  );
}

function ArabicVerseText({ text }: { readonly text: string | null }) {
  if (!text) {
    return (
      <p className="ayah-unavailable-text">
        Arabic text is unavailable from this source.
      </p>
    );
  }

  return (
    <p className="reader-arabic-text" lang="ar" dir="rtl" translate="no">
      {text}
    </p>
  );
}