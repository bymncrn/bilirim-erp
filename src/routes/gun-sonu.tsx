import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  CalendarCheck,
  CreditCard,
  Printer,
  Receipt,
  Ticket,
  TrendingUp,
  Undo2,
  Wallet,
  Percent,
  Archive,
} from "lucide-react";
import { toast } from "sonner";

import { ModuleGuard } from "@/components/subscription/ModuleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useDaySales,
  useZReports,
  summarize,
  closeDay,
  dayMoney,
  PAYMENT_LABELS,
  MODULE_SALES_LABELS,
  type PaymentType,
  type SalesModule,
} from "@/lib/dayend-store";

export const Route = createFileRoute("/gun-sonu")({
  head: () => ({
    meta: [
      { title: "Gün Sonu & Z-Raporu — Bilirim ERP" },
      {
        name: "description",
        content:
          "Günlük ciro, ödeme tipi kırılımı, kasa sayım mutabakatı ve Z-raporu arşivi ile kasa kapanış ekranı.",
      },
      { property: "og:title", content: "Gün Sonu & Z-Raporu — Bilirim ERP" },
      {
        property: "og:description",
        content:
          "Günlük ciro, ödeme kırılımı, kasa mutabakatı ve termal Z-raporu çıktısı tek ekranda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <ModuleGuard module="muhasebe">
      <GunSonuPage />
    </ModuleGuard>
  ),
});

const PAYMENT_ICONS: Record<PaymentType, typeof Banknote> = {
  nakit: Banknote,
  kart: CreditCard,
  yemek: Ticket,
  cari: Wallet,
};

const MODULE_BAR: Record<SalesModule, string> = {
  pos: "bg-pos-tomato",
  adisyon: "bg-pos-cheese",
};

function GunSonuPage() {
  const sales = useDaySales();
  const reports = useZReports();
  const s = useMemo(() => summarize(sales), [sales]);

  const [counted, setCounted] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const systemCash = s.byPayment.nakit.total;
  const countedNum = Number(counted.replace(",", ".")) || 0;
  const diff = counted.trim() === "" ? 0 : Number((countedNum - systemCash).toFixed(2));
  const hasCount = counted.trim() !== "";

  const diffTone = !hasCount
    ? "border-border bg-muted/50 text-muted-foreground"
    : diff === 0
      ? "border-pos-apple bg-pos-apple/15 text-foreground"
      : diff < 0
        ? "border-destructive bg-destructive/10 text-destructive"
        : "border-pos-sky bg-pos-sky/15 text-foreground";

  const diffLabel = !hasCount
    ? "Sayım bekleniyor"
    : diff === 0
      ? "Mutabık"
      : diff < 0
        ? "Kasa Eksiği"
        : "Kasa Fazlası";

  const moduleTotal = s.byModule.pos + s.byModule.adisyon || 1;

  const handleClose = () => {
    const report = closeDay(countedNum);
    setConfirmOpen(false);
    setCounted("");
    toast.success(`Gün kapatıldı. ${report.id} numaralı Z-Raporu arşive kaydedildi.`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/muhasebe">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Ön Muhasebe</span>
            </Button>
          </Link>
          <div className="ml-1">
            <h1 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
              Gün Sonu &amp; Z-Raporu
            </h1>
            <p className="text-xs text-muted-foreground">Kasa Kapanış &amp; Mutabakat</p>
          </div>
          <Link to="/dashboard" className="ml-auto">
            <Button variant="ghost" size="sm">
              Ana Panel
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        {/* 1. Özet kartları */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Günlük Toplam Ciro"
            value={dayMoney(s.revenue)}
            icon={TrendingUp}
            tone="bg-pos-apple text-pos-apple-foreground"
          />
          <SummaryCard
            label="Fiş / Adisyon Sayısı"
            value={String(s.ticketCount)}
            icon={Receipt}
            tone="bg-pos-sky text-pos-sky-foreground"
          />
          <SummaryCard
            label="İndirim & İkram"
            value={dayMoney(s.discount)}
            icon={Percent}
            tone="bg-pos-cheese text-pos-cheese-foreground"
          />
          <SummaryCard
            label="İptal / İade"
            value={dayMoney(s.refund)}
            icon={Undo2}
            tone="bg-pos-tomato text-pos-tomato-foreground"
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* 2. Ödeme tipi kırılımı */}
          <section className="pos-shadow rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold text-foreground">Ödeme Tipi Kırılımı</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Gün içindeki satışların ödeme yöntemine göre dağılımı
            </p>
            <Table className="mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead>Ödeme Yöntemi</TableHead>
                  <TableHead className="text-right">İşlem Adedi</TableHead>
                  <TableHead className="text-right">Toplam Tutar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Object.keys(PAYMENT_LABELS) as PaymentType[]).map((key) => {
                  const Icon = PAYMENT_ICONS[key];
                  const row = s.byPayment[key];
                  return (
                    <TableRow key={key}>
                      <TableCell className="font-medium text-foreground">
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {PAYMENT_LABELS[key]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{row.count}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {dayMoney(row.total)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-bold text-foreground">Genel Toplam</TableCell>
                  <TableCell className="text-right font-bold">{s.ticketCount}</TableCell>
                  <TableCell className="text-right font-bold">{dayMoney(s.revenue)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {/* 4. Modül kırılımı */}
            <div className="mt-6">
              <h3 className="text-sm font-bold text-foreground">Modül Kırılımı</h3>
              <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-muted">
                {(Object.keys(MODULE_SALES_LABELS) as SalesModule[]).map((m) => (
                  <div
                    key={m}
                    className={MODULE_BAR[m]}
                    style={{ width: `${(s.byModule[m] / moduleTotal) * 100}%` }}
                  />
                ))}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(Object.keys(MODULE_SALES_LABELS) as SalesModule[]).map((m) => (
                  <div
                    key={m}
                    className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm"
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${MODULE_BAR[m]}`} />
                    <span className="min-w-0 flex-1 truncate text-foreground">
                      {MODULE_SALES_LABELS[m]}
                    </span>
                    <span className="font-semibold text-foreground">{dayMoney(s.byModule[m])}</span>
                    <span className="text-xs text-muted-foreground">
                      %{Math.round((s.byModule[m] / moduleTotal) * 100)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 3. Kasa sayım & mutabakat */}
          <section className="pos-shadow h-fit rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold text-foreground">Kasa Sayım &amp; Mutabakat</h2>
            <p className="mt-1 text-xs text-muted-foreground">Fiziki nakit kontrolü</p>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-muted/60 px-4 py-3">
                <p className="text-xs text-muted-foreground">Sistemin Hesapladığı Nakit</p>
                <p className="mt-1 text-xl font-bold text-foreground">{dayMoney(systemCash)}</p>
              </div>

              <div>
                <label htmlFor="counted-cash" className="text-xs font-medium text-muted-foreground">
                  Kasada Sayılan Nakit (₺)
                </label>
                <Input
                  id="counted-cash"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={counted}
                  onChange={(e) => setCounted(e.target.value)}
                  className="mt-1 text-lg font-semibold"
                />
              </div>

              <div className={`rounded-xl border px-4 py-3 ${diffTone}`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Kasa Farkı</p>
                  <Badge variant="outline" className="border-current bg-transparent text-current">
                    {diffLabel}
                  </Badge>
                </div>
                <p className="mt-1 text-xl font-bold">
                  {diff > 0 ? "+" : ""}
                  {dayMoney(diff)}
                </p>
              </div>
            </div>

            {/* 5. Gün kapatma & yazdırma */}
            <div className="mt-5 space-y-2">
              <Button
                className="w-full gap-2"
                size="lg"
                disabled={sales.length === 0}
                onClick={() => setConfirmOpen(true)}
              >
                <CalendarCheck className="h-4 w-4" />
                Günü Kapat ve Z-Raporu Al
              </Button>
              <Button variant="outline" className="w-full gap-2" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                80mm Termal Çıktı Önizle / Yazdır
              </Button>
              {sales.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground">
                  Aktif gün kapatıldı, sayaçlar sıfırlandı.
                </p>
              ) : null}
            </div>
          </section>
        </div>

        {/* 80mm termal önizleme */}
        <section className="pos-shadow rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-bold text-foreground">Z-Raporu Önizleme (80mm)</h2>
          <div className="mt-4 flex justify-center">
            <div
              id="z-report"
              className="w-[80mm] max-w-full rounded-lg border border-dashed border-border bg-background p-4 font-mono text-[11px] leading-relaxed text-foreground"
            >
              <p className="text-center text-sm font-bold">BİLİRİM POS</p>
              <p className="text-center">GÜN SONU Z-RAPORU</p>
              <p className="mt-1 text-center">{new Date().toLocaleString("tr-TR")}</p>
              <p className="my-2">--------------------------------</p>
              <ReceiptRow label="Fiş / Adisyon" value={String(s.ticketCount)} />
              <ReceiptRow label="İndirim & İkram" value={dayMoney(s.discount)} />
              <ReceiptRow label="İptal / İade" value={dayMoney(s.refund)} />
              <p className="my-2">--------------------------------</p>
              {(Object.keys(PAYMENT_LABELS) as PaymentType[]).map((k) => (
                <ReceiptRow
                  key={k}
                  label={`${PAYMENT_LABELS[k]} (${s.byPayment[k].count})`}
                  value={dayMoney(s.byPayment[k].total)}
                />
              ))}
              <p className="my-2">--------------------------------</p>
              {(Object.keys(MODULE_SALES_LABELS) as SalesModule[]).map((m) => (
                <ReceiptRow
                  key={m}
                  label={MODULE_SALES_LABELS[m]}
                  value={dayMoney(s.byModule[m])}
                />
              ))}
              <p className="my-2">--------------------------------</p>
              <ReceiptRow label="TOPLAM CİRO" value={dayMoney(s.revenue)} bold />
              <ReceiptRow label="Sistem Nakit" value={dayMoney(systemCash)} />
              <ReceiptRow label="Sayılan Nakit" value={dayMoney(countedNum)} />
              <ReceiptRow label="Kasa Farkı" value={dayMoney(diff)} bold />
              <p className="my-2">--------------------------------</p>
              <p className="text-center">Yine Bekleriz</p>
            </div>
          </div>
        </section>

        {/* Arşiv */}
        <section className="pos-shadow rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Archive className="h-4 w-4" />
            Geçmiş Z-Raporları / Arşiv
          </h2>
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Rapor No</TableHead>
                <TableHead>Kapanış</TableHead>
                <TableHead className="text-right">Fiş</TableHead>
                <TableHead className="text-right">Ciro</TableHead>
                <TableHead className="text-right">Kasa Farkı</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-foreground">{r.id}</TableCell>
                  <TableCell>{r.closedAt}</TableCell>
                  <TableCell className="text-right">{r.ticketCount}</TableCell>
                  <TableCell className="text-right font-semibold">{dayMoney(r.revenue)}</TableCell>
                  <TableCell
                    className={`text-right font-semibold ${
                      r.diff === 0 ? "text-foreground" : r.diff < 0 ? "text-destructive" : ""
                    }`}
                  >
                    {r.diff > 0 ? "+" : ""}
                    {dayMoney(r.diff)}
                  </TableCell>
                </TableRow>
              ))}
              {reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Henüz arşivlenmiş Z-Raporu bulunmuyor.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </section>
      </main>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Günü kapatmak istiyor musunuz?</DialogTitle>
            <DialogDescription>
              Bugünün raporu arşive kaydedilecek ve tüm sayaçlar ertesi gün için sıfırlanacaktır. Bu
              işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 rounded-xl bg-muted/60 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Toplam Ciro</span>
              <span className="font-semibold text-foreground">{dayMoney(s.revenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fiş / Adisyon</span>
              <span className="font-semibold text-foreground">{s.ticketCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kasa Farkı</span>
              <span className="font-semibold text-foreground">{dayMoney(diff)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Vazgeç
            </Button>
            <Button onClick={handleClose}>Onayla ve Günü Kapat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof TrendingUp;
  tone: string;
}) {
  return (
    <div className="pos-shadow rounded-2xl border border-border bg-card p-5">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function ReceiptRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? "font-bold" : ""}`}>
      <span className="min-w-0 truncate">{label}</span>
      <span>{value}</span>
    </div>
  );
}
