"use client";

import {
  createContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type ThemePreference = "light" | "dark" | "system";

type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "sakinah-theme";
const THEME_EVENT = "sakinah-theme-change";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function subscribeToTheme(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getThemeSnapshot(): ThemePreference {
  const storedPreference = localStorage.getItem(STORAGE_KEY);
  return isThemePreference(storedPreference) ? storedPreference : "system";
}

function getServerThemeSnapshot(): ThemePreference {
  return "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const useDarkTheme =
        preference === "dark" ||
        (preference === "system" && mediaQuery.matches);
      document.documentElement.dataset.theme = useDarkTheme ? "dark" : "light";
    };

    applyTheme();
    mediaQuery.addEventListener("change", applyTheme);
    return () => mediaQuery.removeEventListener("change", applyTheme);
  }, [preference]);

  const setPreference = (nextPreference: ThemePreference) => {
    localStorage.setItem(STORAGE_KEY, nextPreference);
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  return (
    <ThemeContext.Provider value={{ preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}