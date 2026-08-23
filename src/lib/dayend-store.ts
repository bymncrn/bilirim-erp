import { useSyncExternalStore } from "react";

export type PaymentType = "nakit" | "kart" | "yemek" | "cari";
export type SalesModule = "pos" | "adisyon";

export type DaySale = {
  id: string;
  time: string;
  module: SalesModule;
  payment: PaymentType;
  /** Brüt satış tutarı */
  gross: number;
  /** Uygulanan indirim / ikram */
  discount: number;
  /** İptal / iade tutarı */
  refund: number;
};

export type ZReport = {
  id: string;
  closedAt: string;
  revenue: number;
  ticketCount: number;
  discount: number;
  refund: number;
  countedCash: number;
  diff: number;
  byPayment: Record<PaymentType, { count: number; total: number }>;
  byModule: Record<SalesModule, number>;
};

export const PAYMENT_LABELS: Record<PaymentType, string> = {
  nakit: "Nakit",
  kart: "Kredi Kartı",
  yemek: "Yemek Kartı",
  cari: "Cari / Veresiye",
};

export const MODULE_SALES_LABELS: Record<SalesModule, string> = {
  pos: "Hızlı Perakende POS",
  adisyon: "Restoran Adisyon",
};

const SALES_KEY = "bilirim-day-sales";
const ARCHIVE_KEY = "bilirim-z-reports";

const DEFAULT_SALES: DaySale[] = [
  {
    id: "s1",
    time: "09:12",
    module: "pos",
    payment: "nakit",
    gross: 486.5,
    discount: 0,
    refund: 0,
  },
  { id: "s2", time: "09:48", module: "pos", payment: "kart", gross: 1240, discount: 60, refund: 0 },
  {
    id: "s3",
    time: "10:20",
    module: "adisyon",
    payment: "nakit",
    gross: 720,
    discount: 30,
    refund: 0,
  },
  {
    id: "s4",
    time: "11:05",
    module: "adisyon",
    payment: "yemek",
    gross: 1560,
    discount: 0,
    refund: 0,
  },
  {
    id: "s5",
    time: "12:30",
    module: "adisyon",
    payment: "kart",
    gross: 2890,
    discount: 120,
    refund: 180,
  },
  { id: "s6", time: "13:14", module: "pos", payment: "nakit", gross: 315, discount: 0, refund: 0 },
  { id: "s7", time: "14:02", module: "pos", payment: "cari", gross: 980, discount: 0, refund: 0 },
  {
    id: "s8",
    time: "15:40",
    module: "adisyon",
    payment: "nakit",
    gross: 1180,
    discount: 45,
    refund: 0,
  },
  { id: "s9", time: "16:25", module: "pos", payment: "kart", gross: 640, discount: 0, refund: 90 },
  {
    id: "s10",
    time: "17:10",
    module: "adisyon",
    payment: "yemek",
    gross: 890,
    discount: 0,
    refund: 0,
  },
  {
    id: "s11",
    time: "18:35",
    module: "adisyon",
    payment: "kart",
    gross: 2140,
    discount: 200,
    refund: 0,
  },
  {
    id: "s12",
    time: "19:50",
    module: "adisyon",
    payment: "nakit",
    gross: 1675,
    discount: 0,
    refund: 0,
  },
  {
    id: "s13",
    time: "20:22",
    module: "pos",
    payment: "nakit",
    gross: 254.9,
    discount: 0,
    refund: 0,
  },
  {
    id: "s14",
    time: "21:05",
    module: "adisyon",
    payment: "cari",
    gross: 1320,
    discount: 80,
    refund: 0,
  },
];

let sales: DaySale[] = DEFAULT_SALES;
let archive: ZReport[] = [];
let hydrated = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function persist() {
  try {
    window.localStorage.setItem(SALES_KEY, JSON.stringify(sales));
    window.localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
  } catch {
    /* yoksay */
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const rawSales = window.localStorage.getItem(SALES_KEY);
    if (rawSales) {
      const parsed = JSON.parse(rawSales) as DaySale[];
      if (Array.isArray(parsed)) sales = parsed;
    }
    const rawArchive = window.localStorage.getItem(ARCHIVE_KEY);
    if (rawArchive) {
      const parsed = JSON.parse(rawArchive) as ZReport[];
      if (Array.isArray(parsed)) archive = parsed;
    }
    emit();
  } catch {
    /* yoksay */
  }
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const salesSnapshot = () => sales;
const salesServerSnapshot = () => DEFAULT_SALES;
const archiveSnapshot = () => archive;
const EMPTY_ARCHIVE: ZReport[] = [];
const archiveServerSnapshot = () => EMPTY_ARCHIVE;

export function useDaySales() {
  return useSyncExternalStore(subscribe, salesSnapshot, salesServerSnapshot);
}

export function useZReports() {
  return useSyncExternalStore(subscribe, archiveSnapshot, archiveServerSnapshot);
}

export function summarize(list: DaySale[]) {
  const byPayment = {
    nakit: { count: 0, total: 0 },
    kart: { count: 0, total: 0 },
    yemek: { count: 0, total: 0 },
    cari: { count: 0, total: 0 },
  } as Record<PaymentType, { count: number; total: number }>;
  const byModule: Record<SalesModule, number> = { pos: 0, adisyon: 0 };

  let revenue = 0;
  let discount = 0;
  let refund = 0;

  for (const s of list) {
    const net = s.gross - s.discount - s.refund;
    revenue += net;
    discount += s.discount;
    refund += s.refund;
    byPayment[s.payment].count += 1;
    byPayment[s.payment].total += net;
    byModule[s.module] += net;
  }

  return { revenue, discount, refund, ticketCount: list.length, byPayment, byModule };
}

export function closeDay(countedCash: number) {
  const s = summarize(sales);
  const now = new Date();
  const closedAt = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const report: ZReport = {
    id: `Z-${now.getTime().toString(36).toUpperCase()}`,
    closedAt,
    revenue: s.revenue,
    ticketCount: s.ticketCount,
    discount: s.discount,
    refund: s.refund,
    countedCash,
    diff: Number((countedCash - s.byPayment.nakit.total).toFixed(2)),
    byPayment: s.byPayment,
    byModule: s.byModule,
  };
  archive = [report, ...archive];
  sales = [];
  persist();
  emit();
  return report;
}

export const dayMoney = (n: number) =>
  `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
