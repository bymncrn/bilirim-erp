import { useCallback, useEffect, useState } from "react";

const KEY = "bilirim.pdks.session";
const EVENT = "bilirim:pdks-session";

export type PdksSession = { id: string; name: string; phone: string; role: string; branch: string };

function read(): PdksSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PdksSession) : null;
  } catch {
    return null;
  }
}

export function signInStaff(staff: PdksSession) {
  window.localStorage.setItem(KEY, JSON.stringify(staff));
  window.dispatchEvent(new Event(EVENT));
}

export function signOutStaff() {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

/** Telefon numarasini karsilastirmak icin sadece rakamlari birakir. */
export const normalizePhone = (v: string) => v.replace(/\D/g, "").replace(/^0+/, "");

export function usePdksSession() {
  const [session, setSession] = useState<PdksSession | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setSession(read());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  return { session, ready };
}
const DEVICE_KEY = "bilirim.pdks.device";

/** Bu tarayici/cihaz icin kalici benzersiz kimlik uretir. */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now() + Math.random());
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

/** Uygulamanin ana ekrandan (PWA standalone) acilip acilmadigini bildirir. */
export function useStandaloneMode() {
  const [state, setState] = useState<{ ready: boolean; standalone: boolean }>({
    ready: false,
    standalone: false,
  });

  useEffect(() => {
    const check = () => {
      const nav = window.navigator as Navigator & { standalone?: boolean };
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: fullscreen)").matches ||
        window.matchMedia("(display-mode: minimal-ui)").matches ||
        nav.standalone === true;
      setState({ ready: true, standalone });
    };
    check();
    const mq = window.matchMedia("(display-mode: standalone)");
    mq.addEventListener("change", check);
    return () => mq.removeEventListener("change", check);
  }, []);

  return state;
}
