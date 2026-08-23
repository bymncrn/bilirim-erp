import { ModuleGuard } from "@/components/subscription/ModuleGuard";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  UtensilsCrossed,
  Plus,
  Minus,
  Gift,
  Move,
  CreditCard,
  Trash2,
  Banknote,
  Utensils,
  UserRound,
  CheckCircle2,
  Printer,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { useAccountSelection, useCariler, postCashIncome, postCariDebt } from "@/lib/settlement";
import { useSellableCatalog, useCatalogCategories } from "@/lib/catalog-store";
import { useCategoryResolver } from "@/lib/categories-store";
import { useStaff } from "@/lib/panel-store";
import {
  useDiningTables,
  useOrderItems,
  orderItemsCollection,
  patchTable,
  closeDiningTable,
} from "@/lib/tables-store";
import { ReceiptModal, type ReceiptData } from "@/components/receipt/ReceiptModal";
import { RecentSalesButton } from "@/components/receipt/RecentSalesButton";
import { pushRecentReceipt } from "@/lib/recent-receipts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/adisyon")({
  head: () => ({
    meta: [
      { title: "Adisyon / Masa Yönetimi — Bilirim ERP" },
      {
        name: "description",
        content:
          "Restoran ve kafeler için görsel masa haritası, adisyon detayı, ikram, masa taşıma ve hesap ödeme işlemleri.",
      },
      { property: "og:title", content: "Adisyon / Masa Yönetimi — Bilirim ERP" },
      {
        property: "og:description",
        content:
          "Salon, teras ve bahçe bölgelerinde boş/dolu masa takibi ve hızlı adisyon yönetimi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <ModuleGuard module="adisyon">
      <AdisyonPage />
    </ModuleGuard>
  ),
});

const TRY = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
});

type Zone = "Salon" | "Teras" | "Bahçe";
type OrderLine = { id: string; name: string; price: number; qty: number; treat?: boolean };
type Table = {
  id: string;
  name: string;
  zone: Zone;
  minutes: number;
  lines: OrderLine[];
  waiter?: string | undefined;
  reserved?: boolean;
  billRequested?: boolean;
};

const ZONES = ["Tüm Masalar", "Salon", "Teras", "Bahçe"] as const;

type PayMethod = "Nakit" | "Kredi Kartı" | "Yemek Kartı" | "Cari Hesaba Yaz";

const PAY_METHODS: { key: PayMethod; icon: typeof Banknote }[] = [
  { key: "Nakit", icon: Banknote },
  { key: "Kredi Kartı", icon: CreditCard },
  { key: "Yemek Kartı", icon: Utensils },
  { key: "Cari Hesaba Yaz", icon: UserRound },
];

const total = (lines: OrderLine[]) =>
  lines.reduce((s, l) => s + (l.treat ? 0 : l.price * l.qty), 0);

const MEAL_BRANDS = [
  "Sodexo",
  "Multinet",
  "Ticket (Edenred)",
  "Metropol",
  "Setcard",
  "Paye",
] as const;

type SplitMode = "esit" | "tutar" | "urun";
type PaidPart = { id: string; label: string; amount: number };

function AdisyonPage() {
  const menu = useSellableCatalog();
  const dbTables = useDiningTables();
  const dbItems = useOrderItems();
  const staff = useStaff();
  const WAITERS = useMemo(() => staff.map((s) => s.name), [staff]);

  const tables = useMemo<Table[]>(
    () =>
      dbTables.map((t) => ({
        id: t.id,
        name: t.name,
        zone: (["Salon", "Teras", "Bahçe"].includes(t.area) ? t.area : "Salon") as Zone,
        minutes: t.openedAt
          ? Math.max(0, Math.round((Date.now() - new Date(t.openedAt).getTime()) / 60000))
          : 0,
        waiter: t.waiter || undefined,
        reserved: t.status === "rezerve",
        billRequested: t.status === "hesap",
        lines: dbItems
          .filter((i) => i.tableId === t.id)
          .map((i) => ({
            id: i.id,
            name: i.name,
            price: i.price,
            qty: i.qty,
            treat: i.note === "ikram",
          })),
      })),
    [dbTables, dbItems],
  );
  const [zone, setZone] = useState<(typeof ZONES)[number]>("Tüm Masalar");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payMode, setPayMode] = useState<"tek" | "parcali">("tek");
  const [method, setMethod] = useState<PayMethod>("Nakit");
  const [brand, setBrand] = useState<string>("Sodexo");
  const [splitMode, setSplitMode] = useState<SplitMode>("esit");
  const [partMethod, setPartMethod] = useState<PayMethod>("Nakit");
  const [partBrand, setPartBrand] = useState<string>("Sodexo");
  const [partAmount, setPartAmount] = useState("");
  const [people, setPeople] = useState<number | null>(null);
  const [parts, setParts] = useState<PaidPart[]>([]);
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const [itemQuery, setItemQuery] = useState("");
  const [itemCat, setItemCat] = useState("Tümü");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const { accounts, selectedId: accountId, select: selectAccount } = useAccountSelection();
  const cariler = useCariler();
  const [cariId, setCariId] = useState<string>("");

  const definedCategories = useCatalogCategories();
  const catName = useCategoryResolver();
  const menuCategories = useMemo(
    () => definedCategories.filter((c) => menu.some((m) => catName(m.category) === c)),
    [definedCategories, menu, catName],
  );
  const filteredMenu = useMemo(() => {
    const q = itemQuery.trim().toLocaleLowerCase("tr");
    return menu.filter(
      (m) =>
        (itemCat === "Tümü" || catName(m.category) === itemCat) &&
        (!q || m.name.toLocaleLowerCase("tr").includes(q)),
    );
  }, [menu, itemCat, itemQuery, catName]);

  const shown = useMemo(
    () => (zone === "Tüm Masalar" ? tables : tables.filter((t) => t.zone === zone)),
    [tables, zone],
  );
  const active = tables.find((t) => t.id === activeId) ?? null;

  const writeTable = (current: Table, next: Table) => {
    const patch: Record<string, unknown> = {};
    const dbRow = dbTables.find((t) => t.id === current.id);
    if ((next.waiter ?? "") !== (current.waiter ?? "")) patch["waiter"] = next.waiter ?? "";
    const nextStatus = next.reserved
      ? "rezerve"
      : next.billRequested
        ? "hesap"
        : next.lines.length
          ? "dolu"
          : "bos";
    if (dbRow && dbRow.status !== nextStatus) patch["status"] = nextStatus;
    if (nextStatus === "bos") patch["opened_at"] = null;
    else if (dbRow && !dbRow.openedAt) patch["opened_at"] = new Date().toISOString();
    if (Object.keys(patch).length) void patchTable(current.id, patch);

    const own = dbItems.filter((i) => i.tableId === current.id);
    for (const line of next.lines) {
      const row = own.find((i) => i.id === line.id);
      if (!row) {
        void orderItemsCollection.insertRaw({
          table_id: current.id,
          product_id: null,
          name: line.name,
          price: line.price,
          qty: line.qty,
          note: line.treat ? "ikram" : "",
          status: "bekliyor",
        });
      } else if (row.qty !== line.qty || (row.note === "ikram") !== !!line.treat) {
        void orderItemsCollection.patch(row.id, {
          qty: line.qty,
          note: line.treat ? "ikram" : "",
        });
      }
    }
    for (const row of own) {
      if (!next.lines.some((l) => l.id === row.id)) void orderItemsCollection.remove(row.id);
    }
  };

  const update = (id: string, fn: (t: Table) => Table) => {
    const current = tables.find((t) => t.id === id);
    if (!current) return;
    writeTable(current, fn(current));
  };

  const addItem = (item: { name: string; price: number }) => {
    if (!active) return;
    update(active.id, (t) => {
      const found = t.lines.find((l) => l.name === item.name && !l.treat);
      const lines = found
        ? t.lines.map((l) => (l === found ? { ...l, qty: l.qty + 1 } : l))
        : [
            ...t.lines,
            { id: `new-${Date.now()}-${item.name}`, name: item.name, price: item.price, qty: 1 },
          ];
      return { ...t, lines, minutes: t.minutes === 0 ? 1 : t.minutes };
    });
  };

  const setQty = (lineId: string, delta: number) => {
    if (!active) return;
    update(active.id, (t) => {
      const lines = t.lines
        .map((l) => (l.id === lineId ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0);
      return { ...t, lines, minutes: lines.length ? t.minutes : 0 };
    });
  };

  const treat = () => {
    if (!active || active.lines.length === 0) return;
    update(active.id, (t) => ({ ...t, lines: t.lines.map((l) => ({ ...l, treat: true })) }));
    toast.success(`${active.name} adisyonu ikram edildi.`);
  };

  const moveTo = (targetId: string) => {
    if (!active) return;
    const src = active;
    const rows = dbItems.filter((i) => i.tableId === src.id);
    void Promise.all(rows.map((r) => orderItemsCollection.patch(r.id, { table_id: targetId })));
    void patchTable(targetId, { status: "dolu", opened_at: new Date().toISOString() });
    void patchTable(src.id, { status: "bos", opened_at: null });
    setMoveOpen(false);
    setActiveId(targetId);
    toast.success(`${src.name} → ${tables.find((t) => t.id === targetId)?.name} taşındı.`);
  };

  const payTotal = total(active?.lines ?? []);
  const collected = parts.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(splitMode === "urun" ? payTotal : payTotal - collected, 0);
  const selectedTotal = (active?.lines ?? [])
    .filter((l) => selectedLines.includes(l.id) && !l.treat)
    .reduce((s, l) => s + l.price * l.qty, 0);

  const labelFor = (m: PayMethod, b: string) => (m === "Yemek Kartı" ? `${m} · ${b}` : m);
  const cariName = cariler.find((c) => c.id === cariId)?.name ?? "";

  const settlementFields = (m: PayMethod) =>
    m === "Cari Hesaba Yaz" ? (
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Cari Seç
        </p>
        <Combobox
          options={cariler.map((c) => ({
            value: c.id,
            label: c.name,
            keywords: `${c.phone} ${c.type}`,
            hint: `${c.type} · Bakiye ${TRY.format(c.balance)}`,
          }))}
          value={cariId}
          onValueChange={setCariId}
          placeholder="Cari hesap arayın…"
          searchPlaceholder="İsim veya telefon…"
          emptyText="Cari bulunamadı."
          ariaLabel="Cari seç"
        />
        <p className="text-xs text-muted-foreground">
          Tutar seçilen carinin hesabına borç olarak işlenecek.
        </p>
      </div>
    ) : (
      <div className="space-y-1.5 rounded-2xl border border-border bg-secondary p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Kasa / Banka Seçimi
        </p>
        <Combobox
          options={accounts.map((a) => ({
            value: a.id,
            label: a.name,
            keywords: a.type,
            hint: `${a.type} · ${TRY.format(a.balance)}`,
          }))}
          value={accountId}
          onValueChange={selectAccount}
          placeholder="Tahsilatın işleneceği kasayı seçin…"
          searchPlaceholder="Hesap arayın…"
          emptyText="Tanımlı hesap yok. Ön Muhasebe → Mali Yönetim'den ekleyin."
          ariaLabel="Kasa / banka seçimi"
        />
        <p className="text-xs text-muted-foreground">
          {accountId
            ? "Tutar seçilen kasanın bakiyesine gelir olarak işlenecek."
            : "Ödemeyi tamamlamak için kasa / banka hesabı seçmelisiniz."}
        </p>
      </div>
    );

  /** Tahsilatı Ön Muhasebe'ye yazar; eksik seçim varsa false döner. */
  const postSettlement = (m: PayMethod, amount: number, desc: string) => {
    if (m === "Cari Hesaba Yaz") {
      if (!cariId) {
        toast.error("Önce bir cari hesap seçin.");
        return false;
      }
      void postCariDebt({ cariId, amount, description: desc });
      return true;
    }
    if (!accountId) {
      toast.error("Önce bir kasa / banka hesabı seçin.");
      return false;
    }
    void postCashIncome({ accountId, amount, description: desc });
    return true;
  };

  const openPay = () => {
    setPayMode("tek");
    setMethod("Nakit");
    setBrand("Sodexo");
    setSplitMode("esit");
    setPartMethod("Nakit");
    setPartBrand("Sodexo");
    setPartAmount("");
    setPeople(null);
    setParts([]);
    setSelectedLines([]);
    setCariId("");
    setPayOpen(true);
  };

  const closeTable = (name: string, note: string) => {
    if (!active) return;
    update(active.id, (t) => ({ ...t, lines: [], minutes: 0 }));
    setPayOpen(false);
    setActiveId(null);
    toast.success(`${name} kapatıldı — ${note}`);
  };

  const buildReceipt = (t: Table, paymentLabel: string): ReceiptData => ({
    date: new Date(),
    no: `AD-${String(t.id).padStart(3, "0")}`,
    title: "ADİSYON NO",
    table: `${t.zone} ${t.name}`,
    staff: t.waiter ?? "Kasiyer",
    customer: cariName || undefined,
    items: t.lines.map((l) => ({
      name: l.treat ? `${l.name} (İKRAM)` : l.name,
      quantity: l.qty,
      price: l.treat ? 0 : l.price,
      kdvRate: 10,
    })),
    paymentLabel,
  });

  const printBill = () => {
    if (!active || !active.lines.length) {
      toast.error("Adisyonda ürün yok.");
      return;
    }
    setReceipt(buildReceipt(active, "ÖDENMEDİ (Bilgi Fişi)"));
    setActiveId(null);
  };

  const completePay = () => {
    if (!active) return;
    const name = active.name;
    const label = labelFor(method, brand);
    if (!postSettlement(method, payTotal, `${name} adisyon ödemesi (${label})`)) return;
    const built = buildReceipt(active, label);
    setReceipt(built);
    pushRecentReceipt("adisyon", built);
    closeTable(
      name,
      `${TRY.format(payTotal)} (${label}${method === "Cari Hesaba Yaz" && cariName ? ` · ${cariName}` : ""})`,
    );
  };

  const collectPart = () => {
    if (!active) return;
    const amount = Number(partAmount.replace(",", ".")) || 0;
    if (amount <= 0) {
      toast.error("Geçerli bir tutar girin.");
      return;
    }
    if (amount - remaining > 0.01) {
      toast.error("Tutar kalan bakiyeden büyük olamaz.");
      return;
    }
    const label = labelFor(partMethod, partBrand);
    if (!postSettlement(partMethod, amount, `${active.name} parça tahsilat (${label})`)) return;
    const next = [...parts, { id: `${Date.now()}`, label, amount }];
    setParts(next);
    setPartAmount("");
    const left = payTotal - next.reduce((s, p) => s + p.amount, 0);
    toast.success(`${TRY.format(amount)} tahsil edildi — ${label}`);
    if (left < 0.01)
      closeTable(active.name, `tüm parçalar tahsil edildi (${TRY.format(payTotal)})`);
  };

  const collectSelected = () => {
    if (!active) return;
    if (selectedTotal <= 0) {
      toast.error("Önce ürün seçin.");
      return;
    }
    const label = labelFor(partMethod, partBrand);
    if (!postSettlement(partMethod, selectedTotal, `${active.name} ürün bazlı tahsilat (${label})`))
      return;
    const rest = active.lines.filter((l) => !selectedLines.includes(l.id));
    update(active.id, (t) => ({ ...t, lines: rest, minutes: rest.length ? t.minutes : 0 }));
    setParts((p) => [
      ...p,
      { id: `${Date.now()}`, label: `Ürün bazlı · ${label}`, amount: selectedTotal },
    ]);
    setSelectedLines([]);
    toast.success(`${TRY.format(selectedTotal)} tahsil edildi — ${label}`);
    if (total(rest) < 0.01) {
      const name = active.name;
      update(active.id, (t) => ({ ...t, lines: [], minutes: 0 }));
      setPayOpen(false);
      setActiveId(null);
      toast.success(`${name} kapatıldı — tüm ürünler ödendi.`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-5 py-4">
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 shrink-0 gap-2 px-5 text-base font-semibold"
          >
            <Link to="/dashboard">
              <ArrowLeft className="h-5 w-5" />
              Ana Panele Dön
            </Link>
          </Button>
          <div className="flex min-w-0 items-center gap-2">
            <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pos-cheese text-pos-cheese-foreground sm:flex">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <h1 className="truncate text-base font-bold tracking-tight text-foreground sm:text-lg">
              Adisyon / Masa Yönetimi
            </h1>
            <div className="ml-auto shrink-0">
              <RecentSalesButton source="adisyon" />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-6">
        <div className="mb-6 flex flex-wrap gap-2">
          {ZONES.map((z) => (
            <button
              key={z}
              onClick={() => setZone(z)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                zone === z
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {z}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((t) => {
            const busy = t.lines.length > 0;
            const sum = total(t.lines);
            return (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={`pos-shadow pos-card-press flex h-36 flex-col justify-between rounded-3xl border p-4 text-left ${
                  busy && t.billRequested
                    ? "border-transparent bg-amber-500 text-white"
                    : busy
                      ? "border-transparent bg-pos-tomato text-pos-tomato-foreground"
                      : t.reserved
                        ? "border-transparent bg-blue-500 text-white"
                        : "border-transparent bg-pos-apple text-pos-apple-foreground"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold">{t.name}</span>
                  <span className="rounded-full bg-card/50 px-2 py-0.5 text-[11px] font-semibold">
                    {t.zone}
                  </span>
                </div>
                {busy ? (
                  <div>
                    <p className="text-xl font-black">{TRY.format(sum)}</p>
                    <p className="text-xs font-medium opacity-80">
                      {t.minutes} dk · {t.lines.length} kalem
                    </p>
                    <p className="text-xs font-medium opacity-80">
                      {t.billRequested ? "Hesap İstendi · " : ""}
                      {t.waiter ?? "Garson atanmadı"}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xl font-black">{t.reserved ? "Rezerve" : "Boş"}</p>
                    {t.waiter && <p className="text-xs font-medium opacity-80">{t.waiter}</p>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </main>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActiveId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{active?.name} — Adisyon</DialogTitle>
            <DialogDescription>
              {active?.zone} · {active?.minutes ? `${active.minutes} dk açık` : "Yeni adisyon"}
            </DialogDescription>
          </DialogHeader>

          {active && (
            <div className="grid gap-2 rounded-2xl border border-border p-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Garson Ata</label>
                <select
                  value={active.waiter ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    update(active.id, (t) => ({ ...t, waiter: v || undefined }));
                    toast.success(v ? `${active.name} → ${v}` : "Garson kaldırıldı.");
                  }}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Atanmadı</option>
                  {WAITERS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                {active.lines.length > 0 ? (
                  <Button
                    variant="outline"
                    className="w-full border-amber-500/60 text-amber-600 hover:bg-amber-500/10"
                    disabled={active.billRequested}
                    onClick={() => {
                      update(active.id, (t) => ({ ...t, billRequested: true }));
                      toast.success(`${active.name} için hesap istendi.`);
                    }}
                  >
                    {active.billRequested ? "Hesap İstendi" : "Hesap İste"}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full border-blue-500/60 text-blue-600 hover:bg-blue-500/10"
                    onClick={() => {
                      const next = !active.reserved;
                      update(active.id, (t) => ({ ...t, reserved: next }));
                      toast.success(
                        next
                          ? `${active.name} rezerve edildi.`
                          : `${active.name} rezervasyonu iptal edildi.`,
                      );
                    }}
                  >
                    {active.reserved ? "Rezervasyonu İptal Et" : "Rezerve Et"}
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {active?.lines.length ? (
              active.lines.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {l.name} {l.treat && <Badge variant="secondary">İkram</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">{TRY.format(l.price)} / adet</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => setQty(l.id, -1)}
                    >
                      {l.qty === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                    </Button>
                    <span className="w-6 text-center text-sm font-bold">{l.qty}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => setQty(l.id, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <span className="w-20 shrink-0 text-right text-sm font-bold text-foreground">
                    {TRY.format(l.treat ? 0 : l.price * l.qty)}
                  </span>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Bu masada henüz sipariş yok.
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ürün Ekle
            </p>
            <Input
              value={itemQuery}
              onChange={(e) => setItemQuery(e.target.value)}
              placeholder="Ürün ara (ör. çay, köfte)..."
              className="mb-2"
            />
            <div className="mb-2 flex flex-wrap gap-1.5">
              {["Tümü", ...menuCategories].map((c) => (
                <button
                  key={c}
                  onClick={() => setItemCat(c)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    itemCat === c
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
              {filteredMenu.length === 0 && (
                <p className="col-span-full py-4 text-center text-xs text-muted-foreground">
                  Eşleşen ürün bulunamadı.
                </p>
              )}
              {filteredMenu.map((m) => (
                <button
                  key={m.id}
                  onClick={() => addItem(m)}
                  className="pos-card-press rounded-2xl border border-border bg-secondary p-2 text-left"
                >
                  <p className="truncate text-xs font-semibold text-foreground">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground">{TRY.format(m.price)}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-secondary px-4 py-3">
            <span className="text-sm font-medium text-muted-foreground">Toplam</span>
            <span className="text-xl font-black text-foreground">
              {TRY.format(total(active?.lines ?? []))}
            </span>
          </div>

          <DialogFooter className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <Button variant="outline" onClick={printBill} disabled={!active?.lines.length}>
              <Printer className="h-4 w-4" />
              Fiş Yazdır
            </Button>
            <Button variant="outline" onClick={treat}>
              <Gift className="h-4 w-4" />
              İkram
            </Button>
            <Button variant="outline" onClick={() => setMoveOpen(true)}>
              <Move className="h-4 w-4" />
              Masa Taşı
            </Button>
            <Button onClick={openPay} disabled={!active?.lines.length} className="h-12 w-full sm:h-10 sm:w-auto">
              <CreditCard className="h-4 w-4" />
              Öde / Hesap Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hesap Öde & Masa Kapat</DialogTitle>
            <DialogDescription>{active?.name} adisyonu kapatılıyor.</DialogDescription>
          </DialogHeader>

          <div className="rounded-3xl bg-pos-apple p-5 text-pos-apple-foreground">
            <p className="text-sm font-medium opacity-80">
              {active?.name} · {active?.zone}
            </p>
            <p className="text-3xl font-black">{TRY.format(payTotal)}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1">
            {(["tek", "parcali"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setPayMode(m)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  payMode === m ? "bg-card text-foreground pos-shadow" : "text-muted-foreground"
                }`}
              >
                {m === "tek" ? "Tek Ödeme" : "Parçalı Ödeme"}
              </button>
            ))}
          </div>

          {payMode === "tek" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {PAY_METHODS.map((m) => {
                  const Icon = m.icon;
                  const on = method === m.key;
                  return (
                    <button
                      key={m.key}
                      onClick={() => setMethod(m.key)}
                      className={`pos-card-press flex items-center gap-2 rounded-2xl border p-3 text-left text-sm font-semibold transition-colors ${
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{m.key}</span>
                    </button>
                  );
                })}
              </div>
              {method === "Yemek Kartı" && (
                <div className="rounded-2xl border border-border bg-secondary p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Yemek Kartı Markası
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {MEAL_BRANDS.map((b) => (
                      <button
                        key={b}
                        onClick={() => setBrand(b)}
                        className={`rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
                          brand === b
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-foreground"
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {settlementFields(method)}
              <Button
                className="h-12 w-full text-base bg-pos-apple text-pos-apple-foreground hover:bg-pos-apple/90"
                onClick={completePay}
              >
                <CheckCircle2 className="h-4 w-4" />
                Ödemeyi Tamamla & Masayı Kapat
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 rounded-2xl bg-secondary p-1">
                {(
                  [
                    ["esit", "Eşit Böl"],
                    ["tutar", "Tutarlı"],
                    ["urun", "Ürün Bazlı"],
                  ] as const
                ).map(([k, l]) => (
                  <button
                    key={k}
                    onClick={() => setSplitMode(k)}
                    className={`rounded-xl px-2 py-2 text-xs font-semibold transition-colors ${
                      splitMode === k
                        ? "bg-card text-foreground pos-shadow"
                        : "text-muted-foreground"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
                <span className="text-sm font-medium text-muted-foreground">Kalan Tutar</span>
                <span className="text-xl font-black text-foreground">{TRY.format(remaining)}</span>
              </div>

              {splitMode === "esit" && (
                <div className="grid grid-cols-3 gap-2">
                  {[2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        setPeople(n);
                        setPartAmount((payTotal / n).toFixed(2));
                      }}
                      className={`pos-card-press rounded-2xl border p-3 text-sm font-bold transition-colors ${
                        people === n
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground"
                      }`}
                    >
                      {n} Kişi
                      <span className="block text-[11px] font-medium opacity-80">
                        {TRY.format(payTotal / n)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {splitMode === "urun" ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Ödenecek Ürünleri Seç
                  </p>
                  {(active?.lines ?? []).map((l) => {
                    const on = selectedLines.includes(l.id);
                    return (
                      <button
                        key={l.id}
                        onClick={() =>
                          setSelectedLines((prev) =>
                            on ? prev.filter((x) => x !== l.id) : [...prev, l.id],
                          )
                        }
                        className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left text-sm transition-colors ${
                          on ? "border-primary bg-primary/10" : "border-border bg-card"
                        }`}
                      >
                        <span className="font-semibold text-foreground">
                          {l.qty}x {l.name}
                        </span>
                        <span className="font-bold text-foreground">
                          {TRY.format(l.treat ? 0 : l.price * l.qty)}
                        </span>
                      </button>
                    );
                  })}
                  <div className="flex items-center justify-between rounded-2xl bg-secondary px-4 py-3">
                    <span className="text-sm font-medium text-muted-foreground">
                      Seçilen Ürün Ödeme Tutarı
                    </span>
                    <span className="text-lg font-black text-foreground">
                      {TRY.format(selectedTotal)}
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Tahsil Edilen Tutar
                  </label>
                  <Input
                    value={partAmount}
                    onChange={(e) => setPartAmount(e.target.value)}
                    inputMode="decimal"
                    placeholder="0,00"
                  />
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Ödeme Yöntemi
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PAY_METHODS.map((m) => {
                    const Icon = m.icon;
                    const on = partMethod === m.key;
                    return (
                      <button
                        key={m.key}
                        onClick={() => setPartMethod(m.key)}
                        className={`pos-card-press flex items-center gap-2 rounded-2xl border p-3 text-left text-sm font-semibold transition-colors ${
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{m.key}</span>
                      </button>
                    );
                  })}
                </div>
                {partMethod === "Yemek Kartı" && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {MEAL_BRANDS.map((b) => (
                      <button
                        key={b}
                        onClick={() => setPartBrand(b)}
                        className={`rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
                          partBrand === b
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-foreground"
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {settlementFields(partMethod)}

              <Button
                className="h-12 w-full text-base bg-pos-apple text-pos-apple-foreground hover:bg-pos-apple/90"
                onClick={splitMode === "urun" ? collectSelected : collectPart}
              >
                <CheckCircle2 className="h-4 w-4" />
                {splitMode === "urun" ? "Seçilen Ürünleri Tahsil Et" : "+ Parça Tahsil Et"}
              </Button>

              {parts.length > 0 && (
                <div className="space-y-1 rounded-2xl border border-border bg-card p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Yapılan Tahsilatlar
                  </p>
                  {parts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{p.label}</span>
                      <span className="font-bold text-foreground">{TRY.format(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Masa Taşı</DialogTitle>
            <DialogDescription>{active?.name} adisyonu hangi masaya taşınsın?</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2">
            {tables
              .filter((t) => t.id !== active?.id)
              .map((t) => (
                <button
                  key={t.id}
                  onClick={() => moveTo(t.id)}
                  className="pos-card-press rounded-2xl border border-border bg-card p-3 text-sm font-semibold text-foreground"
                >
                  {t.name}
                  <span className="block text-[11px] font-normal text-muted-foreground">
                    {t.lines.length ? "Dolu" : "Boş"}
                  </span>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      <ReceiptModal data={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}
