import { createFileRoute } from "@tanstack/react-router";
import {
  LogOut,
  Plus,
  Minus,
  Trash2,
  Gift,
  Percent,
  ArrowLeft,
  Clock,
  User,
  ReceiptText,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PanelShell } from "@/components/panel/PanelShell";
import { PinGate } from "@/components/panel/PinGate";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSellableCatalog } from "@/lib/catalog-store";
import { useCategoryResolver } from "@/lib/categories-store";
import { useStaff, type Staff } from "@/lib/panel-store";
import {
  useDiningTables,
  useOrderItems,
  orderItemsCollection,
  patchTable,
  closeDiningTable,
} from "@/lib/tables-store";
import { money, type OrderLine } from "@/lib/format";

export const Route = createFileRoute("/panel/pos")({
  head: () => ({
    meta: [
      { title: "POS / Adisyon Ekranı — Bilirim Restoran POS" },
      {
        name: "description",
        content:
          "Kat ve salon bazlı görsel masa haritası, durum renkleri ve dokunmatik adisyon yönetimi.",
      },
      { property: "og:title", content: "POS / Adisyon Ekranı — Bilirim Restoran POS" },
      {
        property: "og:description",
        content:
          "Kat ve salon bazlı görsel masa haritası, durum renkleri ve dokunmatik adisyon yönetimi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PosPage,
});

/* ---------------- Masa modeli ---------------- */

const HALLS = ["Ana Salon", "Teras", "Bahçe"] as const;
type Hall = (typeof HALLS)[number];

type TableStatus = "bos" | "dolu" | "hesap" | "rezerve";

type PosTable = {
  id: string;
  name: string;
  hall: Hall;
  status: TableStatus;
  waiter?: string | undefined;
  /** Oturma başlangıcı (dakika cinsinden geçmiş süre) */
  seatedMinutes?: number | undefined;
  lines: OrderLine[];
};

const STATUS_META: Record<TableStatus, { label: string; card: string; dot: string }> = {
  bos: {
    label: "Boş",
    card: "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20",
    dot: "bg-emerald-500",
  },
  dolu: {
    label: "Dolu",
    card: "border-red-500/40 bg-red-500/10 hover:bg-red-500/20",
    dot: "bg-red-500",
  },
  hesap: {
    label: "Hesap İstendi",
    card: "border-amber-500/50 bg-amber-500/15 hover:bg-amber-500/25",
    dot: "bg-amber-500",
  },
  rezerve: {
    label: "Rezerve",
    card: "border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20",
    dot: "bg-blue-500",
  },
};

const total = (t: PosTable) => t.lines.reduce((s, l) => s + l.price * l.qty, 0);

/* ---------------- Sayfa ---------------- */

function PosPage() {
  return (
    <PinGate requiredPerm="pos.openTable" hint="Demo PIN: 1111 (Garson)">
      {(session, logout) => <PosBoard session={session} onLogout={logout} />}
    </PinGate>
  );
}

function PosBoard({ session, onLogout }: { session: Staff; onLogout: () => void }) {
  const menu = useSellableCatalog();
  const staff = useStaff();
  const waiters = useMemo(() => {
    const names = staff.map((s) => s.name);
    return Array.from(new Set([session.name, ...names]));
  }, [staff, session.name]);
  const dbTables = useDiningTables();
  const dbItems = useOrderItems();

  const tables = useMemo<PosTable[]>(
    () =>
      dbTables.map((t) => ({
        id: t.id,
        name: t.name,
        hall: (HALLS.includes(t.area as Hall) ? t.area : "Ana Salon") as Hall,
        status: t.status as TableStatus,
        waiter: t.waiter || undefined,
        seatedMinutes: t.openedAt
          ? Math.max(0, Math.round((Date.now() - new Date(t.openedAt).getTime()) / 60000))
          : undefined,
        lines: dbItems
          .filter((i) => i.tableId === t.id)
          .map((i) => ({ id: i.productId ?? i.id, name: i.name, price: i.price, qty: i.qty })),
      })),
    [dbTables, dbItems],
  );
  const [hall, setHall] = useState<Hall>("Ana Salon");
  const [orderId, setOrderId] = useState<string | null>(null); // hızlı sipariş ekranı (boş masa)
  const [detailId, setDetailId] = useState<string | null>(null); // adisyon modalı (dolu masa)
  const [actionId, setActionId] = useState<string | null>(null); // boş/rezerve masa aksiyon menüsü
  const [reserveId, setReserveId] = useState<string | null>(null); // rezervasyon formu
  const [reserveName, setReserveName] = useState("");
  const [reserveWaiter, setReserveWaiter] = useState(session.name);

  const shown = useMemo(() => tables.filter((t) => t.hall === hall), [tables, hall]);
  const orderTable = tables.find((t) => t.id === orderId) ?? null;
  const detailTable = tables.find((t) => t.id === detailId) ?? null;
  const actionTable = tables.find((t) => t.id === actionId) ?? null;
  const reserveTable = tables.find((t) => t.id === reserveId) ?? null;

  /** Yerel model üzerinde hesaplanan değişikliği veritabanına yazar. */
  const update = (id: string, fn: (t: PosTable) => PosTable) => {
    const current = tables.find((t) => t.id === id);
    if (!current) return;
    const next = fn(current);

    const patch: Record<string, unknown> = {};
    if (next.status !== current.status) patch["status"] = next.status;
    if ((next.waiter ?? "") !== (current.waiter ?? "")) patch["waiter"] = next.waiter ?? "";
    if (next.status !== "bos" && !dbTables.find((t) => t.id === id)?.openedAt) {
      patch["opened_at"] = new Date().toISOString();
    }
    if (next.status === "bos") patch["opened_at"] = null;
    if (Object.keys(patch).length) void patchTable(id, patch);

    const own = dbItems.filter((i) => i.tableId === id);
    for (const line of next.lines) {
      const row = own.find((i) => (i.productId ?? i.id) === line.id);
      if (!row) {
        void orderItemsCollection.insertRaw({
          table_id: id,
          product_id: line.id,
          name: line.name,
          price: line.price,
          qty: line.qty,
          note: "",
          status: "bekliyor",
        });
      } else if (row.qty !== line.qty) {
        void orderItemsCollection.patch(row.id, { qty: line.qty });
      }
    }
    for (const row of own) {
      if (!next.lines.some((l) => l.id === (row.productId ?? row.id))) {
        void orderItemsCollection.remove(row.id);
      }
    }
  };

  const addItem = (tableId: string, productId: string) => {
    const item = menu.find((m) => m.id === productId);
    if (!item) return;
    update(tableId, (t) => {
      const line = t.lines.find((l) => l.id === productId);
      return {
        ...t,
        status: t.status === "bos" || t.status === "rezerve" ? "dolu" : t.status,
        waiter: t.waiter ?? session.name,
        seatedMinutes: t.seatedMinutes ?? 0,
        lines: line
          ? t.lines.map((l) => (l.id === productId ? { ...l, qty: l.qty + 1 } : l))
          : [...t.lines, { id: productId, name: item.name, price: item.price, qty: 1 }],
      };
    });
  };

  const changeQty = (tableId: string, lineId: string, delta: number) =>
    update(tableId, (t) => ({
      ...t,
      lines: t.lines
        .map((l) => (l.id === lineId ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    }));

  const closeTable = (tableId: string, amount: number) => {
    void closeDiningTable(tableId);
    setDetailId(null);
    setOrderId(null);
    toast.success(`Hesap kapatıldı · ${money(amount)}`);
  };

  /* ---- Hızlı sipariş alma ekranı (boş masa) ---- */
  if (orderTable) {
    return (
      <PanelShell
        title={`${orderTable.name} · Hızlı Sipariş`}
        description={`${orderTable.hall} · Garson: ${session.name}`}
      >
        <QuickOrder
          table={orderTable}
          session={session}
          onBack={() => setOrderId(null)}
          onAdd={(pid) => addItem(orderTable.id, pid)}
          onQty={(lid, d) => changeQty(orderTable.id, lid, d)}
          onConfirm={() => {
            if (orderTable.lines.length === 0) return;
            toast.success(`${orderTable.name} açıldı · sipariş mutfağa gönderildi.`);
            setOrderId(null);
          }}
        />
      </PanelShell>
    );
  }

  /* ---- Masa haritası ---- */
  return (
    <PanelShell
      title="Masa & Salon Yönetimi"
      description={`Oturum: ${session.name} (${session.role})`}
      actions={
        <Button variant="outline" size="sm" onClick={onLogout}>
          <LogOut className="mr-1.5 h-4 w-4" />
          Oturumu Kapat
        </Button>
      }
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap gap-2">
          {HALLS.map((h) => {
            const count = tables.filter((t) => t.hall === h && t.status !== "bos").length;
            return (
              <button
                key={h}
                onClick={() => setHall(h)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  hall === h
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {h}
                <span className="ml-2 text-xs opacity-75">{count} aktif</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          {(Object.keys(STATUS_META) as TableStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[s].dot}`} />
              {STATUS_META[s].label}
            </span>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((t) => {
            const meta = STATUS_META[t.status];
            const busy = t.status === "dolu" || t.status === "hesap";
            return (
              <button
                key={t.id}
                onClick={() => (busy ? setDetailId(t.id) : setActionId(t.id))}
                className={`pos-card-press pos-shadow rounded-2xl border p-5 text-left transition-colors ${meta.card}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-base font-bold text-foreground">{t.name}</p>
                  <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{meta.label}</p>

                {busy ? (
                  <div className="mt-4 space-y-1">
                    <p className="text-lg font-bold text-foreground">{money(total(t))}</p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {t.seatedMinutes ?? 0} dk
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      {t.waiter ?? "—"}
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-muted-foreground">
                    {t.status === "rezerve"
                      ? `Rezerve · ${t.waiter ?? "Kayıtlı misafir"}`
                      : "Sipariş almak için dokunun"}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Adisyon detay modalı (dolu masa) */}
      {/* Boş / rezerve masa aksiyon menüsü */}
      <Dialog open={!!actionTable} onOpenChange={(o) => !o && setActionId(null)}>
        <DialogContent className="max-w-sm">
          {actionTable && (
            <>
              <DialogHeader>
                <DialogTitle>{actionTable.name}</DialogTitle>
              </DialogHeader>
              <p className="-mt-2 text-sm text-muted-foreground">
                {actionTable.hall} · {STATUS_META[actionTable.status].label}
                {actionTable.waiter ? ` · ${actionTable.waiter}` : ""}
              </p>
              <div className="space-y-2">
                <Button
                  className="w-full"
                  onClick={() => {
                    setOrderId(actionTable.id);
                    setActionId(null);
                  }}
                >
                  <ReceiptText className="mr-1.5 h-4 w-4" />
                  Sipariş Al / Masayı Aç
                </Button>
                {actionTable.status === "rezerve" ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      update(actionTable.id, (t) => ({ ...t, status: "bos", waiter: undefined }));
                      toast.success(`${actionTable.name} rezervasyonu iptal edildi.`);
                      setActionId(null);
                    }}
                  >
                    <X className="mr-1.5 h-4 w-4" />
                    Rezervasyonu İptal Et
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full border-blue-500/60 text-blue-600 hover:bg-blue-500/10"
                    onClick={() => {
                      setReserveName("");
                      setReserveWaiter(actionTable.waiter ?? session.name);
                      setReserveId(actionTable.id);
                      setActionId(null);
                    }}
                  >
                    <Clock className="mr-1.5 h-4 w-4" />
                    Rezerve Et
                  </Button>
                )}
                <div className="pt-1">
                  <label className="text-xs font-medium text-muted-foreground">Garson Ata</label>
                  <select
                    value={actionTable.waiter ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      update(actionTable.id, (t) => ({ ...t, waiter: v || undefined }));
                      toast.success(v ? `${actionTable.name} → ${v}` : "Garson kaldırıldı.");
                    }}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Atanmadı</option>
                    {waiters.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Rezervasyon formu */}
      <Dialog open={!!reserveTable} onOpenChange={(o) => !o && setReserveId(null)}>
        <DialogContent className="max-w-sm">
          {reserveTable && (
            <>
              <DialogHeader>
                <DialogTitle>{reserveTable.name} · Rezervasyon</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Misafir Adı</label>
                  <input
                    value={reserveName}
                    onChange={(e) => setReserveName(e.target.value)}
                    placeholder="Örn: Ahmet Yılmaz"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    İlgilenecek Garson
                  </label>
                  <select
                    value={reserveWaiter}
                    onChange={(e) => setReserveWaiter(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    {waiters.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    const label = reserveName.trim() || reserveWaiter;
                    update(reserveTable.id, (t) => ({ ...t, status: "rezerve", waiter: label }));
                    toast.success(`${reserveTable.name} rezerve edildi · ${label}`);
                    setReserveId(null);
                  }}
                >
                  Rezervasyonu Kaydet
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailTable} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {detailTable && (
            <>
              <DialogHeader>
                <DialogTitle>{detailTable.name} · Adisyon Detayı</DialogTitle>
              </DialogHeader>
              <p className="-mt-2 text-sm text-muted-foreground">
                {detailTable.hall} · {detailTable.waiter ?? session.name} ·{" "}
                {detailTable.seatedMinutes ?? 0} dk · {STATUS_META[detailTable.status].label}
              </p>

              <div className="grid gap-4 md:grid-cols-[1fr_260px]">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Sipariş Listesi</h3>
                  <ul className="mt-3 space-y-2">
                    {detailTable.lines.length === 0 && (
                      <li className="py-6 text-center text-sm text-muted-foreground">
                        Adisyon boş.
                      </li>
                    )}
                    {detailTable.lines.map((l) => (
                      <li
                        key={l.id}
                        className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{l.name}</p>
                          <p className="text-xs text-muted-foreground">{money(l.price)}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => changeQty(detailTable.id, l.id, -1)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-6 text-center text-sm font-bold text-foreground">
                          {l.qty}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => changeQty(detailTable.id, l.id, 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        {session.perms.includes("pos.refund") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => changeQty(detailTable.id, l.id, -l.qty)}
                            aria-label="Ürünü iptal et"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>

                  <h3 className="mt-5 text-sm font-bold text-foreground">Hızlı Ürün Ekle</h3>
                  <ProductPicker
                    menu={menu}
                    onAdd={(pid) => addItem(detailTable.id, pid)}
                    compact
                  />
                </div>

                <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between text-base font-bold text-foreground">
                    <span>Toplam</span>
                    <span>{money(total(detailTable))}</span>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Garson</label>
                    <select
                      value={detailTable.waiter ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        update(detailTable.id, (t) => ({ ...t, waiter: v || undefined }));
                        toast.success(v ? `Garson: ${v}` : "Garson kaldırıldı.");
                      }}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Atanmadı</option>
                      {waiters.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                  </div>
                  {session.perms.includes("pos.discount") && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toast.success("%10 indirim uygulandı.")}
                      >
                        <Percent className="mr-1.5 h-4 w-4" />
                        İndirim
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toast.success("İkram olarak işlendi.")}
                      >
                        <Gift className="mr-1.5 h-4 w-4" />
                        İkram
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full border-amber-500/60 text-amber-600 hover:bg-amber-500/10"
                    disabled={detailTable.status === "hesap"}
                    onClick={() => {
                      update(detailTable.id, (t) => ({ ...t, status: "hesap" }));
                      toast.success(`${detailTable.name} için hesap istendi.`);
                    }}
                  >
                    <ReceiptText className="mr-1.5 h-4 w-4" />
                    Hesap İste
                  </Button>
                  <Button
                    className="w-full bg-pos-success text-pos-success-foreground hover:bg-pos-success/90"
                    disabled={total(detailTable) === 0}
                    onClick={() => closeTable(detailTable.id, total(detailTable))}
                  >
                    Hesabı Kapat
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={() => setDetailId(null)}>
                    <X className="mr-1.5 h-4 w-4" />
                    Kapat
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PanelShell>
  );
}

/* ---------------- Hızlı sipariş ekranı ---------------- */

function QuickOrder({
  table,
  session,
  onBack,
  onAdd,
  onQty,
  onConfirm,
}: {
  table: PosTable;
  session: Staff;
  onBack: () => void;
  onAdd: (productId: string) => void;
  onQty: (lineId: string, delta: number) => void;
  onConfirm: () => void;
}) {
  const menu = useSellableCatalog();
  const sum = total(table);

  return (
    <div className="mx-auto max-w-6xl">
      <Button variant="outline" size="sm" onClick={onBack}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Masa Haritası
      </Button>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="pos-shadow rounded-2xl border border-border bg-card p-4">
          <ProductPicker menu={menu} onAdd={onAdd} />
        </div>

        <div className="pos-shadow flex flex-col rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-bold text-foreground">{table.name} · Yeni Adisyon</h2>
          <p className="text-xs text-muted-foreground">Garson: {session.name}</p>
          <ul className="mt-3 flex-1 space-y-2">
            {table.lines.length === 0 && (
              <li className="py-8 text-center text-sm text-muted-foreground">
                Henüz ürün eklenmedi.
              </li>
            )}
            {table.lines.map((l) => (
              <li key={l.id} className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{l.name}</p>
                  <p className="text-xs text-muted-foreground">{money(l.price)}</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onQty(l.id, -1)}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-6 text-center text-sm font-bold text-foreground">{l.qty}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onQty(l.id, 1)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            <div className="flex items-center justify-between text-base font-bold text-foreground">
              <span>Toplam</span>
              <span>{money(sum)}</span>
            </div>
            <Button
              className="w-full bg-pos-success text-pos-success-foreground hover:bg-pos-success/90"
              disabled={sum === 0}
              onClick={onConfirm}
            >
              Siparişi Kaydet & Masayı Aç
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Kategori + ürün seçici ---------------- */

function ProductPicker({
  menu,
  onAdd,
  compact = false,
}: {
  menu: ReturnType<typeof useSellableCatalog>;
  onAdd: (productId: string) => void;
  compact?: boolean;
}) {
  const [category, setCategory] = useState<string | null>(null);
  const catName = useCategoryResolver();

  const categories = useMemo(
    () =>
      Array.from(new Set(menu.map((m) => catName(m.category)).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "tr"),
      ),
    [menu, catName],
  );
  const activeCategory = category && categories.includes(category) ? category : null;
  const items = menu.filter((m) => !activeCategory || catName(m.category) === activeCategory);

  return (
    <div
      className={`grid gap-4 ${compact ? "sm:grid-cols-[150px_1fr]" : "sm:grid-cols-[170px_1fr]"}`}
    >
      <div className="space-y-2">
        <button
          onClick={() => setCategory(null)}
          className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
            !activeCategory
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          Tüm Ürünler
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory((prev) => (prev === c ? null : c))}
            className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
              activeCategory === c
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {c}
          </button>
        ))}
        {categories.length === 0 && (
          <p className="px-1 text-xs text-muted-foreground">Kategori tanımlanmamış.</p>
        )}
      </div>

      <div className={`grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
        {items.length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-muted-foreground">
            Bu kategoride ürün bulunmuyor.
          </p>
        )}
        {items.map((m) => (
          <button
            key={m.id}
            onClick={() => onAdd(m.id)}
            className="pos-card-press pos-shadow rounded-2xl border border-border bg-pos-surface p-4 text-left hover:pos-shadow-lg"
          >
            <p className="text-sm font-semibold text-foreground">{m.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{money(m.price)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
