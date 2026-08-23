import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, FileDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PdksShell } from "@/components/pdks/PdksShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { usePdksSites, usePdksStaff } from "@/lib/pdks-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pdks-yonetim/raporlar")({
  head: () => ({
    meta: [
      { title: "Mesai Raporları — Bilirim PDKS" },
      {
        name: "description",
        content:
          "Günlük ve haftalık mesai analizi: zamanında gelenler, geç kalanlar, erken çıkanlar ve ihlal tablosu.",
      },
      { property: "og:title", content: "Mesai Raporları — Bilirim PDKS" },
      {
        property: "og:description",
        content: "Geç kalma ve erken çıkma ihlallerini grafik ve tablo ile analiz edin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

type Punch = { id: string; staff_id: string; created_at: string };

const hhmm = (d: Date) => d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
/** Dakikayi "10 Saat 13 Dakika" bicimine cevirir. */
const durationTr = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h} Saat ${m} Dakika`;
  if (h > 0) return `${h} Saat`;
  return `${m} Dakika`;
};

const minOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes();

function Donut({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-5 shadow-sm">
      <svg viewBox="0 0 130 130" className="h-32 w-32 -rotate-90">
        <circle cx="65" cy="65" r={r} fill="none" strokeWidth="14" className="stroke-muted" />
        <circle
          cx="65"
          cy="65"
          r={r}
          fill="none"
          strokeWidth="14"
          strokeLinecap="round"
          stroke={tone}
          strokeDasharray={`${(c * pct) / 100} ${c}`}
          className="transition-all duration-700"
        />
      </svg>
      <p className="-mt-20 text-2xl font-black tabular-nums text-foreground">%{pct}</p>
      <p className="mt-14 text-sm font-bold text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">
        {value} / {total} kayıt
      </p>
    </div>
  );
}

function Page() {
  const { items: staff } = usePdksStaff();
  const { items: sites } = usePdksSites();
  const [range, setRange] = useState<"day" | "week">("day");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [punches, setPunches] = useState<Punch[]>([]);

  useEffect(() => {
    const start = new Date(`${date}T00:00:00`);
    if (range === "week") start.setDate(start.getDate() - 6);
    const end = new Date(`${date}T00:00:00`);
    end.setDate(end.getDate() + 1);
    void (async () => {
      const { data } = await supabase
        .from("pdks_punch_log")
        .select("id, staff_id, created_at")
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString())
        .order("created_at", { ascending: true })
        .limit(1000);
      setPunches((data ?? []) as Punch[]);
    })();
  }, [date, range]);

  const plan = useMemo(() => {
    const s = sites[0];
    return { start: s?.workStart ?? "08:00", end: s?.workEnd ?? "18:00" };
  }, [sites]);

  const records = useMemo(() => {
    const byKey = new Map<string, Date[]>();
    for (const p of punches) {
      const d = new Date(p.created_at);
      const key = `${p.staff_id}|${d.toISOString().slice(0, 10)}`;
      byKey.set(key, [...(byKey.get(key) ?? []), d]);
    }
    return [...byKey.entries()].map(([key, times]) => {
      const [staffId = "", day = ""] = key.split("|");
      const person = staff.find((s) => s.id === staffId);
      const first = times[0] as Date;
      const last = times[times.length - 1] as Date;
      const lateMin = Math.max(0, minOfDay(first) - toMin(plan.start));
      const earlyMin = times.length > 1 ? Math.max(0, toMin(plan.end) - minOfDay(last)) : 0;
      return {
        key,
        name: person?.name ?? "Bilinmeyen personel",
        date: day,
        planned: `${plan.start} - ${plan.end}`,
        actual: `${hhmm(first)} - ${times.length > 1 ? hhmm(last) : "—"}`,
        lateMin,
        earlyMin,
      };
    });
  }, [punches, staff, plan]);

  const total = records.length;
  const late = records.filter((r) => r.lateMin > 0).length;
  const early = records.filter((r) => r.earlyMin > 0).length;
  const onTime = records.filter((r) => r.lateMin === 0 && r.earlyMin === 0).length;
  const violations = records.filter((r) => r.lateMin > 0 || r.earlyMin > 0);

  const exportPdf = () => {
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    const rowsHtml = violations
      .map(
        (r) => `<tr>
          <td>${r.name}</td><td>${r.date}</td><td>${r.planned}</td><td>${r.actual}</td>
          <td style="color:#c0392b;font-weight:700">${
            r.lateMin > 0 ? `${durationTr(r.lateMin)} Geç Kaldı` : ""
          }${r.lateMin > 0 && r.earlyMin > 0 ? " · " : ""}${
            r.earlyMin > 0 ? `${durationTr(r.earlyMin)} Erken Çıktı` : ""
          }</td></tr>`,
      )
      .join("");
    w.document.write(
      `<html><head><title>Mesai Raporu ${date}</title></head><body style="font-family:sans-serif;padding:32px">
       <h1 style="font-size:20px">Mesai İhlal Raporu</h1>
       <p style="color:#555">${range === "day" ? "Günlük" : "Haftalık"} • ${date} • Planlanan mesai ${plan.start}-${plan.end}</p>
       <p style="color:#555">Zamanında: ${onTime} · Geç kalan: ${late} · Erken çıkan: ${early}</p>
       <table border="1" cellspacing="0" cellpadding="8" style="border-collapse:collapse;width:100%;font-size:12px">
       <thead><tr><th>Personel</th><th>Tarih</th><th>Planlanan</th><th>Gerçekleşen</th><th>Durum</th></tr></thead>
       <tbody>${rowsHtml || '<tr><td colspan="5">İhlal bulunmuyor.</td></tr>'}</tbody></table>
       </body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <PdksShell
      title="Mesai Raporları"
      description="Günlük ve haftalık geç kalma / erken çıkma analizi"
      actions={
        <Button onClick={exportPdf} variant="outline">
          <FileDown className="mr-2 h-4 w-4" />
          PDF'e Aktar
        </Button>
      }
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="space-y-1.5">
            <Label className="text-xs">Tarih</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Aralık</Label>
            <div className="flex gap-2">
              {(["day", "week"] as const).map((r) => (
                <Button
                  key={r}
                  size="sm"
                  variant={range === r ? "default" : "outline"}
                  onClick={() => setRange(r)}
                >
                  {r === "day" ? "Günlük" : "Haftalık"}
                </Button>
              ))}
            </div>
          </div>
          <p className="ml-auto text-xs text-muted-foreground">
            Planlanan mesai: <span className="font-semibold">{plan.start} - {plan.end}</span>
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Donut label="Zamanında Gelenler" value={onTime} total={total} tone="var(--pos-success)" />
          <Donut label="Geç Kalanlar" value={late} total={total} tone="var(--destructive)" />
          <Donut label="Erken Çıkanlar" value={early} total={total} tone="var(--primary)" />
        </div>

        <section
          id="ihlal-tablosu"
          className="scroll-mt-24 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm"
        >
          <h2 className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-bold text-foreground">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            İhlal Tablosu
          </h2>
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Personel</th>
                <th className="px-4 py-3 text-left">Tarih</th>
                <th className="px-4 py-3 text-left">Planlanan Mesai</th>
                <th className="px-4 py-3 text-left">Gerçekleşen</th>
                <th className="px-4 py-3 text-left">Durum</th>
              </tr>
            </thead>
            <tbody>
              {violations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    Seçili dönemde ihlal bulunmuyor.
                  </td>
                </tr>
              ) : (
                violations.map((r) => (
                  <tr key={r.key} className="border-t border-border hover:bg-muted/40">
                    <td className="px-4 py-3 font-semibold text-foreground">{r.name}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{r.date}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{r.planned}</td>
                    <td className="px-4 py-3 tabular-nums">{r.actual}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {r.lateMin > 0 && (
                          <span className={cn("rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive")}>
                            {durationTr(r.lateMin)} Geç Kaldı
                          </span>
                        )}
                        {r.earlyMin > 0 && (
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                            {durationTr(r.earlyMin)} Erken Çıktı
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </PdksShell>
  );
}
