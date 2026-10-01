"use client";

import { Button } from "@/components/ui/Button";
import type { DailyAyahData, DailyDuaData } from "@/types/home";

export interface DailyAyahCardProps {
  readonly data: DailyAyahData;
  readonly onBookmark?: () => void;
  readonly onShare?: () => void;
}

export interface DailyDuaCardProps {
  readonly data: DailyDuaData;
  readonly onBookmark?: () => void;
  readonly onShare?: () => void;
}

interface DailyCardActionsProps {
  readonly label: string;
  readonly onBookmark?: () => void;
  readonly onShare?: () => void;
}

function DailyCardActions({ label, onBookmark, onShare }: DailyCardActionsProps) {
  return (
    <div className="daily-card-actions">
      <Button
        type="button"
        variant="secondary"
        aria-label={`Bookmark ${label}`}
        disabled={!onBookmark}
        onClick={onBookmark}
      >
        Bookmark
      </Button>
      <Button
        type="button"
        variant="secondary"
        aria-label={`Share ${label}`}
        disabled={!onShare}
        onClick={onShare}
      >
        Share
      </Button>
    </div>
  );
}

export function DailyAyahCard({ data, onBookmark, onShare }: DailyAyahCardProps) {
  const hasContent = data.arabic !== null && data.translation !== null &&
    data.surahName !== null && data.ayahNumber !== null;

  return (
    <article className="card daily-content-card">
      <div className="feature-card-header">
        <h3>Daily Ayah</h3>
      </div>
      {!hasContent ? (
        <p className="compact-placeholder">
          A daily verse will appear when a verified daily selection is available.
        </p>
      ) : (
        <>
          <p className="daily-arabic" lang="ar" dir="rtl">{data.arabic}</p>
          <p className="daily-translation">{data.translation}</p>
          <p className="daily-reference">{data.surahName} · Ayah {data.ayahNumber}</p>
        </>
      )}
      {onBookmark || onShare ? <DailyCardActions label="daily ayah" onBookmark={onBookmark} onShare={onShare} /> : null}
    </article>
  );
}

export function DailyDuaCard({ data, onBookmark, onShare }: DailyDuaCardProps) {
  const hasContent = data.title !== null && data.arabic !== null &&
    data.translation !== null && data.source !== null;

  return (
    <article className="card daily-content-card">
      <div className="feature-card-header">
        <h3>{data.title ?? "Daily Dua"}</h3>
      </div>
      {!hasContent ? (
        <p className="compact-placeholder">
          Verified Dua text and attribution will appear when a reliable source is connected.
        </p>
      ) : (
        <>
          <p className="daily-arabic" lang="ar" dir="rtl">{data.arabic}</p>
          <p className="daily-translation">{data.translation}</p>
          <p className="daily-reference">{data.source}</p>
        </>
      )}
      {onBookmark || onShare ? <DailyCardActions label="daily dua" onBookmark={onBookmark} onShare={onShare} /> : null}
    </article>
  );
}