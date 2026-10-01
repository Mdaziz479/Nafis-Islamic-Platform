"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import {
  getIslamicPreferencesSnapshot,
  getServerIslamicPreferencesSnapshot,
  subscribeToIslamicPreferences,
  updateIslamicPreferences,
} from "@/components/islamic/islamic-preferences";
import { Button } from "@/components/ui/Button";
import { HIJRI_CALENDAR_METHODS, PRAYER_CALCULATION_METHODS } from "@/types/islamic";
import {
  getQuranReaderPreferencesSnapshot,
  getServerQuranReaderPreferencesSnapshot,
  subscribeToQuranReaderPreferences,
  updateQuranReaderPreferences,
  type QuranReaderPreferences,
} from "@/components/quran/reader-preferences";

type PreferenceUpdate = Partial<Omit<QuranReaderPreferences, "version">>;

function PreferenceStepper({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly suffix: string;
  readonly onChange: (value: number) => void;
}) {
  const id = `setting-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <div className="settings-row">
      <span id={id}>{label}</span>
      <div className="settings-stepper" aria-labelledby={id}>
        <Button type="button" variant="secondary" disabled={value <= min} aria-label={`Decrease ${label.toLowerCase()}`} onClick={() => onChange(Math.max(min, Number((value - step).toFixed(2))))}>−</Button>
        <output aria-live="polite">{value}{suffix}</output>
        <Button type="button" variant="secondary" disabled={value >= max} aria-label={`Increase ${label.toLowerCase()}`} onClick={() => onChange(Math.min(max, Number((value + step).toFixed(2))))}>+</Button>
      </div>
    </div>
  );
}

function PreferenceToggle({
  label,
  pressed,
  onChange,
}: {
  readonly label: string;
  readonly pressed: boolean;
  readonly onChange: () => void;
}) {
  return (
    <div className="settings-row">
      <span>{label}</span>
      <Button type="button" variant={pressed ? "primary" : "secondary"} aria-pressed={pressed} onClick={onChange}>
        {pressed ? "On" : "Off"}
      </Button>
    </div>
  );
}

export function SettingsPanel() {
  const preferences = useSyncExternalStore(
    subscribeToQuranReaderPreferences,
    getQuranReaderPreferencesSnapshot,
    getServerQuranReaderPreferencesSnapshot,
  );
  const islamicPreferences = useSyncExternalStore(
    subscribeToIslamicPreferences,
    getIslamicPreferencesSnapshot,
    getServerIslamicPreferencesSnapshot,
  );

  function update(values: PreferenceUpdate) {
    updateQuranReaderPreferences(values);
  }

  const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div className="settings-groups">
      <fieldset className="settings-group">
        <legend>Appearance</legend>
        <div className="settings-row">
          <span>Theme</span>
          <ThemeToggle />
        </div>
      </fieldset>

      <fieldset className="settings-group">
        <legend>Quran reader</legend>
        <PreferenceStepper label="Arabic text size" value={preferences.arabicFontSize} min={24} max={48} step={2} suffix="px" onChange={(arabicFontSize) => update({ arabicFontSize })} />
        <PreferenceStepper label="Translation text size" value={preferences.translationFontSize} min={13} max={24} step={1} suffix="px" onChange={(translationFontSize) => update({ translationFontSize })} />
        <PreferenceToggle label="Show translation" pressed={preferences.showTranslation} onChange={() => update({ showTranslation: !preferences.showTranslation })} />
        <PreferenceToggle label="Word-by-word view" pressed={preferences.wordByWordEnabled} onChange={() => update({ wordByWordEnabled: !preferences.wordByWordEnabled })} />
        <PreferenceToggle label="Show Tafsir" pressed={preferences.showTafsir} onChange={() => update({ showTafsir: !preferences.showTafsir })} />
        <Link className="settings-resource-link" href="/quran">Choose translation and Tafsir resources <span aria-hidden="true">→</span></Link>
      </fieldset>

      <fieldset className="settings-group">
        <legend>Audio playback</legend>
        <div className="settings-row">
          <label htmlFor="settings-playback-speed">Playback speed</label>
          <select
            id="settings-playback-speed"
            value={preferences.playbackSpeed}
            onChange={(event) => update({ playbackSpeed: Number(event.currentTarget.value) })}
          >
            {!playbackSpeeds.includes(preferences.playbackSpeed) ? <option value={preferences.playbackSpeed}>{preferences.playbackSpeed}×</option> : null}
            {playbackSpeeds.map((speed) => <option key={speed} value={speed}>{speed}×</option>)}
          </select>
        </div>
        <PreferenceStepper label="Volume" value={preferences.volume} min={0} max={1} step={0.1} suffix="" onChange={(volume) => update({ volume })} />
        <div className="settings-row">
          <label htmlFor="settings-repeat-mode">Repeat</label>
          <select
            id="settings-repeat-mode"
            value={preferences.repeatMode}
            onChange={(event) => update({ repeatMode: event.currentTarget.value as QuranReaderPreferences["repeatMode"] })}
          >
            <option value="off">Off</option>
            <option value="ayah">Current Ayah</option>
            <option value="surah">Current Surah</option>
          </select>
        </div>
        <PreferenceToggle label="Play next Ayah automatically" pressed={preferences.autoPlayNextAyah} onChange={() => update({ autoPlayNextAyah: !preferences.autoPlayNextAyah })} />
      </fieldset>

      <fieldset className="settings-group">
        <legend>Islamic utilities</legend>
        <div className="settings-row settings-location-row">
          <label htmlFor="settings-city">City and country</label>
          <div className="settings-location-fields">
            <input id="settings-city" maxLength={80} value={islamicPreferences.city} onChange={(event) => updateIslamicPreferences({ city: event.currentTarget.value, latitude: null, longitude: null })} placeholder="City" />
            <input aria-label="Country" maxLength={80} value={islamicPreferences.country} onChange={(event) => updateIslamicPreferences({ country: event.currentTarget.value, latitude: null, longitude: null })} placeholder="Country" />
          </div>
        </div>
        <div className="settings-row">
          <label htmlFor="settings-islamic-method">Prayer calculation</label>
          <select id="settings-islamic-method" value={islamicPreferences.prayerMethod} onChange={(event) => updateIslamicPreferences({ prayerMethod: Number(event.currentTarget.value) })}>
            {PRAYER_CALCULATION_METHODS.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
          </select>
        </div>
        <div className="settings-row">
          <label htmlFor="settings-islamic-school">Asr method</label>
          <select id="settings-islamic-school" value={islamicPreferences.school} onChange={(event) => updateIslamicPreferences({ school: Number(event.currentTarget.value) as 0 | 1 })}>
            <option value={0}>Shafi (standard)</option>
            <option value={1}>Hanafi</option>
          </select>
        </div>
        <div className="settings-row">
          <label htmlFor="settings-calendar-method">Hijri date convention</label>
          <select id="settings-calendar-method" value={islamicPreferences.calendarMethod} onChange={(event) => updateIslamicPreferences({ calendarMethod: event.currentTarget.value as typeof islamicPreferences.calendarMethod })}>
            {HIJRI_CALENDAR_METHODS.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
          </select>
        </div>
        {islamicPreferences.latitude !== null ? <p className="settings-location-summary">Coordinates selected: {islamicPreferences.latitude.toFixed(3)}, {islamicPreferences.longitude?.toFixed(3)}</p> : null}
      </fieldset>
    </div>
  );
}