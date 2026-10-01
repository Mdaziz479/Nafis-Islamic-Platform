"use client";

import { useEffect } from "react";
import { useReaderUserData } from "@/components/quran/ReaderUserDataContext";

export function ReaderProgressTracker({ surahId }: { readonly surahId: number }) {
  const userData = useReaderUserData();
  const isLoading = userData?.isLoading;
  const recordReading = userData?.recordReading;

  useEffect(() => {
    if (!recordReading || isLoading) return;
    const cards = [...document.querySelectorAll<HTMLElement>(`.ayah-card[data-surah-id="${surahId}"]` )];
    if (!cards.length) return;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingAyah: number | null = null;

    function scheduleRecord(card: HTMLElement) {
      const ayahNumber = Number(card.dataset.ayahNumber);
      if (!Number.isInteger(ayahNumber) || ayahNumber < 1) return;
      pendingAyah = ayahNumber;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (pendingAyah !== null) recordReading?.(surahId, pendingAyah);
      }, 900);
    }

    if (typeof IntersectionObserver === "undefined") {
      scheduleRecord(cards[0]);
      return () => {
        if (debounceTimer) clearTimeout(debounceTimer);
      };
    }

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      if (visible?.target instanceof HTMLElement) scheduleRecord(visible.target);
    }, { threshold: [0.35, 0.65] });

    cards.forEach((card) => observer.observe(card));
    return () => {
      observer.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [isLoading, recordReading, surahId]);

  return userData?.progressError
    ? <output className="reader-progress-error" aria-live="polite">{userData.progressError}</output>
    : null;
}