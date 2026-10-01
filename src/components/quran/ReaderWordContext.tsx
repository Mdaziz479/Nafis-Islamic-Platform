"use client";

import { createContext, useContext } from "react";
import type { TranslationLoadState } from "@/components/quran/ReaderTranslationContext";
import type { QuranWord } from "@/types/quran";

export interface ReaderWordContextValue {
  readonly enabled: boolean;
  readonly loadState: TranslationLoadState;
  readonly wordsByVerseKey: Readonly<Record<string, QuranWord[]>>;
}

export const ReaderWordContext =
  createContext<ReaderWordContextValue | null>(null);

export function useReaderWords() {
  return useContext(ReaderWordContext);
}