import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";
const KEY = "bilirim-theme";

let theme: Theme = "light";
let hydrated = false;
const listeners = new Set<() => void>();

function apply() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY) as Theme | null;
    if (raw === "dark" || raw === "light") {
      theme = raw;
    }
    // Varsayılan: Açık mod (sistem tercihi dikkate alınmaz)
  } catch {
    /* yoksay */
  }
  apply();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useTheme() {
  return useSyncExternalStore(
    subscribe,
    () => theme,
    () => "light" as Theme,
  );
}

export function toggleTheme() {
  theme = theme === "dark" ? "light" : "dark";
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    /* yoksay */
  }
  apply();
  listeners.forEach((l) => l());
}
