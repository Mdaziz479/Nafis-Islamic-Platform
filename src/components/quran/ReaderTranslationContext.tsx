"use client";

import { createContext, useContext } from "react";
import type { Translation, TranslationResource } from "@/types/quran";

export type TranslationLoadState = "idle" | "loading" | "success" | "error";

export interface ReaderTranslationContextValue {
  readonly showTranslation: boolean;
  readonly selectedResource: TranslationResource | null;
  readonly loadState: TranslationLoadState;
  readonly translationsByVerseKey: Readonly<Record<string, Translation>>;
}

export const ReaderTranslationContext =
  createContext<ReaderTranslationContextValue | null>(null);

export function useReaderTranslation() {
  return useContext(ReaderTranslationContext);
}