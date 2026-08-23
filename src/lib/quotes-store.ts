import { createCollection } from "@/lib/supa-collection";

export type QuoteLine = {
  id: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
  vat: number;
  discount: number;
};

export type QuoteStatus = "Taslak" | "Gönderildi" | "Satışa Çevrildi" | "Faturalandı";

export type Quote = {
  id: string;
  no: string;
  cariId: string | null;
  account: string;
  date: string;
  validUntil: string;
  lines: QuoteLine[];
  subtotal: number;
  vatTotal: number;
  total: number;
  terms: string;
  status: QuoteStatus;
  currency?: string;
};

export const quotesCollection = createCollection<Quote>({
  table: "quotes",
  generatedId: true,
  order: { column: "created_at", ascending: false },
  fromRow: (r) => ({
    id: String(r["id"]),
    no: String(r["no"] ?? ""),
    cariId: (r["cari_id"] as string | null) ?? null,
    account: String(r["account_name"] ?? ""),
    date: String(r["quote_date"] ?? ""),
    validUntil: String(r["valid_until"] ?? ""),
    lines: ((r["lines"] as QuoteLine[] | null) ?? []).map((l, i) => ({
      id: String(l?.id ?? `l${i}`),
      name: String(l?.name ?? ""),
      qty: Number(l?.qty ?? 0),
      unit: String(l?.unit ?? "adet"),
      price: Number(l?.price ?? 0),
      vat: Number(l?.vat ?? 0),
      discount: Number(l?.discount ?? 0),
    })),
    subtotal: Number(r["subtotal"] ?? 0),
    vatTotal: Number(r["vat_total"] ?? 0),
    total: Number(r["total"] ?? 0),
    terms: String(r["terms"] ?? ""),
    currency: String(r["currency"] ?? "TRY"),
    status: String(r["status"] ?? "Taslak") as QuoteStatus,
  }),
  toRow: (q) => ({
    id: q.id,
    no: q.no,
    cari_id: q.cariId,
    account_name: q.account,
    quote_date: q.date || new Date().toISOString().slice(0, 10),
    valid_until: q.validUntil || null,
    lines: q.lines,
    subtotal: q.subtotal,
    vat_total: q.vatTotal,
    total: q.total,
    terms: q.terms,
    currency: q.currency ?? "TRY",
    status: q.status,
  }),
});

export function quoteTotals(lines: QuoteLine[]) {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const net = lines.reduce((s, l) => s + l.qty * l.price * (1 - l.discount / 100), 0);
  const vat = lines.reduce(
    (s, l) => s + l.qty * l.price * (1 - l.discount / 100) * (l.vat / 100),
    0,
  );
  return { subtotal: r2(net), vatTotal: r2(vat), total: r2(net + vat) };
}

export function useQuotes() {
  return quotesCollection.useItems();
}
