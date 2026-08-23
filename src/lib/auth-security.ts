import { useCallback, useEffect, useState } from "react";

/** Güçlü parola kuralları. */
export const PASSWORD_RULES: { key: string; label: string; test: (v: string) => boolean }[] = [
  { key: "len", label: "En az 8 karakter", test: (v) => v.length >= 8 },
  { key: "upper", label: "En az bir büyük harf (A-Z)", test: (v) => /[A-ZĞÜŞİÖÇ]/.test(v) },
  { key: "lower", label: "En az bir küçük harf (a-z)", test: (v) => /[a-zğüşıöç]/.test(v) },
  { key: "digit", label: "En az bir rakam (0-9)", test: (v) => /\d/.test(v) },
];

export function passwordIssues(value: string): string[] {
  return PASSWORD_RULES.filter((r) => !r.test(value)).map((r) => r.label);
}

export function isStrongPassword(value: string): boolean {
  return passwordIssues(value).length === 0;
}

type LockOptions = { maxAttempts?: number; lockMs?: number };

const storageKey = (key: string) => `bilirim.auth.lock.${key}`;

function readLock(key: string): { fails: number; until: number } {
  if (typeof window === "undefined") return { fails: 0, until: 0 };
  try {
    const raw = window.localStorage.getItem(storageKey(key));
    if (!raw) return { fails: 0, until: 0 };
    const parsed = JSON.parse(raw) as { fails?: number; until?: number };
    return { fails: Number(parsed.fails ?? 0), until: Number(parsed.until ?? 0) };
  } catch {
    return { fails: 0, until: 0 };
  }
}

function writeLock(key: string, value: { fails: number; until: number }) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(key), JSON.stringify(value));
}

/**
 * Brute-force koruması: ardışık hatalı denemelerden sonra butonu geçici kilitler.
 */
export function useAttemptLock(key: string, options: LockOptions = {}) {
  const maxAttempts = options.maxAttempts ?? 5;
  const lockMs = options.lockMs ?? 3 * 60 * 1000;
  const [state, setState] = useState({ fails: 0, until: 0 });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setState(readLock(key));
  }, [key]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const locked = state.until > now;
  const remainingMs = locked ? state.until - now : 0;
  const remainingLabel = (() => {
    const total = Math.ceil(remainingMs / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  })();

  const registerFailure = useCallback(() => {
    const current = readLock(key);
    const fails = (current.until > Date.now() ? current.fails : current.fails) + 1;
    const next =
      fails >= maxAttempts
        ? { fails: 0, until: Date.now() + lockMs }
        : { fails, until: current.until };
    writeLock(key, next);
    setState(next);
    return {
      locked: next.until > Date.now(),
      remaining: Math.max(0, maxAttempts - fails),
    };
  }, [key, lockMs, maxAttempts]);

  const reset = useCallback(() => {
    const next = { fails: 0, until: 0 };
    writeLock(key, next);
    setState(next);
  }, [key]);

  return {
    locked,
    remainingLabel,
    attemptsLeft: Math.max(0, maxAttempts - state.fails),
    maxAttempts,
    registerFailure,
    reset,
  };
}
