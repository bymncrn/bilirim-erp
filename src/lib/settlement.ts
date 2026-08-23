import { useCallback, useMemo, useSyncExternalStore } from "react";
import { createCollection } from "@/lib/supa-collection";
import {
  cariCollection,
  finAccountsCollection,
  type AccCari,
  type AccFinAccount,
} from "@/lib/accounting-store";
import { addKasaEntry } from "@/lib/kasa-store";

/* ---------------- Kasa hareketleri (account_txns) ---------------- */

type AccountTxn = { id: string; accountId: string; amount: number; description: string };

const txnCollection = createCollection<AccountTxn>({
  table: "account_txns",
  order: { column: "created_at", ascending: false },
  fromRow: (r) => ({
    id: String(r["id"]),
    accountId: String(r["account_id"] ?? ""),
    amount: Number(r["amount"] ?? 0),
    description: String(r["description"] ?? ""),
  }),
  toRow: (t) => ({
    id: t.id,
    account_id: t.accountId,
    amount: t.amount,
    description: t.description,
  }),
});

/* ---------------- Varsayılan kasa hafızası ---------------- */

const DEFAULT_KEY = "bilirim-default-account";
let defaultAccountId = "";
let hydrated = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  if (!hydrated && typeof window !== "undefined") {
    hydrated = true;
    try {
      defaultAccountId = window.localStorage.getItem(DEFAULT_KEY) ?? "";
    } catch {
      /* yoksay */
    }
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Son kullanılan kasa/banka hesabını hatırlar. */
export function setDefaultAccountId(id: string) {
  defaultAccountId = id;
  try {
    window.localStorage.setItem(DEFAULT_KEY, id);
  } catch {
    /* yoksay */
  }
  emit();
}

const snap = () => defaultAccountId;
const serverSnap = () => "";

export function useDefaultAccountId() {
  return useSyncExternalStore(subscribe, snap, serverSnap);
}

/* ---------------- Ortak seçim listeleri ---------------- */

export function useFinAccounts(): AccFinAccount[] {
  return finAccountsCollection.useItems();
}

export function useCariler(): AccCari[] {
  return cariCollection.useItems();
}

/** Kasa/banka seçimi: liste + son seçilen (yoksa ilk) hesap. */
export function useAccountSelection() {
  const accounts = useFinAccounts();
  const remembered = useDefaultAccountId();
  const selectedId = useMemo(() => {
    if (remembered && accounts.some((a) => a.id === remembered)) return remembered;
    return "";
  }, [accounts, remembered]);
  const select = useCallback((id: string) => setDefaultAccountId(id), []);
  const selected = accounts.find((a) => a.id === selectedId) ?? null;
  return { accounts, selectedId, selected, select };
}

/* ---------------- Muhasebe kayıtları ---------------- */

/** Nakit / kart tahsilatını seçilen kasaya gelir olarak işler. */
export async function postCashIncome(input: {
  accountId: string;
  amount: number;
  description: string;
  category?: string;
}) {
  const account = finAccountsCollection.peek().find((a) => a.id === input.accountId);
  if (!account || input.amount <= 0) return;
  await finAccountsCollection.patch(account.id, { balance: account.balance + input.amount });
  await txnCollection.insertRaw({
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    account_id: account.id,
    date: new Date().toISOString().slice(0, 10),
    amount: input.amount,
    description: input.description,
    category: input.category ?? "Satış",
  });
  addKasaEntry({
    desc: input.description,
    accountName: account.name,
    amount: input.amount,
  });
}

/** Veresiye satışı seçilen carinin hesabına borç olarak işler. */
export async function postCariDebt(input: { cariId: string; amount: number; description: string }) {
  const cari = cariCollection.peek().find((c) => c.id === input.cariId);
  if (!cari || input.amount <= 0) return;
  await cariCollection.patch(cari.id, { balance: cari.balance + input.amount });
}
