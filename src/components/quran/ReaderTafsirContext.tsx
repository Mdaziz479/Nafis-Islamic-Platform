"use client";

import { createContext, useContext, useMemo } from "react";
import type { Tafsir } from "@/types/quran";

export type TafsirLoadState = "idle" | "loading" | "success" | "error";

export interface ReaderTafsirContextValue {
  readonly enabled: boolean;
  readonly selectedTafsirId: number | null;
  readonly loadState: TafsirLoadState;
  readonly tafsirsByVerseKey: Readonly<Record<string, Tafsir>>;
}

export const ReaderTafsirContext = createContext<ReaderTafsirContextValue | null>(null);

export function useReaderTafsir() {
  return useContext(ReaderTafsirContext);
}

interface ReaderTafsirProviderProps {
  readonly children: React.ReactNode;
  readonly enabled: boolean;
  readonly selectedTafsirId: number | null;
  readonly loadState: TafsirLoadState;
  readonly tafsirs: Tafsir[];
}

export function ReaderTafsirProvider({
  children,
  enabled,
  selectedTafsirId,
  loadState,
  tafsirs,
}: ReaderTafsirProviderProps) {
  const tafsirsByVerseKey = useMemo<Record<string, Tafsir>>(
    () => Object.fromEntries(tafsirs.map((tafsir) => [tafsir.verseKey, tafsir])),
    [tafsirs],
  );

  const value = useMemo<ReaderTafsirContextValue>(
    () => ({
      enabled,
      selectedTafsirId,
      loadState,
      tafsirsByVerseKey,
    }),
    [enabled, selectedTafsirId, loadState, tafsirsByVerseKey],
  );

  return (
    <ReaderTafsirContext.Provider value={value}>
      {children}
    </ReaderTafsirContext.Provider>
  );
}
