"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DUA_CATEGORIES, DUAS, type DuaEntry } from "@/data/duas";

function shareText(dua: DuaEntry, url: string) {
  return `${dua.title}\n\n${dua.arabic}\n\n${dua.transliteration}\n\n${dua.meaning}\n\n${dua.source}\n${url}`;
}

export function DuaLibrary() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [message, setMessage] = useState<string | null>(null);
  const filteredDuas = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return DUAS.filter((dua) => {
      const matchesCategory = category === "All" || dua.categories.includes(category);
      const searchable = [dua.title, dua.arabic, dua.transliteration, dua.meaning, dua.source, ...dua.categories]
        .join(" ")
        .toLocaleLowerCase();
      return matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [category, query]);

  async function copyDua(dua: DuaEntry) {
    try {
      await navigator.clipboard.writeText(shareText(dua, `${window.location.origin}/duas`));
      setMessage(`Copied “${dua.title}”.`);
    } catch {
      setMessage("Copy is unavailable in this browser context.");
    }
  }

  async function shareDua(dua: DuaEntry) {
    const url = `${window.location.origin}/duas`;
    const text = shareText(dua, url);
    try {
      if (navigator.share) {
        await navigator.share({ title: dua.title, text, url });
        setMessage(`Shared “${dua.title}”.`);
        return;
      }
      await navigator.clipboard.writeText(text);
      setMessage("Sharing is unavailable here; the Dua and link were copied instead.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setMessage("This Dua could not be shared or copied in this browser context.");
    }
  }

  return (
    <div className="dua-library">
      <div className="dua-controls">
        <label className="dua-search" htmlFor="dua-search-input">
          <span>Search duas</span>
          <input
            id="dua-search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search meaning, Arabic, transliteration, or source"
            maxLength={120}
          />
        </label>
        <div className="dua-category-list" role="group" aria-label="Filter duas by category">
          {["All", ...DUA_CATEGORIES].map((item) => (
            <button
              className="dua-category-button"
              type="button"
              aria-pressed={category === item}
              key={item}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <p className="dua-result-count" aria-live="polite">
        {filteredDuas.length} {filteredDuas.length === 1 ? "Dua" : "Duas"}
        {category !== "All" ? ` in ${category}` : ""}
      </p>
      {message ? <output className="dua-feedback" aria-live="polite">{message}</output> : null}

      {filteredDuas.length ? (
        <div className="dua-grid">
          {filteredDuas.map((dua) => (
            <article className="card dua-card" key={dua.id}>
              <div className="dua-card-heading">
                <h2>{dua.title}</h2>
                <div className="dua-tags">
                  {dua.categories.map((item) => <span key={item}>{item}</span>)}
                </div>
              </div>
              <p className="dua-arabic" lang="ar" dir="rtl">{dua.arabic}</p>
              <p className="dua-transliteration" lang="en">{dua.transliteration}</p>
              <p className="dua-meaning">{dua.meaning}</p>
              <a className="dua-source" href={dua.sourceUrl} target="_blank" rel="noreferrer">
                {dua.source} <span aria-hidden="true">↗</span>
              </a>
              <div className="dua-actions">
                <Button type="button" variant="secondary" onClick={() => void copyDua(dua)}>Copy</Button>
                <Button type="button" variant="secondary" onClick={() => void shareDua(dua)}>Share</Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state dua-empty-state">
          <h2>No duas found</h2>
          <p>Try another search or choose a different category.</p>
          <Button type="button" variant="secondary" onClick={() => { setQuery(""); setCategory("All"); }}>Clear filters</Button>
        </div>
      )}
      <p className="dua-translation-note">Qur&apos;anic meanings are from The Clear Quran by Dr. Mustafa Khattab. Hadith wording and references link to their cited collections.</p>
    </div>
  );
}