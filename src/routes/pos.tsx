import { ModuleGuard } from "@/components/subscription/ModuleGuard";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { PinGate } from "@/components/panel/PinGate";
import {
  useSellableCatalog,
  useCatalogCategories,
  decreaseStock,
  type CatalogProduct,
} from "@/lib/catalog-store";
import { Combobox } from "@/components/ui/combobox";
import { useAccountSelection, useCariler, postCashIncome, postCariDebt } from "@/lib/settlement";
import { useCategoryResolver } from "@/lib/categories-store";
import { ReceiptModal, type ReceiptData } from "@/components/receipt/ReceiptModal";
import { printElementById } from "@/lib/print-receipt";
import { RecentSalesButton } from "@/components/receipt/RecentSalesButton";
import { pushRecentReceipt } from "@/lib/recent-receipts";
import type { Staff } from "@/lib/panel-store";
import {
  Apple,
  Cherry,
  Bean,
  Milk,
  Minus,
  Plus,
  Trash2,
  Receipt as ReceiptIcon,
  ShoppingCart,
  CreditCard,
  ChefHat,
  ScanLine,
  X,
  ArrowLeft,
  LayoutDashboard,
  LogOut,
  Percent,
  PauseCircle,
  Banknote,
  UserSquare2,
  Search,
  PackageX,
} from "lucide-react";

export const Route = createFileRoute("/pos")({
  head: () => ({
    meta: [
      { title: "Bilirim ERP — Hızlı Perakende & Barkod Satış Kasası" },
      {
        name: "description",
        content:
          "Barkod okuyucu destekli hızlı perakende kasa ekranı: kategori bazlı ürün seçimi, sepet, indirim, nakit/kart/veresiye ödeme ve otomatik stok düşümü.",
      },
      { property: "og:title", content: "Bilirim ERP — Satış Kasası" },
      {
        property: "og:description",
        content: "Hızlı perakende satış, barkod okutma ve anlık sepet yönetimi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <ModuleGuard module="pos">
      <PosRoute />
    </ModuleGuard>
  ),
});

type ProductColor = CatalogProduct["color"];

type CartItem = {
  id: string;
  productId?: string;
  name: string;
  price: number;
  unit: string;
  color: ProductColor;
  quantity: number;
};

type HeldSale = { id: string; at: string; items: CartItem[] };

type Discount = { type: "percent" | "amount"; value: number };

type PaymentMethod = "card" | "cash" | "credit";

type Receipt = {
  no: number;
  date: Date;
  items: { name: string; quantity: number; unit: string; price: number }[];
  subtotal: number;
  discount: number;
  kdv: number;
  total: number;
  method: PaymentMethod;
  cashGiven?: number | undefined;
  customer?: string | undefined;
};

const ICON_BY_COLOR: Record<ProductColor, React.ReactNode> = {
  apple: <Apple className="h-7 w-7" />,
  tomato: <Cherry className="h-7 w-7" />,
  cashew: <Bean className="h-7 w-7" />,
  cheese: <Milk className="h-7 w-7" />,
};

const COLOR_STYLES: Record<ProductColor, { card: string; badge: string }> = {
  apple: {
    card: "bg-pos-apple/15 text-pos-apple-foreground hover:bg-pos-apple/25 border-pos-apple/30",
    badge: "bg-pos-apple text-pos-apple-foreground",
  },
  tomato: {
    card: "bg-pos-tomato/15 text-pos-tomato-foreground hover:bg-pos-tomato/25 border-pos-tomato/30",
    badge: "bg-pos-tomato text-pos-tomato-foreground",
  },
  cashew: {
    card: "bg-pos-cashew/15 text-pos-cashew-foreground hover:bg-pos-cashew/25 border-pos-cashew/30",
    badge: "bg-pos-cashew text-pos-cashew-foreground",
  },
  cheese: {
    card: "bg-pos-cheese/15 text-pos-cheese-foreground hover:bg-pos-cheese/25 border-pos-cheese/30",
    badge: "bg-pos-cheese text-pos-cheese-foreground",
  },
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  card: "Kredi Kartı",
  cash: "Nakit",
  credit: "Cari / Veresiye",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(value);
}

const norm = (s: string) => s.toLocaleLowerCase("tr").trim();

/**
 * Tartılı ürün barkodu (EAN-13, "28" öneki): 28 | ürün kodu | tutar
 */
const SCALE_ITEMS: Record<string, { name: string; color: ProductColor }> = {
  "12340": { name: "Domates (Tartılı)", color: "tomato" },
  "12341": { name: "Elma (Tartılı)", color: "apple" },
  "12342": { name: "Kaju (Tartılı)", color: "cashew" },
  "12343": { name: "Peynir (Tartılı)", color: "cheese" },
};

function parseScaleBarcode(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits.startsWith("28") || digits.length < 10) return null;
  const itemCode = digits.slice(2, 7);
  const amount =
    digits.length >= 13 ? Number(digits.slice(7, 12)) / 100 : Number(digits.slice(-5)) / 10;
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { itemCode, amount, digits };
}

function PosRoute() {
  return (
    <PinGate requiredPerm="pos.openTable" hint="Demo PIN: 1234 (Yönetici) · 2222 (Kasiyer)">
      {(session, logout) => <PosScreen session={session} onLogout={logout} />}
    </PinGate>
  );
}

function PosScreen({ session, onLogout }: { session: Staff; onLogout: () => void }) {
  const catalog = useSellableCatalog();
  const categories = useCatalogCategories();
  const catName = useCategoryResolver();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [discount, setDiscount] = useState<Discount | null>(null);
  const [held, setHeld] = useState<HeldSale[]>([]);
  const [ticketNo, setTicketNo] = useState<number | null>(null);

  const [discountOpen, setDiscountOpen] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod | null>(null);
  const [cashGiven, setCashGiven] = useState<number>(0);
  const { accounts, selectedId: accountId, select: selectAccount } = useAccountSelection();
  const cariler = useCariler();
  const [cariId, setCariId] = useState<string>("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const modalOpen = discountOpen || heldOpen || payMethod !== null || receipt !== null;

  useEffect(() => {
    setTicketNo(Math.floor(1000 + Math.random() * 9000));
  }, []);

  /** Barkod tabancası için sürekli odak */
  const focusScanner = useCallback(() => {
    if (modalOpen) return;
    inputRef.current?.focus();
  }, [modalOpen]);

  useEffect(() => {
    focusScanner();
    const id = window.setInterval(focusScanner, 1200);
    return () => window.clearInterval(id);
  }, [focusScanner]);

  const shownProducts = useMemo(() => {
    const q = norm(query);
    return catalog.filter((p) => {
      const cat = catName(p.category);
      const catOk = !activeCategory || cat === activeCategory;
      const qOk =
        !q || norm(p.name).includes(q) || (p.barcode ?? "").includes(q) || norm(cat).includes(q);
      return catOk && qOk;
    });
  }, [catalog, activeCategory, query, catName]);

  const step = (unit: string) => (norm(unit) === "kg" ? 0.5 : 1);

  const addProduct = (product: CatalogProduct) => {
    const inc = step(product.unit);
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: Number((i.quantity + inc).toFixed(3)) }
            : i,
        );
      }
      return [
        ...prev,
        {
          id: `l-${product.id}`,
          productId: product.id,
          name: product.name,
          price: product.price,
          unit: product.unit,
          color: product.color,
          quantity: inc,
        },
      ];
    });
  };

  const updateQuantity = (id: string, dir: 1 | -1) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.id === id
            ? {
                ...i,
                quantity: Number(Math.max(0, i.quantity + dir * step(i.unit)).toFixed(3)),
              }
            : i,
        )
        .filter((i) => i.quantity > 0),
    );
  };

  const removeItem = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));

  const totals = useMemo(() => {
    const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const discountAmount = !discount
      ? 0
      : discount.type === "percent"
        ? (subtotal * discount.value) / 100
        : Math.min(discount.value, subtotal);
    const net = Math.max(0, subtotal - discountAmount);
    return { subtotal, discountAmount, net, lines: cart.length };
  }, [cart, discount]);

  /** Barkod / arama gönderimi */
  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = query.trim();
    if (!raw) return;

    const parsed = parseScaleBarcode(raw);
    if (parsed) {
      const meta = SCALE_ITEMS[parsed.itemCode] ?? {
        name: `Tartılı Ürün ${parsed.itemCode}`,
        color: "apple" as ProductColor,
      };
      setCart((prev) => [
        ...prev,
        {
          id: `bc-${parsed.digits}-${Date.now()}`,
          name: meta.name,
          price: parsed.amount,
          unit: "adet",
          color: meta.color,
          quantity: 1,
        },
      ]);
      toast.success(`${meta.name} sepete eklendi`, {
        description: `Barkod ${parsed.digits} · ${formatCurrency(parsed.amount)}`,
      });
      setQuery("");
      focusScanner();
      return;
    }

    const q = norm(raw);
    const found =
      catalog.find((p) => (p.barcode ?? "") === raw) ??
      catalog.find((p) => norm(p.name) === q) ??
      catalog.find((p) => norm(p.name).includes(q));

    if (found) {
      addProduct(found);
      toast.success(`${found.name} sepete eklendi`);
      setQuery("");
      focusScanner();
      return;
    }

    toast.error("Ürün bulunamadı", {
      description: "Barkodu kontrol edin veya soldaki karttan seçin.",
    });
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setDiscount(null);
    toast.info("Sepet boşaltıldı.");
  };

  const holdSale = () => {
    if (cart.length === 0) {
      toast.error("Askıya alınacak ürün yok.");
      return;
    }
    setHeld((prev) => [
      {
        id: `h-${Date.now()}`,
        at: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
        items: cart,
      },
      ...prev,
    ]);
    setCart([]);
    setDiscount(null);
    toast.success("Satış askıya alındı.");
  };

  const resumeSale = (sale: HeldSale) => {
    setCart(sale.items);
    setHeld((prev) => prev.filter((h) => h.id !== sale.id));
    setHeldOpen(false);
    toast.success("Askıdaki satış geri yüklendi.");
  };

  const openPayment = (method: PaymentMethod) => {
    if (cart.length === 0) {
      toast.error("Sepet boş");
      return;
    }
    setCashGiven(method === "cash" ? 0 : totals.net);
    setCariId("");
    setPayMethod(method);
  };

  const completeSale = (method: PaymentMethod, given?: number) => {
    const desc = `POS Satış #${ticketNo ?? 0} · ${METHOD_LABEL[method]}`;
    if (method === "credit") {
      if (!cariId) {
        toast.error("Önce bir cari hesap seçin.");
        return;
      }
    } else if (!accountId) {
      toast.error("Önce bir kasa / banka hesabı seçin.");
      return;
    }
    const kdvRate = 0.01;
    const kdv = totals.net - totals.net / (1 + kdvRate);

    // Stok düşümü (Ürünler & Stok)
    const stockLines = cart
      .filter((i) => i.productId)
      .map((i) => ({ id: i.productId as string, quantity: i.quantity }));
    if (stockLines.length) decreaseStock(stockLines);

    // Ön Muhasebe entegrasyonu
    const cariName = cariler.find((c) => c.id === cariId)?.name ?? "";
    if (method === "credit") {
      void postCariDebt({ cariId, amount: totals.net, description: desc });
    } else {
      void postCashIncome({ accountId, amount: totals.net, description: desc });
    }

    const saleDate = new Date();
    setReceipt({
      no: ticketNo ?? 1000,
      date: saleDate,
      items: cart.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        price: i.price,
      })),
      subtotal: totals.net - kdv,
      discount: totals.discountAmount,
      kdv,
      total: totals.net,
      method,
      cashGiven: given,
      customer: cariName || undefined,
    });

    pushRecentReceipt("pos", {
      date: saleDate,
      no: ticketNo ?? 1000,
      title: "FİŞ NO",
      staff: session.name,
      customer: cariName || undefined,
      items: cart.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        price: i.price,
        kdvRate: 1,
      })),
      discount: totals.discountAmount,
      paymentLabel: METHOD_LABEL[method],
      received: method === "cash" ? given : undefined,
    });

    setCart([]);
    setDiscount(null);
    setPayMethod(null);
    toast.success(`Satış tamamlandı · ${formatCurrency(totals.net)}`, {
      description:
        method === "credit"
          ? `Tutar ${cariName} carisine borç olarak işlendi.`
          : "Stok düşüldü ve tutar seçilen kasaya gelir olarak işlendi.",
    });
  };

  const closeReceipt = () => {
    setReceipt(null);
    setTicketNo(Math.floor(1000 + Math.random() * 9000));
    focusScanner();
  };

  const printReceipt = () => {
    toast.info("Fiş Yazdırılıyor...");
    window.setTimeout(() => {
      printElementById("thermal-receipt");
    }, 200);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/80 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8 print:hidden">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Modül Seçimi</span>
            </Link>
            <Link
              to="/panel"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Yönetim Paneli</span>
            </Link>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground pos-shadow">
              <ChefHat className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                Bilirim ERP
              </h1>
              <p className="text-xs text-muted-foreground">Hızlı Perakende & Barkod</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RecentSalesButton source="pos" />
            <div className="hidden items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground sm:flex">
              <ReceiptIcon className="h-4 w-4" />
              <span>Fiş #{ticketNo ?? "----"}</span>
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-foreground">{session.name}</p>
              <p className="text-xs text-muted-foreground">{session.role}</p>
            </div>
            <button
              onClick={onLogout}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Oturumu Kapat</span>
            </button>
          </div>
        </div>

        {/* Barkod / arama */}
        <form onSubmit={handleScan} className="mx-auto mt-3 flex max-w-[1600px] items-center gap-2">
          <div className="relative flex-1">
            <ScanLine className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
            <input
              ref={inputRef}
              value={query}
              autoFocus
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => window.setTimeout(focusScanner, 150)}
              placeholder="Barkod Okut veya Ürün Ara..."
              aria-label="Barkod Okut veya Ürün Ara"
              className="w-full rounded-2xl border-2 border-primary/40 bg-background py-3.5 pl-11 pr-28 text-base font-medium text-foreground outline-none transition-shadow placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/15"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground sm:block">
              Enter = Sepete Ekle
            </span>
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Ekle</span>
          </button>
        </form>
      </header>

      {/* Main */}
      <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 print:hidden">
        <div className="mx-auto grid max-w-[1600px] gap-5 lg:grid-cols-[1.5fr_1fr] lg:gap-6">
          {/* Sol: ürün seçimi */}
          <section className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCategory(null)}
                className={`rounded-full border border-border px-4 py-2 text-sm font-semibold transition-colors ${
                  activeCategory === null
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground hover:bg-accent"
                }`}
              >
                Tümü
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full border border-border px-4 py-2 text-sm font-semibold transition-colors ${
                    activeCategory === category
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-foreground hover:bg-accent"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground sm:text-lg">
                Hızlı Ürün Seçimi
              </h2>
              <span className="text-sm text-muted-foreground">{shownProducts.length} ürün</span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {shownProducts.map((product) => {
                const styles = COLOR_STYLES[product.color];
                const out = product.stock <= 0;
                return (
                  <button
                    key={product.id}
                    onClick={() => addProduct(product)}
                    disabled={out}
                    className={`group relative flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all pos-card-press pos-shadow disabled:cursor-not-allowed disabled:opacity-50 ${styles.card}`}
                  >
                    <div
                      className={`grid h-12 w-12 place-items-center rounded-xl ${styles.badge} pos-shadow`}
                    >
                      {ICON_BY_COLOR[product.color]}
                    </div>
                    <div className="w-full">
                      <h3 className="line-clamp-2 text-base font-bold leading-tight">
                        {product.name}
                      </h3>
                      <p className="mt-1 flex items-center gap-1 text-xs font-medium opacity-80">
                        {out ? (
                          <>
                            <PackageX className="h-3.5 w-3.5" /> Stok yok
                          </>
                        ) : (
                          <>
                            Stok: {product.stock.toLocaleString("tr-TR")} {product.unit}
                          </>
                        )}
                      </p>
                      <p className="mt-1.5 text-xl font-black tracking-tight">
                        {formatCurrency(product.price)}
                        <span className="ml-1 text-xs font-semibold opacity-70">
                          /{product.unit}
                        </span>
                      </p>
                    </div>
                    <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
                      <Plus className="h-5 w-5" />
                    </div>
                  </button>
                );
              })}
              {shownProducts.length === 0 && (
                <p className="col-span-full rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                  Eşleşen ürün yok.
                </p>
              )}
            </div>
          </section>

          {/* Sağ: sepet */}
          <section className="flex flex-col rounded-3xl border border-border bg-card pos-shadow-lg lg:sticky lg:top-[152px] lg:max-h-[calc(100vh-172px)]">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">Aktif Sepet</h2>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                {totals.lines} kalem
              </span>
            </div>

            <div className="min-h-[140px] flex-1 space-y-1.5 overflow-auto px-3 py-3">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted">
                    <ScanLine className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Barkod okutun veya soldan ürün seçin.
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border bg-background p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="truncate font-semibold text-foreground">{item.name}</h4>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(item.price)} / {item.unit}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card transition-colors hover:bg-accent"
                          aria-label="Azalt"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-[3.5ch] text-center text-sm font-bold tabular-nums">
                          {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1)}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card transition-colors hover:bg-accent"
                          aria-label="Artır"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="ml-1 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Satırı sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Sepet işlemleri */}
            <div className="grid grid-cols-3 gap-2 border-t border-border px-3 py-3">
              <button
                onClick={clearCart}
                className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
              >
                <Trash2 className="h-4 w-4" />
                Sepeti Boşalt
              </button>
              <button
                onClick={() => (cart.length ? holdSale() : setHeldOpen(true))}
                className="relative flex flex-col items-center gap-1 rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
              >
                <PauseCircle className="h-4 w-4" />
                {cart.length ? "Askıya Al" : "Bekleyenler"}
                {held.length > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {held.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setDiscountOpen(true)}
                disabled={!session.perms.includes("pos.discount")}
                className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-40"
              >
                <Percent className="h-4 w-4" />
                İndirim Uygula
              </button>
            </div>

            {/* Ödeme paneli */}
            <div className="border-t border-border bg-muted/30 p-5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Toplam Tutar</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatCurrency(totals.subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Uygulanan İndirim
                    {discount
                      ? ` (${discount.type === "percent" ? `%${discount.value}` : formatCurrency(discount.value)})`
                      : ""}
                  </span>
                  <span className="flex items-center gap-2 font-semibold tabular-nums text-pos-danger">
                    -{formatCurrency(totals.discountAmount)}
                    {discount && (
                      <button
                        onClick={() => setDiscount(null)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="İndirimi kaldır"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </span>
                </div>
                <div className="flex items-end justify-between border-t border-border pt-3">
                  <span className="text-base font-semibold text-foreground">Ödenecek</span>
                  <span className="text-3xl font-black tracking-tight tabular-nums text-foreground">
                    {formatCurrency(totals.net)}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <button
                  onClick={() => openPayment("card")}
                  className="flex flex-col items-center gap-1.5 rounded-2xl bg-primary py-4 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
                >
                  <CreditCard className="h-5 w-5" />
                  Kredi Kartı
                </button>
                <button
                  onClick={() => openPayment("cash")}
                  className="flex flex-col items-center gap-1.5 rounded-2xl bg-pos-success py-4 text-xs font-bold text-pos-success-foreground transition-all hover:bg-pos-success/90 active:scale-[0.98]"
                >
                  <Banknote className="h-5 w-5" />
                  Nakit
                </button>
                <button
                  onClick={() => openPayment("credit")}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card py-4 text-xs font-bold text-foreground transition-all hover:bg-accent active:scale-[0.98]"
                >
                  <UserSquare2 className="h-5 w-5" />
                  Cari / Veresiye
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* İndirim modalı */}
      {discountOpen && (
        <DiscountDialog
          subtotal={totals.subtotal}
          onClose={() => setDiscountOpen(false)}
          onApply={(d) => {
            setDiscount(d);
            setDiscountOpen(false);
            toast.success("İndirim uygulandı.");
          }}
        />
      )}

      {/* Askıdakiler */}
      {heldOpen && (
        <Modal title="Askıdaki Satışlar" onClose={() => setHeldOpen(false)}>
          {held.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Askıda bekleyen satış yok.
            </p>
          ) : (
            <div className="space-y-2">
              {held.map((h) => (
                <button
                  key={h.id}
                  onClick={() => resumeSale(h)}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-background p-3 text-left transition-colors hover:bg-accent"
                >
                  <div>
                    <p className="font-semibold text-foreground">
                      {h.at} · {h.items.length} kalem
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {h.items.map((i) => i.name).join(", ")}
                    </p>
                  </div>
                  <span className="font-bold tabular-nums text-foreground">
                    {formatCurrency(h.items.reduce((s, i) => s + i.price * i.quantity, 0))}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Ödeme modalı */}
      {payMethod && (
        <Modal title={`${METHOD_LABEL[payMethod]} ile Tahsilat`} onClose={() => setPayMethod(null)}>
          <div className="rounded-2xl bg-muted/50 p-4 text-center">
            <p className="text-sm text-muted-foreground">Ödenecek Net Tutar</p>
            <p className="text-4xl font-black tabular-nums text-foreground">
              {formatCurrency(totals.net)}
            </p>
          </div>

          {payMethod === "cash" && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {[100, 200, 500].map((v) => (
                  <button
                    key={v}
                    onClick={() => setCashGiven((c) => c + v)}
                    className="rounded-xl border border-border bg-card py-3 text-sm font-bold text-foreground transition-colors hover:bg-accent"
                  >
                    {v}₺
                  </button>
                ))}
                <button
                  onClick={() => setCashGiven(totals.net)}
                  className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Tamamı
                </button>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Alınan Nakit
                </label>
                <input
                  type="number"
                  min={0}
                  value={cashGiven || ""}
                  onChange={(e) => setCashGiven(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-3 text-lg font-bold tabular-nums text-foreground outline-none focus:border-primary"
                />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-pos-success/10 px-4 py-3">
                <span className="text-sm font-semibold text-foreground">Para Üstü</span>
                <span className="text-xl font-black tabular-nums text-pos-success">
                  {formatCurrency(Math.max(0, cashGiven - totals.net))}
                </span>
              </div>
            </div>
          )}

          {payMethod === "credit" ? (
            <div className="mt-4 space-y-2">
              <label className="block text-xs font-semibold text-muted-foreground">Cari Seç</label>
              <Combobox
                options={cariler.map((c) => ({
                  value: c.id,
                  label: c.name,
                  keywords: `${c.phone} ${c.type}`,
                  hint: `${c.type} · Bakiye ${formatCurrency(c.balance)}`,
                }))}
                value={cariId}
                onValueChange={setCariId}
                placeholder="Cari hesap arayın…"
                searchPlaceholder="İsim veya telefon…"
                emptyText="Cari bulunamadı."
                ariaLabel="Cari seç"
              />
              <p className="rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                Tutar seçilen carinin hesabına borç olarak işlenecek.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              <label className="block text-xs font-semibold text-muted-foreground">
                Kasa / Banka Seçimi
              </label>
              <Combobox
                options={accounts.map((a) => ({
                  value: a.id,
                  label: a.name,
                  keywords: a.type,
                  hint: `${a.type} · ${formatCurrency(a.balance)}`,
                }))}
                value={accountId}
                onValueChange={selectAccount}
                placeholder="Kasa / banka seçin…"
                searchPlaceholder="Hesap arayın…"
                emptyText="Tanımlı hesap yok. Ön Muhasebe → Mali Yönetim'den ekleyin."
                ariaLabel="Kasa / banka seçimi"
              />
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <button
              onClick={() => setPayMethod(null)}
              className="flex-1 rounded-2xl border border-border bg-card py-3.5 font-semibold text-foreground transition-colors hover:bg-accent"
            >
              Vazgeç
            </button>
            <button
              onClick={() => completeSale(payMethod, payMethod === "cash" ? cashGiven : undefined)}
              disabled={
                (payMethod === "cash" && cashGiven < totals.net) ||
                (payMethod === "credit" ? !cariId : !accountId)
              }
              className="flex-[2] rounded-2xl bg-pos-success py-3.5 font-bold text-pos-success-foreground transition-all hover:bg-pos-success/90 active:scale-[0.98] disabled:opacity-50"
            >
              Satışı Tamamla
            </button>
          </div>
        </Modal>
      )}

      {/* 80mm termal fiş önizleme */}
      <ReceiptModal
        data={
          receipt
            ? ({
                date: receipt.date,
                no: receipt.no,
                staff: session.name,
                customer: receipt.customer,
                items: receipt.items.map((i) => ({
                  name: i.name,
                  quantity: i.quantity,
                  unit: i.unit,
                  price: i.price,
                  kdvRate: 1,
                })),
                discount: receipt.discount,
                paymentLabel: METHOD_LABEL[receipt.method],
                received: receipt.method === "cash" ? receipt.cashGiven : undefined,
              } satisfies ReceiptData)
            : null
        }
        onClose={closeReceipt}
        onPrint={printReceipt}
      />
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-foreground/50 p-4 backdrop-blur-sm print:hidden"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-border bg-card p-5 pos-shadow-lg"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DiscountDialog({
  subtotal,
  onApply,
  onClose,
}: {
  subtotal: number;
  onApply: (d: Discount) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<Discount["type"]>("percent");
  const [value, setValue] = useState<number>(10);
  const amount = type === "percent" ? (subtotal * value) / 100 : Math.min(value, subtotal);

  return (
    <Modal title="İndirim Uygula" onClose={onClose}>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => setType("percent")}
          className={`rounded-xl border border-border py-3 text-sm font-bold transition-colors ${
            type === "percent" ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
          }`}
        >
          Yüzde (%)
        </button>
        <button
          onClick={() => setType("amount")}
          className={`rounded-xl border border-border py-3 text-sm font-bold transition-colors ${
            type === "amount" ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
          }`}
        >
          Tutar (₺)
        </button>
      </div>
      <input
        type="number"
        min={0}
        value={value || ""}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full rounded-xl border border-border bg-background px-3 py-3 text-lg font-bold tabular-nums text-foreground outline-none focus:border-primary"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {(type === "percent" ? [5, 10, 15, 20] : [10, 25, 50, 100]).map((v) => (
          <button
            key={v}
            onClick={() => setValue(v)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
          >
            {type === "percent" ? `%${v}` : `${v}₺`}
          </button>
        ))}
      </div>
      <p className="mt-4 rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        İndirim tutarı: <strong className="text-foreground">{formatCurrency(amount)}</strong>
      </p>
      <button
        onClick={() => onApply({ type, value })}
        className="mt-4 w-full rounded-2xl bg-primary py-3.5 font-bold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Uygula
      </button>
    </Modal>
  );
}
