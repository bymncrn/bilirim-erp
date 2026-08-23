import { useSyncExternalStore } from "react";

import { createCollection } from "@/lib/supa-collection";
import { useAuth } from "@/hooks/use-auth";

export type PermKey =
  | "products.view"
  | "products.create"
  | "products.delete"
  | "pos.openTable"
  | "pos.refund"
  | "pos.discount"
  | "finance.reports"
  | "finance.dayEnd";

export const PERMISSION_GROUPS: {
  module: string;
  items: { key: PermKey; label: string }[];
}[] = [
  {
    module: "Ürünler Modülü",
    items: [
      { key: "products.view", label: "Görebilir" },
      { key: "products.create", label: "Ekleyebilir" },
      { key: "products.delete", label: "Silebilir" },
    ],
  },
  {
    module: "POS Modülü",
    items: [
      { key: "pos.openTable", label: "Masa Açabilir" },
      { key: "pos.refund", label: "İptal/İade Yapabilir" },
      { key: "pos.discount", label: "İndirim/İkram Uygulayabilir" },
    ],
  },
  {
    module: "Finans Modülü",
    items: [
      { key: "finance.reports", label: "Raporları Görebilir" },
      { key: "finance.dayEnd", label: "Gün Sonu Alabilir" },
    ],
  },
];

export const ROLES = ["Yönetici", "Müdür", "Kasiyer", "Garson", "Mutfak"] as const;
export type Role = (typeof ROLES)[number];

export type Staff = {
  id: string;
  name: string;
  email: string;
  role: Role;
  pin: string;
  active: boolean;
  perms: PermKey[];
};

const ALL_PERMS = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));

export const ROLE_DEFAULT_PERMS: Record<Role, PermKey[]> = {
  Yönetici: [...ALL_PERMS],
  Müdür: [
    "products.view",
    "products.create",
    "pos.openTable",
    "pos.discount",
    "pos.refund",
    "finance.reports",
  ],
  Kasiyer: ["products.view", "pos.openTable", "pos.refund"],
  Garson: ["products.view", "pos.openTable"],
  Mutfak: ["products.view"],
};

const collection = createCollection<Staff>({
  table: "staff_members",
  generatedId: true,
  order: { column: "created_at" },
  fromRow: (r) => ({
    id: String(r["id"]),
    name: String(r["name"] ?? ""),
    email: String(r["email"] ?? ""),
    role: String(r["role"] ?? "Kasiyer") as Role,
    pin: String(r["pin"] ?? ""),
    active: Boolean(r["active"] ?? true),
    perms: ((r["perms"] as string[] | null) ?? []) as PermKey[],
  }),
  toRow: (u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    pin: u.pin,
    active: u.active,
    perms: u.perms,
  }),
});

const CURRENT_KEY = "bilirim-current-staff";
let currentUserId = "";
const currentListeners = new Set<() => void>();
let currentHydrated = false;

function subscribeCurrent(listener: () => void) {
  if (!currentHydrated && typeof window !== "undefined") {
    currentHydrated = true;
    currentUserId = window.localStorage.getItem(CURRENT_KEY) ?? "";
  }
  currentListeners.add(listener);
  return () => {
    currentListeners.delete(listener);
  };
}

const getCurrent = () => currentUserId;
const getCurrentServer = () => "";

export function useStaff() {
  return collection.useItems();
}

export function usePanelState() {
  const staff = useStaff();
  const id = useSyncExternalStore(subscribeCurrent, getCurrent, getCurrentServer);
  return { staff, currentUserId: id || (staff[0]?.id ?? "") };
}

/**
 * Aktif personel. Henüz personel tanımlanmamışsa oturum sahibini
 * (tam yetkili işletme yöneticisi) döndürür.
 */
export function useCurrentStaff(): Staff {
  const { staff, currentUserId: id } = usePanelState();
  const { profile } = useAuth();
  const owner: Staff = {
    id: "owner",
    name: profile?.full_name || "İşletme Sahibi",
    email: profile?.email ?? "",
    role: "Yönetici",
    pin: "",
    active: true,
    perms: [...ALL_PERMS],
  };
  return staff.find((u) => u.id === id) ?? staff[0] ?? owner;
}

export function useCan() {
  const user = useCurrentStaff();
  return (perm: PermKey) => user.perms.includes(perm);
}

export function setCurrentUser(id: string) {
  currentUserId = id;
  try {
    window.localStorage.setItem(CURRENT_KEY, id);
  } catch {
    /* yoksay */
  }
  currentListeners.forEach((l) => l());
}

export function upsertStaff(user: Staff) {
  void collection.upsert(user);
}

export function removeStaff(id: string) {
  void collection.remove(id);
}

export function newStaffId() {
  return `new-${Date.now().toString(36)}`;
}
