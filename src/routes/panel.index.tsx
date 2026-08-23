import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, Users, Receipt, Timer, Lock, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { PanelShell } from "@/components/panel/PanelShell";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/lib/permissions";
import { money } from "@/lib/format";
import { useCatalog } from "@/lib/catalog-store";
import { useDiningTables, useOrderItems } from "@/lib/tables-store";
import { useKasaEntries } from "@/lib/kasa-store";

export const Route = createFileRoute("/panel/")({
  head: () => ({
    meta: [
      { title: "Yönetim Paneli — Bilirim Restoran POS" },
      {
        name: "description",
        content:
          "Restoran işletmeniz için günlük ciro, masa doluluk, mutfak ve stok özetlerini tek ekranda takip edin.",
      },
      { property: "og:title", content: "Yönetim Paneli — Bilirim Restoran POS" },
      {
        property: "og:description",
        content:
          "Restoran işletmeniz için günlük ciro, masa doluluk, mutfak ve stok özetlerini tek ekranda takip edin.",
      },
    ],
  }),
  component: PanelHome,
});

function PanelHome() {
  const { can: canPerm } = usePermissions();
  const catalog = useCatalog();
  const tables = useDiningTables();
  const items = useOrderItems();
  const kasa = useKasaEntries();

  const today = new Date().toLocaleDateString("tr-TR");
  const todayEntries = kasa.filter((e) => e.date.startsWith(today));
  const openTables = tables.filter((t) => t.status !== "bos");
  const openTotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  const kpis = [
    {
      label: "Günlük Ciro",
      value: money(todayEntries.reduce((s, e) => s + e.amount, 0)),
      icon: TrendingUp,
      tone: "bg-pos-apple text-pos-apple-foreground",
    },
    {
      label: "Açık Masa",
      value: `${openTables.length} / ${tables.length}`,
      icon: Users,
      tone: "bg-pos-tomato text-pos-tomato-foreground",
    },
    {
      label: "Bugünkü Adisyon",
      value: String(todayEntries.length),
      icon: Receipt,
      tone: "bg-pos-sky text-pos-sky-foreground",
    },
    {
      label: "Açık Adisyon Tutarı",
      value: money(openTotal),
      icon: Timer,
      tone: "bg-pos-cheese text-pos-cheese-foreground",
    },
  ];
  const canReports = canPerm("raporlar");
  const canDayEnd = canPerm("raporlar");
  const critical = catalog.filter((p) => p.critical > 0 && p.stock <= p.critical);

  return (
    <PanelShell
      title="Ana Sayfa"
      description="İşletmenizin anlık durumu"
      actions={
        canDayEnd ? (
          <Button size="sm" onClick={() => toast.success("Gün sonu raporu alındı.")}>
            <CalendarCheck className="mr-1.5 h-4 w-4" />
            Gün Sonu Al
          </Button>
        ) : null
      }
    >
      <div className="mx-auto max-w-6xl space-y-6">
        {canReports ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((k) => {
              const Icon = k.icon;
              return (
                <div
                  key={k.label}
                  className="pos-shadow rounded-2xl border border-border bg-card p-5"
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${k.tone}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">{k.label}</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                    {k.value}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
            <Lock className="h-4 w-4 shrink-0" />
            Finansal raporları görüntüleme yetkiniz bulunmuyor.
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="pos-shadow rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold text-foreground">Mutfaktaki Siparişler</h2>
            <ul className="mt-4 space-y-3">
              {openTables.map((t) => {
                const own = items.filter((i) => i.tableId === t.id);
                if (!own.length) return null;
                return (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {t.name} · {own.map((i) => `${i.qty}x ${i.name}`).join(", ")}
                    </span>
                    <span className="shrink-0 rounded-full bg-card px-2.5 py-1 text-xs font-semibold text-foreground">
                      {money(own.reduce((s, i) => s + i.price * i.qty, 0))}
                    </span>
                  </li>
                );
              })}
              {items.length === 0 && (
                <li className="text-sm text-muted-foreground">Mutfakta bekleyen sipariş yok.</li>
              )}
            </ul>
          </div>

          <div className="pos-shadow rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold text-foreground">Kritik Stok Uyarıları</h2>
            <ul className="mt-4 space-y-3">
              {critical.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {p.name}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-destructive">
                    {p.stock} {p.unit} · kritik {p.critical}
                  </span>
                </li>
              ))}
              {critical.length === 0 && (
                <li className="text-sm text-muted-foreground">Kritik stok bulunmuyor.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </PanelShell>
  );
}
