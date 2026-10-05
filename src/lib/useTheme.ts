"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const subscribe = (cb: () => void) => {
  window.addEventListener("themechange", cb);
  return () => window.removeEventListener("themechange", cb);
};

/** Current theme, for canvas/WebGL code that can't read CSS variables. */
export function useTheme(): Theme {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"),
    () => "light",
  );
}
