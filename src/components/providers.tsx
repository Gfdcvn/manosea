"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useThemeStore } from "@/stores/theme-store";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PunishmentPopup } from "@/components/modals/punishment-popup";

export function Providers({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Apply theme class on mount and changes
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-dark", "theme-light", "theme-sepia", "theme-gray", "theme-blue", "theme-purple");
    root.classList.add(`theme-${theme}`);
    if (theme === "light" || theme === "sepia") {
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
    }
  }, [theme]);

  return (
    <TooltipProvider delayDuration={100}>
      {children}
      <PunishmentPopup />
    </TooltipProvider>
  );
}
