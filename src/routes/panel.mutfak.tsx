import { createFileRoute } from "@tanstack/react-router";
import { Clock, ChefHat, CheckCheck } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { PanelShell } from "@/components/panel/PanelShell";
import { Button } from "@/components/ui/button";
import {
  useDiningTables,
  useOrderItems,
  patchOrderItem,
  removeOrderItem,
} from "@/lib/tables-store";

export const Route = createFileRoute("/panel/mutfak")({
  head: () => ({
    meta: [
      { title: "Mutfak Ekranı (KDS) — Bilirim Restoran POS" },
      {
        name: "description",
        content:
          "Mutfak sipariş takip ekranı: bekleyen, hazırlanan ve servise hazır adisyonları canlı izleyin.",
      },
      { property: "og:title", content: "Mutfak Ekranı (KDS) — Bilirim Restoran POS" },
      {
        property: "og:description",
        content:
          "Mutfak sipariş takip ekranı: bekleyen, hazırlanan ve servise hazır adisyonları canlı izleyin.",
      },
    ],
  }),
  component: KdsPage,
});

type KdsStatus = "bekliyor" | "hazirlaniyor" | "hazir";

const COLUMNS: { status: KdsStatus; label: string; tone: string }[] = [
  { status: "bekliyor", label: "Bekliyor", tone: "bg-pos-cheese text-pos-cheese-foreground" },
  {
    status: "hazirlaniyor",
    label: "Hazırlanıyor",
    tone: "bg-pos-tomato text-pos-tomato-foreground",
  },
  { status: "hazir", label: "Hazır", tone: "bg-pos-apple text-pos-apple-foreground" },
];

type KdsTicket = {
  id: string;
  table: string;
  waiter: string;
  minutes: number;
  status: KdsStatus;
  items: { name: string; qty: number; note: string }[];
};

function KdsPage() {
  const tables = useDiningTables();
  const items = useOrderItems();

  const tickets = useMemo<KdsTicket[]>(() => {
    return tables
      .map((t) => {
        const own = items.filter((i) => i.tableId === t.id);
        if (!own.length) return null;
        const first = own[0]!;
        const minutes = t.openedAt
          ? Math.max(0, Math.round((Date.now() - new Date(t.openedAt).getTime()) / 60000))
          : 0;
        return {
          id: t.id,
          table: t.name,
          waiter: t.waiter || "—",
          minutes,
          status: (first.status as KdsStatus) ?? "bekliyor",
          items: own.map((i) => ({ name: i.name, qty: i.qty, note: i.note })),
        } as KdsTicket;
      })
      .filter((t): t is KdsTicket => t !== null);
  }, [tables, items]);

  const advance = (ticketId: string) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    const own = items.filter((i) => i.tableId === ticketId);
    if (ticket.status === "hazir") {
      void Promise.all(own.map((i) => removeOrderItem(i.id)));
      toast.success(`${ticket.table} siparişi servis edildi.`);
      return;
    }
    const next = ticket.status === "bekliyor" ? "hazirlaniyor" : "hazir";
    void Promise.all(own.map((i) => patchOrderItem(i.id, { status: next })));
  };

  return (
    <PanelShell title="Mutfak Ekranı (KDS)" description="Canlı sipariş akışı">
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => (
          <section key={col.status} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${col.tone}`}>
                {col.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {tickets.filter((t) => t.status === col.status).length} adisyon
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {tickets
                .filter((t) => t.status === col.status)
                .map((t) => (
                  <article
                    key={t.id}
                    className="pos-shadow rounded-xl border border-border bg-pos-surface p-4"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{t.table}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                        {t.items.length} kalem
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {t.minutes} dk
                      </span>
                    </div>
                    <ul className="mt-3 space-y-1.5">
                      {t.items.map((i) => (
                        <li key={i.name} className="text-sm text-foreground">
                          <span className="font-semibold">{i.qty}x</span> {i.name}
                          {i.note && (
                            <span className="ml-1 text-xs text-muted-foreground">({i.note})</span>
                          )}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-muted-foreground">Garson: {t.waiter}</p>
                    <Button size="sm" className="mt-3 w-full" onClick={() => advance(t.id)}>
                      {t.status === "hazir" ? (
                        <>
                          <CheckCheck className="mr-1.5 h-4 w-4" /> Servis Edildi
                        </>
                      ) : (
                        <>
                          <ChefHat className="mr-1.5 h-4 w-4" />
                          {t.status === "bekliyor" ? "Hazırlamaya Başla" : "Hazır"}
                        </>
                      )}
                    </Button>
                  </article>
                ))}
              {tickets.filter((t) => t.status === col.status).length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">Sipariş yok.</p>
              )}
            </div>
          </section>
        ))}
      </div>
    </PanelShell>
  );
}
