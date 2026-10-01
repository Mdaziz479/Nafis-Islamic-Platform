"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { useAudioPlayer } from "@/components/quran/AudioContext";
import {
  getQuranReaderPreferencesSnapshot,
  getServerQuranReaderPreferencesSnapshot,
  subscribeToQuranReaderPreferences,
} from "@/components/quran/reader-preferences";
import type { Reciter } from "@/types/quran";

interface AudioPlayerProps {
  readonly surahId: number;
  readonly reciters: Reciter[];
}

export function AudioPlayer({ surahId, reciters }: AudioPlayerProps) {
  const audio = useAudioPlayer();
  const preferences = useSyncExternalStore(
    subscribeToQuranReaderPreferences,
    getQuranReaderPreferencesSnapshot,
    getServerQuranReaderPreferencesSnapshot,
  );

  useEffect(() => {
    if (!audio || audio.currentReciter || audio.playbackState === "loading" || reciters.length === 0) return;
    const preferredReciter = preferences.selectedReciterId === null
      ? undefined
      : reciters.find(({ id }) => Number(id) === preferences.selectedReciterId);
    const reciter = preferredReciter ?? reciters[0];
    if (reciter) void audio.loadVerseRecitations(surahId, reciter);
  }, [audio, audio?.currentReciter, audio?.loadVerseRecitations, preferences.selectedReciterId, reciters, surahId]);
  
  if (!audio) return null;

  const {
    playbackState,
    currentReciter,
    currentVerseKey,
    currentTime,
    duration,
    volume,
    playbackSpeed,
    repeatMode,
    autoPlayNextAyah,
    pause,
    resume,
    playAdjacentAyah,
    seek,
    setVolume,
    setPlaybackSpeed,
    setRepeatMode,
    setAutoPlayNextAyah,
    loadVerseRecitations,
    recitationsLoaded,
  } = audio;

  const handleReciterChange = async (reciterId: string) => {
    const reciter = reciters.find((r) => r.id === reciterId);
    if (reciter) {
      await loadVerseRecitations(surahId, reciter);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  function cycleRepeatMode() {
    let nextMode: "off" | "ayah" | "surah" = "off";
    if (repeatMode === "off") nextMode = "ayah";
    else if (repeatMode === "ayah") nextMode = "surah";
    setRepeatMode(nextMode);
  }

  return (
    <div className="audio-player">
      <div className="audio-player-controls">
        <div className="audio-playback-controls">
          <Button
            type="button"
            variant="secondary"
            disabled={playbackState === "loading" || playbackState === "error" || !currentVerseKey}
            aria-label="Previous Ayah"
            onClick={() => playAdjacentAyah(-1)}
          >
            ⏮
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={playbackState === "loading" || playbackState === "error"}
            onClick={playbackState === "playing" ? pause : resume}
            aria-label={playbackState === "playing" ? "Pause" : "Play"}
          >
            {playbackState === "playing" ? "⏸" : "▶"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={playbackState === "loading" || playbackState === "error" || !currentVerseKey}
            aria-label="Next Ayah"
            onClick={() => playAdjacentAyah(1)}
          >
            ⏭
          </Button>
          
          <div className="audio-progress">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seek(Number(e.currentTarget.value))}
              disabled={playbackState === "idle" || playbackState === "loading"}
              className="audio-progress-slider"
              aria-label="Seek audio"
            />
            <span className="audio-time">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="audio-settings">
          <div className="audio-reciter-select">
            <label htmlFor="audio-reciter">Reciter</label>
            <select
              id="audio-reciter"
              value={currentReciter?.id ?? ""}
              onChange={(e) => handleReciterChange(e.currentTarget.value)}
              disabled={reciters.length === 0}
            >
              <option value="">Select reciter</option>
              {reciters.map((reciter) => (
                <option key={reciter.id} value={reciter.id}>
                  {reciter.name}
                </option>
              ))}
            </select>
          </div>

          <div className="audio-speed-control">
            <label htmlFor="audio-speed">Speed</label>
            <select
              id="audio-speed"
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.currentTarget.value))}
            >
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </div>

          <div className="audio-volume-control">
            <label htmlFor="audio-volume">Volume</label>
            <input
              id="audio-volume"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(Number(e.currentTarget.value))}
              aria-label="Volume"
            />
          </div>

          <div className="audio-repeat-control">
            <Button
              type="button"
              variant={repeatMode === "off" ? "secondary" : "primary"}
              onClick={cycleRepeatMode}
              aria-label={`Repeat: ${repeatMode}`}
            >
              {repeatMode === "off" ? "Repeat: Off" : `Repeat: ${repeatMode}`}
            </Button>
          </div>

          <div className="audio-autoplay-control">
            <label>
              <input
                type="checkbox"
                checked={autoPlayNextAyah}
                onChange={(e) => setAutoPlayNextAyah(e.currentTarget.checked)}
              />
              <span>Auto-next</span>
            </label>
          </div>
        </div>
      </div>

      {playbackState === "error" && (
        <div className="audio-error" role="alert">
          <p>Audio could not be loaded. Please try selecting a different reciter.</p>
        </div>
      )}

      {playbackState === "loading" && (
        <div className="audio-loading" aria-live="polite">
          Loading audio...
        </div>
      )}
      {!reciters.length && (
        <output className="audio-error" aria-live="polite">Audio is unavailable from the configured Quran provider.</output>
      )}
      {reciters.length > 0 && !recitationsLoaded && playbackState === "idle" && (
        <output className="audio-loading" aria-live="polite">Select a reciter to load provider audio.</output>
      )}
    </div>
  );
}
