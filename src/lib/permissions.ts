import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeRole, type AppRole } from "@/lib/rbac";

/** Kullanıcıya açılabilecek modüller (tek seviye, checkbox ile yönetilir). */
export type PermKey =
  | "muhasebe"
  | "pos"
  | "adisyon"
  | "kasa"
  | "cari"
  | "urunler"
  | "ayarlar"
  | "raporlar"
  | "servis"
  | "pdks"
  | "panel";

export const PERMISSION_ITEMS: { key: PermKey; label: string; hint: string }[] = [
  { key: "muhasebe", label: "Ön Muhasebe", hint: "Fatura, teklif ve e-belge işlemleri" },
  { key: "pos", label: "POS", hint: "Hızlı satış kasası" },
  { key: "adisyon", label: "Adisyon", hint: "Masa ve sipariş yönetimi" },
  { key: "kasa", label: "Kasa / Banka", hint: "Hesaplar, tahsilat ve ödemeler" },
  { key: "cari", label: "Cari Yönetimi", hint: "Müşteri ve tedarikçi kartları" },
  { key: "urunler", label: "Ürünler", hint: "Ürün ve stok yönetimi" },
  { key: "ayarlar", label: "Sistem Ayarları", hint: "İşletme ayarları ve kullanıcılar" },
  { key: "raporlar", label: "Raporlar", hint: "Gün sonu ve mali raporlar" },
  { key: "servis", label: "Teknik Servis", hint: "Cihaz kabul ve arıza takibi" },
  { key: "pdks", label: "PDKS", hint: "Personel devam kontrol ve mesai takibi" },
  { key: "panel", label: "Restoran Paneli", hint: "Restoran yönetim paneli ekranları" },
];

export const PERM_KEYS = PERMISSION_ITEMS.map((p) => p.key);

export const PERM_LABELS = Object.fromEntries(
  PERMISSION_ITEMS.map((p) => [p.key, p.label]),
) as Record<PermKey, string>;

export type SalesScope = "own" | "all";

export type UserPermissions = {
  perms: Record<PermKey, boolean>;
  salesScope: SalesScope;
  allowedAccounts: string[]; // boş = tüm kasalar
};

const none = () => Object.fromEntries(PERM_KEYS.map((k) => [k, false])) as Record<PermKey, boolean>;
const all = () => Object.fromEntries(PERM_KEYS.map((k) => [k, true])) as Record<PermKey, boolean>;

export const allPerms = all;
export const nonePerms = none;

export function emptyPermissions(): UserPermissions {
  return { perms: none(), salesScope: "all", allowedAccounts: [] };
}

export function normalizePerms(raw: unknown): Record<PermKey, boolean> {
  const src = (raw ?? {}) as Record<string, unknown>;
  return Object.fromEntries(PERM_KEYS.map((k) => [k, Boolean(src[k])])) as Record<PermKey, boolean>;
}

/** Modül gerektiren rotalar (en uzun eşleşme kazanır). */
const PERM_ROUTES: { prefix: string; perm: PermKey }[] = [
  { prefix: "/muhasebe", perm: "muhasebe" },
  { prefix: "/pos", perm: "pos" },
  { prefix: "/panel/pos", perm: "adisyon" },
  { prefix: "/adisyon", perm: "adisyon" },
  { prefix: "/panel/mutfak", perm: "adisyon" },
  { prefix: "/panel/yerlesim", perm: "adisyon" },
  { prefix: "/panel/musteriler", perm: "cari" },
  { prefix: "/panel/urunler", perm: "urunler" },
  { prefix: "/panel", perm: "panel" },
  { prefix: "/pdks-yonetim", perm: "pdks" },
  { prefix: "/gun-sonu", perm: "raporlar" },
  { prefix: "/servis", perm: "servis" },
];

export function routePermission(pathname: string): PermKey | null {
  const match = [...PERM_ROUTES]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
  return match?.perm ?? null;
}

/** Yetkili olunan ilk modülün ana ekranı. */
export const PERM_HOME: Record<PermKey, string> = {
  muhasebe: "/muhasebe",
  pos: "/pos",
  adisyon: "/adisyon",
  kasa: "/muhasebe",
  cari: "/panel/musteriler",
  urunler: "/panel/urunler",
  ayarlar: "/sistem/ayarlar",
  raporlar: "/gun-sonu",
  servis: "/servis",
  pdks: "/pdks-yonetim",
  panel: "/panel",
};

export function homeForPerms(perms: Record<PermKey, boolean>, isAdmin: boolean): string {
  if (isAdmin) return "/dashboard";
  const first = PERM_KEYS.find((k) => perms[k]);
  return first ? PERM_HOME[first] : "/dashboard";
}

type State = UserPermissions & { role: AppRole; isAdmin: boolean; loading: boolean };

const adminState = (): State => ({
  perms: all(),
  salesScope: "all",
  allowedAccounts: [],
  role: "yonetici",
  isAdmin: true,
  loading: false,
});

let state: State = { ...adminState(), loading: true };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
let started = false;

async function load() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    state = adminState();
    emit();
    return;
  }
  const [{ data: roleRow }, { data: permRow }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", auth.user.id).limit(1).maybeSingle(),
    supabase
      .from("user_permissions")
      .select("perms, sales_scope, allowed_accounts")
      .eq("user_id", auth.user.id)
      .maybeSingle(),
  ]);
  const role = normalizeRole(roleRow?.role ?? null);
  const isAdmin = role === "yonetici";
  if (isAdmin) {
    state = adminState();
  } else {
    state = {
      perms: normalizePerms(permRow?.perms),
      salesScope: (permRow?.sales_scope === "own" ? "own" : "all") as SalesScope,
      allowedAccounts: Array.isArray(permRow?.allowed_accounts)
        ? (permRow?.allowed_accounts as string[])
        : [],
      role,
      isAdmin: false,
      loading: false,
    };
  }
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
const serverState: State = { ...adminState(), loading: true };
const getServerSnapshot = () => serverState;

/** Oturum sahibinin modül yetkileri. */
export function usePermissions() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    ...s,
    can: (key: PermKey) => s.perms[key] === true,
    home: homeForPerms(s.perms, s.isAdmin),
    canUseAccount: (accountId: string) =>
      s.allowedAccounts.length === 0 || s.allowedAccounts.includes(accountId),
  };
}

export function reloadPermissions() {
  void load();
}
