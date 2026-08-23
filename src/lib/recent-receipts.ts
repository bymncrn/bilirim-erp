import { useCallback, useEffect, useState } from "react";
import type { ReceiptData } from "@/components/receipt/ReceiptModal";

export type RecentSource = "pos" | "adisyon";

type StoredReceipt = Omit<ReceiptData, "date"> & { date: string };

const KEY = (source: RecentSource) => `bilirim.recent-receipts.${source}`;
const LIMIT = 10;
const EVENT = "bilirim:recent-receipts";

function read(source: RecentSource): ReceiptData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY(source));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredReceipt[];
    return parsed.map((r) => ({ ...r, date: new Date(r.date) }));
  } catch {
    return [];
  }
}

/** Tamamlanan bir işlemi "Son İşlemler" listesine ekler (en fazla 10 kayıt). */
export function pushRecentReceipt(source: RecentSource, receipt: ReceiptData) {
  if (typeof window === "undefined") return;
  const next = [receipt, ...read(source)].slice(0, LIMIT);
  const stored: StoredReceipt[] = next.map((r) => ({ ...r, date: r.date.toISOString() }));
  try {
    window.localStorage.setItem(KEY(source), JSON.stringify(stored));
  } catch {
    /* kota dolu olabilir */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: source }));
}

/** Son 10 işlemi canlı olarak döner. */
export function useRecentReceipts(source: RecentSource) {
  const [items, setItems] = useState<ReceiptData[]>([]);

  const refresh = useCallback(() => setItems(read(source)), [source]);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, [refresh]);

  return items;
}