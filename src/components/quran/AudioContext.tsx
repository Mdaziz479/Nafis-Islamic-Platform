"use client";

import { createContext, useContext, useRef, useState, useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  getQuranReaderPreferencesSnapshot,
  getServerQuranReaderPreferencesSnapshot,
  subscribeToQuranReaderPreferences,
  updateQuranReaderPreferences,
} from "@/components/quran/reader-preferences";
import type { Reciter, VerseRecitation } from "@/types/quran";

export type AudioPlaybackState = "idle" | "loading" | "playing" | "paused" | "error";
export type AudioRepeatMode = "off" | "ayah" | "surah";

export interface AudioContextValue {
  readonly playbackState: AudioPlaybackState;
  readonly currentReciter: Reciter | null;
  readonly currentVerseKey: string | null;
  readonly currentTime: number;
  readonly duration: number;
  readonly volume: number;
  readonly playbackSpeed: number;
  readonly repeatMode: AudioRepeatMode;
  readonly autoPlayNextAyah: boolean;
  readonly verseRecitations: Readonly<Record<string, VerseRecitation[]>>;
  readonly recitationsLoaded: boolean;
  playAyah: (verseKey: string, reciter: Reciter) => void;
  playAdjacentAyah: (direction: -1 | 1) => void;
  pause: () => void;
  resume: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setRepeatMode: (mode: AudioRepeatMode) => void;
  setAutoPlayNextAyah: (enabled: boolean) => void;
  loadVerseRecitations: (chapterId: number, reciter: Reciter) => Promise<void>;
}

export const AudioContext = createContext<AudioContextValue | null>(null);

export function useAudioPlayer() {
  return useContext(AudioContext);
}

interface AudioProviderProps {
  readonly children: React.ReactNode;
}

interface AudioApiResponse {
  readonly status?: string;
  readonly data?: VerseRecitation[] | null;
}

export function AudioProvider({ children }: AudioProviderProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recitationsControllerRef = useRef<AbortController | null>(null);
  const preferences = useSyncExternalStore(
    subscribeToQuranReaderPreferences,
    getQuranReaderPreferencesSnapshot,
    getServerQuranReaderPreferencesSnapshot,
  );
  const [playbackState, setPlaybackState] = useState<AudioPlaybackState>("idle");
  const [currentReciter, setCurrentReciter] = useState<Reciter | null>(null);
  const [currentVerseKey, setCurrentVerseKey] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const { volume, playbackSpeed, repeatMode, autoPlayNextAyah } = preferences;
  const [verseRecitations, setVerseRecitations] = useState<Record<string, VerseRecitation[]>>({});
  const [recitationsLoaded, setRecitationsLoaded] = useState(false);

  const loadVerseRecitations = useCallback(async (chapterId: number, reciter: Reciter) => {
    recitationsControllerRef.current?.abort();
    const controller = new AbortController();
    recitationsControllerRef.current = controller;
    setPlaybackState("loading");
    setRecitationsLoaded(false);
    setVerseRecitations({});
    audioRef.current?.pause();
    try {
      const response = await fetch(`/api/quran/audio/chapter/${chapterId}/reciter/${reciter.id}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      const result = await response.json() as AudioApiResponse;
      if (!response.ok || result.status !== "success" || !Array.isArray(result.data)) {
        throw new Error("Audio data could not be loaded.");
      }
      if (!controller.signal.aborted) {
        const byVerseKey: Record<string, VerseRecitation[]> = {};
        for (const recitation of result.data) {
          if (!byVerseKey[recitation.verseKey]) {
            byVerseKey[recitation.verseKey] = [];
          }
          byVerseKey[recitation.verseKey].push(recitation);
        }
        const firstVerseKey = Object.keys(byVerseKey).sort((left, right) => {
          const [leftChapter, leftAyah] = left.split(":").map(Number);
          const [rightChapter, rightAyah] = right.split(":").map(Number);
          return leftChapter - rightChapter || leftAyah - rightAyah;
        })[0] ?? null;
        setVerseRecitations(byVerseKey);
        setRecitationsLoaded(true);
        setCurrentReciter(reciter);
        setCurrentVerseKey(firstVerseKey);
        const selectedReciterId = Number(reciter.id);
        updateQuranReaderPreferences({
          selectedReciterId: Number.isSafeInteger(selectedReciterId) && selectedReciterId > 0
            ? selectedReciterId
            : null,
        });
        setPlaybackState("idle");
      }
    } catch {
      if (controller.signal.aborted) return;
      setRecitationsLoaded(false);
      setPlaybackState("error");
    }
  }, []);

  const playRecitation = useCallback((verseKey: string, reciter: Reciter | null) => {
    audioRef.current ??= new Audio();

    const audio = audioRef.current;
    const recitations = verseRecitations[verseKey];
    const recitation = recitations?.[0];

    if (!recitation || !reciter) {
      setPlaybackState("error");
      return;
    }

    setCurrentReciter(reciter);
    setCurrentVerseKey(verseKey);
    setPlaybackState("loading");

    audio.src = recitation.audioUrl;
    audio.volume = volume;
    audio.playbackRate = playbackSpeed;
    audio.load();

    audio.play()
      .then(() => {
        setPlaybackState("playing");
      })
      .catch(() => {
        setPlaybackState("error");
      });

    if ("mediaSession" in navigator && typeof MediaMetadata !== "undefined") {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `Ayah ${verseKey}`,
        artist: reciter.name,
      });
    }
  }, [playbackSpeed, verseRecitations, volume]);

  const playAyah = useCallback((verseKey: string, reciter: Reciter) => {
    setCurrentReciter(reciter);
    playRecitation(verseKey, reciter);
  }, [playRecitation]);

  const orderedVerseKeys = useCallback(() => Object.keys(verseRecitations).sort((left, right) => {
    const [leftChapter, leftAyah] = left.split(":").map(Number);
    const [rightChapter, rightAyah] = right.split(":").map(Number);
    return leftChapter - rightChapter || leftAyah - rightAyah;
  }), [verseRecitations]);

  const playAdjacentAyah = useCallback((direction: -1 | 1) => {
    if (!currentVerseKey) return;
    const verseKeys = orderedVerseKeys();
    const currentIndex = verseKeys.indexOf(currentVerseKey);
    const nextVerseKey = verseKeys[currentIndex + direction];
    if (nextVerseKey) playRecitation(nextVerseKey, currentReciter);
  }, [currentReciter, currentVerseKey, orderedVerseKeys, playRecitation]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlaybackState("paused");
    }
  }, []);

  const resume = useCallback(() => {
    if (!audioRef.current || !currentVerseKey || !currentReciter) return;
    if (!audioRef.current.src) {
      playRecitation(currentVerseKey, currentReciter);
      return;
    }
    audioRef.current.play()
      .then(() => setPlaybackState("playing"))
      .catch(() => setPlaybackState("error"));
  }, [currentReciter, currentVerseKey, playRecitation]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  const handleSetVolume = useCallback((newVolume: number) => {
    updateQuranReaderPreferences({ volume: newVolume });
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  }, []);

  const handleSetPlaybackSpeed = useCallback((speed: number) => {
    updateQuranReaderPreferences({ playbackSpeed: speed });
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, []);

  const handleSetRepeatMode = useCallback((mode: AudioRepeatMode) => {
    updateQuranReaderPreferences({ repeatMode: mode });
  }, []);

  const handleSetAutoPlayNextAyah = useCallback((enabled: boolean) => {
    updateQuranReaderPreferences({ autoPlayNextAyah: enabled });
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = preferences.volume;
      audioRef.current.playbackRate = preferences.playbackSpeed;
    }
  }, [preferences.autoPlayNextAyah, preferences.playbackSpeed, preferences.repeatMode, preferences.volume]);

  // Setup audio event listeners
  useEffect(() => {
    audioRef.current ??= new Audio();
    audioRef.current.volume = volume;
    audioRef.current.playbackRate = playbackSpeed;

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handlePlaying = () => {
      setPlaybackState("playing");
    };

    const handlePause = () => {
      if (!audio.ended) setPlaybackState("paused");
    };

    const handleEnded = () => {
      if (!currentVerseKey) return setPlaybackState("idle");
      if (repeatMode === "ayah") return playRecitation(currentVerseKey, currentReciter);
      const verseKeys = orderedVerseKeys();
      const currentIndex = verseKeys.indexOf(currentVerseKey);
      const nextVerseKey = verseKeys[currentIndex + 1];
      if (nextVerseKey && (autoPlayNextAyah || repeatMode === "surah")) {
        return playRecitation(nextVerseKey, currentReciter);
      }
      if (repeatMode === "surah" && verseKeys.length) return playRecitation(verseKeys[0], currentReciter);
      setPlaybackState("idle");
    };

    const handleError = () => {
      setPlaybackState("error");
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [autoPlayNextAyah, currentReciter, currentVerseKey, orderedVerseKeys, playbackSpeed, playRecitation, repeatMode, volume]);

  useEffect(() => () => {
    recitationsControllerRef.current?.abort();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    }
  }, []);

  const value = useMemo<AudioContextValue>(() => ({
    playbackState,
    currentReciter,
    currentVerseKey,
    currentTime,
    duration,
    volume,
    playbackSpeed,
    repeatMode,
    autoPlayNextAyah,
    verseRecitations,
    recitationsLoaded,
    playAyah,
    playAdjacentAyah,
    pause,
    resume,
    seek,
    setVolume: handleSetVolume,
    setPlaybackSpeed: handleSetPlaybackSpeed,
    setRepeatMode: handleSetRepeatMode,
    setAutoPlayNextAyah: handleSetAutoPlayNextAyah,
    loadVerseRecitations,
  }), [
    playbackState,
    currentReciter,
    currentVerseKey,
    currentTime,
    duration,
    volume,
    playbackSpeed,
    repeatMode,
    autoPlayNextAyah,
    verseRecitations,
    recitationsLoaded,
    playAyah,
    playAdjacentAyah,
    pause,
    resume,
    seek,
    handleSetVolume,
    handleSetPlaybackSpeed,
    handleSetRepeatMode,
    handleSetAutoPlayNextAyah,
    loadVerseRecitations,
  ]);

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}
