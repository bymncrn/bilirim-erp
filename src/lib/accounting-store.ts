import { createCollection } from "@/lib/supa-collection";

/* ---------------- Ürünler (ön muhasebe görünümü) ---------------- */

export type AccProduct = {
  id: string;
  name: string;
  barcode: string;
  categoryId: string;
  stock: number;
  unit: string;
  buy: number;
  sell: number;
  vat: number;
  images: string[];
};

export const productsCollection = createCollection<AccProduct>({
  table: "products",
  order: { column: "name" },
  fromRow: (r) => ({
    id: String(r["id"]),
    name: String(r["name"] ?? ""),
    barcode: String(r["barcode"] ?? ""),
    categoryId: String(r["category"] ?? ""),
    stock: Number(r["stock"] ?? 0),
    unit: String(r["unit"] ?? "adet"),
    buy: Number(r["cost"] ?? 0),
    sell: Number(r["price"] ?? 0),
    vat: Number(r["vat"] ?? 0),
    images: Array.isArray(r["images"]) ? (r["images"] as string[]) : [],
  }),
  toRow: (p) => ({
    id: p.id,
    name: p.name,
    barcode: p.barcode,
    sku: p.barcode,
    category: p.categoryId,
    stock: p.stock,
    unit: p.unit,
    cost: p.buy,
    price: p.sell,
    vat: p.vat,
    critical_stock: 0,
    description: "",
    color: "apple",
    images: p.images ?? [],
  }),
});

/* ---------------- Cari hesaplar ---------------- */

export type AccCari = {
  id: string;
  name: string;
  type: "Müşteri" | "Tedarikçi";
  phone: string;
  balance: number;
  taxOffice?: string;
  taxNo?: string;
  email?: string;
  address?: string;
  currency?: string;
};

export const cariCollection = createCollection<AccCari>({
  table: "cariler",
  order: { column: "name" },
  fromRow: (r) => ({
    id: String(r["id"]),
    name: String(r["name"] ?? ""),
    type: String(r["type"] ?? "Müşteri") as AccCari["type"],
    phone: String(r["phone"] ?? ""),
    balance: Number(r["balance"] ?? 0),
    taxOffice: String(r["tax_office"] ?? ""),
    taxNo: String(r["tax_no"] ?? ""),
    email: String(r["email"] ?? ""),
    address: String(r["address"] ?? ""),
    currency: String(r["currency"] ?? "TRY"),
  }),
  toRow: (c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    phone: c.phone,
    balance: c.balance,
    opening_balance: c.balance,
    tax_office: c.taxOffice ?? "",
    tax_no: c.taxNo ?? "",
    email: c.email ?? "",
    address: c.address ?? "",
    currency: c.currency ?? "TRY",
    note: "",
  }),
});

/* ---------------- Kasa / banka hesapları ---------------- */

export type AccFinAccountType =
  "Nakit Kasa" | "Banka Hesabı" | "POS Hesabı" | "Kredi Kartı" | "Ortaklar Hesabı";

export type AccFinAccount = {
  id: string;
  name: string;
  type: AccFinAccountType;
  detail: string;
  balance: number;
};

export const finAccountsCollection = createCollection<AccFinAccount>({
  table: "financial_accounts",
  order: { column: "created_at" },
  fromRow: (r) => ({
    id: String(r["id"]),
    name: String(r["name"] ?? ""),
    type: String(r["type"] ?? "Nakit Kasa") as AccFinAccountType,
    detail: String(r["note"] ?? ""),
    balance: Number(r["balance"] ?? 0),
  }),
  toRow: (a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    note: a.detail,
    balance: a.balance,
    opening_balance: a.balance,
    currency: "TRY",
    iban: "",
    last4: "",
    limit: 0,
    bank_name: "",
    active: true,
  }),
});

/* ---------------- e-Belgeler ---------------- */

export type AccEDocLine = {
  id: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
  vat: number;
};

export type AccEDoc = {
  id: string;
  no: string;
  kind: string;
  dir: "Giden" | "Gelen";
  account: string;
  date: string;
  base: number;
  vat: number;
  total: number;
  status: string;
  lines: AccEDocLine[];
  currency?: string;
  scenario?: string;
  invoiceType?: string;
  buyerTaxNo?: string;
  buyerTaxOffice?: string;
  buyerCity?: string;
  buyerDistrict?: string;
};

export const eDocsCollection = createCollection<AccEDoc>({
  table: "e_documents",
  generatedId: true,
  order: { column: "doc_date", ascending: false },
  fromRow: (r) => ({
    id: String(r["id"]),
    no: String(r["no"] ?? ""),
    kind: String(r["kind"] ?? "e-Fatura"),
    dir: String(r["direction"] ?? "Giden") as AccEDoc["dir"],
    account: String(r["account_name"] ?? ""),
    date: String(r["doc_date"] ?? ""),
    base: Number(r["base"] ?? 0),
    vat: Number(r["vat"] ?? 0),
    total: Number(r["total"] ?? 0),
    status: String(r["status"] ?? "Taslak"),
    currency: String(r["currency"] ?? "TRY"),
    scenario: String(r["scenario"] ?? "Temel Fatura"),
    invoiceType: String(r["invoice_type"] ?? "Satış"),
    buyerTaxNo: String(r["buyer_tax_no"] ?? ""),
    buyerTaxOffice: String(r["buyer_tax_office"] ?? ""),
    buyerCity: String(r["buyer_city"] ?? ""),
    buyerDistrict: String(r["buyer_district"] ?? ""),
    lines: ((r["lines"] as AccEDocLine[] | null) ?? []).map((l, i) => ({
      id: String(l?.id ?? `el${i}`),
      name: String(l?.name ?? ""),
      qty: Number(l?.qty ?? 0),
      unit: String(l?.unit ?? "adet"),
      price: Number(l?.price ?? 0),
      vat: Number(l?.vat ?? 0),
    })),
  }),
  toRow: (d) => ({
    id: d.id,
    no: d.no,
    kind: d.kind,
    direction: d.dir,
    account_name: d.account,
    doc_date: d.date,
    base: d.base,
    vat: d.vat,
    total: d.total,
    status: d.status,
    currency: d.currency ?? "TRY",
    scenario: d.scenario ?? "Temel Fatura",
    invoice_type: d.invoiceType ?? "Satış",
    buyer_tax_no: d.buyerTaxNo ?? "",
    buyer_tax_office: d.buyerTaxOffice ?? "",
    buyer_city: d.buyerCity ?? "",
    buyer_district: d.buyerDistrict ?? "",
    lines: d.lines ?? [],
  }),
});

/* ---------------- Giderler ---------------- */

export type AccExpense = {
  id: string;
  title: string;
  category: string;
  amount: number;
  account: string;
  date: string;
};

export const expensesCollection = createCollection<AccExpense>({
  table: "expenses",
  generatedId: true,
  order: { column: "expense_date", ascending: false },
  fromRow: (r) => ({
    id: String(r["id"]),
    title: String(r["title"] ?? ""),
    category: String(r["category"] ?? "Diğer"),
    amount: Number(r["amount"] ?? 0),
    account: String(r["account_name"] ?? ""),
    date: String(r["expense_date"] ?? ""),
  }),
  toRow: (e) => ({
    id: e.id,
    title: e.title,
    category: e.category,
    amount: e.amount,
    account_name: e.account,
    expense_date: e.date,
  }),
});

/* ---------------- Kasa / banka hesap hareketleri ---------------- */

export type AccAccountTxn = {
  id: string;
  accountId: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  createdAt: string;
};

export const accountTxnsCollection = createCollection<AccAccountTxn>({
  table: "account_txns",
  order: { column: "created_at", ascending: false },
  fromRow: (r) => ({
    id: String(r["id"]),
    accountId: String(r["account_id"] ?? ""),
    date: String(r["date"] ?? ""),
    amount: Number(r["amount"] ?? 0),
    description: String(r["description"] ?? ""),
    category: String(r["category"] ?? ""),
    createdAt: String(r["created_at"] ?? ""),
  }),
  toRow: (t) => ({
    id: t.id,
    account_id: t.accountId,
    date: t.date,
    amount: t.amount,
    description: t.description,
    category: t.category,
  }),
});

/** Kasa hareketi ekler (POS, virman, tahsilat vb.). */
export function addAccountTxn(input: {
  accountId: string;
  amount: number;
  description: string;
  category?: string;
  date?: string;
}) {
  return accountTxnsCollection.insertRaw({
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    account_id: input.accountId,
    date: input.date ?? new Date().toISOString().slice(0, 10),
    amount: input.amount,
    description: input.description,
    category: input.category ?? "Genel",
  });
}

/* ---------------- Cari tahsilat / ödeme hareketleri ---------------- */

export type AccPayment = {
  id: string;
  cariId: string;
  date: string;
  amount: number;
  method: string;
  direction: "in" | "out";
  note: string;
};

export const paymentsCollection = createCollection<AccPayment>({
  table: "payments",
  order: { column: "created_at", ascending: false },
  fromRow: (r) => ({
    id: String(r["id"]),
    cariId: String(r["cari_id"] ?? ""),
    date: String(r["date"] ?? ""),
    amount: Number(r["amount"] ?? 0),
    method: String(r["method"] ?? "Nakit"),
    direction: (String(r["direction"] ?? "in") === "out" ? "out" : "in") as AccPayment["direction"],
    note: String(r["note"] ?? ""),
  }),
  toRow: (p) => ({
    id: p.id,
    cari_id: p.cariId,
    date: p.date,
    amount: p.amount,
    method: p.method,
    direction: p.direction,
    note: p.note,
  }),
});

/** Cari tahsilat/ödeme kaydı ekler. */
export function addCariPayment(input: {
  cariId: string;
  amount: number;
  direction: "in" | "out";
  method?: string;
  note?: string;
  date?: string;
}) {
  return paymentsCollection.insertRaw({
    id: `pm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    cari_id: input.cariId,
    date: input.date ?? new Date().toISOString().slice(0, 10),
    amount: input.amount,
    method: input.method ?? "Nakit",
    direction: input.direction,
    note: input.note ?? "",
  });
}
