"use client";

import { useTheme } from "@/hooks/use-theme";

const NEXT_THEME = {
  system: "light",
  light: "dark",
  dark: "system",
} as const;

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const symbol = preference === "dark" ? "◐" : preference === "light" ? "☼" : "◒";

  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label={`Theme preference is ${preference}. Change theme.`}
      title={`Theme: ${preference}`}
      onClick={() => setPreference(NEXT_THEME[preference])}
    >
      <span className="theme-icon" aria-hidden="true">
        {symbol}
      </span>
      <span className="theme-label">Theme</span>
    </button>
  );
}