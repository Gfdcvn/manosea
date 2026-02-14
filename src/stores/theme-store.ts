"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "dark" | "light" | "sepia" | "gray";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
    }),
    {
      name: "ricord-theme",
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          applyTheme(state.theme);
        }
      },
    }
  )
);

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // Remove all theme classes
  root.classList.remove("theme-dark", "theme-light", "theme-sepia", "theme-gray");
  root.classList.add(`theme-${theme}`);

  // Also toggle the dark class for Tailwind darkMode
  if (theme === "light" || theme === "sepia") {
    root.classList.remove("dark");
  } else {
    root.classList.add("dark");
  }
}
