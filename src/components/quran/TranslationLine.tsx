"use client";

import { useReaderTranslation } from "@/components/quran/ReaderTranslationContext";

interface TranslationLineProps {
  readonly verseKey: string;
}

export function TranslationLine({ verseKey }: TranslationLineProps) {
  const context = useReaderTranslation();
  if (!context?.showTranslation || !context.selectedResource) return null;
  if (context.loadState === "error") return null;

  if (context.loadState === "loading" || context.loadState === "idle") {
    return (
      <div className="ayah-translation-area" translate="no">
        <span className="translation-source-label">
          {context.selectedResource.languageName} · {context.selectedResource.resourceName}
        </span>
        <p className="translation-loading">Translation loading...</p>
      </div>
    );
  }

  const translation = context.translationsByVerseKey[verseKey];
  if (!translation) {
    return (
      <div className="ayah-translation-area" translate="no">
        <span className="translation-source-label">
          {context.selectedResource.languageName} · {context.selectedResource.resourceName}
        </span>
        <p className="translation-missing">
          This translation was not returned for this Ayah.
        </p>
      </div>
    );
  }

  return (
    <div className="ayah-translation-area" translate="no">
      <span className="translation-source-label">
        {context.selectedResource.languageName} · {context.selectedResource.resourceName}
      </span>
      <p
        className="ayah-translation-text"
        lang={context.selectedResource.languageCode ?? undefined}
        dir="auto"
        translate="no"
      >
        {translation.text}
      </p>
      {translation.footnotes?.length ? (
        <ol className="translation-footnotes" aria-label="Translation footnotes">
          {translation.footnotes.map((footnote) => (
            <li key={footnote.id}>
              {footnote.marker ? <sup>{footnote.marker}</sup> : null}
              {footnote.text}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}