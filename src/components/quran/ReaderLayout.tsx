"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/Button";
import {
  ReaderTranslationContext,
  type TranslationLoadState,
} from "@/components/quran/ReaderTranslationContext";
import { ReaderWordContext } from "@/components/quran/ReaderWordContext";
import { ReaderTafsirProvider } from "@/components/quran/ReaderTafsirContext";
import { ReaderUserDataProvider } from "@/components/quran/ReaderUserDataContext";
import { ReaderProgressTracker } from "@/components/quran/ReaderProgressTracker";
import {
  getQuranReaderPreferencesSnapshot,
  getServerQuranReaderPreferencesSnapshot,
  subscribeToQuranReaderPreferences,
  updateQuranReaderPreferences,
} from "@/components/quran/reader-preferences";
import type {
  AyahWordData,
  QuranWord,
  Translation,
  TranslationResource,
  Tafsir,
  TafsirResource,
} from "@/types/quran";

interface ReaderLayoutProps {
  readonly surahId: number;
  readonly translationResources: TranslationResource[];
  readonly translationResourcesUnavailable: boolean;
  readonly tafsirResources: TafsirResource[];
  readonly children: ReactNode;
}

interface ReaderStyle extends CSSProperties {
  "--reader-arabic-size": string;
  "--reader-translation-size": string;
}

interface TranslationFetchState {
  readonly key: string | null;
  readonly state: TranslationLoadState;
  readonly translations: Translation[];
}

interface TranslationApiResponse {
  readonly status?: string;
  readonly data?: Translation[] | null;
}

interface WordApiResponse {
  readonly status?: string;
  readonly data?: AyahWordData[] | null;
}

interface WordFetchState {
  readonly key: string | null;
  readonly state: TranslationLoadState;
  readonly ayahs: AyahWordData[];
}

interface TafsirApiResponse {
  readonly status?: string;
  readonly data?: Tafsir[] | null;
}

interface TafsirFetchState {
  readonly key: string | null;
  readonly state: TranslationLoadState;
  readonly tafsirs: Tafsir[];
}

export function ReaderLayout({
  surahId,
  translationResources,
  translationResourcesUnavailable,
  tafsirResources,
  children,
}: ReaderLayoutProps) {
  const preferences = useSyncExternalStore(
    subscribeToQuranReaderPreferences,
    getQuranReaderPreferencesSnapshot,
    getServerQuranReaderPreferencesSnapshot,
  );
  const [retryCount, setRetryCount] = useState(0);
  const [fetchState, setFetchState] = useState<TranslationFetchState>({
    key: null,
    state: "idle",
    translations: [],
  });
  const [wordRetryCount, setWordRetryCount] = useState(0);
  const [wordFetchState, setWordFetchState] = useState<WordFetchState>({
    key: null,
    state: "idle",
    ayahs: [],
  });
  const [tafsirFetchState, setTafsirFetchState] = useState<TafsirFetchState>({
    key: null,
    state: "idle",
    tafsirs: [],
  });
  const selectRef = useRef<HTMLSelectElement>(null);
  const tafsirSelectRef = useRef<HTMLSelectElement>(null);
  const selectedResource = translationResources.find(
    ({ id }) => id === preferences.selectedTranslationId,
  ) ?? null;
  const selectedTranslationId = selectedResource?.id ?? null;
  const requestKey =
    preferences.showTranslation && selectedTranslationId !== null
      ? `${surahId}:${selectedTranslationId}:${retryCount}`
      : null;
  const wordRequestKey = preferences.wordByWordEnabled
    ? `${surahId}:${wordRetryCount}`
    : null;
  const selectedTafsirResource = tafsirResources.find(
    ({ id }) => id === preferences.selectedTafsirId,
  ) ?? null;
  const selectedTafsirId = selectedTafsirResource?.id ?? null;
  const tafsirRequestKey = preferences.showTafsir && selectedTafsirId !== null
    ? `${surahId}:${selectedTafsirId}`
    : null;

  useEffect(() => {
    if (
      preferences.selectedTranslationId !== null &&
      selectedResource === null
    ) {
      updateQuranReaderPreferences({ selectedTranslationId: null });
    }
  }, [preferences.selectedTranslationId, selectedResource]);

  useEffect(() => {
    if (requestKey === null || fetchState.key === requestKey) return;

    const controller = new AbortController();
    const query = new URLSearchParams({
      resourceId: String(selectedTranslationId),
    });

    void fetch(
      `/api/quran/surah/${surahId}/translations?${query.toString()}`,
      { signal: controller.signal, cache: "no-store" },
    )
      .then(async (response) => {
        const result = (await response.json()) as TranslationApiResponse;
        if (
          !response.ok ||
          result.status !== "success" ||
          !Array.isArray(result.data)
        ) {
          throw new Error("Translation request failed.");
        }

        setFetchState({
          key: requestKey,
          state: "success",
          translations: result.data,
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setFetchState({ key: requestKey, state: "error", translations: [] });
      });

    return () => controller.abort();
  }, [fetchState.key, requestKey, selectedTranslationId, surahId]);

  useEffect(() => {
    if (wordRequestKey === null || wordFetchState.key === wordRequestKey) return;

    const controller = new AbortController();
    void fetch(`/api/quran/surah/${surahId}/words`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const result = (await response.json()) as WordApiResponse;
        if (
          !response.ok ||
          result.status !== "success" ||
          !Array.isArray(result.data)
        ) {
          throw new Error("Word request failed.");
        }

        setWordFetchState({
          key: wordRequestKey,
          state: "success",
          ayahs: result.data,
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setWordFetchState({ key: wordRequestKey, state: "error", ayahs: [] });
      });

    return () => controller.abort();
  }, [surahId, wordFetchState.key, wordRequestKey]);

  useEffect(() => {
    if (tafsirRequestKey === null || tafsirFetchState.key === tafsirRequestKey) return;

    const controller = new AbortController();
    void fetch(`/api/quran/surah/${surahId}/tafsir/${selectedTafsirId}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const result = (await response.json()) as TafsirApiResponse;
        if (
          !response.ok ||
          result.status !== "success" ||
          !Array.isArray(result.data)
        ) {
          throw new Error("Tafsir request failed.");
        }

        setTafsirFetchState({
          key: tafsirRequestKey,
          state: "success",
          tafsirs: result.data,
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setTafsirFetchState({ key: tafsirRequestKey, state: "error", tafsirs: [] });
      });

    return () => controller.abort();
  }, [surahId, tafsirFetchState.key, tafsirRequestKey, selectedTafsirId]);

  let loadState: TranslationLoadState = "idle";
  if (requestKey !== null) {
    loadState = fetchState.key === requestKey ? fetchState.state : "loading";
  }
  const translationsByVerseKey = useMemo<Record<string, Translation>>(
    () => Object.fromEntries(
      (loadState === "success" ? fetchState.translations : []).map(
        (translation) => [translation.verseKey, translation],
      ),
    ),
    [fetchState.translations, loadState],
  );
  const translationContext = useMemo(
    () => ({
      showTranslation: preferences.showTranslation,
      selectedResource,
      loadState,
      translationsByVerseKey,
    }),
    [loadState, preferences.showTranslation, selectedResource, translationsByVerseKey],
  );
  const wordLoadState: TranslationLoadState = wordRequestKey === null
    ? "idle"
    : wordFetchState.key === wordRequestKey
      ? wordFetchState.state
      : "loading";
  const wordsByVerseKey = useMemo<Record<string, QuranWord[]>>(
    () => Object.fromEntries(
      wordFetchState.ayahs.map((ayah) => [ayah.verseKey, ayah.words]),
    ),
    [wordFetchState.ayahs],
  );
  const wordContext = useMemo(
    () => ({
      enabled: preferences.wordByWordEnabled,
      loadState: wordLoadState,
      wordsByVerseKey,
    }),
    [preferences.wordByWordEnabled, wordLoadState, wordsByVerseKey],
  );
  const tafsirLoadState: TranslationLoadState = tafsirRequestKey === null
    ? "idle"
    : tafsirFetchState.key === tafsirRequestKey
      ? tafsirFetchState.state
      : "loading";
  const style: ReaderStyle = {
    "--reader-arabic-size": `${preferences.arabicFontSize}px`,
    "--reader-translation-size": `${preferences.translationFontSize}px`,
  };
  let translationNotice: ReactNode = null;
  if (translationResourcesUnavailable) {
    translationNotice = (
      <div className="translation-settings-message" aria-live="polite">
        Available translations could not be loaded.
      </div>
    );
  } else if (translationResources.length === 0) {
    translationNotice = (
      <p className="translation-settings-message">
        No translations are currently available from this provider environment.
      </p>
    );
  } else if (preferences.showTranslation && selectedResource && loadState === "loading") {
    translationNotice = (
      <div className="translation-settings-message" aria-live="polite">
        Translation loading...
      </div>
    );
  }
  let wordNotice: ReactNode = null;
  if (preferences.wordByWordEnabled && wordLoadState === "loading") {
    wordNotice = (
      <div className="translation-settings-message" aria-live="polite">
        Word-by-word data loading. Arabic remains visible.
      </div>
    );
  } else if (preferences.wordByWordEnabled && wordLoadState === "error") {
    wordNotice = (
      <div className="translation-error-state" role="alert">
        <p>Word-by-word data could not be loaded. Arabic remains readable.</p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setWordRetryCount((count) => count + 1)}
        >
          Retry word data
        </Button>
      </div>
    );
  }

  return (
    <div className="quran-reader" style={style}>
      <fieldset className="reader-preferences">
        <legend className="sr-only">Reader settings</legend>
        <FontSizeControl
          label="Arabic size"
          size={preferences.arabicFontSize}
          min={24}
          max={48}
          step={2}
          onChange={(arabicFontSize) => updateQuranReaderPreferences({ arabicFontSize })}
        />
        <FontSizeControl
          label="Translation size"
          size={preferences.translationFontSize}
          min={13}
          max={24}
          step={1}
          onChange={(translationFontSize) =>
            updateQuranReaderPreferences({ translationFontSize })
          }
        />
        <Button
          type="button"
          variant="secondary"
          aria-pressed={preferences.wordByWordEnabled}
          onClick={() => updateQuranReaderPreferences({
            wordByWordEnabled: !preferences.wordByWordEnabled,
          })}
        >
          {preferences.wordByWordEnabled ? "Word by word: On" : "Word by word: Off"}
        </Button>
        <div className="reader-translation-settings">
          <label htmlFor="reader-translation-select">Translation</label>
          <select
            ref={selectRef}
            id="reader-translation-select"
            value={selectedTranslationId ?? ""}
            disabled={translationResources.length === 0}
            onChange={(event) => {
              const value = Number(event.currentTarget.value);
              updateQuranReaderPreferences({
                selectedTranslationId:
                  Number.isInteger(value) && value > 0 ? value : null,
              });
            }}
          >
            <option value="">Select a provider translation</option>
            {translationResources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.languageName} — {resource.resourceName}
                {resource.translator ? ` (${resource.translator})` : ""}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="secondary"
            aria-pressed={preferences.showTranslation}
            disabled={selectedTranslationId === null}
            onClick={() => updateQuranReaderPreferences({
              showTranslation: !preferences.showTranslation,
            })}
          >
            {preferences.showTranslation ? "Hide translation" : "Show translation"}
          </Button>
        </div>
        <div className="reader-translation-settings">
          <label htmlFor="reader-tafsir-select">Tafsir</label>
          <select
            ref={tafsirSelectRef}
            id="reader-tafsir-select"
            value={selectedTafsirId ?? ""}
            disabled={tafsirResources.length === 0}
            onChange={(event) => {
              const value = Number(event.currentTarget.value);
              updateQuranReaderPreferences({
                selectedTafsirId:
                  Number.isInteger(value) && value > 0 ? value : null,
              });
            }}
          >
            <option value="">Select a Tafsir</option>
            {tafsirResources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.languageName} — {resource.name}
                {resource.authorName ? ` (${resource.authorName})` : ""}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="secondary"
            aria-pressed={preferences.showTafsir}
            disabled={selectedTafsirId === null}
            onClick={() => updateQuranReaderPreferences({
              showTafsir: !preferences.showTafsir,
            })}
          >
            {preferences.showTafsir ? "Hide Tafsir" : "Show Tafsir"}
          </Button>
        </div>
      </fieldset>

      {translationNotice}
      {wordNotice}
      {preferences.showTranslation && selectedResource && loadState === "error" ? (
        <div className="translation-error-state" role="alert">
          <p>Translation could not be loaded.</p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            Retry
          </Button>
          <Button
            type="button"
            variant="quiet"
            onClick={() => selectRef.current?.focus()}
          >
            Change Translation
          </Button>
        </div>
      ) : null}

      <ReaderUserDataProvider>
        <ReaderProgressTracker surahId={surahId} />
        <ReaderTranslationContext.Provider value={translationContext}>
          <ReaderWordContext.Provider value={wordContext}>
            <ReaderTafsirProvider
              enabled={preferences.showTafsir}
              selectedTafsirId={selectedTafsirId}
              loadState={tafsirLoadState}
              tafsirs={tafsirFetchState.tafsirs}
            >
              {children}
            </ReaderTafsirProvider>
          </ReaderWordContext.Provider>
        </ReaderTranslationContext.Provider>
      </ReaderUserDataProvider>
    </div>
  );
}

interface FontSizeControlProps {
  readonly label: string;
  readonly size: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly onChange: (size: number) => void;
}

function FontSizeControl({
  label,
  size,
  min,
  max,
  step,
  onChange,
}: FontSizeControlProps) {
  return (
    <div className="reader-font-setting">
      <span>{label}</span>
      <div className="reader-text-controls">
        <Button
          type="button"
          variant="secondary"
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={size <= min}
          onClick={() => onChange(Math.max(min, size - step))}
        >
          A−
        </Button>
        <output aria-live="polite">{size}px</output>
        <Button
          type="button"
          variant="secondary"
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={size >= max}
          onClick={() => onChange(Math.min(max, size + step))}
        >
          A+
        </Button>
      </div>
    </div>
  );
}