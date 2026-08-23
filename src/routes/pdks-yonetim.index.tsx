import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Users,
  UserCheck,
  MapPinned,
  Fingerprint,
  CalendarDays,
  AlertTriangle,
  LogIn,
  LogOut,
  UserPlus,
  CalendarPlus,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PdksShell } from "@/components/pdks/PdksShell";
import {
  DEFAULT_SHIFT,
  shiftWorkDate,
  usePdksLeaves,
  usePdksShifts,
  usePdksSites,
  usePdksStaff,
} from "@/lib/pdks-store";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/pdks-yonetim/")({
  head: () => ({
    meta: [
      { title: "Bilirim PDKS — Yönetici Paneli" },
      {
        name: "description",
        content:
          "Personel giriş çıkışlarını canlı takip edin: kayıtlı personel, tanımlı şantiyeler ve günlük okutma hareketleri.",
      },
      { property: "og:title", content: "Bilirim PDKS — Yönetici Paneli" },
      {
        property: "og:description",
        content: "Canlı personel hareketleri, şantiye dağılımı ve mesai özetleri tek ekranda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PdksDashboard,
});

type Punch = { id: string; staff_id: string; method: string; created_at: string };

const WEEKLY_TREND = [
  { day: "Pzt", planlanan: 72, gerceklesen: 68 },
  { day: "Sal", planlanan: 72, gerceklesen: 74 },
  { day: "Çar", planlanan: 72, gerceklesen: 70 },
  { day: "Per", planlanan: 72, gerceklesen: 66 },
  { day: "Cum", planlanan: 72, gerceklesen: 78 },
  { day: "Cmt", planlanan: 40, gerceklesen: 44 },
  { day: "Paz", planlanan: 0, gerceklesen: 8 },
];

const SHIFT_SPLIT: { name: string; value: number; color: string }[] = [
  { name: "Gündüz", value: 60, color: "var(--color-pos-sky)" },
  { name: "Akşam", value: 25, color: "var(--color-pos-cheese)" },
  { name: "Gece", value: 15, color: "var(--color-brand-navy)" },
];

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("") || "?"
  );
}

function PdksDashboard() {
  const { items: staff } = usePdksStaff();
  const navigate = useNavigate();
  const { items: sites } = usePdksSites();
  const { items: shifts } = usePdksShifts();
  const { items: leaves } = usePdksLeaves();
  const [punches, setPunches] = useState<Punch[]>([]);

  useEffect(() => {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    // Gece vardiyasinin onceki gunden devam eden okutmalarini da al.
    const from = new Date(since.getTime() - 18 * 3_600_000);
    void (async () => {
      const { data } = await supabase
        .from("pdks_punch_log")
        .select("id, staff_id, method, created_at")
        .gte("created_at", from.toISOString())
        .order("created_at", { ascending: false })
        .limit(60);
      setPunches(((data ?? []) as Punch[]).filter((p) => new Date(p.created_at) >= from));
    })();
  }, []);

  const nameOf = (id: string) => staff.find((s) => s.id === id);
  const shiftOf = (id: string) => {
    const s = staff.find((x) => x.id === id);
    return shifts.find((x) => x.id === s?.shiftId) ?? DEFAULT_SHIFT;
  };

  // Personel + mesai günü bazında okutmalar (eskiden yeniye) → çift/tek ile giriş/çıkış.
  // Gece vardiyasında sabah yapılan okutma önceki günün mesai bitişi sayılır.
  const asc = [...punches].reverse();
  const seq = new Map<string, number>();
  const direction = new Map<string, "in" | "out">();
  for (const p of asc) {
    const key = `${p.staff_id}|${shiftWorkDate(new Date(p.created_at), shiftOf(p.staff_id))}`;
    const n = seq.get(key) ?? 0;
    direction.set(p.id, n % 2 === 0 ? "in" : "out");
    seq.set(key, n + 1);
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayPunches = punches.filter((p) => new Date(p.created_at) >= startOfToday);

  const today = new Date().toISOString().slice(0, 10);
  const onLeaveIds = new Set(
    leaves.filter((l) => l.startDate <= today && l.endDate >= today).map((l) => l.staffId),
  );
  // Her personelin en son mesai gününe göre içeride mi olduğu.
  const lastOdd = new Map<string, boolean>();
  for (const [key, n] of seq) lastOdd.set(key.split("|")[0] as string, n % 2 === 1);
  const insideNow = Array.from(lastOdd.values()).filter(Boolean).length;
  const punchedIds = new Set(todayPunches.map((p) => p.staff_id));

  const workStart = sites.map((s) => s.workStart).sort()[0] ?? "08:00";
  const firstPunchOf = (id: string) =>
    asc.find((p) => p.staff_id === id)?.created_at ?? "";
  const isLate = (id: string) => {
    const t = firstPunchOf(id);
    if (!t) return false;
    return new Date(t).toTimeString().slice(0, 5) > workStart;
  };
  const absentOrLate = staff.filter(
    (s) => !onLeaveIds.has(s.id) && (!punchedIds.has(s.id) || isLate(s.id)),
  ).length;

  const kpis = [
    {
      label: "Kayıtlı Personel",
      value: String(staff.length),
      icon: Users,
      tone: "bg-pos-sky text-pos-sky-foreground",
      onSelect: () => void navigate({ to: "/pdks-yonetim/personel" }),
    },
    {
      label: "Şu An Mesaide (İçeride)",
      value: String(insideNow),
      icon: UserCheck,
      tone: "bg-pos-apple text-pos-apple-foreground",
      onSelect: () =>
        document
          .getElementById("bugunku-hareketler")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    },
    {
      label: "Bugün İzinli",
      value: String(onLeaveIds.size),
      icon: CalendarDays,
      tone: "bg-pos-sky text-pos-sky-foreground",
      onSelect: () =>
        void navigate({ to: "/pdks-yonetim/puantaj", search: { filter: "izinli" } }),
    },
    {
      label: "Gelmeyen / Geç Kalan",
      value: String(absentOrLate),
      icon: AlertTriangle,
      tone: "bg-pos-tomato text-pos-tomato-foreground",
      onSelect: () => void navigate({ to: "/pdks-yonetim/raporlar", hash: "ihlal-tablosu" }),
    },
  ];

  return (
    <PdksShell title="Ana Panel" description="Personel devam kontrol sisteminin anlık durumu">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <button
                key={k.label}
                type="button"
                onClick={k.onSelect}
                className="group w-full cursor-pointer rounded-xl border border-border/70 bg-card p-5 text-left shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_-12px_rgba(15,23,42,0.18)] transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_12px_32px_-10px_rgba(15,23,42,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-105 ${k.tone}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <p className="mt-4 text-sm text-muted-foreground">{k.label}</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{k.value}</p>
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm lg:col-span-3">
            <h2 className="text-sm font-bold text-foreground">Haftalık Mesai Trendi</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Planlanan ve gerçekleşen toplam mesai saatleri (örnek veri)
            </p>
            <div className="mt-4 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={WEEKLY_TREND} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} width={32} />
                  <Tooltip
                    cursor={{ fill: "color-mix(in oklab, var(--color-muted) 60%, transparent)" }}
                    contentStyle={{ borderRadius: 12, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="planlanan"
                    name="Planlanan"
                    fill="var(--color-muted-foreground)"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="gerceklesen"
                    name="Gerçekleşen"
                    fill="var(--color-primary)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm lg:col-span-2">
            <h2 className="text-sm font-bold text-foreground">Vardiya / Personel Dağılımı</h2>
            <p className="mt-1 text-xs text-muted-foreground">Vardiyalara göre personel oranı</p>
            <div className="mt-4 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={SHIFT_SPLIT}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {SHIFT_SPLIT.map((s) => (
                      <Cell key={s.name} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => `%${v}`}
                    contentStyle={{ borderRadius: 12, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
          <h2 className="text-sm font-bold text-foreground">Hızlı İşlemler</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              {
                label: "Yeni Personel Ekle",
                icon: UserPlus,
                tone: "bg-pos-sky text-pos-sky-foreground",
                onSelect: () => void navigate({ to: "/pdks-yonetim/personel" }),
              },
              {
                label: "Toplu İzin Gir",
                icon: CalendarPlus,
                tone: "bg-pos-cheese text-pos-cheese-foreground",
                onSelect: () =>
                  void navigate({ to: "/pdks-yonetim/puantaj", search: { filter: "izinli" } }),
              },
            ].map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  type="button"
                  onClick={a.onSelect}
                  className="group flex items-center gap-3 rounded-xl border border-border/70 bg-muted/40 px-4 py-3 text-left transition-all hover:-translate-y-1 hover:border-primary/40 hover:bg-card hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${a.tone}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                    {a.label}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-5">
          <section
            id="bugunku-hareketler"
            className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">Bugünkü Okutma Hareketleri</h2>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos-success opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-pos-success" />
                </span>
                canlı
              </span>
            </div>
            {todayPunches.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Bugün henüz okutma kaydı yok.
              </p>
            ) : (
              <ul className="relative mt-4 space-y-2.5 before:absolute before:bottom-3 before:left-5 before:top-3 before:w-px before:bg-border">
                {todayPunches.map((p, i) => {
                  const s = nameOf(p.staff_id);
                  const dir = direction.get(p.id) ?? "in";
                  return (
                    <li
                      key={p.id}
                      style={{ animationDelay: `${i * 40}ms` }}
                      className="relative flex animate-in items-center gap-3 rounded-xl border border-transparent bg-muted/50 px-3 py-2.5 fade-in slide-in-from-bottom-2 transition-all hover:translate-x-0.5 hover:border-border hover:bg-muted"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-bold text-brand-navy-foreground">
                        {initials(s?.name ?? "")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {s?.name ?? "Bilinmeyen personel"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[s?.role, s?.branch].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                        {new Date(p.created_at).toLocaleTimeString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span
                        className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          dir === "in"
                            ? "bg-pos-success text-pos-success-foreground"
                            : "bg-destructive text-destructive-foreground"
                        }`}
                      >
                        {dir === "in" ? (
                          <LogIn className="h-3 w-3" />
                        ) : (
                          <LogOut className="h-3 w-3" />
                        )}
                        {dir === "in" ? "GİRİŞ YAPTI" : "ÇIKIŞ YAPTI"}
                      </span>
                      <span className="hidden shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground sm:flex">
                        <Fingerprint className="h-3 w-3" />
                        {p.method || "Okutma"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
            <h2 className="text-sm font-bold text-foreground">Konum Dağılımı</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Toplam {staff.length} personel, {sites.length} tanımlı konum
            </p>
            {sites.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Henüz konum tanımlanmadı.
              </p>
            ) : (
              <ul className="mt-4 space-y-4">
                {sites.map((s) => {
                  const count = staff.filter((p) => p.branch === s.name).length;
                  const pct = staff.length ? Math.round((count / staff.length) * 100) : 0;
                  return (
                    <li key={s.id}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
                          <MapPinned className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{s.name}</span>
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                          {count} Kişi
                        </span>
                      </div>
                      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-pos-success transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </PdksShell>
  );
}
