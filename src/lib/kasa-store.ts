import { createCollection } from "@/lib/supa-collection";

export type KasaEntry = {
  id: string;
  date: string;
  desc: string;
  accountName: string;
  amount: number;
};

const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const collection = createCollection<KasaEntry>({
  table: "cash_entries",
  generatedId: true,
  order: { column: "occurred_at", ascending: false },
  fromRow: (r) => ({
    id: String(r["id"]),
    date: fmt(String(r["occurred_at"] ?? new Date().toISOString())),
    desc: String(r["description"] ?? ""),
    accountName: String(r["account_name"] ?? ""),
    amount: Number(r["amount"] ?? 0),
  }),
  toRow: (e) => ({
    id: e.id,
    description: e.desc,
    account_name: e.accountName,
    amount: e.amount,
  }),
});

export function useKasaEntries() {
  return collection.useItems();
}

export function addKasaEntry(entry: Omit<KasaEntry, "id" | "date"> & { source?: string }) {
  void collection.insertRaw({
    description: entry.desc,
    account_name: entry.accountName,
    amount: entry.amount,
    source: entry.source ?? "pos",
  });
}
