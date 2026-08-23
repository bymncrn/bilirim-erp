import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "yonetici" | "muhasebe" | "kasiyer" | "garson" | "teknik_servis";

export const ROLE_LABELS: Record<AppRole, string> = {
  yonetici: "Yönetici",
  muhasebe: "Muhasebe",
  kasiyer: "Kasiyer",
  garson: "Garson",
  teknik_servis: "Teknik Servis",
};

export const ROLE_OPTIONS = Object.keys(ROLE_LABELS) as AppRole[];

/** Veritabanındaki eski rol değerlerini yeni role eşler. */
export function normalizeRole(dbRole: string | null | undefined): AppRole {
  switch (dbRole) {
    case "muhasebe":
    case "kasiyer":
    case "garson":
    case "teknik_servis":
      return dbRole;
    case "staff":
      return "kasiyer";
    default:
      return "yonetici";
  }
}

/** Uygulama rolünü veritabanı enum değerine çevirir (Yönetici = admin). */
export function toDbRole(role: AppRole): string {
  return role === "yonetici" ? "admin" : role;
}

export const ROLE_HOME: Record<AppRole, string> = {
  yonetici: "/dashboard",
  muhasebe: "/muhasebe",
  kasiyer: "/pos",
  garson: "/adisyon",
  teknik_servis: "/servis",
};

const COMMON = ["/hesabim", "/abonelik", "/odeme"];

const ROLE_ROUTES: Record<AppRole, string[] | "all"> = {
  yonetici: "all",
  muhasebe: [
    "/muhasebe",
    "/panel/urunler",
    "/panel/musteriler",
    "/gun-sonu",
    ...COMMON,
  ],
  kasiyer: ["/pos", ...COMMON],
  garson: ["/adisyon", "/panel/pos", ...COMMON],
  teknik_servis: ["/servis", ...COMMON],
};

export function canAccess(role: AppRole, pathname: string): boolean {
  const allowed = ROLE_ROUTES[role];
  if (allowed === "all") return true;
  return allowed.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

type RoleState = { role: AppRole; loading: boolean };

let state: RoleState = { role: "yonetici", loading: true };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
let started = false;

async function load() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    state = { role: "yonetici", loading: false };
    emit();
    return;
  }
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", auth.user.id)
    .limit(1)
    .maybeSingle();
  state = { role: normalizeRole(data?.role ?? null), loading: false };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started && typeof window !== "undefined") {
    started = true;
    void load();
    supabase.auth.onAuthStateChange(() => {
      state = { ...state, loading: true };
      emit();
      void load();
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;
const serverState: RoleState = { role: "yonetici", loading: true };
const getServerSnapshot = () => serverState;

export function useRole(): RoleState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function reloadRole() {
  void load();
}