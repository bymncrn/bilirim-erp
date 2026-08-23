import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Check, ChevronDown, Download, Plus, Search, Trash2, X } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PdksShell } from "@/components/pdks/PdksShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  LEAVE_KINDS,
  UNPAID_LEAVE_KINDS,
  DEFAULT_SHIFT,
  newId,
  planForDay,
  shiftCrossesMidnight,
  shiftWorkDate,
  usePdksHolidays,
  usePdksLeaves,
  usePdksOvertime,
  usePdksShifts,
  usePdksSites,
  usePdksStaff,
  type PdksLeave,
  type PdksShift,
} from "@/lib/pdks-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pdks-yonetim/puantaj")({
  validateSearch: (search: Record<string, unknown>) => ({
    filter: search["filter"] === "izinli" ? ("izinli" as const) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Puantaj & İzinler — Bilirim PDKS" },
      {
        name: "description",
        content:
          "Personelin aylık çalışma günleri, izin, devamsızlık ve fazla mesai özeti ile gün gün giriş/çıkış dökümü.",
      },
      { property: "og:title", content: "Puantaj & İzinler — Bilirim PDKS" },
      {
        property: "og:description",
        content: "Aylık puantaj tablosu, Excel aktarımı ve izin yönetimi tek ekranda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

type Punch = { id: string; staff_id: string; created_at: string };

const monthKey = (d: Date) => d.toISOString().slice(0, 7);
const hhmm = (d: Date) => d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

/** Vardiyanin net calisma saati (gece vardiyasi 24 saati asar mantigiyla hesaplanir). */
function shiftNetHours(shift: PdksShift) {
  const [sh, sm] = shift.start.split(":").map(Number);
  const [eh, em] = shift.end.split(":").map(Number);
  const start = (sh ?? 8) * 60 + (sm ?? 0);
  let end = (eh ?? 18) * 60 + (em ?? 0);
  if (end <= start) end += 24 * 60;
  const h = (end - start - (shift.breakMinutes ?? 0)) / 60;
  return h > 0 ? h : 8;
}

const EMPTY: PdksLeave = {
  id: "",
  staffId: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  kind: LEAVE_KINDS[0] as string,
  reason: "",
  paid: true,
};

/** Ay icindeki hafta ici (Pzt-Cum) gun sayisi; gecerli ayda bugune kadar. */
function workingDaysInMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  const year = y ?? 2026;
  const mon = m ?? 1;
  const last = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const now = new Date();
  const capped =
    monthKey(now) === month ? Math.min(last, now.getUTCDate()) : last;
  let count = 0;
  for (let d = 1; d <= capped; d += 1) {
    const day = new Date(Date.UTC(year, mon - 1, d)).getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

/** Izin gununun secili ay ile kesisimini gun sayisi olarak verir. */
function leaveDaysInMonth(leave: PdksLeave, month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(`${month}-01T00:00:00.000Z`).getTime();
  const end = new Date(Date.UTC(y ?? 2026, m ?? 1, 0)).getTime();
  const a = Math.max(new Date(`${leave.startDate}T00:00:00.000Z`).getTime(), start);
  const b = Math.min(new Date(`${leave.endDate}T00:00:00.000Z`).getTime(), end);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.floor((b - a) / 86_400_000) + 1;
}

function Page() {
  const { filter } = Route.useSearch();
  const { items: staff } = usePdksStaff();
  const { items: sites } = usePdksSites();
  const { items: shifts } = usePdksShifts();
  const { items: holidays } = usePdksHolidays();
  const { items: leaves, save } = usePdksLeaves();
  const { items: approvals, setApproval } = usePdksOvertime();
  const [month, setMonth] = useState(monthKey(new Date()));
  const [query, setQuery] = useState("");
  const [punches, setPunches] = useState<Punch[]>([]);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [onlyLeave, setOnlyLeave] = useState(filter === "izinli");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [form, setForm] = useState<PdksLeave>(EMPTY);

  useEffect(() => {
    const [y, m] = month.split("-").map(Number);
    // Gece vardiyasi icin ay siniri disina bir gun tasma payi birakilir.
    const from = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, 0)).toISOString();
    const to = new Date(Date.UTC(y ?? 2026, m ?? 1, 2)).toISOString();
    void (async () => {
      const { data } = await supabase
        .from("pdks_punch_log")
        .select("id, staff_id, created_at")
        .gte("created_at", from)
        .lt("created_at", to)
        .order("created_at", { ascending: true })
        .limit(2000);
      setPunches((data ?? []) as Punch[]);
    })();
  }, [month]);

  const expectedDaily = useMemo(() => {
    const s = sites[0];
    if (!s) return 9;
    const plan = planForDay(s, 1);
    const [sh, sm] = plan.start.split(":").map(Number);
    const [eh, em] = plan.end.split(":").map(Number);
    const h =
      (eh ?? 18) + (em ?? 0) / 60 - ((sh ?? 8) + (sm ?? 0) / 60) - (s.breakMinutes ?? 0) / 60;
    return h > 0 ? h : 9;
  }, [sites]);

  /** Konum ayarindan gelen otomatik gunluk mola (saat). */
  const breakHours = useMemo(() => (sites[0]?.breakMinutes ?? 0) / 60, [sites]);

  const expectedDays = useMemo(() => workingDaysInMonth(month), [month]);

  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    return staff
      .filter(
        (s) =>
          !q ||
          s.name.toLocaleLowerCase("tr").includes(q) ||
          s.branch.toLocaleLowerCase("tr").includes(q),
      )
      .filter((s) => shiftFilter === "all" || (s.shiftId || "") === (shiftFilter === "default" ? "" : shiftFilter))
      .map((s) => {
        const shift = shifts.find((x) => x.id === s.shiftId) ?? DEFAULT_SHIFT;
        const night = shiftCrossesMidnight(shift);
        const staffBreak = s.shiftId ? (shift.breakMinutes ?? 0) / 60 : breakHours;
        const staffExpected = s.shiftId ? shiftNetHours(shift) : expectedDaily;
        const own = punches.filter((p) => p.staff_id === s.id);
        const byDay = new Map<string, Date[]>();
        for (const p of own) {
          const d = new Date(p.created_at);
          const key = shiftWorkDate(d, shift);
          if (!key.startsWith(month)) continue;
          byDay.set(key, [...(byDay.get(key) ?? []), d]);
        }
        let hours = 0;
        let countedHours = 0;
        let approvedOvertime = 0;
        let pendingOvertime = 0;
        let weekendHours = 0;
        let holidayHours = 0;
        const days = [...byDay.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, times]) => {
            let gross = 0;
            for (let i = 0; i + 1 < times.length; i += 2) {
              gross +=
                ((times[i + 1] as Date).getTime() - (times[i] as Date).getTime()) / 3_600_000;
            }
            const dayHours = gross > 0 ? Math.max(0, gross - staffBreak) : 0;
            const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
            const holiday = holidays.find((h) => h.date === date);
            const isWeekend = !holiday && !planForDay(sites[0], weekday).working;
            const special: "holiday" | "weekend" | "" = holiday
              ? "holiday"
              : isWeekend
                ? "weekend"
                : "";
            if (special === "holiday") holidayHours += dayHours;
            if (special === "weekend") weekendHours += dayHours;
            const overtime = Math.max(0, dayHours - staffExpected);
            const approval = approvals.find((a) => a.staffId === s.id && a.workDate === date);
            const approved = approval?.approved === true;
            if (!special && overtime > 0) {
              if (approved) approvedOvertime += overtime;
              else pendingOvertime += overtime;
            }
            if (!special)
              countedHours += Math.min(dayHours, staffExpected) + (approved ? overtime : 0);
            hours += dayHours;
            return {
              date,
              first: hhmm(times[0] as Date),
              last: times.length > 1 ? hhmm(times[times.length - 1] as Date) : "—",
              punches: times.length,
              gross,
              hours: dayHours,
              overtime: special ? 0 : overtime,
              special,
              holidayName: holiday?.name ?? "",
              approved,
              decided: !!approval,
            };
          });
        const workedDays = days.filter((d) => !d.special).length;
        const ownLeaves = leaves.filter((l) => l.staffId === s.id);
        const leaveDays = ownLeaves.reduce((acc, l) => acc + leaveDaysInMonth(l, month), 0);
        const unpaidLeaveDays = ownLeaves
          .filter((l) => !l.paid || UNPAID_LEAVE_KINDS.includes(l.kind))
          .reduce((acc, l) => acc + leaveDaysInMonth(l, month), 0);
        const absentDays = Math.max(0, expectedDays - workedDays - leaveDays);
        const balance = countedHours - (workedDays + leaveDays) * staffExpected;
        return {
          id: s.id,
          name: s.name,
          branch: s.branch,
          shiftName: shift.name,
          shiftRange: `${shift.start} - ${shift.end}`,
          night,
          workedDays,
          leaveDays,
          unpaidLeaveDays,
          absentDays,
          deductedDays: unpaidLeaveDays + absentDays,
          hours,
          approvedOvertime,
          pendingOvertime,
          weekendHours,
          holidayHours,
          balance,
          days,
        };
      });
  }, [
    staff,
    shifts,
    punches,
    leaves,
    approvals,
    holidays,
    sites,
    breakHours,
    expectedDaily,
    expectedDays,
    month,
    query,
    shiftFilter,
  ]);

  const visibleRows = useMemo(
    () => (onlyLeave ? rows.filter((r) => r.leaveDays > 0) : rows),
    [rows, onlyLeave],
  );

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const sheet = XLSX.utils.json_to_sheet(
      visibleRows.map((r) => ({
        Personel: r.name,
        Şube: r.branch,
        Vardiya: `${r.shiftName} (${r.shiftRange})`,
        "Normal Çalışma Günü": r.workedDays,
        "İzinli/Raporlu": r.leaveDays,
        "Ücretsiz İzin": r.unpaidLeaveDays,
        Devamsızlık: r.absentDays,
        "Maaştan Düşülecek Gün": r.deductedDays,
        "Toplam Saat": r.hours.toFixed(1),
        "Onaylı Fazla Mesai": r.approvedOvertime.toFixed(1),
        "Onay Bekleyen Fazla Mesai": r.pendingOvertime.toFixed(1),
        "Hafta Sonu Mesaisi": r.weekendHours.toFixed(1),
        "Resmi Tatil Mesaisi": r.holidayHours.toFixed(1),
        "Eksik/Fazla Mesai": `${r.balance >= 0 ? "+" : ""}${r.balance.toFixed(1)} Saat`,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Puantaj");
    XLSX.writeFile(wb, `puantaj-${month}.xlsx`);
  };

  const submitLeave = () => {
    if (!form.staffId) {
      toast.error("Personel seçiniz.");
      return;
    }
    if (form.endDate < form.startDate) {
      toast.error("Bitiş tarihi başlangıçtan önce olamaz.");
      return;
    }
    save([...leaves, { ...form, id: newId() }]);
    toast.success("İzin tanımlandı. Bu personel izinli günlerde mesai başlatamaz.");
    setOpen(false);
  };

  return (
    <PdksShell
      title="Puantaj & İzinler"
      description="Aylık çalışma günleri, izin, devamsızlık ve fazla mesai yönetimi"
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="space-y-1.5">
            <Label className="text-xs">Ay / Yıl</Label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="min-w-[220px] flex-1 space-y-1.5">
            <Label className="text-xs">Personel Ara</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ad veya şube…"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Vardiyaya Göre Filtrele</Label>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="h-10 w-52 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">Tüm Vardiyalar</option>
              <option value="default">{DEFAULT_SHIFT.name}</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {`${s.name} (${s.start}-${s.end})`}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={exportExcel}
            className="bg-pos-success text-white hover:bg-pos-success/90"
          >
            <Download className="mr-2 h-4 w-4" />
            Excel'e Aktar
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setForm({ ...EMPTY });
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            İzin Ekle
          </Button>
          <Button
            variant={onlyLeave ? "default" : "outline"}
            onClick={() => setOnlyLeave((v) => !v)}
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            {onlyLeave ? "Tümünü Göster" : "Sadece İzinliler"}
          </Button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Personel</th>
                <th className="px-4 py-3 text-left">Şube</th>
                <th className="px-4 py-3 text-left">Vardiya</th>
                <th className="px-4 py-3 text-right">Normal Çalışma Günü</th>
                <th className="px-4 py-3 text-right">İzinli/Raporlu</th>
                <th className="px-4 py-3 text-right">Devamsızlık</th>
                <th className="px-4 py-3 text-right">Maaştan Düşülecek</th>
                <th className="px-4 py-3 text-right">Toplam Saat</th>
                <th className="px-4 py-3 text-right">Onaylı F. Mesai</th>
                <th className="px-4 py-3 text-right">Hafta Sonu Mesaisi</th>
                <th className="px-4 py-3 text-right">Resmi Tatil Mesaisi</th>
                <th className="px-4 py-3 text-right">Eksik/Fazla Mesai</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-muted-foreground">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                visibleRows.map((r) => (
                  <Fragment key={r.id}>
                    <tr
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                      className="cursor-pointer border-t border-border hover:bg-muted/40"
                    >
                      <td className="px-4 py-3 font-semibold text-foreground">
                        <span className="inline-flex items-center gap-2">
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform",
                              expanded === r.id && "rotate-180",
                            )}
                          />
                          {r.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.branch || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
                            r.night
                              ? "bg-brand-navy text-brand-navy-foreground"
                              : "bg-primary/10 text-primary",
                          )}
                          title={r.shiftRange}
                        >
                          {r.shiftName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.workedDays}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.leaveDays}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.absentDays}</td>
                      <td
                        className="px-4 py-3 text-right font-semibold tabular-nums"
                        title={`Ücretsiz izin: ${r.unpaidLeaveDays} gün • Devamsızlık: ${r.absentDays} gün`}
                      >
                        {r.deductedDays}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.hours.toFixed(1)}</td>
                      <td
                        className="px-4 py-3 text-right tabular-nums text-pos-success"
                        title={`Onay bekleyen/reddedilen: ${r.pendingOvertime.toFixed(1)} saat (toplama eklenmez)`}
                      >
                        {r.approvedOvertime.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-amber-600">
                        {r.weekendHours.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-destructive">
                        {r.holidayHours.toFixed(1)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right font-bold tabular-nums",
                          r.balance < 0 ? "text-destructive" : "text-pos-success",
                        )}
                      >
                        {r.balance >= 0 ? "+" : ""}
                        {r.balance.toFixed(1)} Saat
                      </td>
                    </tr>
                    {expanded === r.id && (
                      <tr className="border-t border-border bg-muted/30">
                        <td colSpan={12} className="px-4 py-4">
                          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Gün Gün Giriş / Çıkış Dökümü
                          </p>
                          {r.days.length === 0 ? (
                            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                              Bu ay için okutma kaydı yok.
                            </p>
                          ) : (
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {r.days.map((d) => (
                                <div
                                  key={d.date}
                                  className={cn(
                                    "rounded-xl border border-border bg-card px-3 py-2.5",
                                    d.special && "border-destructive/40 bg-destructive/5",
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-semibold text-muted-foreground">
                                      {d.date}
                                    </p>
                                    {d.special && (
                                      <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive">
                                        {d.special === "holiday"
                                          ? `TATİL MESAİSİ${d.holidayName ? ` · ${d.holidayName}` : ""}`
                                          : "TATİL MESAİSİ · HAFTA SONU"}
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-1 text-sm font-bold tabular-nums text-foreground">
                                    {d.first} → {d.last}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {d.punches} okutma • brüt {d.gross.toFixed(1)} sa • mola düşülmüş
                                    net {d.hours.toFixed(1)} sa
                                  </p>
                                  {d.overtime > 0 && (
                                    <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted/60 px-2 py-1.5">
                                      <span className="text-xs font-semibold text-foreground">
                                        +{d.overtime.toFixed(1)} sa fazla mesai
                                      </span>
                                      <span
                                        className={cn(
                                          "rounded-full px-2 py-0.5 text-[10px] font-bold",
                                          d.decided && d.approved
                                            ? "bg-pos-success/15 text-pos-success"
                                            : d.decided
                                              ? "bg-destructive/15 text-destructive"
                                              : "bg-muted text-muted-foreground",
                                        )}
                                      >
                                        {d.decided ? (d.approved ? "ONAYLI" : "REDDEDİLDİ") : "BEKLİYOR"}
                                      </span>
                                      <div className="ml-auto flex gap-1">
                                        <Button
                                          size="icon"
                                          variant={d.approved ? "default" : "outline"}
                                          className="h-7 w-7"
                                          title="Fazla mesaiyi onayla"
                                          onClick={() => {
                                            setApproval(r.id, d.date, true);
                                            toast.success("Fazla mesai onaylandı.");
                                          }}
                                        >
                                          <Check className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant={
                                            d.decided && !d.approved ? "destructive" : "outline"
                                          }
                                          className="h-7 w-7"
                                          title="Fazla mesaiyi reddet"
                                          onClick={() => {
                                            setApproval(r.id, d.date, false);
                                            toast.success("Fazla mesai reddedildi.");
                                          }}
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <CalendarDays className="h-4 w-4" />
            Tanımlı İzinler
          </h2>
          {leaves.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Henüz izin tanımlanmadı.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {leaves.map((l) => {
                const s = staff.find((p) => p.id === l.staffId);
                return (
                  <li
                    key={l.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5"
                  >
                    <span className="font-semibold text-foreground">{s?.name ?? "—"}</span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {l.kind}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        l.paid
                          ? "bg-pos-success/10 text-pos-success"
                          : "bg-destructive/10 text-destructive",
                      )}
                    >
                      {l.paid ? "Ücretli" : "Ücretsiz (maaştan düşülür)"}
                    </span>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {l.startDate} → {l.endDate}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {l.reason}
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        save(leaves.filter((x) => x.id !== l.id));
                        toast.success("İzin kaydı silindi.");
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>İzin Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Personel</Label>
              <select
                value={form.staffId}
                onChange={(e) => setForm({ ...form, staffId: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Seçiniz…</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Başlangıç Tarihi</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Bitiş Tarihi</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>İzin Tipi</Label>
              <select
                value={form.kind}
                onChange={(e) =>
                  setForm({
                    ...form,
                    kind: e.target.value,
                    paid: !UNPAID_LEAVE_KINDS.includes(e.target.value),
                  })
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {LEAVE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {form.paid
                  ? "Ücretli izin: maaş hakedişinden düşülmez."
                  : "Ücretsiz izin: bu günler maaş hakedişinden düşülür."}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Mazeret / Açıklama</Label>
              <Textarea
                rows={3}
                maxLength={500}
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button onClick={submitLeave} className="h-12 w-full sm:h-10 sm:w-auto">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PdksShell>
  );
}
