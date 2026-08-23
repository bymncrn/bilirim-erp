import { ModuleGuard } from "@/components/subscription/ModuleGuard";
import { ProductGallery } from "@/components/products/ProductGallery";
import { ProductPicker } from "@/components/products/ProductPicker";
import { QuickProductDialog } from "@/components/products/QuickProductDialog";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useKasaEntries } from "@/lib/kasa-store";
import { useDbState } from "@/lib/supa-collection";
import {
  productsCollection,
  cariCollection,
  finAccountsCollection,
  eDocsCollection,
  expensesCollection,
  accountTxnsCollection,
  paymentsCollection,
  addAccountTxn,
  addCariPayment,
} from "@/lib/accounting-store";
import type { AccEDoc } from "@/lib/accounting-store";
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  Users,
  Truck,
  Plus,
  Package,
  Landmark,
  Banknote,
  ArrowDownLeft,
  ArrowUpRight,
  Settings2,
  Pencil,
  Trash2,
  FileText,
  Check,
  X,
  Search,
  Upload,
  Download,
  FileSpreadsheet,
  Apple,
  Carrot,
  Nut,
  Milk,
  Beef,
  ShieldCheck,
  CreditCard,
  Handshake,
  Printer,
  Mail,
  ListTree,
  FileSignature,
  ArrowLeftRight,
  Scale,
} from "lucide-react";
import { Send, Receipt, Inbox, Tag, ShoppingCart, PackagePlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { readSheetRows, pickCell, toNumber } from "@/lib/excel-import";
import { bulkImportProducts, signedProductImageUrls } from "@/lib/catalog-store";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { CURRENCIES, fmtMoney, normalizeCurrency } from "@/lib/currency";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/lib/permissions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCategories,
  addCategory,
  updateCategory,
  removeCategory,
  categoryColorClass,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
} from "@/lib/categories-store";
import { useCompany, getCompanyLogoUrl } from "@/lib/company-store";
import {
  quotesCollection,
  quoteTotals as calcQuoteTotals,
  type Quote,
  type QuoteLine,
} from "@/lib/quotes-store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MuhasebeShell, MUHASEBE_NAV } from "@/components/muhasebe/MuhasebeShell";

export const Route = createFileRoute("/muhasebe")({
  head: () => ({
    meta: [
      { title: "Ön Muhasebe Modülü — Bilirim ERP" },
      {
        name: "description",
        content:
          "Stok, cari hesaplar, kasa ve banka takibi; alacak, borç ve ciro özetleri tek ekranda.",
      },
      { property: "og:title", content: "Ön Muhasebe Modülü — Bilirim ERP" },
      {
        property: "og:description",
        content:
          "Stok ve ürün yönetimi, cari hesaplar, kasa & banka hareketleri ve finansal özet kartları.",
      },
    ],
  }),
  component: () => (
    <ModuleGuard module="muhasebe">
      <MuhasebePage />
    </ModuleGuard>
  ),
});

const TRY = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
});

type Product = {
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

type Account = {
  id: string;
  name: string;
  type: "Müşteri" | "Tedarikçi";
  phone: string;
  balance: number; // + alacak, - borç
  taxOffice?: string;
  taxNo?: string;
  email?: string;
  address?: string;
  currency?: string;
};

const UNITS = ["kg", "adet", "koli"] as const;

const CATEGORY_ICON_MAP: Record<string, typeof Package> = {
  apple: Apple,
  carrot: Carrot,
  nut: Nut,
  milk: Milk,
  beef: Beef,
  package: Package,
};

const emptyProductForm = {
  name: "",
  barcode: "",
  unit: "kg" as string,
  buy: "",
  sell: "",
  vat: "1",
  categoryId: "",
  stock: "0",
};

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type FinAccountType =
  "Nakit Kasa" | "Banka Hesabı" | "POS Hesabı" | "Kredi Kartı" | "Ortaklar Hesabı";

type FinAccount = {
  id: string;
  name: string;
  type: FinAccountType;
  detail: string;
  balance: number;
};

const FIN_TYPES: FinAccountType[] = [
  "Nakit Kasa",
  "Banka Hesabı",
  "POS Hesabı",
  "Kredi Kartı",
  "Ortaklar Hesabı",
];

const FIN_TYPE_META: Record<FinAccountType, { icon: typeof Wallet; tone: string }> = {
  "Nakit Kasa": { icon: Banknote, tone: "bg-pos-apple text-pos-apple-foreground" },
  "Banka Hesabı": { icon: Landmark, tone: "bg-pos-cashew text-pos-cashew-foreground" },
  "POS Hesabı": { icon: Wallet, tone: "bg-pos-cheese text-pos-cheese-foreground" },
  "Kredi Kartı": { icon: CreditCard, tone: "bg-pos-tomato text-pos-tomato-foreground" },
  "Ortaklar Hesabı": { icon: Handshake, tone: "bg-pos-sky text-pos-sky-foreground" },
};

type EStatus = "Onaylandı" | "GİB Bekliyor" | "Taslak";

type EDocKind = "e-Fatura" | "e-Arşiv Fatura" | "e-İrsaliye";

type EInvoice = {
  id: string;
  no: string;
  kind: EDocKind;
  dir: "Giden" | "Gelen";
  account: string;
  date: string;
  base: number;
  vat: number;
  total: number;
  status: EStatus;
  lines: EDocLine[];
  scenario?: string;
  invoiceType?: string;
  buyerTaxNo?: string;
  buyerTaxOffice?: string;
  buyerCity?: string;
  buyerDistrict?: string;
};

type ELine = { id: string; name: string; qty: string; price: string; vat: string };

type EDocLine = { id: string; name: string; qty: number; unit: string; price: number; vat: number };

type Expense = {
  id: string;
  title: string;
  category: string;
  amount: number;
  account: string;
  date: string;
};

const EXPENSE_CATEGORIES = [
  "Kira",
  "Personel Maaşı",
  "Elektrik / Su / Doğalgaz",
  "Benzin / Ulaşım",
  "Nakliye",
  "Vergi & SGK",
  "Bakım / Onarım",
  "Diğer",
] as const;

const DEFAULT_QUOTE_TERMS = `1. Fiyatlarımıza KDV dahil değildir, tabloda ayrıca gösterilmiştir.\n2. Teklif, belirtilen geçerlilik tarihine kadar geçerlidir.\n3. Ödeme: Peşin / anlaşmalı vade koşullarına göre yapılır.\n4. Teslimat süresi sipariş onayından itibaren 3-7 iş günüdür.\n5. Stok durumuna göre fiyat ve termin değişiklik gösterebilir.`;

const thisMonth = new Date().toISOString().slice(0, 7);

function eStatusClass(status: string) {
  if (status === "Onaylandı") return "bg-pos-apple text-pos-apple-foreground";
  if (status === "GİB Bekliyor") return "bg-pos-cheese text-pos-cheese-foreground";
  return "bg-secondary text-secondary-foreground";
}

type Movement = {
  id: string;
  date: string;
  desc: string;
  account: string;
  amount: number;
};

function parseTrDate(d: string) {
  const [dd, mm, yyyy] = d.slice(0, 10).split(".");
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

function toIso(d: string) {
  const dt = parseTrDate(d);
  return Number.isNaN(dt.getTime()) ? "" : dt.toISOString().slice(0, 10);
}

function printHtml(title: string, body: string) {
  const win = window.open("", "_blank", "width=820,height=1000");
  if (!win) return false;
  win.document
    .write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${title}</title>
  <style>
    body{font-family:ui-sans-serif,system-ui,Arial;padding:32px;color:#111}
    h1{font-size:20px;margin:0 0 4px}
    .muted{color:#666;font-size:12px}
    table{width:100%;border-collapse:collapse;margin-top:18px;font-size:13px}
    th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left}
    td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
    tfoot td{font-weight:700;border-top:2px solid #111}
    .foot{margin-top:24px;font-size:12px;color:#666}
  </style></head><body>${body}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
  return true;
}

function openPrintWindow(title: string, css: string, body: string) {
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) {
    toast.error("Yazdırma penceresi engellendi. Tarayıcı ayarlarından izin verin.");
    return false;
  }
  win.document
    .write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${title}</title>
  <style>${css}</style></head><body>${body}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
  return true;
}

const escapeHtml = (v: string) =>
  v.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );

/** Barkod rakamlarından basit görsel çizgi kodu üretir (raf etiketi önizlemesi). */
function barcodeBars(code: string) {
  const digits = (code || "").replace(/\D/g, "") || "0000000000000";
  const bars = digits
    .split("")
    .map((d) => {
      const n = Number(d);
      const w = 1 + (n % 3);
      const gap = 1 + ((n + 1) % 2);
      return `<i style="width:${w}px"></i><b style="width:${gap}px"></b>`;
    })
    .join("");
  return `<div class="bars">${bars}${bars}</div>`;
}

type ShelfLabel = { name: string; barcode: string; price: string; unit: string; extra?: string };

/** Standart raf etiketi (barkod + isim + fiyat) şablonu. */
function printShelfLabels(labels: ShelfLabel[], companyName: string) {
  if (labels.length === 0) {
    toast.error("Yazdırılacak etiket bulunamadı.");
    return;
  }
  const css = `
    @page{margin:8mm}
    body{font-family:ui-sans-serif,system-ui,Arial;margin:0;color:#111}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm}
    .label{border:1px dashed #999;border-radius:6px;padding:8px;height:38mm;display:flex;flex-direction:column;justify-content:space-between;page-break-inside:avoid}
    .brand{font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#666}
    .name{font-size:13px;font-weight:700;line-height:1.2;margin-top:2px}
    .extra{font-size:9px;color:#666}
    .price{font-size:22px;font-weight:800;text-align:right;font-variant-numeric:tabular-nums}
    .unit{font-size:10px;font-weight:600;color:#444;text-align:right}
    .bars{display:flex;align-items:flex-end;height:12mm;gap:0}
    .bars i{display:block;background:#111;height:100%}
    .bars b{display:block;background:#fff;height:100%}
    .code{font-size:10px;letter-spacing:.18em;text-align:center;font-variant-numeric:tabular-nums}
  `;
  const body = `<div class="grid">${labels
    .map(
      (l) => `<div class="label">
        <div>
          <div class="brand">${escapeHtml(companyName)}</div>
          <div class="name">${escapeHtml(l.name)}</div>
          ${l.extra ? `<div class="extra">${escapeHtml(l.extra)}</div>` : ""}
        </div>
        <div>
          <div class="price">${escapeHtml(l.price)}</div>
          <div class="unit">/ ${escapeHtml(l.unit)}</div>
        </div>
        ${barcodeBars(l.barcode)}
        <div class="code">${escapeHtml(l.barcode || "—")}</div>
      </div>`,
    )
    .join("")}</div>`;
  if (openPrintWindow("Raf Etiketleri", css, body))
    toast.success(`${labels.length} raf etiketi yazdırmaya gönderildi.`);
}

type QuoteCompany = {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  taxNo?: string;
  taxOffice?: string;
  logoUrl?: string;
};

/** Kurumsal teklif çıktısı: logo + teklif tablosu + şartlar & koşullar. */
function printQuoteDoc(
  quote: Quote,
  company: QuoteCompany,
  fmt: (n: number) => string,
  images: Record<string, string> = {},
) {
  const css = `
    @page{margin:20mm 18mm}
    body{font-family:ui-sans-serif,system-ui,Arial;color:#111;margin:0;padding:10mm 8mm}
    header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:3px solid #111;padding-bottom:14px}
    .logo{max-height:64px;max-width:200px;object-fit:contain}
    .co{font-size:20px;font-weight:800}
    .thumb{width:34px;height:34px;object-fit:cover;border-radius:6px;border:1px solid #e5e5e5;margin-right:8px;vertical-align:middle}
    .item{display:flex;align-items:center;gap:8px}
    .muted{color:#666;font-size:11px;line-height:1.5}
    .title{text-align:right}
    .title h1{margin:0;font-size:24px;letter-spacing:.04em}
    .meta{margin-top:18px;display:flex;justify-content:space-between;gap:24px;font-size:12px}
    .box{border:1px solid #ddd;border-radius:8px;padding:10px 12px;min-width:240px}
    .box h3{margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#666}
    table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12px}
    th{background:#f4f4f5;text-align:left;padding:10px 12px;border-bottom:1px solid #ddd}
    td{padding:10px 12px;border-bottom:1px solid #eee}
    td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
    tfoot td{font-weight:700}
    .grand td{border-top:2px solid #111;font-size:14px}
    .terms{margin-top:26px;border:1px solid #ddd;border-radius:8px;padding:14px 16px;font-size:11px;line-height:1.6;white-space:pre-wrap}
    .terms h3{margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#666}
    .sign{margin-top:34px;display:flex;justify-content:space-between;font-size:11px;color:#666}
  `;
  const rows = quote.lines
    .map(
      (l, i) => `<tr>
        <td>${i + 1}</td>
        <td><div class="item">${images[l.name] ? `<img class="thumb" src="${escapeHtml(images[l.name] as string)}" alt="" />` : ""}<span>${escapeHtml(l.name)}</span></div></td>
        <td class="num">${l.qty.toLocaleString("tr-TR")} ${escapeHtml(l.unit)}</td>
        <td class="num">${fmt(l.price)}</td>
        <td class="num">%${l.discount}</td>
        <td class="num">%${l.vat}</td>
        <td class="num">${fmt(l.qty * l.price * (1 - l.discount / 100) * (1 + l.vat / 100))}</td>
      </tr>`,
    )
    .join("");
  const body = `
  <header>
    <div>
      ${company.logoUrl ? `<img class="logo" src="${escapeHtml(company.logoUrl)}" alt="${escapeHtml(company.name)} logosu" />` : ""}
      <div class="co">${escapeHtml(company.name)}</div>
      <div class="muted">
        ${escapeHtml(company.address ?? "")}<br/>
        ${escapeHtml(company.phone ?? "")} ${company.email ? "· " + escapeHtml(company.email) : ""}<br/>
        ${company.taxOffice ? escapeHtml(company.taxOffice) + " V.D. " : ""}${escapeHtml(company.taxNo ?? "")}
      </div>
    </div>
    <div class="title">
      <h1>FİYAT TEKLİFİ</h1>
      <div class="muted">Teklif No: <b>${escapeHtml(quote.no)}</b><br/>
      Tarih: ${escapeHtml(quote.date || "—")}<br/>
      Geçerlilik: ${escapeHtml(quote.validUntil || "—")}</div>
    </div>
  </header>
  <div class="meta">
    <div class="box">
      <h3>Sayın</h3>
      <div><b>${escapeHtml(quote.account || "—")}</b></div>
    </div>
    <div class="box">
      <h3>Durum</h3>
      <div><b>${escapeHtml(quote.status)}</b></div>
    </div>
  </div>
  <table>
    <thead><tr>
      <th>#</th><th>Açıklama</th><th class="num">Miktar</th><th class="num">Birim Fiyat</th>
      <th class="num">İskonto</th><th class="num">KDV</th><th class="num">Tutar</th>
    </tr></thead>
    <tbody>${rows || `<tr><td colspan="7">Kalem yok.</td></tr>`}</tbody>
    <tfoot>
      <tr><td colspan="6" class="num">Ara Toplam</td><td class="num">${fmt(quote.subtotal)}</td></tr>
      <tr><td colspan="6" class="num">KDV</td><td class="num">${fmt(quote.vatTotal)}</td></tr>
      <tr class="grand"><td colspan="6" class="num">GENEL TOPLAM</td><td class="num">${fmt(quote.total)}</td></tr>
    </tfoot>
  </table>
  <div class="terms"><h3>Şartlar &amp; Koşullar</h3>${escapeHtml(quote.terms || "—")}</div>
  <div class="sign"><div>${escapeHtml(company.name)}<br/>Yetkili İmza</div><div>Müşteri Onayı<br/>Kaşe / İmza</div></div>`;
  if (openPrintWindow(`Teklif ${quote.no}`, css, body))
    toast.success("Teklif çıktısı hazırlandı. Yazdır penceresinden PDF olarak kaydedebilirsiniz.");
}

type InvoiceItem = {
  name: string;
  qty: number;
  unit: string;
  price: number;
  vat: number;
  discount: number;
};

type Invoice = {
  id: string;
  no: string;
  type: "Alış" | "Satış";
  account: string;
  date: string;
  total: number;
  status: "Ödendi" | "Bekliyor";
  items: InvoiceItem[];
};

const r2 = (n: number) => Math.round(n * 100) / 100;

function itemTotals(items: InvoiceItem[]) {
  const net = items.reduce((s, i) => s + i.qty * i.price * (1 - i.discount / 100), 0);
  const vat = items.reduce(
    (s, i) => s + i.qty * i.price * (1 - i.discount / 100) * (i.vat / 100),
    0,
  );
  const discount = items.reduce((s, i) => s + i.qty * i.price * (i.discount / 100), 0);
  return { net: r2(net), vat: r2(vat), discount: r2(discount), gross: r2(net + vat) };
}

const mkInvoice = (
  id: string,
  no: string,
  type: Invoice["type"],
  account: string,
  date: string,
  status: Invoice["status"],
  items: InvoiceItem[],
): Invoice => ({ id, no, type, account, date, status, items, total: itemTotals(items).gross });

type Statement = { id: string; date: string; desc: string; debit: number; credit: number };

const statements: Record<string, Statement[]> = {};

function MuhasebePage() {
  const company = useCompany();
  const [products, setProducts] = useDbState(productsCollection);
  /** Fatura/teklif kalemlerinde stoktan arama için sade ürün listesi. */
  const pickableProducts = useMemo(
    () =>
      products.map((p) => ({
        id: p.id,
        name: p.name,
        unit: p.unit,
        sell: p.sell,
        vat: p.vat,
        barcode: p.barcode,
      })),
    [products],
  );
  const [accounts, setAccounts] = useDbState(cariCollection);
  const [finAccounts, setFinAccounts] = useDbState(finAccountsCollection);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [tab, setTab] = useState<string>("ozet");

  const kasaEntries = useKasaEntries();
  const appliedKasaIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fresh = kasaEntries.filter((e) => !appliedKasaIds.current.has(e.id));
    if (!fresh.length) return;
    fresh.forEach((e) => appliedKasaIds.current.add(e.id));
    setFinAccounts((prev) =>
      prev.map((a) => {
        const delta = fresh
          .filter((e) => e.accountName === a.name)
          .reduce((s, e) => s + e.amount, 0);
        return delta ? { ...a, balance: a.balance + delta } : a;
      }),
    );
    setMovements((prev) => [
      ...fresh.map((e) => ({
        id: e.id,
        date: e.date,
        desc: e.desc,
        account: e.accountName,
        amount: e.amount,
      })),
      ...prev,
    ]);
  }, [kasaEntries]);
  const [finOpen, setFinOpen] = useState(false);
  const [finForm, setFinForm] = useState({
    name: "",
    type: "Nakit Kasa" as FinAccountType,
    detail: "",
    balance: "",
  });
  const [finMovementsOf, setFinMovementsOf] = useState<FinAccount | null>(null);
  const accountTxns = accountTxnsCollection.useItems();
  const cariPayments = paymentsCollection.useItems();
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({ from: "", to: "", amount: "", desc: "" });
  const [finBalanceOpen, setFinBalanceOpen] = useState(false);
  const [finBalanceValue, setFinBalanceValue] = useState("");
  const [cariBalanceOpen, setCariBalanceOpen] = useState(false);
  const [cariBalanceValue, setCariBalanceValue] = useState("");
  const [cashTx, setCashTx] = useState<null | "in" | "out">(null);
  const [cashForm, setCashForm] = useState({ accountId: "", cariId: "", amount: "", desc: "" });
  const [range, setRange] = useState({ from: "", to: "" });
  const [payAccountId, setPayAccountId] = useState("");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteLines, setQuoteLines] = useState<
    { id: string; productId: string; qty: string; price: string; vat: string; discount: string }[]
  >([]);
  const [quoteValid, setQuoteValid] = useState("");
  const categories = useCategories();
  const [manageOpen, setManageOpen] = useState(false);
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", color: "apple", icon: "package" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [productOpen, setProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [importOpen, setImportOpen] = useState<null | "stok" | "cari">(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [stokQuery, setStokQuery] = useState("");
  const [cariQuery, setCariQuery] = useState("");
  const [kasaQuery, setKasaQuery] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    type: "Satış" as Invoice["type"],
    account: "",
    total: "",
  });
  const [statementOf, setStatementOf] = useState<Account | null>(null);
  const [editCari, setEditCari] = useState<Account | null>(null);
  const [editCariForm, setEditCariForm] = useState({
    name: "",
    type: "Müşteri" as Account["type"],
    taxNo: "",
    taxOffice: "",
    phone: "",
    email: "",
    address: "",
    currency: "TRY",
  });
  const [editFin, setEditFin] = useState<FinAccount | null>(null);
  const [editFinForm, setEditFinForm] = useState({
    name: "",
    type: "Nakit Kasa" as FinAccountType,
    detail: "",
    note: "",
  });
  const [invoiceDetail, setInvoiceDetail] = useState<Invoice | null>(null);
  const [cariOpen, setCariOpen] = useState(false);
  const [cariType, setCariType] = useState<"all" | "Müşteri" | "Tedarikçi">("all");
  const [cariForm, setCariForm] = useState({
    type: "Müşteri" as Account["type"],
    name: "",
    taxOffice: "",
    taxNo: "",
    phone: "",
    email: "",
    address: "",
    opening: "",
    currency: "TRY",
  });
  const [extraEntries] = useState<Record<string, Statement[]>>({});
  const [payment, setPayment] = useState("");
  const { can: canPerm } = usePermissions();

  // --- Hızlı ürün ekleme (fatura & teklif kalemleri) ---
  const [quickProduct, setQuickProduct] = useState<{
    query: string;
    apply: (p: { id: string; name: string; unit: string; sell: number; vat: number }) => void;
  } | null>(null);

  // --- e-Fatura / e-Arşiv ---
  const [eInvoices, setEInvoices] = useDbState(eDocsCollection);
  const [eQuery, setEQuery] = useState("");
  const [eOpen, setEOpen] = useState(false);
  const [eKindTab, setEKindTab] = useState<EDocKind>("e-Fatura");
  const [eTypePickerOpen, setETypePickerOpen] = useState(false);
  const [eDocKind, setEDocKind] = useState<EDocKind>("e-Fatura");
  const [eForm, setEForm] = useState({
    account: "",
    date: "",
    note: "",
    scenario: "Temel Fatura",
    invoiceType: "Satış",
    buyerTaxNo: "",
    buyerTaxOffice: "",
    buyerCity: "",
    buyerDistrict: "",
  });
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [eLines, setELines] = useState<ELine[]>([
    { id: "l1", name: "", qty: "1", price: "", vat: "10" },
  ]);

  /** Teknik servis fişinden gelen verilerle e-Fatura formunu otomatik doldurur. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem("servis:invoice-prefill");
    if (!raw) return;
    sessionStorage.removeItem("servis:invoice-prefill");
    try {
      const p = JSON.parse(raw) as {
        account?: string;
        note?: string;
        lines?: { id: string; name: string; qty: string; price: string; vat: string }[];
      };
      setTab("ebelge");
      setEDocKind("e-Fatura");
      setEKindTab("e-Fatura");
      setEForm((f) => ({
        ...f,
        account: p.account ?? "",
        date: new Date().toISOString().slice(0, 10),
        note: p.note ?? "",
      }));
      if (p.lines?.length) setELines(p.lines);
      setEOpen(true);
      toast.success("Servis fişi bilgileri fatura formuna aktarıldı.");
    } catch (err) {
      console.error("[muhasebe] servis fişi aktarımı okunamadı", err);
    }
  }, []);

  // --- Gelir & Gider ---
  const [expenses, setExpenses] = useDbState(expensesCollection);
  const [expQuery, setExpQuery] = useState("");
  const [expOpen, setExpOpen] = useState(false);
  const [expForm, setExpForm] = useState({
    title: "",
    category: EXPENSE_CATEGORIES[0] as string,
    amount: "",
    accountId: "",
    date: "",
  });

  const filteredEInvoices = useMemo(() => {
    const q = eQuery.trim().toLocaleLowerCase("tr");
    if (!q) return eInvoices;
    return eInvoices.filter((i) =>
      [i.no, i.account, i.date, i.status].join(" ").toLocaleLowerCase("tr").includes(q),
    );
  }, [eInvoices, eQuery]);

  const eTotals = useMemo(() => {
    const base = eLines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.price) || 0), 0);
    const vat = eLines.reduce(
      (s, l) => s + ((Number(l.qty) || 0) * (Number(l.price) || 0) * (Number(l.vat) || 0)) / 100,
      0,
    );
    return { base, vat, total: base + vat };
  }, [eLines]);

  const filteredExpenses = useMemo(() => {
    const q = expQuery.trim().toLocaleLowerCase("tr");
    if (!q) return expenses;
    return expenses.filter((e) =>
      [e.title, e.category, e.account, e.date].join(" ").toLocaleLowerCase("tr").includes(q),
    );
  }, [expenses, expQuery]);

  const monthlyExpense = useMemo(() => {
    const ym = new Date().toISOString().slice(0, 7);
    return expenses.filter((e) => e.date.startsWith(ym)).reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const resetEForm = () =>
    setEForm({
      account: "",
      date: "",
      note: "",
      scenario: "Temel Fatura",
      invoiceType: "Satış",
      buyerTaxNo: "",
      buyerTaxOffice: "",
      buyerCity: "",
      buyerDistrict: "",
    });

  const validateEInvoice = () => {
    if (!eForm.account) {
      toast.error("Cari seçiniz.");
      return false;
    }
    if (eTotals.total <= 0) {
      toast.error("En az bir geçerli kalem giriniz.");
      return false;
    }
    if (!/^\d{10}$|^\d{11}$/.test(eForm.buyerTaxNo)) {
      toast.error("VKN 10, TCKN 11 rakam olmalıdır.");
      return false;
    }
    if (!eForm.buyerTaxOffice.trim()) {
      toast.error("Vergi dairesi giriniz.");
      return false;
    }
    if (!eForm.buyerCity.trim() || !eForm.buyerDistrict.trim()) {
      toast.error("İl ve ilçe bilgisi giriniz.");
      return false;
    }
    return true;
  };

  const requestSendEInvoice = () => {
    if (!validateEInvoice()) return;
    if ((company?.edoc_credits ?? 0) <= 0) {
      toast.error("Kontörünüz yetersiz. Lütfen paket satın alın.");
      return;
    }
    setSendConfirmOpen(true);
    setEOpen(false);
  };

  const handleSendEInvoice = (status: EStatus) => {
    if (!validateEInvoice()) return;
    const prefix =
      eDocKind === "e-İrsaliye" ? "IRS2026" : eDocKind === "e-Arşiv Fatura" ? "ARS2026" : "EFT2026";
    const inv: EInvoice = {
      id: `ei-${Date.now()}`,
      no: `${prefix}${String(eInvoices.length + 1).padStart(6, "0")}`,
      kind: eDocKind,
      dir: "Giden",
      account: eForm.account,
      date: eForm.date || new Date().toISOString().slice(0, 10),
      base: eTotals.base,
      vat: eTotals.vat,
      total: eTotals.total,
      status,
      scenario: eForm.scenario,
      invoiceType: eForm.invoiceType,
      buyerTaxNo: eForm.buyerTaxNo,
      buyerTaxOffice: eForm.buyerTaxOffice,
      buyerCity: eForm.buyerCity,
      buyerDistrict: eForm.buyerDistrict,
      lines: eLines.map((l) => ({
        id: l.id,
        name: l.name,
        qty: Number(String(l.qty).replace(",", ".")) || 0,
        unit: "adet",
        price: Number(String(l.price).replace(",", ".")) || 0,
        vat: Number(String(l.vat).replace(",", ".")) || 0,
      })),
    };
    setEInvoices((prev) => [inv, ...prev]);
    setSendConfirmOpen(false);
    setEOpen(false);
    resetEForm();
    setELines([{ id: `l${Date.now()}`, name: "", qty: "1", price: "", vat: "10" }]);
    toast.success(
      status === "Taslak"
        ? `${eDocKind} taslak olarak kaydedildi.`
        : `${eDocKind} GİB'e gönderildi.`,
    );
  };

  const handleAddExpense = () => {
    const amount = Number(expForm.amount);
    if (!expForm.title.trim()) {
      toast.error("Masraf açıklaması giriniz.");
      return;
    }
    if (!amount || amount <= 0) {
      toast.error("Geçerli bir tutar giriniz.");
      return;
    }
    if (!expForm.accountId) {
      toast.error("Ödeme hesabı seçiniz.");
      return;
    }
    const acc = finAccounts.find((a) => a.id === expForm.accountId);
    setExpenses((prev) => [
      {
        id: `g-${Date.now()}`,
        title: expForm.title.trim(),
        category: expForm.category,
        amount,
        account: acc?.name ?? "—",
        date: expForm.date || new Date().toISOString().slice(0, 10),
      },
      ...prev,
    ]);
    setFinAccounts((prev) =>
      prev.map((a) => (a.id === expForm.accountId ? { ...a, balance: a.balance - amount } : a)),
    );
    setExpOpen(false);
    setExpForm({
      title: "",
      category: EXPENSE_CATEGORIES[0] as string,
      amount: "",
      accountId: "",
      date: "",
    });
    toast.success("Gider kaydı eklendi.");
  };

  const kpis = useMemo(() => {
    const cash = finAccounts.reduce((s, a) => s + a.balance, 0);
    const receivable = accounts.filter((a) => a.balance > 0).reduce((s, a) => s + a.balance, 0);
    const payable = accounts
      .filter((a) => a.balance < 0)
      .reduce((s, a) => s + Math.abs(a.balance), 0);
    const ym = new Date().toISOString().slice(0, 7);
    const revenue = eInvoices
      .filter((d) => d.dir === "Giden" && String(d.date ?? "").startsWith(ym))
      .reduce((s, d) => s + (Number(d.total) || 0), 0);
    return { cash, receivable, payable, revenue };
  }, [accounts, finAccounts, eInvoices]);

  const soon = (label: string) => toast.info(`${label} yakında eklenecek.`);

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";

  const filteredProducts = useMemo(() => {
    const q = stokQuery.trim().toLocaleLowerCase("tr");
    if (!q) return products;
    return products.filter((p) =>
      [p.name, p.barcode, categoryName(p.categoryId), p.unit]
        .join(" ")
        .toLocaleLowerCase("tr")
        .includes(q),
    );
  }, [products, stokQuery, categories]);

  const filteredAccounts = useMemo(() => {
    const q = cariQuery.trim().toLocaleLowerCase("tr");
    const byType = cariType === "all" ? accounts : accounts.filter((a) => a.type === cariType);
    if (!q) return byType;
    return byType.filter((a) =>
      [a.name, a.type, a.phone].join(" ").toLocaleLowerCase("tr").includes(q),
    );
  }, [accounts, cariQuery, cariType]);

  const filteredMovements = useMemo(() => {
    const q = kasaQuery.trim().toLocaleLowerCase("tr");
    if (!q) return movements;
    return movements.filter((m) =>
      [m.desc, m.account, m.date].join(" ").toLocaleLowerCase("tr").includes(q),
    );
  }, [kasaQuery, movements]);

  /* ---------- Hızlı stok girişi (arama sonucu boşsa) ---------- */
  const [quickForm, setQuickForm] = useState({
    name: "",
    barcode: "",
    unit: "adet",
    stock: "",
    buy: "",
    sell: "",
    vat: "10",
    categoryId: "",
  });

  const handleQuickAdd = () => {
    const num = (v: string) => Number(String(v).replace(",", "."));
    const name = quickForm.name.trim() || stokQuery.trim();
    if (!name) {
      toast.error("Ürün adı zorunludur.");
      return;
    }
    const sell = num(quickForm.sell);
    if (!Number.isFinite(sell) || sell <= 0) {
      toast.error("Geçerli bir satış fiyatı girin.");
      return;
    }
    const digits = name.replace(/\D/g, "");
    const isBarcodeSearch = digits.length >= 8 && digits === name;
    setProducts((prev) => [
      {
        id: `p-${Date.now()}`,
        name: isBarcodeSearch ? `Yeni Ürün ${digits.slice(-4)}` : name,
        barcode: (quickForm.barcode.trim() || (isBarcodeSearch ? digits : "")).trim(),
        categoryId: quickForm.categoryId || (categories[0]?.id ?? ""),
        stock: num(quickForm.stock) || 0,
        unit: quickForm.unit,
        buy: num(quickForm.buy) || 0,
        sell,
        vat: num(quickForm.vat) || 0,
        images: [],
      },
      ...prev,
    ]);
    setQuickForm({
      name: "",
      barcode: "",
      unit: "adet",
      stock: "",
      buy: "",
      sell: "",
      vat: "10",
      categoryId: "",
    });
    toast.success("Ürün stoğa eklendi. POS ve diğer modüllere anında yansır.");
  };

  const printProductLabels = (list: Product[]) =>
    printShelfLabels(
      list.map((p) => ({
        name: p.name,
        barcode: p.barcode,
        price: TRY.format(p.sell),
        unit: p.unit,
        extra: categoryName(p.categoryId),
      })),
      company?.name ?? "Bilirim ERP",
    );

  /* ---------- Excel'den içe aktarım (Supabase'e yazar) ---------- */
  const runImport = async () => {
    if (!importFile) return;
    setImportBusy(true);
    try {
      const rows = await readSheetRows(importFile);
      if (!rows.length) {
        toast.error("Dosyada okunabilir satır bulunamadı.");
        return;
      }
      if (importOpen === "cari") {
        const parsed = rows
          .map((r) => ({
            name: pickCell(r, ["ünvan", "unvan", "ad", "müşteri", "cari", "name"]),
            type: (pickCell(r, ["tip", "type"]).toLocaleLowerCase("tr").includes("tedarik")
              ? "Tedarikçi"
              : "Müşteri") as "Müşteri" | "Tedarikçi",
            phone: pickCell(r, ["telefon", "gsm", "phone"]),
            balance: toNumber(pickCell(r, ["bakiye", "balance"])),
            taxNo: pickCell(r, ["vergi no", "vkn", "tckn"]),
            taxOffice: pickCell(r, ["vergi dairesi"]),
            email: pickCell(r, ["e-posta", "eposta", "mail"]),
            address: pickCell(r, ["adres", "address"]),
          }))
          .filter((c) => c.name);
        if (!parsed.length) {
          toast.error("Dosyada geçerli cari satırı bulunamadı.");
          return;
        }
        for (const [i, c] of parsed.entries()) {
          await cariCollection.upsert({ id: `imp-${Date.now().toString(36)}-${i}`, ...c });
        }
        toast.success(`${parsed.length} cari hesap aktarıldı.`);
      } else {
        const parsed = rows.map((r) => ({
          name: pickCell(r, ["ürün", "urun", "ad", "name"]),
          barcode: pickCell(r, ["barkod", "stok kodu", "sku", "barcode"]),
          category: pickCell(r, ["kategori", "category"]),
          unit: pickCell(r, ["birim", "unit"]),
          cost: toNumber(pickCell(r, ["alış", "alis", "maliyet", "cost"])),
          price: toNumber(pickCell(r, ["satış", "satis", "fiyat", "price"])),
          vat: toNumber(pickCell(r, ["kdv", "vat"])) || 20,
          stock: toNumber(pickCell(r, ["stok", "miktar", "stock"])),
        }));
        const count = await bulkImportProducts(parsed);
        if (!count) {
          toast.error("Dosyada geçerli ürün satırı bulunamadı.");
          return;
        }
        toast.success(`${count} ürün Supabase'e aktarıldı.`);
      }
      setImportOpen(null);
      setImportFile(null);
    } catch (e) {
      console.error(e);
      toast.error("Dosya aktarılamadı. Lütfen şablona uygun bir dosya seçin.");
    } finally {
      setImportBusy(false);
    }
  };

  /* ---------- Fatura düzenleme (e-Belge) ---------- */
  const [eEdit, setEEdit] = useState<EInvoice | null>(null);
  const [eEditLines, setEEditLines] = useState<
    { id: string; name: string; qty: string; unit: string; price: string; vat: string }[]
  >([]);
  const [eEditForm, setEEditForm] = useState({
    no: "",
    account: "",
    date: "",
    base: "",
    vat: "",
    status: "Taslak" as EStatus,
    kind: "e-Fatura" as EDocKind,
    dir: "Giden" as EInvoice["dir"],
    currency: "TRY",
  });

  const openEditEDoc = (inv: AccEDoc) => {
    setEEdit(inv as EInvoice);
    setEEditLines(
      (inv.lines ?? []).map((l) => ({
        id: l.id,
        name: l.name,
        qty: String(l.qty),
        unit: l.unit || "adet",
        price: String(l.price),
        vat: String(l.vat),
      })),
    );
    setEEditForm({
      no: inv.no,
      account: inv.account,
      date: inv.date,
      base: String(inv.base),
      vat: String(inv.vat),
      status: inv.status as EStatus,
      kind: inv.kind as EDocKind,
      dir: inv.dir as EInvoice["dir"],
      currency: normalizeCurrency(inv.currency),
    });
  };

  const handleSaveEDoc = () => {
    if (!eEdit) return;
    const num = (v: string) => Number(String(v).replace(",", ".")) || 0;
    const hasLines = eEditLines.length > 0;
    const lineBase = eEditLines.reduce((s, l) => s + num(l.qty) * num(l.price), 0);
    const lineVat = eEditLines.reduce(
      (s, l) => s + (num(l.qty) * num(l.price) * num(l.vat)) / 100,
      0,
    );
    const base = hasLines ? Math.round(lineBase * 100) / 100 : num(eEditForm.base);
    const vat = hasLines ? Math.round(lineVat * 100) / 100 : num(eEditForm.vat);
    if (!eEditForm.account.trim()) {
      toast.error("Cari adı zorunludur.");
      return;
    }
    if (base <= 0) {
      toast.error(
        hasLines ? "En az bir geçerli kalem giriniz." : "Matrah sıfırdan büyük olmalıdır.",
      );
      return;
    }
    setEInvoices((prev) =>
      prev.map((i) =>
        i.id === eEdit.id
          ? {
              ...i,
              no: eEditForm.no.trim() || i.no,
              account: eEditForm.account.trim(),
              date: eEditForm.date || i.date,
              base,
              vat,
              total: base + vat,
              status: eEditForm.status,
              kind: eEditForm.kind,
              dir: eEditForm.dir,
              currency: eEditForm.currency,
              lines: eEditLines.map((l) => ({
                id: l.id,
                name: l.name,
                qty: num(l.qty),
                unit: l.unit || "adet",
                price: num(l.price),
                vat: num(l.vat),
              })),
            }
          : i,
      ),
    );
    setEEdit(null);
    toast.success("Fatura güncellendi.");
  };

  const handleDeleteEDoc = () => {
    if (!eEdit) return;
    setEInvoices((prev) => prev.filter((i) => i.id !== eEdit.id));
    setEEdit(null);
    toast.success("Fatura silindi.");
  };

  /* ---------- Hızlı GİB gönderimi (satır içi + toplu) ---------- */
  const [selectedEIds, setSelectedEIds] = useState<string[]>([]);
  const [gibSendIds, setGibSendIds] = useState<string[] | null>(null);

  const toggleESelect = (id: string) =>
    setSelectedEIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const confirmGibSend = () => {
    const ids = gibSendIds ?? [];
    if (ids.length === 0) return;
    setEInvoices((prev) =>
      prev.map((i) =>
        ids.includes(i.id) && i.status === "Taslak"
          ? { ...i, status: "GİB Bekliyor" as EStatus }
          : i,
      ),
    );
    setSelectedEIds((prev) => prev.filter((id) => !ids.includes(id)));
    setGibSendIds(null);
    if (eEdit && ids.includes(eEdit.id)) {
      setEEditForm((f) => ({ ...f, status: "GİB Bekliyor" }));
      setEEdit((prev) => (prev ? { ...prev, status: "GİB Bekliyor" } : prev));
    }
    toast.success(
      ids.length > 1
        ? `${ids.length} fatura GİB kuyruğuna alındı.`
        : "Fatura GİB kuyruğuna alındı.",
    );
  };

  /* ---------- Teklifler ---------- */
  const [quotes, setQuotes] = useDbState(quotesCollection);
  const [quoteQuery, setQuoteQuery] = useState("");
  const [quoteEditOpen, setQuoteEditOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [qForm, setQForm] = useState({
    no: "",
    account: "",
    cariId: "",
    date: "",
    validUntil: "",
    terms: DEFAULT_QUOTE_TERMS,
    status: "Taslak" as Quote["status"],
    currency: "TRY",
  });
  const [qLines, setQLines] = useState<
    {
      id: string;
      name: string;
      qty: string;
      unit: string;
      price: string;
      vat: string;
      discount: string;
    }[]
  >([]);

  const qTotals = useMemo(
    () =>
      calcQuoteTotals(
        qLines.map((l) => ({
          id: l.id,
          name: l.name,
          qty: Number(String(l.qty).replace(",", ".")) || 0,
          unit: l.unit,
          price: Number(String(l.price).replace(",", ".")) || 0,
          vat: Number(l.vat) || 0,
          discount: Number(l.discount) || 0,
        })),
      ),
    [qLines],
  );

  const filteredQuotes = useMemo(() => {
    const q = quoteQuery.trim().toLocaleLowerCase("tr");
    if (!q) return quotes;
    return quotes.filter((t) =>
      [t.no, t.account, t.date, t.status].join(" ").toLocaleLowerCase("tr").includes(q),
    );
  }, [quotes, quoteQuery]);

  const openNewQuote = () => {
    setEditingQuote(null);
    setQForm({
      no: `TKF${new Date().getFullYear()}${String(quotes.length + 1).padStart(4, "0")}`,
      account: "",
      cariId: "",
      date: new Date().toISOString().slice(0, 10),
      validUntil: "",
      terms: DEFAULT_QUOTE_TERMS,
      status: "Taslak",
      currency: "TRY",
    });
    setQLines([
      {
        id: `ql-${Date.now()}`,
        name: "",
        qty: "1",
        unit: "adet",
        price: "",
        vat: "20",
        discount: "0",
      },
    ]);
    setQuoteEditOpen(true);
  };

  const openEditQuote = (q: Quote) => {
    setEditingQuote(q);
    setQForm({
      no: q.no,
      account: q.account,
      cariId: q.cariId ?? "",
      date: q.date,
      validUntil: q.validUntil,
      terms: q.terms || DEFAULT_QUOTE_TERMS,
      status: q.status,
      currency: normalizeCurrency(q.currency),
    });
    setQLines(
      q.lines.map((l) => ({
        id: l.id,
        name: l.name,
        qty: String(l.qty),
        unit: l.unit,
        price: String(l.price),
        vat: String(l.vat),
        discount: String(l.discount),
      })),
    );
    setQuoteEditOpen(true);
  };

  const buildQuote = (): Quote | null => {
    if (!qForm.account.trim()) {
      toast.error("Teklif için cari seçiniz.");
      return null;
    }
    const lines: QuoteLine[] = qLines
      .filter((l) => l.name.trim())
      .map((l) => ({
        id: l.id,
        name: l.name.trim(),
        qty: Number(String(l.qty).replace(",", ".")) || 0,
        unit: l.unit || "adet",
        price: Number(String(l.price).replace(",", ".")) || 0,
        vat: Number(l.vat) || 0,
        discount: Number(l.discount) || 0,
      }));
    if (lines.length === 0) {
      toast.error("En az bir teklif kalemi giriniz.");
      return null;
    }
    const t = calcQuoteTotals(lines);
    return {
      id: editingQuote?.id ?? `q-${Date.now()}`,
      no: qForm.no.trim() || `TKF${Date.now()}`,
      cariId: qForm.cariId || null,
      account: qForm.account.trim(),
      date: qForm.date || new Date().toISOString().slice(0, 10),
      validUntil: qForm.validUntil,
      lines,
      subtotal: t.subtotal,
      vatTotal: t.vatTotal,
      total: t.total,
      terms: qForm.terms,
      status: qForm.status,
      currency: qForm.currency,
    };
  };

  const handleSaveQuote = () => {
    const quote = buildQuote();
    if (!quote) return;
    setQuotes((prev) =>
      editingQuote ? prev.map((q) => (q.id === quote.id ? quote : q)) : [quote, ...prev],
    );
    setQuoteEditOpen(false);
    toast.success(editingQuote ? "Teklif güncellendi." : "Teklif oluşturuldu.");
  };

  const handleDeleteQuote = (q: Quote) => {
    setQuotes((prev) => prev.filter((x) => x.id !== q.id));
    toast.success("Teklif silindi.");
  };

  /** Teklifi giden e-Fatura belgesine dönüştürür. */
  const handleConvertQuote = (q: Quote) => {
    if (q.status === "Satışa Çevrildi" || q.status === "Faturalandı") {
      toast.error("Bu teklif zaten faturalandırılmış.");
      return;
    }
    const cari = accounts.find((a) => (q.cariId ? a.id === q.cariId : a.name === q.account));
    const kind: EDocKind = "e-Fatura";
    const prefix = "EFT2026";
    setEInvoices((prev) => [
      {
        id: `ei-${Date.now()}`,
        no: `${prefix}${String(prev.length + 1).padStart(6, "0")}`,
        kind,
        dir: "Giden",
        account: cari?.name ?? q.account,
        date: new Date().toISOString().slice(0, 10),
        base: q.subtotal,
        vat: q.vatTotal,
        total: q.total,
        status: "Taslak",
        currency: normalizeCurrency(q.currency),
        lines: q.lines.map((l) => ({
          id: l.id,
          name: l.name,
          qty: l.qty,
          unit: l.unit,
          price: l.price * (1 - l.discount / 100),
          vat: l.vat,
        })),
      },
      ...prev,
    ]);
    setQuotes((prev) =>
      prev.map((x) => (x.id === q.id ? { ...x, status: "Faturalandı" as const } : x)),
    );
    toast.success(`Teklif faturalandırıldı. ${kind} taslağı e-Belge İşlemleri sekmesinde.`);
  };

  const handlePrintQuote = async (q: Quote) => {
    const logoUrl = await getCompanyLogoUrl();
    const paths: string[] = [];
    const nameByPath = new Map<string, string>();
    for (const line of q.lines) {
      const p = products.find((x) => x.name === line.name);
      const first = p?.images?.[0];
      if (first && !nameByPath.has(first)) {
        nameByPath.set(first, line.name);
        paths.push(first);
      }
    }
    const images: Record<string, string> = {};
    if (paths.length) {
      try {
        const signed = await signedProductImageUrls(paths);
        for (const s of signed) {
          const name = nameByPath.get(s.path);
          if (name && s.url) images[name] = s.url;
        }
      } catch {
        /* görsel yoksa metinle devam */
      }
    }
    printQuoteDoc(
      q,
      {
        name: company?.name ?? "Bilirim ERP",
        address: company?.address ?? "",
        phone: company?.phone ?? "",
        email: company?.email ?? "",
        taxNo: company?.tax_no ?? "",
        taxOffice: company?.tax_office ?? "",
        logoUrl,
      },
      (n) => fmtMoney(n, q.currency),
      images,
    );
  };

  const handleAddCategory = () => {
    if (!catForm.name.trim()) {
      toast.error("Kategori adı boş olamaz.");
      return;
    }
    if (addCategory(catForm.name, catForm.color, catForm.icon)) {
      toast.success(`"${catForm.name.trim()}" kategorisi eklendi.`);
      setCatForm({ name: "", color: "apple", icon: "package" });
      setAddCatOpen(false);
    } else {
      toast.error("Bu kategori zaten mevcut.");
    }
  };

  const openNewProduct = () => {
    setEditingProduct(null);
    setProductForm({ ...emptyProductForm, categoryId: categories[0]?.id ?? "" });
    setProductOpen(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name,
      barcode: p.barcode,
      unit: p.unit,
      buy: String(p.buy),
      sell: String(p.sell),
      vat: String(p.vat),
      categoryId: p.categoryId,
      stock: String(p.stock ?? 0),
    });
    setProductOpen(true);
  };

  const handleSaveProduct = () => {
    const num = (v: string) => Number(v.replace(",", "."));
    const buy = num(productForm.buy);
    const sell = num(productForm.sell);
    const vat = num(productForm.vat);
    if (!productForm.name.trim()) {
      toast.error("Ürün adı zorunludur.");
      return;
    }
    if (!Number.isFinite(buy) || !Number.isFinite(sell) || sell <= 0) {
      toast.error("Geçerli alış ve satış fiyatı girin.");
      return;
    }
    if (editingProduct) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id
            ? {
                ...p,
                name: productForm.name.trim(),
                barcode: productForm.barcode.trim(),
                unit: productForm.unit,
                categoryId: productForm.categoryId,
                stock: Number.isFinite(num(productForm.stock)) ? num(productForm.stock) : p.stock,
                buy,
                sell,
                vat: Number.isFinite(vat) ? vat : 0,
              }
            : p,
        ),
      );
      toast.success("Ürün güncellendi.");
    } else {
      setProducts((prev) => [
        {
          id: `p-${Date.now()}`,
          name: productForm.name.trim(),
          barcode: productForm.barcode.trim(),
          categoryId: productForm.categoryId,
          stock: Number.isFinite(num(productForm.stock)) ? num(productForm.stock) : 0,
          unit: productForm.unit,
          buy,
          sell,
          vat: Number.isFinite(vat) ? vat : 0,
          images: [],
        },
        ...prev,
      ]);
      toast.success("Yeni ürün eklendi.");
    }
    setProductOpen(false);
  };

  const handleCreateAccount = () => {
    const name = cariForm.name.trim();
    if (!name) {
      toast.error("Firma / şahıs adı zorunludur.");
      return;
    }
    const opening = Number(cariForm.opening.replace(",", ".")) || 0;
    setAccounts((prev) => [
      {
        id: `c-${Date.now()}`,
        name,
        type: cariForm.type,
        phone: cariForm.phone.trim() || "—",
        balance: cariForm.type === "Müşteri" ? opening : -Math.abs(opening),
        taxOffice: cariForm.taxOffice.trim(),
        taxNo: cariForm.taxNo.trim(),
        email: cariForm.email.trim(),
        address: cariForm.address.trim(),
        currency: cariForm.currency,
      },
      ...prev,
    ]);
    setCariOpen(false);
    setCariForm({
      type: "Müşteri",
      name: "",
      taxOffice: "",
      taxNo: "",
      phone: "",
      email: "",
      address: "",
      opening: "",
      currency: "TRY",
    });
    toast.success("Yeni cari kaydedildi.");
  };

  const openCariEdit = (a: Account) => {
    setEditCari(a);
    setEditCariForm({
      name: a.name,
      type: a.type,
      taxNo: a.taxNo ?? "",
      taxOffice: a.taxOffice ?? "",
      phone: a.phone === "—" ? "" : a.phone,
      email: a.email ?? "",
      address: a.address ?? "",
      currency: a.currency ?? "TRY",
    });
  };

  const handleUpdateAccount = () => {
    if (!editCari) return;
    const name = editCariForm.name.trim();
    if (!name) {
      toast.error("Firma / şahıs adı zorunludur.");
      return;
    }
    const updated: Account = {
      ...editCari,
      name,
      type: editCariForm.type,
      taxNo: editCariForm.taxNo.trim(),
      taxOffice: editCariForm.taxOffice.trim(),
      phone: editCariForm.phone.trim() || "—",
      email: editCariForm.email.trim(),
      address: editCariForm.address.trim(),
      currency: editCariForm.currency,
    };
    setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setStatementOf((s) => (s && s.id === updated.id ? updated : s));
    setEditCari(null);
    toast.success("Cari bilgileri güncellendi.");
  };

  const openFinEdit = (a: FinAccount) => {
    setEditFin(a);
    setEditFinForm({ name: a.name, type: a.type, detail: a.detail, note: "" });
  };

  const handleUpdateFinAccount = () => {
    if (!editFin) return;
    const name = editFinForm.name.trim();
    if (!name) {
      toast.error("Hesap adı zorunludur.");
      return;
    }
    const detail = [editFinForm.detail.trim(), editFinForm.note.trim()].filter(Boolean).join(" · ");
    setFinAccounts((prev) =>
      prev.map((a) => (a.id === editFin.id ? { ...a, name, type: editFinForm.type, detail } : a)),
    );
    setEditFin(null);
    toast.success("Hesap bilgileri güncellendi.");
  };

  const printInvoice = (inv: Invoice) => {
    const t = itemTotals(inv.items);
    const rows = inv.items
      .map(
        (i) =>
          `<tr><td>${i.name}</td><td class="num">${i.qty} ${i.unit}</td><td class="num">${TRY.format(
            i.price,
          )}</td><td class="num">%${i.discount}</td><td class="num">%${i.vat}</td><td class="num">${TRY.format(
            r2(i.qty * i.price * (1 - i.discount / 100) * (1 + i.vat / 100)),
          )}</td></tr>`,
      )
      .join("");
    printHtml(
      inv.no,
      `<h1>${inv.type} Faturası — ${inv.no}</h1>
       <p class="muted">${inv.account} · ${inv.date} · ${inv.status}</p>
       <table><thead><tr><th>Kalem</th><th class="num">Miktar</th><th class="num">Birim Fiyat</th><th class="num">İskonto</th><th class="num">KDV</th><th class="num">Tutar</th></tr></thead>
       <tbody>${rows}</tbody>
       <tfoot>
         <tr><td colspan="5">Ara Toplam</td><td class="num">${TRY.format(t.net)}</td></tr>
         <tr><td colspan="5">İskonto</td><td class="num">${TRY.format(t.discount)}</td></tr>
         <tr><td colspan="5">KDV</td><td class="num">${TRY.format(t.vat)}</td></tr>
         <tr><td colspan="5">Genel Toplam</td><td class="num">${TRY.format(t.gross)}</td></tr>
       </tfoot></table>
       <p class="foot">Bilirim ERP — Ön Muhasebe</p>`,
    );
  };

  const handleCreateInvoice = () => {
    const total = Number(invoiceForm.total.replace(",", "."));
    if (!invoiceForm.account.trim() || !Number.isFinite(total) || total <= 0) {
      toast.error("Cari ünvanı ve geçerli bir tutar girin.");
      return;
    }
    const prefix = invoiceForm.type === "Satış" ? "SAT" : "ALS";
    const seq = String(413 + invoices.length).padStart(6, "0");
    setInvoices((prev) => [
      {
        id: `f-${Date.now()}`,
        no: `${prefix}-2026-${seq}`,
        type: invoiceForm.type,
        account: invoiceForm.account.trim(),
        date: new Date().toLocaleDateString("tr-TR"),
        total,
        status: "Bekliyor",
        items: [
          {
            name: "Muhtelif ürün / hizmet",
            qty: 1,
            unit: "adet",
            price: total,
            vat: 0,
            discount: 0,
          },
        ],
      },
      ...prev,
    ]);
    setInvoiceOpen(false);
    setInvoiceForm({ type: "Satış", account: "", total: "" });
    toast.success("Fatura oluşturuldu.");
  };

  /** Cari hareketleri: e-belgeler (fatura), tahsilat/ödemeler ve oturum içi kayıtlar. */
  const allStatementRows: Statement[] = useMemo(() => {
    if (!statementOf) return [];
    const isCustomer = statementOf.type === "Müşteri";
    const docRows: Statement[] = eInvoices
      .filter((d) => d.account === statementOf.name)
      .map((d) => ({
        id: `doc-${d.id}`,
        date: new Date(d.date).toLocaleDateString("tr-TR"),
        desc: `${d.kind} ${d.no}`.trim(),
        debit: isCustomer ? d.total : 0,
        credit: isCustomer ? 0 : d.total,
      }));
    const payRows: Statement[] = cariPayments
      .filter((p) => p.cariId === statementOf.id)
      .map((p) => ({
        id: `pay-${p.id}`,
        date: new Date(p.date).toLocaleDateString("tr-TR"),
        desc: p.note || (p.direction === "in" ? "Tahsilat" : "Ödeme"),
        debit: p.direction === "in" ? 0 : p.amount,
        credit: p.direction === "in" ? p.amount : 0,
      }));
    const rows = [
      ...docRows,
      ...payRows,
      ...(statements[statementOf.id] ?? []),
      ...(extraEntries[statementOf.id] ?? []),
    ];
    return rows.sort((a, b) => (toIso(a.date) < toIso(b.date) ? -1 : 1));
  }, [statementOf, eInvoices, cariPayments, extraEntries]);

  const statementRows = allStatementRows.filter((r) => {
    const iso = toIso(r.date);
    if (range.from && iso && iso < range.from) return false;
    if (range.to && iso && iso > range.to) return false;
    return true;
  });

  const addMovement = (accountId: string, amount: number, desc: string) => {
    const acc = finAccounts.find((a) => a.id === accountId);
    if (!acc) return null;
    setFinAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, balance: a.balance + amount } : a)),
    );
    void addAccountTxn({ accountId, amount, description: desc, category: "Kasa" });
    setMovements((prev) => [
      {
        id: `m-${Date.now()}`,
        date: new Date().toLocaleString("tr-TR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        desc,
        account: acc.name,
        amount,
      },
      ...prev,
    ]);
    return acc;
  };

  /** Hesaplar arası virman. */
  const finTxnRows = useMemo(() => {
    if (!finMovementsOf) return [] as { id: string; date: string; desc: string; amount: number }[];
    return accountTxns
      .filter((t) => t.accountId === finMovementsOf.id)
      .map((t) => ({
        id: t.id,
        date: t.date ? new Date(t.date).toLocaleDateString("tr-TR") : "",
        desc: t.description,
        amount: t.amount,
      }));
  }, [accountTxns, finMovementsOf]);

  const handleTransfer = () => {
    const amount = Number(transferForm.amount.replace(",", "."));
    const from = finAccounts.find((a) => a.id === transferForm.from);
    const to = finAccounts.find((a) => a.id === transferForm.to);
    if (!from || !to) {
      toast.error("Gönderen ve alıcı hesabı seçin.");
      return;
    }
    if (from.id === to.id) {
      toast.error("Gönderen ve alıcı hesap aynı olamaz.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Geçerli bir tutar girin.");
      return;
    }
    const note = transferForm.desc.trim() || "Hesaplar arası transfer";
    addMovement(from.id, -amount, `${note} → ${to.name}`);
    addMovement(to.id, amount, `${note} ← ${from.name}`);
    setTransferForm({ from: "", to: "", amount: "", desc: "" });
    setTransferOpen(false);
    toast.success(`${TRY.format(amount)} ${from.name} → ${to.name} aktarıldı.`);
  };

  /** Kasa/banka bakiyesini manuel eşitler. */
  const handleFinBalanceAdjust = () => {
    if (!finMovementsOf) return;
    const target = Number(finBalanceValue.replace(",", "."));
    if (!Number.isFinite(target)) {
      toast.error("Geçerli bir bakiye girin.");
      return;
    }
    const diff = target - finMovementsOf.balance;
    setFinAccounts((prev) =>
      prev.map((a) => (a.id === finMovementsOf.id ? { ...a, balance: target } : a)),
    );
    if (diff !== 0)
      void addAccountTxn({
        accountId: finMovementsOf.id,
        amount: diff,
        description: "Bakiye düzeltme",
        category: "Düzeltme",
      });
    setFinMovementsOf({ ...finMovementsOf, balance: target });
    setFinBalanceOpen(false);
    toast.success("Bakiye güncellendi.");
  };

  /** Cari bakiyesini (devir) manuel günceller. */
  const handleCariBalanceAdjust = () => {
    if (!statementOf) return;
    const target = Number(cariBalanceValue.replace(",", "."));
    if (!Number.isFinite(target)) {
      toast.error("Geçerli bir bakiye girin.");
      return;
    }
    setAccounts((prev) =>
      prev.map((a) => (a.id === statementOf.id ? { ...a, balance: target } : a)),
    );
    setStatementOf({ ...statementOf, balance: target });
    setCariBalanceOpen(false);
    toast.success("Cari bakiyesi güncellendi.");
  };

  /** Filtrelenmiş cari ekstreyi Excel (CSV) olarak indirir. */
  const exportStatementExcel = () => {
    if (!statementOf) return;
    downloadCsv(`${statementOf.name}-ekstre.csv`, [
      ["Tarih", "Açıklama", "Borç", "Alacak"],
      ...statementRows.map((r) => [r.date, r.desc, String(r.debit || 0), String(r.credit || 0)]),
      ["", "Bakiye", "", String(statementOf.balance)],
    ]);
    toast.success("Ekstre indirildi.");
  };

  const handleCreateFinAccount = () => {
    const bal = Number(finForm.balance.replace(",", ".")) || 0;
    if (!finForm.name.trim()) {
      toast.error("Hesap adı zorunludur.");
      return;
    }
    setFinAccounts((prev) => [
      ...prev,
      {
        id: `k-${Date.now()}`,
        name: finForm.name.trim(),
        type: finForm.type,
        detail: finForm.detail.trim(),
        balance: bal,
      },
    ]);
    setFinForm({ name: "", type: "Nakit Kasa", detail: "", balance: "" });
    setFinOpen(false);
    toast.success("Hesap tanımlandı.");
  };

  const handleCashTx = () => {
    const amount = Number(cashForm.amount.replace(",", "."));
    if (!cashForm.accountId) {
      toast.error("İşlem yapılacak hesabı seçin.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Geçerli bir tutar girin.");
      return;
    }
    const isIn = cashTx === "in";
    const cari = accounts.find((a) => a.id === cashForm.cariId);
    const desc =
      cashForm.desc.trim() || `${cari ? `${cari.name} ` : ""}${isIn ? "tahsilat" : "ödeme"}`;
    addMovement(cashForm.accountId, isIn ? amount : -amount, desc);
    if (cari) {
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === cari.id ? { ...a, balance: isIn ? a.balance - amount : a.balance + amount } : a,
        ),
      );
      void addCariPayment({
        cariId: cari.id,
        amount,
        direction: isIn ? "in" : "out",
        note: desc,
      });
    }
    setCashTx(null);
    setCashForm({ accountId: "", cariId: "", amount: "", desc: "" });
    toast.success(`${TRY.format(amount)} ${isIn ? "tahsil edildi" : "ödendi"}.`);
  };

  const exportStatementPdf = () => {
    if (!statementOf) return;
    const rows = statementRows
      .map(
        (r) =>
          `<tr><td>${r.date}</td><td>${r.desc}</td><td class="num">${
            r.debit ? TRY.format(r.debit) : "—"
          }</td><td class="num">${r.credit ? TRY.format(r.credit) : "—"}</td></tr>`,
      )
      .join("");
    const ok = printHtml(
      `${statementOf.name} Ekstre`,
      `<h1>Bilirim ERP — Cari Ekstre</h1>
       <div class="muted">${statementOf.name} · ${statementOf.type} · ${statementOf.phone}</div>
       <div class="muted">Tarih aralığı: ${range.from || "—"} / ${range.to || "—"}</div>
       <table><thead><tr><th>Tarih</th><th>Açıklama</th><th class="num">Borç</th><th class="num">Alacak</th></tr></thead>
       <tbody>${rows || '<tr><td colspan="4">Hareket yok.</td></tr>'}</tbody>
       <tfoot><tr><td colspan="3">Kalan Bakiye</td><td class="num">${TRY.format(
         Math.abs(statementOf.balance),
       )} ${statementOf.balance >= 0 ? "alacak" : "borç"}</td></tr></tfoot></table>
       <p class="foot">Bilirim ERP tarafından oluşturulmuştur.</p>`,
    );
    if (!ok) toast.error("Yazdırma penceresi engellendi.");
  };

  const emailStatement = () => {
    if (!statementOf) return;
    const body = statementRows
      .map((r) => `${r.date} - ${r.desc} - Borç: ${r.debit} - Alacak: ${r.credit}`)
      .join("\n");
    window.location.href = `mailto:?subject=${encodeURIComponent(
      `${statementOf.name} Cari Ekstre`,
    )}&body=${encodeURIComponent(body || "Hareket yok.")}`;
    toast.success("E-posta taslağı hazırlandı.");
  };

  const quoteTotals = quoteLines.reduce(
    (acc, l) => {
      const qty = Number(l.qty.replace(",", ".")) || 0;
      const price = Number(l.price.replace(",", ".")) || 0;
      const disc = Number(l.discount.replace(",", ".")) || 0;
      const vat = Number(l.vat.replace(",", ".")) || 0;
      const net = qty * price * (1 - disc / 100);
      acc.net += net;
      acc.vat += (net * vat) / 100;
      return acc;
    },
    { net: 0, vat: 0 },
  );

  const createQuotePdf = () => {
    if (!statementOf) return;
    if (quoteLines.length === 0) {
      toast.error("En az bir ürün ekleyin.");
      return;
    }
    const rows = quoteLines
      .map((l) => {
        const p = products.find((x) => x.id === l.productId);
        const qty = Number(l.qty.replace(",", ".")) || 0;
        const price = Number(l.price.replace(",", ".")) || 0;
        const disc = Number(l.discount.replace(",", ".")) || 0;
        const vat = Number(l.vat.replace(",", ".")) || 0;
        const net = qty * price * (1 - disc / 100);
        return `<tr><td>${p?.name ?? "Ürün"}</td><td class="num">${qty}</td><td class="num">${TRY.format(
          price,
        )}</td><td class="num">%${disc}</td><td class="num">%${vat}</td><td class="num">${TRY.format(
          net * (1 + vat / 100),
        )}</td></tr>`;
      })
      .join("");
    const ok = printHtml(
      "Teklif Fişi",
      `<h1>Bilirim ERP — Fiyat Teklifi</h1>
       <div class="muted">Sayın ${statementOf.name} · ${new Date().toLocaleDateString("tr-TR")}</div>
       <div class="muted">Geçerlilik tarihi: ${quoteValid || "—"}</div>
       <table><thead><tr><th>Ürün</th><th class="num">Miktar</th><th class="num">Birim Fiyat</th><th class="num">İskonto</th><th class="num">KDV</th><th class="num">Tutar</th></tr></thead>
       <tbody>${rows}</tbody>
       <tfoot>
         <tr><td colspan="5">Ara Toplam</td><td class="num">${TRY.format(quoteTotals.net)}</td></tr>
         <tr><td colspan="5">KDV</td><td class="num">${TRY.format(quoteTotals.vat)}</td></tr>
         <tr><td colspan="5">Genel Toplam</td><td class="num">${TRY.format(
           quoteTotals.net + quoteTotals.vat,
         )}</td></tr>
       </tfoot></table>
       <p class="foot">Bu teklif belirtilen geçerlilik tarihine kadar geçerlidir.</p>`,
    );
    if (!ok) toast.error("Yazdırma penceresi engellendi.");
    else toast.success("Teklif fişi oluşturuldu.");
  };

  const handlePayment = () => {
    if (!statementOf) return;
    const amount = Number(payment.replace(",", "."));
    if (!payAccountId) {
      toast.error("İşlem yapılacak hesabı seçin.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Geçerli bir tutar girin.");
      return;
    }
    const isCustomer = statementOf.type === "Müşteri";
    const desc = `${statementOf.name} ${isCustomer ? "tahsilat" : "ödeme"}`;
    const entry: Statement = {
      id: `x-${Date.now()}`,
      date: new Date().toLocaleDateString("tr-TR"),
      desc: isCustomer ? "Tahsilat" : "Tedarikçiye ödeme",
      debit: isCustomer ? 0 : amount,
      credit: isCustomer ? amount : 0,
    };
    addMovement(payAccountId, isCustomer ? amount : -amount, desc);
    void addCariPayment({
      cariId: statementOf.id,
      amount,
      direction: isCustomer ? "in" : "out",
      note: entry.desc,
    });
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === statementOf.id
          ? { ...a, balance: isCustomer ? a.balance - amount : a.balance + amount }
          : a,
      ),
    );
    setStatementOf((prev) =>
      prev
        ? { ...prev, balance: isCustomer ? prev.balance - amount : prev.balance + amount }
        : prev,
    );
    setPayment("");
    toast.success(`${TRY.format(amount)} işlendi.`);
  };

  return (
    <MuhasebeShell
      title={MUHASEBE_NAV.find((n) => n.value === tab)?.label ?? "Ön Muhasebe Modülü"}
      description="Stok, Cari, Fatura, Kasa"
      active={tab}
      onSelect={setTab}
      actions={
        <Link to="/gun-sonu">
          <Button variant="outline" size="sm" className="h-11 gap-2">
            <FileSignature className="h-4 w-4" />
            <span className="hidden sm:inline">Gün Sonu &amp; Z-Raporu</span>
          </Button>
        </Link>
      }
    >
      <div className="mx-auto w-full max-w-6xl">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Kasa / Banka Bakiyesi"
            value={TRY.format(kpis.cash)}
            icon={Wallet}
            tone="bg-pos-apple text-pos-apple-foreground"
            onClick={() => setTab("kasa")}
          />
          <KpiCard
            label="Müşteri Alacakları"
            value={TRY.format(kpis.receivable)}
            icon={Users}
            tone="bg-pos-cheese text-pos-cheese-foreground"
            onClick={() => setTab("cari")}
          />
          <KpiCard
            label="Tedarikçi Borçları"
            value={TRY.format(kpis.payable)}
            icon={Truck}
            tone="bg-pos-tomato text-pos-tomato-foreground"
            onClick={() => setTab("cari")}
          />
          <KpiCard
            label="Aylık Toplam Ciro"
            value={TRY.format(kpis.revenue)}
            icon={TrendingUp}
            tone="bg-pos-cashew text-pos-cashew-foreground"
            onClick={() => setTab("ebelge")}
          />
        </section>

        <Tabs value={tab} onValueChange={setTab} className="mt-8">
          <TabsList className="w-full justify-start overflow-x-auto lg:hidden">
            {MUHASEBE_NAV.map((n) => (
              <TabsTrigger key={n.value} value={n.value} className="shrink-0">
                {n.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="ozet" className="mt-4 space-y-4">
            <Panel title="Özet Panel" subtitle="Finansal durum özeti">
              <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">Net Pozisyon</p>
                  <p className="mt-1 text-xl font-bold tabular-nums">
                    {TRY.format(kpis.cash + kpis.receivable - kpis.payable)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">Aylık Ciro</p>
                  <p className="mt-1 text-xl font-bold tabular-nums">{TRY.format(kpis.revenue)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-border px-5 py-4">
                {MUHASEBE_NAV.filter((n) => n.value !== "ozet").map((n) => (
                  <Button
                    key={n.value}
                    variant="outline"
                    className="h-11"
                    onClick={() => setTab(n.value)}
                  >
                    {n.label}
                  </Button>
                ))}
              </div>
            </Panel>
          </TabsContent>

          <TabsContent value="stok" className="mt-4">
            <Panel
              title="Stok & Ürünler"
              subtitle={`${filteredProducts.length} / ${products.length} ürün`}
              action={
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="gap-2" onClick={openNewProduct}>
                    <Plus className="h-4 w-4" /> Yeni Ürün Ekle
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => printProductLabels(filteredProducts)}
                  >
                    <Tag className="h-4 w-4" /> Etiketleri Yazdır
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2 bg-pos-sky text-pos-sky-foreground hover:bg-pos-sky/90"
                    onClick={() => {
                      setImportFile(null);
                      setImportOpen("stok");
                    }}
                  >
                    <FileSpreadsheet className="h-4 w-4" /> Excel'den Aktar
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-2"
                    onClick={() => {
                      setCatForm({ name: "", color: "apple", icon: "package" });
                      setAddCatOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" /> Yeni Kategori Ekle
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => setManageOpen(true)}
                  >
                    <Settings2 className="h-4 w-4" /> Kategorileri Yönet
                  </Button>
                </div>
              }
            >
              <SearchBar value={stokQuery} onChange={setStokQuery} />
              <div className="flex flex-wrap gap-2 border-b border-border px-5 py-3">
                {categories.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    Henüz kategori yok. "Yeni Kategori Ekle" ile başlayın.
                  </span>
                ) : (
                  categories.map((c) => {
                    const Icon = CATEGORY_ICON_MAP[c.icon ?? "package"] ?? Package;
                    return (
                      <span
                        key={c.id}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${categoryColorClass(c.color)}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {c.name}
                      </span>
                    );
                  })
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ürün Adı</TableHead>
                    <TableHead>Barkod</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Stok</TableHead>
                    <TableHead className="text-right">Alış</TableHead>
                    <TableHead className="text-right">Satış</TableHead>
                    <TableHead className="text-right">KDV</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        {stokQuery.trim()
                          ? `"${stokQuery.trim()}" için stokta kayıt bulunamadı.`
                          : "Sonuç bulunamadı."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((p) => (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer"
                        onClick={() => openEditProduct(p)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                              <Package className="h-4 w-4" />
                            </span>
                            {p.name}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                          {p.barcode || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{categoryName(p.categoryId)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={p.stock < 15 ? "font-semibold text-destructive" : ""}>
                            {p.stock.toLocaleString("tr-TR")} {p.unit}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {TRY.format(p.buy)}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {TRY.format(p.sell)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">%{p.vat}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              printProductLabels([p]);
                            }}
                          >
                            <Tag className="h-3.5 w-3.5" /> Etiket Yazdır
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditProduct(p);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" /> Düzenle
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {stokQuery.trim() && filteredProducts.length === 0 ? (
                <div className="border-t border-border bg-muted/30 p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <PackagePlus className="h-4 w-4" />
                    Hızlı Stok Girişi{stokQuery.trim() ? ` — "${stokQuery.trim()}"` : ""}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Aradığınız ürün stokta yok. Sayfadan çıkmadan aşağıdaki formla hemen ekleyin.
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <Field label="Ürün Adı">
                      <Input
                        value={quickForm.name}
                        onChange={(e) => setQuickForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder={stokQuery.trim() || "Örn. Domates"}
                        className="h-9"
                      />
                    </Field>
                    <Field label="Barkod / Stok Kodu">
                      <Input
                        value={quickForm.barcode}
                        onChange={(e) => setQuickForm((f) => ({ ...f, barcode: e.target.value }))}
                        placeholder="Örn. 8690000000000"
                        className="h-9"
                      />
                    </Field>
                    <Field label="Kategori">
                      <select
                        value={quickForm.categoryId}
                        onChange={(e) =>
                          setQuickForm((f) => ({ ...f, categoryId: e.target.value }))
                        }
                        aria-label="Kategori"
                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="">Seçiniz…</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Birim">
                      <select
                        value={quickForm.unit}
                        onChange={(e) => setQuickForm((f) => ({ ...f, unit: e.target.value }))}
                        aria-label="Birim"
                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        {["adet", "kg", "gr", "lt", "paket", "koli"].map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Stok Miktarı">
                      <Input
                        value={quickForm.stock}
                        onChange={(e) => setQuickForm((f) => ({ ...f, stock: e.target.value }))}
                        inputMode="decimal"
                        placeholder="0"
                        className="h-9"
                      />
                    </Field>
                    <Field label="Alış Fiyatı">
                      <Input
                        value={quickForm.buy}
                        onChange={(e) => setQuickForm((f) => ({ ...f, buy: e.target.value }))}
                        inputMode="decimal"
                        placeholder="0,00"
                        className="h-9"
                      />
                    </Field>
                    <Field label="Satış Fiyatı">
                      <Input
                        value={quickForm.sell}
                        onChange={(e) => setQuickForm((f) => ({ ...f, sell: e.target.value }))}
                        inputMode="decimal"
                        placeholder="0,00"
                        className="h-9"
                      />
                    </Field>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Field label="KDV (%)" className="w-28">
                      <Input
                        value={quickForm.vat}
                        onChange={(e) => setQuickForm((f) => ({ ...f, vat: e.target.value }))}
                        inputMode="numeric"
                        className="h-9"
                      />
                    </Field>
                    <Button size="sm" className="mt-5 gap-2" onClick={handleQuickAdd}>
                      <Plus className="h-4 w-4" /> Stoğa Ekle
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-5"
                      onClick={() => setStokQuery("")}
                    >
                      Aramayı Temizle
                    </Button>
                  </div>
                </div>
              ) : null}
            </Panel>
          </TabsContent>

          <TabsContent value="cari" className="mt-4">
            <Panel
              title="Cari Hesaplar"
              subtitle="Müşteri ve tedarikçi bakiyeleri"
              action={
                <div className="flex flex-wrap gap-2">
                  {canPerm("cari") ? (
                    <Button size="sm" className="gap-2" onClick={() => setCariOpen(true)}>
                      <Plus className="h-4 w-4" /> Yeni Cari Ekle
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    className="gap-2 bg-pos-sky text-pos-sky-foreground hover:bg-pos-sky/90"
                    onClick={() => {
                      setImportFile(null);
                      setImportOpen("cari");
                    }}
                  >
                    <FileSpreadsheet className="h-4 w-4" /> Excel'den Aktar
                  </Button>
                </div>
              }
            >
              <div className="mb-3 flex flex-wrap gap-2">
                {(
                  [
                    ["all", "Tüm Cariler"],
                    ["Müşteri", "Müşteriler"],
                    ["Tedarikçi", "Tedarikçiler"],
                  ] as const
                ).map(([key, label]) => (
                  <Button
                    key={key}
                    size="sm"
                    variant={cariType === key ? "default" : "outline"}
                    onClick={() => setCariType(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <SearchBar value={cariQuery} onChange={setCariQuery} />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ünvan</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead className="text-right">Bakiye</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Sonuç bulunamadı.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAccounts.map((a) => (
                      <TableRow
                        key={a.id}
                        className="cursor-pointer"
                        onClick={() => {
                          setStatementOf(a);
                          setPayment("");
                        }}
                      >
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell>
                          <Badge variant={a.type === "Müşteri" ? "secondary" : "outline"}>
                            {a.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{a.phone}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span
                            className={
                              a.balance >= 0
                                ? "font-semibold text-pos-success"
                                : "font-semibold text-destructive"
                            }
                          >
                            {TRY.format(Math.abs(a.balance))}
                          </span>
                          <span className="ml-1 text-xs text-muted-foreground">
                            {a.balance >= 0 ? "alacak" : "borç"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="outline"
                            aria-label={`${a.name} bilgilerini düzenle`}
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCariEdit(a);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Panel>
          </TabsContent>

          <TabsContent value="kasa" className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {finAccounts.map((a) => {
                const meta = FIN_TYPE_META[a.type];
                const Icon = meta.icon;
                return (
                  <div
                    key={a.id}
                    className="pos-shadow rounded-2xl border border-border bg-card p-5"
                  >
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${meta.tone}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-foreground">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.detail}</p>
                    <p className="mt-3 text-xl font-bold tabular-nums text-foreground">
                      {TRY.format(a.balance)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                className="gap-2"
                onClick={() => {
                  setCashForm({
                    accountId: finAccounts[0]?.id ?? "",
                    cariId: "",
                    amount: "",
                    desc: "",
                  });
                  setCashTx("in");
                }}
              >
                <ArrowDownLeft className="h-4 w-4" /> Tahsilat Ekle
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  setCashForm({
                    accountId: finAccounts[0]?.id ?? "",
                    cariId: "",
                    amount: "",
                    desc: "",
                  });
                  setCashTx("out");
                }}
              >
                <ArrowUpRight className="h-4 w-4" /> Ödeme Yap / Gider
              </Button>
            </div>

            <Panel title="Son Hareketler" subtitle="Kasa ve banka işlemleri">
              <SearchBar value={kasaQuery} onChange={setKasaQuery} />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead>Hesap</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Sonuç bulunamadı.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMovements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {m.date}
                        </TableCell>
                        <TableCell className="font-medium">{m.desc}</TableCell>
                        <TableCell className="text-muted-foreground">{m.account}</TableCell>
                        <TableCell
                          className={`text-right font-semibold tabular-nums ${
                            m.amount >= 0 ? "text-pos-success" : "text-destructive"
                          }`}
                        >
                          {m.amount >= 0 ? "+" : "−"}
                          {TRY.format(Math.abs(m.amount))}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Panel>
          </TabsContent>

          <TabsContent value="ebelge" className="mt-4 space-y-4">
            <div className="pos-shadow flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {(["e-Fatura", "e-İrsaliye"] as const).map((k) => (
                  <Button
                    key={k}
                    size="sm"
                    variant={eKindTab === k ? "default" : "outline"}
                    onClick={() => setEKindTab(k)}
                  >
                    {k}
                  </Button>
                ))}
              </div>
              {canPerm("muhasebe") ? (
                <Button
                  size="sm"
                  className="gap-2 bg-pos-sky text-pos-sky-foreground hover:bg-pos-sky/90"
                  onClick={() => setETypePickerOpen(true)}
                >
                  <Plus className="h-4 w-4" /> Yeni e-Belge Oluştur
                </Button>
              ) : null}
            </div>
            <div className="pos-shadow overflow-hidden rounded-2xl border border-border bg-card">
              <SearchBar value={eQuery} onChange={setEQuery} />
            </div>
            <p className="px-1 text-sm text-muted-foreground">
              {eKindTab === "e-Fatura"
                ? "Gelen ve giden e-Faturalar."
                : "Sevk ve taşıma işlemlerine ait e-İrsaliyeler."}
            </p>
            {(["Giden", "Gelen"] as const).map((dir) => {
              const rows = filteredEInvoices.filter(
                (i) =>
                  i.dir === dir &&
                  (eKindTab === "e-Fatura"
                    ? i.kind === "e-Fatura" || i.kind === "e-Arşiv Fatura"
                    : i.kind === eKindTab),
              );
              const label = eKindTab === "e-İrsaliye" ? "İrsaliyeler" : "Faturalar";
              const draftIds = rows.filter((r) => r.status === "Taslak").map((r) => r.id);
              const selectedHere = draftIds.filter((id) => selectedEIds.includes(id));
              const allSelected = draftIds.length > 0 && selectedHere.length === draftIds.length;
              return (
                <Panel
                  key={dir}
                  title={`${dir} ${label}`}
                  subtitle={`${rows.length} belge · ${TRY.format(
                    rows.reduce((s, r) => s + r.total, 0),
                  )}`}
                  action={
                    selectedHere.length > 0 ? (
                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => setGibSendIds(selectedHere)}
                      >
                        <Send className="h-4 w-4" /> Seçilenleri GİB'e Gönder ({selectedHere.length}
                        )
                      </Button>
                    ) : undefined
                  }
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            aria-label="Tümünü seç"
                            checked={allSelected}
                            disabled={draftIds.length === 0}
                            onCheckedChange={(v) =>
                              setSelectedEIds((prev) =>
                                v === true
                                  ? Array.from(new Set([...prev, ...draftIds]))
                                  : prev.filter((id) => !draftIds.includes(id)),
                              )
                            }
                          />
                        </TableHead>
                        <TableHead>Belge No</TableHead>
                        <TableHead>Cari</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead className="text-right">Matrah</TableHead>
                        <TableHead className="text-right">KDV</TableHead>
                        <TableHead className="text-right">Toplam</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead className="text-right">İşlem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-muted-foreground">
                            Kayıt yok.
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.map((inv) => (
                          <TableRow
                            key={inv.id}
                            className="cursor-pointer"
                            onClick={() => openEditEDoc(inv)}
                          >
                            <TableCell onClick={(ev) => ev.stopPropagation()}>
                              <Checkbox
                                aria-label={`${inv.no} seç`}
                                disabled={inv.status !== "Taslak"}
                                checked={selectedEIds.includes(inv.id)}
                                onCheckedChange={() => toggleESelect(inv.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              <span className="flex items-center gap-2">
                                {dir === "Giden" ? (
                                  <Send className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Inbox className="h-4 w-4 text-muted-foreground" />
                                )}
                                {inv.no}
                              </span>
                            </TableCell>
                            <TableCell>{inv.account}</TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground">
                              {inv.date}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {fmtMoney(inv.base, inv.currency)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {fmtMoney(inv.vat, inv.currency)}
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {fmtMoney(inv.total, inv.currency)}
                            </TableCell>
                            <TableCell>
                              <Badge className={eStatusClass(inv.status)}>
                                {inv.status === "GİB Bekliyor" ? "Kuyrukta" : inv.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-wrap justify-end gap-1">
                                {inv.status === "Taslak" ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1 border-pos-sky text-pos-sky hover:bg-pos-sky hover:text-pos-sky-foreground"
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      setGibSendIds([inv.id]);
                                    }}
                                  >
                                    <Send className="h-3.5 w-3.5" /> GİB'e Gönder
                                  </Button>
                                ) : null}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    openEditEDoc(inv);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" /> Düzenle
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Panel>
              );
            })}
          </TabsContent>

          <TabsContent value="teklif" className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard
                label="Toplam Teklif"
                value={String(quotes.length)}
                icon={FileSignature}
                tone="bg-pos-sky text-pos-sky-foreground"
              />
              <KpiCard
                label="Bekleyen Teklif Tutarı"
                value={TRY.format(
                  quotes
                    .filter((q) => q.status !== "Satışa Çevrildi" && q.status !== "Faturalandı")
                    .reduce((s, q) => s + q.total, 0),
                )}
                icon={FileText}
                tone="bg-pos-cheese text-pos-cheese-foreground"
              />
              <KpiCard
                label="Faturalanan Tutar"
                value={TRY.format(
                  quotes
                    .filter((q) => q.status === "Satışa Çevrildi" || q.status === "Faturalandı")
                    .reduce((s, q) => s + q.total, 0),
                )}
                icon={ShoppingCart}
                tone="bg-pos-apple text-pos-apple-foreground"
              />
            </div>
            <Panel
              title="Teklifler"
              subtitle={`${filteredQuotes.length} / ${quotes.length} teklif`}
              action={
                <Button size="sm" className="gap-2" onClick={openNewQuote}>
                  <Plus className="h-4 w-4" /> Yeni Teklif Hazırla
                </Button>
              }
            >
              <SearchBar value={quoteQuery} onChange={setQuoteQuery} />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teklif No</TableHead>
                    <TableHead>Cari</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Geçerlilik</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Henüz teklif yok. "Yeni Teklif Hazırla" ile başlayın.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQuotes.map((q) => {
                      const invoiced = q.status === "Satışa Çevrildi" || q.status === "Faturalandı";
                      return (
                        <TableRow
                          key={q.id}
                          className={`cursor-pointer ${invoiced ? "opacity-60" : ""}`}
                          onClick={() => openEditQuote(q)}
                        >
                          <TableCell className="font-medium">{q.no}</TableCell>
                          <TableCell>{q.account}</TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {q.date}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {q.validUntil || "—"}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {fmtMoney(q.total, q.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                invoiced
                                  ? "bg-muted text-muted-foreground"
                                  : q.status === "Gönderildi"
                                    ? "bg-pos-sky text-pos-sky-foreground"
                                    : "bg-secondary text-secondary-foreground"
                              }
                            >
                              {invoiced ? "Faturalandı" : q.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  void handlePrintQuote(q);
                                }}
                              >
                                <Printer className="h-3.5 w-3.5" /> Yazdır / PDF
                              </Button>
                              <Button
                                size="sm"
                                disabled={invoiced}
                                className="gap-1 bg-pos-apple text-pos-apple-foreground hover:bg-pos-apple/90"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  handleConvertQuote(q);
                                }}
                              >
                                <ShoppingCart className="h-3.5 w-3.5" />{" "}
                                {invoiced ? "Faturalandı" : "Faturaya Çevir"}
                              </Button>
                              {canPerm("muhasebe") ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  aria-label="Teklifi sil"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    handleDeleteQuote(q);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Panel>
          </TabsContent>

          <TabsContent value="gider" className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard
                label="Bu Ayki Toplam İşletme Gideri"
                value={TRY.format(monthlyExpense)}
                icon={Receipt}
                tone="bg-pos-tomato text-pos-tomato-foreground"
              />
              <KpiCard
                label="Kayıtlı Gider Adedi"
                value={String(expenses.length)}
                icon={FileText}
                tone="bg-pos-cashew text-pos-cashew-foreground"
              />
              <KpiCard
                label="Aylık Ciro (Gelir)"
                value={TRY.format(kpis.revenue)}
                icon={TrendingUp}
                tone="bg-pos-apple text-pos-apple-foreground"
              />
            </div>
            <div className="pos-shadow overflow-hidden rounded-2xl border border-border bg-card">
              <SearchBar value={expQuery} onChange={setExpQuery} />
            </div>
            <Panel
              title="Gelir & Gider / Masraf Takibi"
              subtitle="Kira, personel, fatura ve diğer işletme masrafları"
              action={
                <Button size="sm" className="gap-2" onClick={() => setExpOpen(true)}>
                  <Plus className="h-4 w-4" /> Gider Kaydı Ekle
                </Button>
              }
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Açıklama</TableHead>
                    <TableHead>Masraf Kategorisi</TableHead>
                    <TableHead>Ödeme Hesabı</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Kayıt yok.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpenses.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{e.category}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{e.account}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {e.date}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-destructive">
                          -{TRY.format(e.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Panel>
          </TabsContent>

          <TabsContent value="mali" className="mt-4 space-y-4">
            <Panel
              title="Mali Yönetim — Hesap Tanımları"
              subtitle="Kasa, banka, POS, kredi kartı ve ortaklar hesapları (yalnızca yetkili kullanıcılar)"
              action={
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      setTransferForm({ from: "", to: "", amount: "", desc: "" });
                      setTransferOpen(true);
                    }}
                  >
                    <ArrowLeftRight className="h-4 w-4" /> Hesaplar Arası Transfer
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      setFinForm({ name: "", type: "Nakit Kasa", detail: "", balance: "" });
                      setFinOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" /> Yeni Hesap Tanımla
                  </Button>
                </div>
              }
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hesap Adı</TableHead>
                    <TableHead>Tür</TableHead>
                    <TableHead>Detay</TableHead>
                    <TableHead className="text-right">Güncel Bakiye</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {finAccounts.map((a) => {
                    const meta = FIN_TYPE_META[a.type];
                    const Icon = meta.icon;
                    return (
                      <TableRow
                        key={a.id}
                        className="cursor-pointer"
                        onClick={() => openFinEdit(a)}
                      >
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-2">
                            <span
                              className={`flex h-8 w-8 items-center justify-center rounded-lg ${meta.tone}`}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            {a.name}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{a.type}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{a.detail || "—"}</TableCell>
                        <TableCell
                          className={`text-right font-semibold tabular-nums ${
                            a.balance >= 0 ? "text-pos-success" : "text-destructive"
                          }`}
                        >
                          {TRY.format(a.balance)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFinMovementsOf(a);
                              }}
                            >
                              <ListTree className="h-3.5 w-3.5" /> Hareketleri İncele
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                openFinEdit(a);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" /> Düzenle
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Panel>
          </TabsContent>
        </Tabs>
      </div>

      {/* Stokta olmayan ürünü hızlıca ekle */}
      <QuickProductDialog
        open={quickProduct !== null}
        initialName={quickProduct?.query ?? ""}
        onOpenChange={(o) => {
          if (!o) setQuickProduct(null);
        }}
        onCreated={(p) => {
          quickProduct?.apply(p);
          setQuickProduct(null);
        }}
      />

      {/* Yeni e-Fatura */}
      <Dialog open={eTypePickerOpen} onOpenChange={setETypePickerOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni e-Belge Oluştur</DialogTitle>
            <DialogDescription>Oluşturmak istediğiniz belge türünü seçin.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {[
              {
                k: "e-Fatura" as const,
                d: "Kurumsal (mükellef) carilere kesilen fatura",
                i: FileText,
              },
              { k: "e-İrsaliye" as const, d: "Sevk ve taşıma irsaliyesi", i: Send },
            ].map(({ k, d, i: Icon }) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setEDocKind(k);
                  setEKindTab(k);
                  setETypePickerOpen(false);
                  setEOpen(true);
                }}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary hover:bg-accent"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-pos-sky text-pos-sky-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-semibold">{k}</span>
                  <span className="block text-sm text-muted-foreground">{d}</span>
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={eOpen} onOpenChange={setEOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Yeni {eDocKind} Oluştur</DialogTitle>
            <DialogDescription>
              Cari ve ürün kalemlerini girin, matrah ve KDV otomatik hesaplanır.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm font-bold text-foreground">
              Mevcut Bakiyeniz: {(company?.edoc_credits ?? 0).toLocaleString("tr-TR")} Kontör
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Gönderdiğiniz ya da aldığınız her fatura 1 kontör üzerinden hesaplanır.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Fatura Senaryosu">
              <select
                value={eForm.scenario}
                onChange={(ev) => setEForm((f) => ({ ...f, scenario: ev.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                aria-label="Fatura senaryosu"
              >
                {["Temel Fatura", "Ticari Fatura"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Fatura Tipi">
              <select
                value={eForm.invoiceType}
                onChange={(ev) => setEForm((f) => ({ ...f, invoiceType: ev.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                aria-label="Fatura tipi"
              >
                {["Satış", "İade", "Tevkifat", "İstisna"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cari Seçimi">
              <select
                value={eForm.account}
                onChange={(ev) => setEForm((f) => ({ ...f, account: ev.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                aria-label="Cari seçimi"
              >
                <option value="">Seçiniz…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.name} ({a.type})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Fatura Tarihi">
              <Input
                type="date"
                value={eForm.date}
                onChange={(ev) => setEForm((f) => ({ ...f, date: ev.target.value }))}
              />
            </Field>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="mb-2 text-sm font-semibold">Alıcı Bilgileri</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="VKN / TCKN">
                <Input
                  value={eForm.buyerTaxNo}
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="10 veya 11 haneli"
                  onChange={(ev) =>
                    setEForm((f) => ({
                      ...f,
                      buyerTaxNo: ev.target.value.replace(/\D/g, "").slice(0, 11),
                    }))
                  }
                />
              </Field>
              <Field label="Vergi Dairesi">
                <Input
                  value={eForm.buyerTaxOffice}
                  maxLength={100}
                  onChange={(ev) => setEForm((f) => ({ ...f, buyerTaxOffice: ev.target.value }))}
                />
              </Field>
              <Field label="İl">
                <Input
                  value={eForm.buyerCity}
                  maxLength={50}
                  onChange={(ev) => setEForm((f) => ({ ...f, buyerCity: ev.target.value }))}
                />
              </Field>
              <Field label="İlçe">
                <Input
                  value={eForm.buyerDistrict}
                  maxLength={50}
                  onChange={(ev) => setEForm((f) => ({ ...f, buyerDistrict: ev.target.value }))}
                />
              </Field>
            </div>
          </div>

          <div className="space-y-2">
            <div className="hidden gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[2fr_0.7fr_1fr_0.7fr_1fr_auto]">
              <span>Ürün / Hizmet</span>
              <span>Miktar</span>
              <span>Birim Fiyat</span>
              <span>KDV (%)</span>
              <span className="text-right">Toplam</span>
              <span />
            </div>
            {eLines.map((l) => {
              const lineTotal =
                (Number(l.qty) || 0) * (Number(l.price) || 0) * (1 + (Number(l.vat) || 0) / 100);
              return (
                <div
                  key={l.id}
                  className="grid gap-2 sm:grid-cols-[2fr_0.7fr_1fr_0.7fr_1fr_auto] sm:items-center"
                >
                  <ProductPicker
                    products={pickableProducts}
                    value={l.name}
                    onCreateNew={(query) =>
                      setQuickProduct({
                        query,
                        apply: (p0) =>
                          setELines((p) =>
                            p.map((x) =>
                              x.id === l.id
                                ? {
                                    ...x,
                                    name: p0.name,
                                    price: String(p0.sell),
                                    vat: String(p0.vat),
                                  }
                                : x,
                            ),
                          ),
                      })
                    }
                    onPick={(p0) =>
                      setELines((p) =>
                        p.map((x) =>
                          x.id === l.id
                            ? {
                                ...x,
                                name: p0.name,
                                price: String(p0.sell),
                                vat: String(p0.vat),
                              }
                            : x,
                        ),
                      )
                    }
                  />
                  <Input
                    value={l.qty}
                    inputMode="decimal"
                    onChange={(ev) =>
                      setELines((p) =>
                        p.map((x) => (x.id === l.id ? { ...x, qty: ev.target.value } : x)),
                      )
                    }
                  />
                  <Input
                    value={l.price}
                    inputMode="decimal"
                    placeholder="0,00"
                    onChange={(ev) =>
                      setELines((p) =>
                        p.map((x) => (x.id === l.id ? { ...x, price: ev.target.value } : x)),
                      )
                    }
                  />
                  <Input
                    value={l.vat}
                    inputMode="decimal"
                    onChange={(ev) =>
                      setELines((p) =>
                        p.map((x) => (x.id === l.id ? { ...x, vat: ev.target.value } : x)),
                      )
                    }
                  />
                  <div className="text-right text-sm font-semibold tabular-nums">
                    {TRY.format(lineTotal)}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Kalemi sil"
                    onClick={() =>
                      setELines((p) => (p.length > 1 ? p.filter((x) => x.id !== l.id) : p))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() =>
                setELines((p) => [
                  ...p,
                  { id: `l${Date.now()}`, name: "", qty: "1", price: "", vat: "10" },
                ])
              }
            >
              <Plus className="h-4 w-4" /> Kalem Ekle
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Matrah</span>
              <span className="tabular-nums">{TRY.format(eTotals.base)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">KDV</span>
              <span className="tabular-nums">{TRY.format(eTotals.vat)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 font-bold">
              <span>Genel Toplam</span>
              <span className="tabular-nums">{TRY.format(eTotals.total)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleSendEInvoice("Taslak")}>
              Taslak Kaydet
            </Button>
            <Button className="gap-2" onClick={requestSendEInvoice}>
              <Send className="h-4 w-4" /> GİB'e Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={sendConfirmOpen} onOpenChange={setSendConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fatura Gönderim Onayı</AlertDialogTitle>
            <AlertDialogDescription>
              Faturayı GİB'e göndermek üzeresiniz. Mevcut Bakiyeniz:{" "}
              {(company?.edoc_credits ?? 0).toLocaleString("tr-TR")} Kontör. Gönderdiğiniz veya
              aldığınız her fatura 1 kontör üzerinden hesaplanır. Onaylıyor musunuz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEOpen(true)}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSendEInvoice("GİB Bekliyor")}>
              Evet, Gönder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hızlı GİB gönderim onayı (liste ve detay) */}
      <AlertDialog open={gibSendIds !== null} onOpenChange={(o) => !o && setGibSendIds(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {(gibSendIds?.length ?? 0) > 1
                ? `${gibSendIds?.length} fatura GİB'e iletilecek`
                : "Fatura GİB'e iletilecek"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Onaylıyor musunuz? Mevcut Bakiyeniz:{" "}
              {(company?.edoc_credits ?? 0).toLocaleString("tr-TR")} Kontör. Her belge 1 kontör
              üzerinden hesaplanır.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGibSend}>Evet, Gönder</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Gider kaydı */}
      <Dialog open={expOpen} onOpenChange={setExpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gider Kaydı Ekle</DialogTitle>
            <DialogDescription>Tutar seçilen kasa/banka hesabından düşülür.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Açıklama">
              <Input
                value={expForm.title}
                placeholder="Ör. Temmuz elektrik faturası"
                onChange={(ev) => setExpForm((f) => ({ ...f, title: ev.target.value }))}
              />
            </Field>
            <Field label="Masraf Kategorisi">
              <select
                value={expForm.category}
                onChange={(ev) => setExpForm((f) => ({ ...f, category: ev.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                aria-label="Masraf kategorisi"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tutar (₺)">
              <Input
                value={expForm.amount}
                inputMode="decimal"
                placeholder="0,00"
                onChange={(ev) => setExpForm((f) => ({ ...f, amount: ev.target.value }))}
              />
            </Field>
            <Field label="Ödeme Hesabı (Kasa / Banka)">
              <select
                value={expForm.accountId}
                onChange={(ev) => setExpForm((f) => ({ ...f, accountId: ev.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                aria-label="Ödeme hesabı"
              >
                <option value="">Seçiniz…</option>
                {finAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {a.type}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tarih">
              <Input
                type="date"
                value={expForm.date}
                onChange={(ev) => setExpForm((f) => ({ ...f, date: ev.target.value }))}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpOpen(false)}>
              Vazgeç
            </Button>
            <Button onClick={handleAddExpense}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Yeni kategori formu */}
      <Dialog open={addCatOpen} onOpenChange={setAddCatOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Kategori Ekle</DialogTitle>
            <DialogDescription>
              Kategori adı, rengi ve ikonunu seçin. POS filtreleri anında güncellenir.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleAddCategory();
            }}
          >
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Kategori Adı</label>
              <Input
                value={catForm.name}
                onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ör. Baharat"
                aria-label="Kategori adı"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Renk</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-label={c.label}
                    onClick={() => setCatForm((f) => ({ ...f, color: c.id }))}
                    className={`h-9 w-9 rounded-xl ${c.className} ${
                      catForm.color === c.id ? "ring-2 ring-ring ring-offset-2" : ""
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">İkon</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_ICONS.map((key) => {
                  const Icon = CATEGORY_ICON_MAP[key] ?? Package;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-label={`İkon ${key}`}
                      onClick={() => setCatForm((f) => ({ ...f, icon: key }))}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card ${
                        catForm.icon === key ? "ring-2 ring-ring ring-offset-2" : ""
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddCatOpen(false)}>
                Vazgeç
              </Button>
              <Button type="submit" className="gap-2">
                <Plus className="h-4 w-4" /> Kategoriyi Kaydet
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Kategori yönetimi */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kategorileri Yönet</DialogTitle>
            <DialogDescription>
              Ürün grupları POS satış ekranındaki filtre butonlarını otomatik günceller.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2"
              >
                {editingId === c.id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      aria-label="Kategori adı"
                      className="h-8"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Kaydet"
                      onClick={() => {
                        if (!editingName.trim()) {
                          toast.error("Kategori adı boş olamaz.");
                          return;
                        }
                        updateCategory(c.id, { name: editingName });
                        setEditingId(null);
                        toast.success("Kategori güncellendi.");
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Vazgeç"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${categoryColorClass(c.color)}`}
                    >
                      {(() => {
                        const Icon = CATEGORY_ICON_MAP[c.icon ?? "package"] ?? Package;
                        return <Icon className="h-3.5 w-3.5" />;
                      })()}
                    </span>
                    <span className="flex-1 text-sm font-medium text-foreground">{c.name}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => {
                        setEditingId(c.id);
                        setEditingName(c.name);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Düzenle
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1"
                      onClick={() => {
                        removeCategory(c.id);
                        toast.success(`"${c.name}" silindi.`);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Sil
                    </Button>
                  </>
                )}
              </div>
            ))}
            {categories.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Henüz kategori yok.</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Ürün formu */}
      <Dialog open={productOpen} onOpenChange={setProductOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Ürün Detay / Düzenle" : "Yeni Ürün Formu"}</DialogTitle>
            <DialogDescription>
              {editingProduct ? "Ürün bilgilerini güncelleyin." : "Yeni ürünün bilgilerini girin."}
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveProduct();
            }}
          >
            <Field label="Ürün Adı" className="sm:col-span-2">
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ör. Elma (Amasya)"
                aria-label="Ürün adı"
              />
            </Field>
            <Field label="Barkod">
              <Input
                value={productForm.barcode}
                onChange={(e) => setProductForm((f) => ({ ...f, barcode: e.target.value }))}
                placeholder="8690000000000"
                inputMode="numeric"
                aria-label="Barkod"
              />
            </Field>
            <Field label="Birim">
              <select
                value={productForm.unit}
                onChange={(e) => setProductForm((f) => ({ ...f, unit: e.target.value }))}
                aria-label="Birim"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Alış Fiyatı (₺)">
              <Input
                value={productForm.buy}
                onChange={(e) => setProductForm((f) => ({ ...f, buy: e.target.value }))}
                inputMode="decimal"
                aria-label="Alış fiyatı"
              />
            </Field>
            <Field label="Satış Fiyatı (₺)">
              <Input
                value={productForm.sell}
                onChange={(e) => setProductForm((f) => ({ ...f, sell: e.target.value }))}
                inputMode="decimal"
                aria-label="Satış fiyatı"
              />
            </Field>
            <Field label="KDV Oranı (%)">
              <select
                value={productForm.vat}
                onChange={(e) => setProductForm((f) => ({ ...f, vat: e.target.value }))}
                aria-label="KDV oranı"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {["0", "1", "10", "20"].map((v) => (
                  <option key={v} value={v}>
                    %{v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Kategori">
              <select
                value={productForm.categoryId}
                onChange={(e) => setProductForm((f) => ({ ...f, categoryId: e.target.value }))}
                aria-label="Kategori"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Kategorisiz</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Manuel Stok Miktarı">
              <Input
                value={productForm.stock}
                onChange={(e) => setProductForm((f) => ({ ...f, stock: e.target.value }))}
                inputMode="decimal"
                placeholder="0"
                aria-label="Manuel stok miktarı"
              />
            </Field>
            {editingProduct ? (
              <div className="sm:col-span-2">
                <ProductGallery
                  productId={editingProduct.id}
                  images={
                    products.find((p) => p.id === editingProduct.id)?.images ??
                    editingProduct.images ??
                    []
                  }
                />
              </div>
            ) : null}
            <DialogFooter className="sm:col-span-2">
              {editingProduct ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="mr-auto gap-1"
                  onClick={() => {
                    setProducts((prev) => prev.filter((p) => p.id !== editingProduct.id));
                    setProductOpen(false);
                    toast.success("Ürün silindi.");
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Sil
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={() => setProductOpen(false)}>
                Vazgeç
              </Button>
              <Button type="submit">Kaydet</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Excel'den aktar */}
      <Dialog open={importOpen !== null} onOpenChange={(o) => !o && setImportOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excel'den Aktar</DialogTitle>
            <DialogDescription>
              {importOpen === "cari"
                ? "Cari hesapları toplu olarak .xlsx / .csv dosyasından yükleyin."
                : "Ürünleri toplu olarak .xlsx / .csv dosyasından yükleyin."}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center">
            <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium text-foreground">
              {importFile?.name ?? "Dosya seçin veya sürükleyin"}
            </p>
            <p className="text-xs text-muted-foreground">Desteklenen: .xlsx, .csv</p>
            <input
              id="import-file"
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={() => document.getElementById("import-file")?.click()}
            >
              Dosya Seç
            </Button>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            onClick={() =>
              importOpen === "cari"
                ? downloadCsv("cari-sablon.csv", [
                    ["Ünvan", "Tip", "Telefon", "Bakiye"],
                    ["Örnek Market", "Müşteri", "0532 000 00 00", "1500"],
                  ])
                : downloadCsv("urun-sablon.csv", [
                    ["Ürün Adı", "Barkod", "Kategori", "Birim", "Alış", "Satış", "KDV"],
                    ["Örnek Ürün", "8690000000000", "Meyve", "kg", "10", "15", "1"],
                  ])
            }
          >
            <Download className="h-4 w-4" /> Şablon İndir
          </Button>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(null)}>
              Kapat
            </Button>
            <Button disabled={!importFile || importBusy} onClick={() => void runImport()}>
              {importBusy ? "Aktarılıyor…" : "Yükle ve Aktar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Yeni fatura */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Fatura Kes / Gir</DialogTitle>
            <DialogDescription>Alış veya satış faturası oluşturun.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              {(["Satış", "Alış"] as const).map((t) => (
                <Button
                  key={t}
                  variant={invoiceForm.type === t ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setInvoiceForm((f) => ({ ...f, type: t }))}
                >
                  {t} Faturası
                </Button>
              ))}
            </div>
            <Input
              value={invoiceForm.account}
              onChange={(e) => setInvoiceForm((f) => ({ ...f, account: e.target.value }))}
              placeholder="Cari ünvanı"
              aria-label="Cari ünvanı"
            />
            <Input
              value={invoiceForm.total}
              onChange={(e) => setInvoiceForm((f) => ({ ...f, total: e.target.value }))}
              placeholder="Tutar (₺)"
              inputMode="decimal"
              aria-label="Tutar"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceOpen(false)}>
              Vazgeç
            </Button>
            <Button onClick={handleCreateInvoice}>Faturayı Oluştur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cari ekstre */}
      <Dialog
        open={statementOf !== null}
        onOpenChange={(o) => {
          if (!o) {
            setStatementOf(null);
            setRange({ from: "", to: "" });
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{statementOf?.name} — Cari Ekstre</DialogTitle>
            <DialogDescription>
              {statementOf?.type} · {statementOf?.phone}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => statementOf && openCariEdit(statementOf)}
            >
              <Pencil className="h-4 w-4" /> Bilgileri Düzenle
            </Button>
          </div>

          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
            <Field label="Başlangıç Tarihi">
              <Input
                type="date"
                value={range.from}
                aria-label="Başlangıç tarihi"
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                className="h-9"
              />
            </Field>
            <Field label="Bitiş Tarihi">
              <Input
                type="date"
                value={range.to}
                aria-label="Bitiş tarihi"
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                className="h-9"
              />
            </Field>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-1" onClick={exportStatementPdf}>
                <Printer className="h-3.5 w-3.5" /> PDF İndir
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={exportStatementExcel}>
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel İndir
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => {
                  setCariBalanceValue(String(statementOf?.balance ?? 0));
                  setCariBalanceOpen(true);
                }}
              >
                <Scale className="h-3.5 w-3.5" /> Bakiye Düzelt
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={emailStatement}>
                <Mail className="h-3.5 w-3.5" /> E-posta Gönder
              </Button>
              <Button
                size="sm"
                className="gap-1 bg-pos-sky text-pos-sky-foreground hover:bg-pos-sky/90"
                onClick={() => {
                  setQuoteLines([]);
                  setQuoteValid("");
                  setQuoteOpen(true);
                }}
              >
                <FileSignature className="h-3.5 w-3.5" /> Teklif Hazırla
              </Button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead className="text-right">Borç</TableHead>
                  <TableHead className="text-right">Alacak</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statementRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {r.date}
                    </TableCell>
                    <TableCell className="font-medium">{r.desc}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.debit ? TRY.format(r.debit) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-pos-success">
                      {r.credit ? TRY.format(r.credit) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {statementRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Hareket yok.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
            <span className="text-sm text-muted-foreground">Kalan Bakiye</span>
            <span
              className={`text-lg font-bold tabular-nums ${
                (statementOf?.balance ?? 0) >= 0 ? "text-pos-success" : "text-destructive"
              }`}
            >
              {TRY.format(Math.abs(statementOf?.balance ?? 0))}{" "}
              <span className="text-xs font-medium text-muted-foreground">
                {(statementOf?.balance ?? 0) >= 0 ? "alacak" : "borç"}
              </span>
            </span>
          </div>

          <form
            className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              handlePayment();
            }}
          >
            <select
              value={payAccountId}
              onChange={(e) => setPayAccountId(e.target.value)}
              aria-label="İşlem yapılacak hesap"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">İşlem yapılacak hesap seçin…</option>
              {finAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {a.type}
                </option>
              ))}
            </select>
            <Input
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
              placeholder="Tutar (₺)"
              inputMode="decimal"
              aria-label="Tahsilat tutarı"
            />
            <Button type="submit" className="gap-2">
              <ArrowDownLeft className="h-4 w-4" />
              {statementOf?.type === "Müşteri" ? "Tahsilat Ekle" : "Ödeme Yap"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Yeni mali hesap */}
      <Dialog open={finOpen} onOpenChange={setFinOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Hesap Tanımla</DialogTitle>
            <DialogDescription>
              Nakit kasa, banka, POS, kredi kartı veya ortak hesabı.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateFinAccount();
            }}
          >
            <Field label="Hesap Adı">
              <Input
                value={finForm.name}
                onChange={(e) => setFinForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ör. Merkez Kasa"
                aria-label="Hesap adı"
              />
            </Field>
            <Field label="Hesap Türü">
              <select
                value={finForm.type}
                onChange={(e) =>
                  setFinForm((f) => ({ ...f, type: e.target.value as FinAccountType }))
                }
                aria-label="Hesap türü"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {FIN_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={finForm.type === "Banka Hesabı" ? "Banka Adı & IBAN" : "Açıklama"}>
              <Input
                value={finForm.detail}
                onChange={(e) => setFinForm((f) => ({ ...f, detail: e.target.value }))}
                placeholder={
                  finForm.type === "Banka Hesabı"
                    ? "Ziraat Bankası · TR00 0000 ..."
                    : "Kısa açıklama"
                }
                aria-label="Hesap detayı"
              />
            </Field>
            <Field label="Açılış Bakiyesi (₺)">
              <Input
                value={finForm.balance}
                onChange={(e) => setFinForm((f) => ({ ...f, balance: e.target.value }))}
                inputMode="decimal"
                aria-label="Açılış bakiyesi"
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFinOpen(false)}>
                Vazgeç
              </Button>
              <Button type="submit">Hesabı Kaydet</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Hesap hareketleri */}
      <Dialog open={finMovementsOf !== null} onOpenChange={(o) => !o && setFinMovementsOf(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{finMovementsOf?.name} — Hesap Hareketleri</DialogTitle>
            <DialogDescription>
              {finMovementsOf?.type} · Güncel bakiye: {TRY.format(finMovementsOf?.balance ?? 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => {
                setFinBalanceValue(String(finMovementsOf?.balance ?? 0));
                setFinBalanceOpen(true);
              }}
            >
              <Scale className="h-4 w-4" /> Bakiyeyi Güncelle / Sıfırla
            </Button>
          </div>
          <div className="max-h-80 overflow-y-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead className="text-right">Tutar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {finTxnRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Bu hesapta hareket yok.
                    </TableCell>
                  </TableRow>
                ) : (
                  finTxnRows.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {m.date}
                      </TableCell>
                      <TableCell className="font-medium">{m.desc}</TableCell>
                      <TableCell
                        className={`text-right font-semibold tabular-nums ${
                          m.amount >= 0 ? "text-pos-success" : "text-destructive"
                        }`}
                      >
                        {m.amount >= 0 ? "+" : "−"}
                        {TRY.format(Math.abs(m.amount))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hesaplar arası transfer (virman) */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hesaplar Arası Transfer</DialogTitle>
            <DialogDescription>
              Tutar gönderen hesaptan düşer, alıcı hesaba eklenir.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleTransfer();
            }}
          >
            <Field label="Gönderen Hesap *">
              <select
                value={transferForm.from}
                onChange={(e) => setTransferForm((f) => ({ ...f, from: e.target.value }))}
                aria-label="Gönderen hesap"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Hesap seçin…</option>
                {finAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {TRY.format(a.balance)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Alıcı Hesap *">
              <select
                value={transferForm.to}
                onChange={(e) => setTransferForm((f) => ({ ...f, to: e.target.value }))}
                aria-label="Alıcı hesap"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Hesap seçin…</option>
                {finAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {TRY.format(a.balance)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tutar (₺) *">
              <Input
                value={transferForm.amount}
                onChange={(e) => setTransferForm((f) => ({ ...f, amount: e.target.value }))}
                inputMode="decimal"
                aria-label="Transfer tutarı"
              />
            </Field>
            <Field label="Açıklama">
              <Input
                value={transferForm.desc}
                onChange={(e) => setTransferForm((f) => ({ ...f, desc: e.target.value }))}
                placeholder="Ör. Kasadan bankaya yatırım"
                aria-label="Transfer açıklaması"
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTransferOpen(false)}>
                Vazgeç
              </Button>
              <Button type="submit">Transferi Gerçekleştir</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Kasa bakiye düzeltme */}
      <Dialog open={finBalanceOpen} onOpenChange={setFinBalanceOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Bakiyeyi Güncelle</DialogTitle>
            <DialogDescription>
              {finMovementsOf?.name} hesabının güncel bakiyesini elle eşitleyin. Fark, düzeltme
              hareketi olarak kaydedilir.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleFinBalanceAdjust();
            }}
          >
            <Field label="Yeni Bakiye (₺)">
              <Input
                value={finBalanceValue}
                onChange={(e) => setFinBalanceValue(e.target.value)}
                inputMode="decimal"
                aria-label="Yeni bakiye"
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFinBalanceValue("0")}>
                Sıfırla
              </Button>
              <Button type="submit">Kaydet</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cari bakiye (devir) düzeltme */}
      <Dialog open={cariBalanceOpen} onOpenChange={setCariBalanceOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Bakiyeyi Güncelle (Devir Bakiye)</DialogTitle>
            <DialogDescription>
              {statementOf?.name} carisinin bakiyesi. Pozitif değer alacak, negatif değer borç
              anlamına gelir.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleCariBalanceAdjust();
            }}
          >
            <Field label="Yeni Bakiye (₺)">
              <Input
                value={cariBalanceValue}
                onChange={(e) => setCariBalanceValue(e.target.value)}
                inputMode="decimal"
                aria-label="Yeni cari bakiye"
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCariBalanceValue("0")}>
                Sıfırla
              </Button>
              <Button type="submit">Kaydet</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tahsilat / Ödeme */}
      <Dialog open={cashTx !== null} onOpenChange={(o) => !o && setCashTx(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{cashTx === "in" ? "Tahsilat Ekle" : "Ödeme Yap"}</DialogTitle>
            <DialogDescription>
              Tutar seçilen hesaba {cashTx === "in" ? "artı (+)" : "eksi (−)"} olarak işlenir.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleCashTx();
            }}
          >
            <Field label="İşlem Yapılacak Hesap *">
              <select
                value={cashForm.accountId}
                onChange={(e) => setCashForm((f) => ({ ...f, accountId: e.target.value }))}
                aria-label="İşlem yapılacak hesap"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Hesap seçin…</option>
                {finAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.type}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cari (opsiyonel)">
              <Combobox
                ariaLabel="Cari"
                value={cashForm.cariId}
                placeholder="Cari seçilmedi"
                searchPlaceholder="Ünvan, telefon veya vergi no…"
                emptyText="Cari bulunamadı."
                options={accounts.map((a) => ({
                  value: a.id,
                  label: a.name,
                  keywords: `${a.type} ${a.phone ?? ""} ${a.taxNo ?? ""}`,
                  hint: `${a.type}${a.phone ? " · " + a.phone : ""}`,
                }))}
                onValueChange={(id) => setCashForm((f) => ({ ...f, cariId: id }))}
              />
            </Field>
            <Field label="Tutar (₺)">
              <Input
                value={cashForm.amount}
                onChange={(e) => setCashForm((f) => ({ ...f, amount: e.target.value }))}
                inputMode="decimal"
                aria-label="Tutar"
              />
            </Field>
            <Field label="Açıklama">
              <Input
                value={cashForm.desc}
                onChange={(e) => setCashForm((f) => ({ ...f, desc: e.target.value }))}
                placeholder="Ör. Günlük kasa tahsilatı"
                aria-label="Açıklama"
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCashTx(null)}>
                Vazgeç
              </Button>
              <Button type="submit">{cashTx === "in" ? "Tahsil Et" : "Ödemeyi Kaydet"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Teklif hazırla */}
      <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Teklif Hazırla — {statementOf?.name}</DialogTitle>
            <DialogDescription>
              Ürünleri seçin, birim fiyat / KDV / iskonto girin ve teklif fişi oluşturun.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-end gap-3">
            <Field label="Geçerlilik Tarihi">
              <Input
                type="date"
                value={quoteValid}
                onChange={(e) => setQuoteValid(e.target.value)}
                aria-label="Geçerlilik tarihi"
                className="h-9"
              />
            </Field>
            <Button
              size="sm"
              variant="secondary"
              className="gap-1"
              onClick={() => {
                const p = products[0];
                setQuoteLines((prev) => [
                  ...prev,
                  {
                    id: `q-${Date.now()}`,
                    productId: p?.id ?? "",
                    qty: "1",
                    price: String(p?.sell ?? 0),
                    vat: String(p?.vat ?? 10),
                    discount: "0",
                  },
                ]);
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Ürün Ekle
            </Button>
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto">
            {quoteLines.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Henüz ürün eklenmedi.
              </p>
            ) : (
              <div className="hidden gap-2 px-3 text-xs font-semibold text-muted-foreground sm:grid sm:grid-cols-[2fr_repeat(5,1fr)_auto]">
                <span>Ürün / Hizmet Seçimi</span>
                <span>Miktar</span>
                <span>Birim</span>
                <span>Birim Fiyat</span>
                <span>İskonto (%)</span>
                <span>KDV (%)</span>
                <span className="w-9" />
              </div>
            )}
            {quoteLines.map((l, i) => (
              <div
                key={l.id}
                className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[2fr_repeat(5,1fr)_auto]"
              >
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground sm:hidden">
                    Ürün / Hizmet Seçimi
                  </span>
                  <Combobox
                    ariaLabel="Ürün"
                    value={l.productId}
                    placeholder="Ürün arayın…"
                    searchPlaceholder="Ürün adı, stok kodu veya barkod…"
                    emptyText="Ürün bulunamadı."
                    options={products.map((p) => ({
                      value: p.id,
                      label: p.name,
                      keywords: `${p.barcode} ${categoryName(p.categoryId)}`,
                      hint: `${p.barcode ? p.barcode + " · " : ""}${TRY.format(p.sell)} · stok ${p.stock}`,
                    }))}
                    onValueChange={(id) => {
                      const p = products.find((x) => x.id === id);
                      setQuoteLines((prev) =>
                        prev.map((x, xi) =>
                          xi === i
                            ? {
                                ...x,
                                productId: id,
                                price: String(p?.sell ?? x.price),
                                vat: String(p?.vat ?? x.vat),
                              }
                            : x,
                        ),
                      );
                    }}
                  />
                </div>
                {(
                  [
                    ["qty", "Miktar"],
                    ["unitLabel", "Birim"],
                    ["price", "Birim Fiyat"],
                    ["discount", "İskonto (%)"],
                    ["vat", "KDV (%)"],
                  ] as const
                ).map(([key, label]) =>
                  key === "unitLabel" ? (
                    <div key={key} className="space-y-1">
                      <span className="text-xs text-muted-foreground sm:hidden">{label}</span>
                      <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-2 text-sm text-muted-foreground">
                        {products.find((p) => p.id === l.productId)?.unit ?? "adet"}
                      </div>
                    </div>
                  ) : (
                    <div key={key} className="space-y-1">
                      <span className="text-xs text-muted-foreground sm:hidden">{label}</span>
                      <Input
                        value={l[key]}
                        inputMode="decimal"
                        aria-label={label}
                        placeholder={label}
                        className="h-9"
                        onChange={(e) =>
                          setQuoteLines((prev) =>
                            prev.map((x, xi) => (xi === i ? { ...x, [key]: e.target.value } : x)),
                          )
                        }
                      />
                    </div>
                  ),
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Satırı sil"
                  onClick={() => setQuoteLines((prev) => prev.filter((_, xi) => xi !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="sm:col-span-7 flex justify-end border-t border-border pt-2 text-sm">
                  <span className="text-muted-foreground">Toplam Tutar:&nbsp;</span>
                  <span className="font-semibold tabular-nums">
                    {TRY.format(
                      (Number(l.qty.replace(",", ".")) || 0) *
                        (Number(l.price.replace(",", ".")) || 0) *
                        (1 - (Number(l.discount.replace(",", ".")) || 0) / 100) *
                        (1 + (Number(l.vat.replace(",", ".")) || 0) / 100),
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Ara Toplam {TRY.format(quoteTotals.net)} · KDV {TRY.format(quoteTotals.vat)}
            </span>
            <span className="text-lg font-bold tabular-nums">
              {TRY.format(quoteTotals.net + quoteTotals.vat)}
            </span>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteOpen(false)}>
              Kapat
            </Button>
            <Button className="gap-2" onClick={createQuotePdf}>
              <Printer className="h-4 w-4" /> Teklif Fişi (PDF)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cariOpen} onOpenChange={setCariOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Cari Ekle</DialogTitle>
            <DialogDescription>Müşteri veya tedarikçi kartı oluşturun.</DialogDescription>
          </DialogHeader>
          {null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Cari Tipi">
              <select
                value={cariForm.type}
                aria-label="Cari tipi"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                onChange={(e) =>
                  setCariForm((f) => ({ ...f, type: e.target.value as Account["type"] }))
                }
              >
                <option value="Müşteri">Müşteri</option>
                <option value="Tedarikçi">Tedarikçi</option>
              </select>
            </Field>
            <Field label="Firma / Şahıs Adı">
              <Input
                value={cariForm.name}
                onChange={(e) => setCariForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Yıldız Market"
              />
            </Field>
            <Field label="Vergi Dairesi">
              <Input
                value={cariForm.taxOffice}
                onChange={(e) => setCariForm((f) => ({ ...f, taxOffice: e.target.value }))}
                placeholder="Kadıköy V.D."
              />
            </Field>
            <Field label="Vergi No / TC No">
              <Input
                value={cariForm.taxNo}
                inputMode="numeric"
                onChange={(e) => setCariForm((f) => ({ ...f, taxNo: e.target.value }))}
                placeholder="1234567890"
              />
            </Field>
            <Field label="Telefon">
              <Input
                value={cariForm.phone}
                onChange={(e) => setCariForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="0532 000 00 00"
              />
            </Field>
            <Field label="E-posta">
              <Input
                type="email"
                value={cariForm.email}
                onChange={(e) => setCariForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="info@firma.com"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Adres">
                <Input
                  value={cariForm.address}
                  onChange={(e) => setCariForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Mahalle / Cadde / No / İlçe / İl"
                />
              </Field>
            </div>
            <Field label="Varsayılan Para Birimi">
              <select
                value={cariForm.currency}
                aria-label="Varsayılan para birimi"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                onChange={(e) => setCariForm((f) => ({ ...f, currency: e.target.value }))}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Açılış Bakiyesi">
              <Input
                value={cariForm.opening}
                inputMode="decimal"
                onChange={(e) => setCariForm((f) => ({ ...f, opening: e.target.value }))}
                placeholder="0,00"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCariOpen(false)}>
              Vazgeç
            </Button>
            <Button onClick={handleCreateAccount}>Cariyi Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fatura düzenleme */}
      <Dialog open={eEdit !== null} onOpenChange={(o) => !o && setEEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <DialogTitle>Fatura Düzenle — {eEdit?.no}</DialogTitle>
                <DialogDescription>
                  Belge bilgilerini ve ürün kalemlerini güncelleyin; toplam tutar kalemlerden
                  otomatik hesaplanır.
                </DialogDescription>
              </div>
              {eEdit && eEditForm.status === "Taslak" ? (
                <Button className="shrink-0 gap-2" onClick={() => setGibSendIds([eEdit.id])}>
                  <Send className="h-4 w-4" /> GİB'e Gönder
                </Button>
              ) : (
                <Badge className={`${eStatusClass(eEditForm.status)} shrink-0`}>
                  {eEditForm.status === "GİB Bekliyor" ? "Kuyrukta" : eEditForm.status}
                </Badge>
              )}
            </div>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Belge No">
              <Input
                value={eEditForm.no}
                onChange={(e) => setEEditForm((f) => ({ ...f, no: e.target.value }))}
                className="h-9"
              />
            </Field>
            <Field label="Cari">
              <Combobox
                ariaLabel="Cari"
                value={eEditForm.account}
                onValueChange={(v) => setEEditForm((f) => ({ ...f, account: v }))}
                placeholder="Cari arayın…"
                searchPlaceholder="Ünvan, telefon veya vergi no…"
                emptyText="Cari bulunamadı."
                options={accounts.map((a) => ({
                  value: a.name,
                  label: a.name,
                  keywords: `${a.type} ${a.phone ?? ""} ${a.taxNo ?? ""}`,
                  hint: `${a.type}${a.phone ? " · " + a.phone : ""}`,
                }))}
              />
            </Field>
            <Field label="Belge Türü">
              <select
                value={eEditForm.kind}
                onChange={(e) => setEEditForm((f) => ({ ...f, kind: e.target.value as EDocKind }))}
                aria-label="Belge türü"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {(["e-Fatura", "e-Arşiv Fatura", "e-İrsaliye"] as const).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Yön">
              <select
                value={eEditForm.dir}
                onChange={(e) =>
                  setEEditForm((f) => ({ ...f, dir: e.target.value as EInvoice["dir"] }))
                }
                aria-label="Yön"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="Giden">Giden</option>
                <option value="Gelen">Gelen</option>
              </select>
            </Field>
            <Field label="Tarih">
              <Input
                type="date"
                value={eEditForm.date}
                onChange={(e) => setEEditForm((f) => ({ ...f, date: e.target.value }))}
                className="h-9"
              />
            </Field>
            <Field label="Durum">
              <select
                value={eEditForm.status}
                onChange={(e) => setEEditForm((f) => ({ ...f, status: e.target.value as EStatus }))}
                aria-label="Durum"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {(["Taslak", "GİB Bekliyor", "Onaylandı"] as const).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Para Birimi">
              <select
                value={eEditForm.currency}
                onChange={(e) => setEEditForm((f) => ({ ...f, currency: e.target.value }))}
                aria-label="Para birimi"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            {eEditLines.length === 0 ? (
              <>
                <Field label="Matrah">
                  <Input
                    value={eEditForm.base}
                    inputMode="decimal"
                    onChange={(e) => setEEditForm((f) => ({ ...f, base: e.target.value }))}
                    className="h-9"
                  />
                </Field>
                <Field label="KDV">
                  <Input
                    value={eEditForm.vat}
                    inputMode="decimal"
                    onChange={(e) => setEEditForm((f) => ({ ...f, vat: e.target.value }))}
                    className="h-9"
                  />
                </Field>
              </>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Fatura Kalemleri
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-56">
                  <Combobox
                    ariaLabel="Stoktan ürün ekle"
                    value=""
                    placeholder="Stoktan ürün ekle…"
                    searchPlaceholder="Ürün adı, stok kodu veya barkod…"
                    emptyText="Ürün bulunamadı."
                    triggerClassName="h-8 text-xs"
                    footerAction={{
                      label: "Stokta Olmayan Ürün Ekle",
                      onSelect: (query) =>
                        setQuickProduct({
                          query,
                          apply: (p0) =>
                            setEEditLines((prev) => [
                              ...prev,
                              {
                                id: `el-${Date.now()}`,
                                name: p0.name,
                                qty: "1",
                                unit: p0.unit,
                                price: String(p0.sell),
                                vat: String(p0.vat),
                              },
                            ]),
                        }),
                    }}
                    options={products.map((p) => ({
                      value: p.id,
                      label: p.name,
                      keywords: `${p.barcode} ${categoryName(p.categoryId)}`,
                      hint: `${p.barcode ? p.barcode + " · " : ""}${TRY.format(p.sell)} · stok ${p.stock}`,
                    }))}
                    onValueChange={(id) => {
                      const p = products.find((x) => x.id === id);
                      if (!p) return;
                      setEEditLines((prev) => [
                        ...prev,
                        {
                          id: `el-${Date.now()}`,
                          name: p.name,
                          qty: "1",
                          unit: p.unit,
                          price: String(p.sell),
                          vat: String(p.vat),
                        },
                      ]);
                    }}
                  />
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1"
                  onClick={() =>
                    setEEditLines((prev) => [
                      ...prev,
                      {
                        id: `el-${Date.now()}`,
                        name: "",
                        qty: "1",
                        unit: "adet",
                        price: "",
                        vat: "20",
                      },
                    ])
                  }
                >
                  <Plus className="h-3.5 w-3.5" /> Satır Ekle
                </Button>
              </div>
            </div>
            {eEditLines.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                Bu faturada kalem kaydı yok. Kalem eklerseniz matrah ve KDV otomatik hesaplanır.
              </p>
            ) : (
              <div className="hidden gap-2 rounded-lg bg-muted/60 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-12">
                <span className="sm:col-span-4">Ürün Adı</span>
                <span className="sm:col-span-2">Miktar</span>
                <span className="sm:col-span-2">Birim Fiyat</span>
                <span className="sm:col-span-1">KDV (%)</span>
                <span className="text-right sm:col-span-3">Toplam</span>
              </div>
            )}
            {eEditLines.map((l, i) => (
              <div key={l.id} className="grid grid-cols-2 gap-2 sm:grid-cols-12">
                <ProductPicker
                  className="sm:col-span-4"
                  ariaLabel={`Kalem ${i + 1}`}
                  products={pickableProducts}
                  value={l.name}
                  onCreateNew={(query) =>
                    setQuickProduct({
                      query,
                      apply: (p0) =>
                        setEEditLines((prev) =>
                          prev.map((x) =>
                            x.id === l.id
                              ? {
                                  ...x,
                                  name: p0.name,
                                  unit: p0.unit,
                                  price: String(p0.sell),
                                  vat: String(p0.vat),
                                }
                              : x,
                          ),
                        ),
                    })
                  }
                  onPick={(p0) =>
                    setEEditLines((prev) =>
                      prev.map((x) =>
                        x.id === l.id
                          ? {
                              ...x,
                              name: p0.name,
                              unit: p0.unit,
                              price: String(p0.sell),
                              vat: String(p0.vat),
                            }
                          : x,
                      ),
                    )
                  }
                />
                <Input
                  className="h-9 sm:col-span-2"
                  placeholder="Miktar"
                  inputMode="decimal"
                  aria-label={`Kalem ${i + 1} miktar`}
                  value={l.qty}
                  onChange={(e) =>
                    setEEditLines((prev) =>
                      prev.map((x) => (x.id === l.id ? { ...x, qty: e.target.value } : x)),
                    )
                  }
                />
                <Input
                  className="h-9 sm:col-span-2"
                  placeholder="Birim Fiyat"
                  inputMode="decimal"
                  aria-label={`Kalem ${i + 1} fiyat`}
                  value={l.price}
                  onChange={(e) =>
                    setEEditLines((prev) =>
                      prev.map((x) => (x.id === l.id ? { ...x, price: e.target.value } : x)),
                    )
                  }
                />
                <Input
                  className="h-9 sm:col-span-1"
                  placeholder="KDV %"
                  inputMode="decimal"
                  aria-label={`Kalem ${i + 1} KDV`}
                  value={l.vat}
                  onChange={(e) =>
                    setEEditLines((prev) =>
                      prev.map((x) => (x.id === l.id ? { ...x, vat: e.target.value } : x)),
                    )
                  }
                />
                <div className="flex items-center justify-end gap-1 sm:col-span-3">
                  <span className="text-xs font-semibold tabular-nums">
                    {fmtMoney(
                      (Number(String(l.qty).replace(",", ".")) || 0) *
                        (Number(String(l.price).replace(",", ".")) || 0) *
                        (1 + (Number(String(l.vat).replace(",", ".")) || 0) / 100),
                      eEditForm.currency,
                    )}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Satırı sil"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setEEditLines((prev) => prev.filter((x) => x.id !== l.id))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-muted/50 px-4 py-3 text-right text-sm font-bold">
            Genel Toplam:{" "}
            {fmtMoney(
              eEditLines.length > 0
                ? eEditLines.reduce(
                    (s, l) =>
                      s +
                      (Number(String(l.qty).replace(",", ".")) || 0) *
                        (Number(String(l.price).replace(",", ".")) || 0) *
                        (1 + (Number(String(l.vat).replace(",", ".")) || 0) / 100),
                    0,
                  )
                : (Number(String(eEditForm.base).replace(",", ".")) || 0) +
                    (Number(String(eEditForm.vat).replace(",", ".")) || 0),
              eEditForm.currency,
            )}
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            {canPerm("muhasebe") ? (
              <Button variant="ghost" className="text-destructive" onClick={handleDeleteEDoc}>
                <Trash2 className="mr-1 h-4 w-4" /> Faturayı Sil
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEEdit(null)}>
                Vazgeç
              </Button>
              <Button onClick={handleSaveEDoc}>Değişiklikleri Kaydet</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Teklif oluştur / düzenle */}
      <Dialog open={quoteEditOpen} onOpenChange={setQuoteEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editingQuote ? `Teklifi Düzenle — ${qForm.no}` : "Yeni Teklif"}
            </DialogTitle>
            <DialogDescription>
              Kalemleri girin, kaydedin ve tek tıkla yazdırın veya satışa çevirin.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Teklif No">
              <Input
                value={qForm.no}
                onChange={(e) => setQForm((f) => ({ ...f, no: e.target.value }))}
                className="h-9"
              />
            </Field>
            <Field label="Cari">
              <Combobox
                ariaLabel="Cari"
                value={qForm.cariId}
                placeholder={qForm.account || "Cari arayın…"}
                searchPlaceholder="Ünvan, telefon veya vergi no…"
                emptyText="Cari bulunamadı."
                options={accounts.map((a) => ({
                  value: a.id,
                  label: a.name,
                  keywords: `${a.type} ${a.phone ?? ""} ${a.taxNo ?? ""}`,
                  hint: `${a.type}${a.phone ? " · " + a.phone : ""}`,
                }))}
                onValueChange={(id) => {
                  const acc = accounts.find((a) => a.id === id);
                  setQForm((f) => ({ ...f, cariId: id, account: acc?.name ?? f.account }));
                }}
              />
            </Field>
            <Field label="Teklif Tarihi">
              <Input
                type="date"
                value={qForm.date}
                onChange={(e) => setQForm((f) => ({ ...f, date: e.target.value }))}
                className="h-9"
              />
            </Field>
            <Field label="Geçerlilik Tarihi">
              <Input
                type="date"
                value={qForm.validUntil}
                onChange={(e) => setQForm((f) => ({ ...f, validUntil: e.target.value }))}
                className="h-9"
              />
            </Field>
            <Field label="Para Birimi">
              <select
                value={qForm.currency}
                aria-label="Teklif para birimi"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                onChange={(e) => setQForm((f) => ({ ...f, currency: e.target.value }))}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Teklif Kalemleri
              </span>
              <div className="flex gap-2">
                <div className="w-56">
                  <Combobox
                    ariaLabel="Stoktan ürün ekle"
                    value=""
                    placeholder="Stoktan ürün ekle…"
                    searchPlaceholder="Ürün adı, stok kodu veya barkod…"
                    emptyText="Ürün bulunamadı."
                    triggerClassName="h-8 text-xs"
                    footerAction={{
                      label: "Stokta Olmayan Ürün Ekle",
                      onSelect: (query) =>
                        setQuickProduct({
                          query,
                          apply: (p0) =>
                            setQLines((prev) => [
                              ...prev,
                              {
                                id: `ql-${Date.now()}`,
                                name: p0.name,
                                qty: "1",
                                unit: p0.unit,
                                price: String(p0.sell),
                                vat: String(p0.vat),
                                discount: "0",
                              },
                            ]),
                        }),
                    }}
                    options={products.map((p) => ({
                      value: p.id,
                      label: p.name,
                      keywords: `${p.barcode} ${categoryName(p.categoryId)}`,
                      hint: `${p.barcode ? p.barcode + " · " : ""}${TRY.format(p.sell)} · stok ${p.stock}`,
                    }))}
                    onValueChange={(id) => {
                      const p = products.find((x) => x.id === id);
                      if (!p) return;
                      setQLines((prev) => [
                        ...prev,
                        {
                          id: `ql-${Date.now()}`,
                          name: p.name,
                          qty: "1",
                          unit: p.unit,
                          price: String(p.sell),
                          vat: String(p.vat),
                          discount: "0",
                        },
                      ]);
                    }}
                  />
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1"
                  onClick={() =>
                    setQLines((prev) => [
                      ...prev,
                      {
                        id: `ql-${Date.now()}`,
                        name: "",
                        qty: "1",
                        unit: "adet",
                        price: "",
                        vat: "20",
                        discount: "0",
                      },
                    ])
                  }
                >
                  <Plus className="h-3.5 w-3.5" /> Satır Ekle
                </Button>
              </div>
            </div>
            {qLines.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                Henüz kalem yok.
              </p>
            ) : (
              <div className="hidden gap-2 rounded-lg bg-muted/60 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-12">
                <span className="sm:col-span-4">Ürün Adı</span>
                <span className="sm:col-span-1">Miktar</span>
                <span className="sm:col-span-1">Birim</span>
                <span className="sm:col-span-2">Birim Fiyat</span>
                <span className="sm:col-span-1">İsk (%)</span>
                <span className="sm:col-span-1">KDV (%)</span>
                <span className="text-right sm:col-span-2">Toplam</span>
              </div>
            )}
            {qLines.map((l, i) => (
              <div key={l.id} className="grid grid-cols-2 gap-2 sm:grid-cols-12">
                <ProductPicker
                  className="sm:col-span-4"
                  ariaLabel={`Kalem ${i + 1}`}
                  products={pickableProducts}
                  value={l.name}
                  onCreateNew={(query) =>
                    setQuickProduct({
                      query,
                      apply: (p0) =>
                        setQLines((prev) =>
                          prev.map((x) =>
                            x.id === l.id
                              ? {
                                  ...x,
                                  name: p0.name,
                                  unit: p0.unit,
                                  price: String(p0.sell),
                                  vat: String(p0.vat),
                                }
                              : x,
                          ),
                        ),
                    })
                  }
                  onPick={(p0) =>
                    setQLines((prev) =>
                      prev.map((x) =>
                        x.id === l.id
                          ? {
                              ...x,
                              name: p0.name,
                              unit: p0.unit,
                              price: String(p0.sell),
                              vat: String(p0.vat),
                            }
                          : x,
                      ),
                    )
                  }
                />
                <Input
                  className="h-9 sm:col-span-1"
                  placeholder="Adet"
                  aria-label={`Kalem ${i + 1} miktar`}
                  value={l.qty}
                  onChange={(e) =>
                    setQLines((prev) =>
                      prev.map((x) => (x.id === l.id ? { ...x, qty: e.target.value } : x)),
                    )
                  }
                />
                <Input
                  className="h-9 sm:col-span-1"
                  placeholder="Birim"
                  aria-label={`Kalem ${i + 1} birim`}
                  value={l.unit}
                  onChange={(e) =>
                    setQLines((prev) =>
                      prev.map((x) => (x.id === l.id ? { ...x, unit: e.target.value } : x)),
                    )
                  }
                />
                <Input
                  className="h-9 sm:col-span-2"
                  placeholder="Birim Fiyat"
                  aria-label={`Kalem ${i + 1} fiyat`}
                  value={l.price}
                  onChange={(e) =>
                    setQLines((prev) =>
                      prev.map((x) => (x.id === l.id ? { ...x, price: e.target.value } : x)),
                    )
                  }
                />
                <Input
                  className="h-9 sm:col-span-1"
                  placeholder="İsk %"
                  aria-label={`Kalem ${i + 1} iskonto`}
                  value={l.discount}
                  onChange={(e) =>
                    setQLines((prev) =>
                      prev.map((x) => (x.id === l.id ? { ...x, discount: e.target.value } : x)),
                    )
                  }
                />
                <Input
                  className="h-9 sm:col-span-1"
                  placeholder="KDV %"
                  aria-label={`Kalem ${i + 1} KDV`}
                  value={l.vat}
                  onChange={(e) =>
                    setQLines((prev) =>
                      prev.map((x) => (x.id === l.id ? { ...x, vat: e.target.value } : x)),
                    )
                  }
                />
                <div className="flex items-center justify-end gap-1 sm:col-span-2">
                  <span className="text-xs font-semibold tabular-nums">
                    {fmtMoney(
                      (Number(String(l.qty).replace(",", ".")) || 0) *
                        (Number(String(l.price).replace(",", ".")) || 0) *
                        (1 - (Number(l.discount) || 0) / 100) *
                        (1 + (Number(l.vat) || 0) / 100),
                      qForm.currency,
                    )}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Satırı sil"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setQLines((prev) => prev.filter((x) => x.id !== l.id))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Field label="Şartlar & Koşullar (teklif çıktısının altında yer alır)">
            <Textarea
              value={qForm.terms}
              onChange={(e) => setQForm((f) => ({ ...f, terms: e.target.value }))}
              rows={5}
            />
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3">
            <div className="text-xs text-muted-foreground">
              Ara Toplam {fmtMoney(qTotals.subtotal, qForm.currency)} · KDV{" "}
              {fmtMoney(qTotals.vatTotal, qForm.currency)}
            </div>
            <div className="text-lg font-bold">{fmtMoney(qTotals.total, qForm.currency)}</div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <select
                value={qForm.status}
                aria-label="Teklif durumu"
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                onChange={(e) =>
                  setQForm((f) => ({ ...f, status: e.target.value as Quote["status"] }))
                }
              >
                {(["Taslak", "Gönderildi", "Satışa Çevrildi"] as const).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  const q = buildQuote();
                  if (q) void handlePrintQuote(q);
                }}
              >
                <Printer className="h-4 w-4" /> Yazdır / PDF İndir
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setQuoteEditOpen(false)}>
                Vazgeç
              </Button>
              <Button onClick={handleSaveQuote}>Teklifi Kaydet</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cari bilgilerini güncelle */}
      <Dialog open={editCari !== null} onOpenChange={(o) => !o && setEditCari(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cari Bilgilerini Güncelle</DialogTitle>
            <DialogDescription>{editCari?.name} kartındaki bilgileri düzenleyin.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Firma / Şahıs Adı">
              <Input
                value={editCariForm.name}
                onChange={(e) => setEditCariForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Field>
            <Field label="Cari Tipi">
              <select
                value={editCariForm.type}
                aria-label="Cari tipi"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                onChange={(e) =>
                  setEditCariForm((f) => ({ ...f, type: e.target.value as Account["type"] }))
                }
              >
                <option value="Müşteri">Müşteri</option>
                <option value="Tedarikçi">Tedarikçi</option>
              </select>
            </Field>
            <Field label="TC / Vergi No">
              <Input
                value={editCariForm.taxNo}
                inputMode="numeric"
                onChange={(e) => setEditCariForm((f) => ({ ...f, taxNo: e.target.value }))}
              />
            </Field>
            <Field label="Vergi Dairesi">
              <Input
                value={editCariForm.taxOffice}
                onChange={(e) => setEditCariForm((f) => ({ ...f, taxOffice: e.target.value }))}
                placeholder="Kadıköy V.D."
              />
            </Field>
            <Field label="Varsayılan Para Birimi">
              <select
                value={editCariForm.currency}
                aria-label="Varsayılan para birimi"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                onChange={(e) => setEditCariForm((f) => ({ ...f, currency: e.target.value }))}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Telefon">
              <Input
                value={editCariForm.phone}
                onChange={(e) => setEditCariForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </Field>
            <Field label="E-posta">
              <Input
                type="email"
                value={editCariForm.email}
                onChange={(e) => setEditCariForm((f) => ({ ...f, email: e.target.value }))}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Adres">
                <Input
                  value={editCariForm.address}
                  onChange={(e) => setEditCariForm((f) => ({ ...f, address: e.target.value }))}
                />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCari(null)}>
              Vazgeç
            </Button>
            <Button onClick={handleUpdateAccount}>Değişiklikleri Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mali hesap detayı & düzenle */}
      <Dialog open={editFin !== null} onOpenChange={(o) => !o && setEditFin(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hesap Detayı & Düzenle</DialogTitle>
            <DialogDescription>
              {editFin ? `${editFin.type} · Güncel bakiye: ${TRY.format(editFin.balance)}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Hesap Adı">
              <Input
                value={editFinForm.name}
                onChange={(e) => setEditFinForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Field>
            <Field label="Hesap Türü">
              <select
                value={editFinForm.type}
                aria-label="Hesap türü"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                onChange={(e) =>
                  setEditFinForm((f) => ({ ...f, type: e.target.value as FinAccountType }))
                }
              >
                {FIN_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="IBAN / Hesap No">
              <Input
                value={editFinForm.detail}
                onChange={(e) => setEditFinForm((f) => ({ ...f, detail: e.target.value }))}
                placeholder="TR00 0000 0000 0000"
              />
            </Field>
            <Field label="Açıklama">
              <Input
                value={editFinForm.note}
                onChange={(e) => setEditFinForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Kısa açıklama"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFin(null)}>
              Vazgeç
            </Button>
            <Button onClick={handleUpdateFinAccount}>Güncelle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!invoiceDetail} onOpenChange={(o) => !o && setInvoiceDetail(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Fatura Detayı — {invoiceDetail?.no}</DialogTitle>
            <DialogDescription>
              {invoiceDetail
                ? `${invoiceDetail.type} faturası · ${invoiceDetail.account} · ${invoiceDetail.date} · ${invoiceDetail.status}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {invoiceDetail ? (
            <>
              <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kalem</TableHead>
                      <TableHead className="text-right">Miktar</TableHead>
                      <TableHead className="text-right">Birim Fiyat</TableHead>
                      <TableHead className="text-right">İskonto</TableHead>
                      <TableHead className="text-right">KDV</TableHead>
                      <TableHead className="text-right">Tutar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceDetail.items.map((it, idx) => (
                      <TableRow key={`${it.name}-${idx}`}>
                        <TableCell className="font-medium">{it.name}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {it.qty} {it.unit}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {TRY.format(it.price)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">%{it.discount}</TableCell>
                        <TableCell className="text-right tabular-nums">%{it.vat}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {TRY.format(
                            r2(it.qty * it.price * (1 - it.discount / 100) * (1 + it.vat / 100)),
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-1 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
                {(() => {
                  const t = itemTotals(invoiceDetail.items);
                  return (
                    <>
                      <Row label="Ara Toplam" value={TRY.format(t.net)} />
                      <Row label="Toplam İskonto" value={TRY.format(t.discount)} />
                      <Row label="Toplam KDV" value={TRY.format(t.vat)} />
                      <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold">
                        <span>Genel Toplam</span>
                        <span className="tabular-nums">{TRY.format(t.gross)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDetail(null)}>
              Kapat
            </Button>
            <Button className="gap-2" onClick={() => invoiceDetail && printInvoice(invoiceDetail)}>
              <Printer className="h-4 w-4" /> Faturayı Yazdır / PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MuhasebeShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="border-b border-border px-5 py-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ürün adı, barkod, müşteri adı veya fiş/fatura no ile ara..."
          aria-label="Ara"
          className="pl-9"
        />
      </div>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  tone: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={`w-full rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
        onClick ? "cursor-pointer hover:border-primary/40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
    </Comp>
  );
}

function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow duration-300 hover:shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="w-full overflow-x-auto">{children}</div>
    </div>
  );
}
