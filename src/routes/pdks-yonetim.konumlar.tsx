import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import {
  Clock,
  Coffee,
  Crosshair,
  CalendarDays,
  MapPinned,
  Pencil,
  Plus,
  Printer,
  QrCode,
  Timer,
  Trash2,
} from "lucide-react";
import QRCode from "qrcode";
import { Suspense, lazy, useEffect, useState } from "react";
import { toast } from "sonner";
import { PdksShell } from "@/components/pdks/PdksShell";
import { PlanLimitDialog, type PlanLimitInfo } from "@/components/pdks/PlanLimitDialog";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  WEEKDAY_NAMES,
  defaultSchedule,
  newId,
  planForDay,
  shiftCrossesMidnight,
  usePdksHolidays,
  usePdksShifts,
  usePdksSites,
  type PdksHoliday,
  type PdksShift,
  type PdksSite,
} from "@/lib/pdks-store";
import { formatCoords, parseCoords } from "@/lib/geo";
import { usePdksPlan } from "@/lib/pdks-plan";
import { cn } from "@/lib/utils";

/** Takvimde gosterim sirasi: Pazartesi -> Pazar. */
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const MapPicker = lazy(() => import("@/components/pdks/MapPicker"));

export const Route = createFileRoute("/pdks-yonetim/konumlar")({
  head: () => ({
    meta: [
      { title: "Konum & Mesai Ayarları — Bilirim PDKS" },
      { name: "description", content: "Şantiye adresi, koordinat, yarıçap ve mesai saatleri tanımları bu ekrandan yapılandırılır." },
      { property: "og:title", content: "Konum & Mesai Ayarları — Bilirim PDKS" },
      { property: "og:description", content: "Şantiye adresi, koordinat, yarıçap ve mesai saatleri tanımları bu ekrandan yapılandırılır." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

const EMPTY: PdksSite = {
  id: "",
  name: "",
  address: "",
  radius: 50,
  coords: "",
  workStart: "08:00",
  workEnd: "18:00",
  breakMinutes: 60,
  schedule: defaultSchedule(),
};

function QrDialog({ site, onClose }: { site: PdksSite | null; onClose: () => void }) {
  const [png, setPng] = useState("");

  useEffect(() => {
    if (!site) return;
    void QRCode.toDataURL(`BILIRIM-PDKS:${site.id}`, { width: 720, margin: 1 }).then(setPng);
  }, [site]);

  const print = () => {
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) return;
    w.document.write(
      `<html><head><title>${site?.name ?? ""} QR</title></head><body style="font-family:sans-serif;text-align:center;padding:40px">
       <h1 style="font-size:28px;margin:0 0 8px">${site?.name ?? ""}</h1>
       <p style="margin:0 0 24px;color:#555">Mesai: ${site ? `${planForDay(site, 1).start} - ${planForDay(site, 1).end}` : ""}</p>
       <img src="${png}" style="width:420px;height:420px" />
       <p style="margin-top:24px;color:#555">Bilirim PDKS · Giriş/çıkış için bu kodu okutunuz</p>
       </body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <Dialog open={!!site} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{site?.name} — Konum QR Kodu</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3">
          {png ? (
            <img src={png} alt={`${site?.name} QR kodu`} className="h-64 w-64 rounded-xl border p-2" />
          ) : (
            <div className="h-64 w-64 animate-pulse rounded-xl bg-muted" />
          )}
          <p className="text-center text-xs text-muted-foreground">
            Bu kodu yazdırıp şantiye girişine asın. Personel mobil uygulamadan okutarak giriş/çıkış
            yapar.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Kapat
          </Button>
          <Button onClick={print} disabled={!png}>
            <Printer className="mr-2 h-4 w-4" />
            Yazdır
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Page() {
  const { items, save } = usePdksSites();
  const plan = usePdksPlan();
  const [limitInfo, setLimitInfo] = useState<PlanLimitInfo>(null);
  const { items: holidays, save: saveHolidays } = usePdksHolidays();
  const { items: shifts, save: saveShifts } = usePdksShifts();
  const [open, setOpen] = useState(false);
  const [holidayOpen, setHolidayOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [shiftForm, setShiftForm] = useState<PdksShift>({
    id: "",
    name: "",
    start: "08:00",
    end: "16:00",
    breakMinutes: 60,
  });
  const [holidayForm, setHolidayForm] = useState<PdksHoliday>({ id: "", name: "", date: "" });
  const [qrSite, setQrSite] = useState<PdksSite | null>(null);
  const [form, setForm] = useState<PdksSite>(EMPTY);
  const picked = parseCoords(form.coords);

  const setDay = (day: number, patch: Partial<{ working: boolean; start: string; end: string }>) =>
    setForm((f) => ({
      ...f,
      schedule: (f.schedule ?? defaultSchedule()).map((p) =>
        p.day === day ? { ...p, ...patch } : p,
      ),
    }));

  const addHoliday = () => {
    if (!holidayForm.date) {
      toast.error("Tatil tarihi seçiniz.");
      return;
    }
    saveHolidays([
      ...holidays,
      { ...holidayForm, name: holidayForm.name.trim() || "Resmi Tatil", id: newId() },
    ]);
    setHolidayForm({ id: "", name: "", date: "" });
    toast.success("Resmi tatil eklendi.");
  };

  const addShift = () => {
    if (!shiftForm.name.trim()) {
      toast.error("Vardiya adı zorunludur.");
      return;
    }
    saveShifts([...shifts, { ...shiftForm, name: shiftForm.name.trim(), id: newId() }]);
    setShiftForm({ id: "", name: "", start: "08:00", end: "16:00", breakMinutes: 60 });
    toast.success("Vardiya oluşturuldu.");
  };

  const useMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Bu cihaz konum servisini desteklemiyor.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setForm((f) => ({
          ...f,
          coords: formatCoords(pos.coords.latitude, pos.coords.longitude),
        })),
      () => toast.error("Konum alınamadı. Lütfen konum iznini verin."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const startNew = () => {
    if (items.length >= plan.sites) {
      setLimitInfo({
        title: "Limit Aşıldı — Paketinizi Yükseltin",
        description: `${plan.name} paketi ${plan.sites} lokasyon ile sınırlıdır. Daha fazla şube/şantiye tanımlamak için paketinizi yükseltin.`,
      });
      return;
    }
    setForm({ ...EMPTY });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Konum adı zorunludur.");
      return;
    }
    if (form.id) {
      save(items.map((i) => (i.id === form.id ? form : i)));
      toast.success("Konum güncellendi.");
    } else {
      save([...items, { ...form, id: newId() }]);
      toast.success("Konum eklendi.");
    }
    setOpen(false);
  };

  return (
    <PdksShell
      title="Konum & Mesai Ayarları"
      description="Şantiye, şube, mesai saatleri ve QR/GPS doğrulama alanları"
      actions={
        <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setShiftOpen(true)} className="font-semibold">
          <Timer className="mr-2 h-4 w-4" />
          Vardiyalar
        </Button>
        <Button variant="outline" onClick={() => setHolidayOpen(true)} className="font-semibold">
          <CalendarDays className="mr-2 h-4 w-4" />
          Resmi Tatil Takvimi
        </Button>
        <Button onClick={startNew} className="font-semibold">
          <Plus className="mr-2 h-4 w-4" />
          Yeni Konum Ekle
        </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-7xl">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-sm">
            <MapPinned className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-3 text-base font-bold text-foreground">Henüz konum tanımlanmadı</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Personelin giriş yapabileceği şantiye veya şube alanlarını tanımlayın.
            </p>
            <Button className="mt-4" onClick={startNew}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Konum Ekle
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((s) => (
              <div key={s.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <MapPinned className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-bold text-foreground">{s.name}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">{s.address || "Adres girilmedi"}</p>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-muted/50 p-3">
                    <dt className="text-xs uppercase text-muted-foreground">Yarıçap</dt>
                    <dd className="mt-0.5 font-semibold text-foreground">{s.radius} m</dd>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <dt className="text-xs uppercase text-muted-foreground">Koordinat</dt>
                    <dd className="mt-0.5 truncate font-mono text-xs text-foreground">
                      {s.coords || "—"}
                    </dd>
                  </div>
                  <div className="col-span-2 rounded-xl bg-muted/50 p-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-xs uppercase text-muted-foreground">
                        Haftalık Çalışma Takvimi
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {DAY_ORDER.map((d) => {
                        const p = planForDay(s, d);
                        return (
                          <li key={d} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{WEEKDAY_NAMES[d]}</span>
                            {p.working ? (
                              <span className="font-semibold tabular-nums text-foreground">
                                {p.start} - {p.end}
                              </span>
                            ) : (
                              <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-bold text-destructive">
                                Tatil
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 rounded-xl bg-muted/50 p-3">
                    <Coffee className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-xs uppercase text-muted-foreground">Mola</span>
                    <span className="ml-auto font-semibold tabular-nums text-foreground">
                      {s.breakMinutes} dk
                    </span>
                  </div>
                </dl>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setQrSite(s)}>
                    <QrCode className="mr-1.5 h-3.5 w-3.5" />
                    QR
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setForm(s);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Düzenle
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      save(items.filter((i) => i.id !== s.id));
                      toast.success(`${s.name} silindi.`);
                    }}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Sil
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Konumu Düzenle" : "Yeni Konum Ekle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Konum Adı</Label>
              <Input
                value={form.name}
                placeholder="Örn: Merkez Şantiye"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Açık Adres</Label>
              <Textarea
                rows={3}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Geçerli Yarıçap (metre)</Label>
                <Input
                  type="number"
                  min={10}
                  value={form.radius}
                  onChange={(e) => setForm({ ...form, radius: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Koordinat</Label>
                <Input
                  value={form.coords}
                  placeholder="40.1885, 29.0610"
                  onChange={(e) => setForm({ ...form, coords: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Otomatik Günlük Mola Süresi (dakika)</Label>
                <Input
                  type="number"
                  min={0}
                  step={5}
                  value={form.breakMinutes}
                  onChange={(e) =>
                    setForm({ ...form, breakMinutes: Math.max(0, Number(e.target.value) || 0) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Puantajda günlük giriş-çıkış farkından otomatik düşülür (örn. 09:00-19:00 = 10
                  saat, 60 dk mola ile net 9 saat).
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Haftalık Çalışma Takvimi</Label>
              <div className="divide-y rounded-xl border border-border">
                {DAY_ORDER.map((d) => {
                  const p = planForDay(form, d);
                  return (
                    <div key={d} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                      <span className="w-24 text-sm font-semibold text-foreground">
                        {WEEKDAY_NAMES[d]}
                      </span>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={p.working}
                          onCheckedChange={(v) => setDay(d, { working: v })}
                          aria-label={`${WEEKDAY_NAMES[d]} çalışma günü`}
                        />
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            p.working ? "text-pos-success" : "text-destructive",
                          )}
                        >
                          {p.working ? "Çalışma Günü" : "Tatil Günü"}
                        </span>
                      </div>
                      {p.working && (
                        <div className="ml-auto flex items-center gap-2">
                          <Input
                            type="time"
                            className="w-28"
                            value={p.start}
                            onChange={(e) => setDay(d, { start: e.target.value })}
                          />
                          <span className="text-muted-foreground">—</span>
                          <Input
                            type="time"
                            className="w-28"
                            value={p.end}
                            onChange={(e) => setDay(d, { end: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Tatil olarak işaretlenen günlerde yapılan çalışmalar puantajda "Hafta Sonu Mesaisi"
                sütununa yazılır.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Harita üzerinden seç</Label>
                <Button type="button" size="sm" variant="outline" onClick={useMyLocation}>
                  <Crosshair className="mr-1.5 h-3.5 w-3.5" />
                  Konumumu Kullan
                </Button>
              </div>
              <ClientOnly
                fallback={<div className="h-64 w-full rounded-xl border bg-muted/50" />}
              >
                <Suspense fallback={<div className="h-64 w-full rounded-xl border bg-muted/50" />}>
                  <MapPicker
                    value={picked}
                    onChange={(lat, lng) => setForm((f) => ({ ...f, coords: formatCoords(lat, lng) }))}
                  />
                </Suspense>
              </ClientOnly>
              <p className="text-xs text-muted-foreground">
                Haritada bir noktaya dokunarak şantiye merkezini işaretleyin.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button onClick={submit} className="h-12 w-full sm:h-10 sm:w-auto">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QrDialog site={qrSite} onClose={() => setQrSite(null)} />

      <Dialog open={shiftOpen} onOpenChange={setShiftOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vardiyalar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Vardiya Adı</Label>
                  <Input
                    value={shiftForm.name}
                    placeholder="Örn: Gece"
                    onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Başlangıç</Label>
                  <Input
                    type="time"
                    value={shiftForm.start}
                    onChange={(e) => setShiftForm({ ...shiftForm, start: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Bitiş</Label>
                  <Input
                    type="time"
                    value={shiftForm.end}
                    onChange={(e) => setShiftForm({ ...shiftForm, end: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Mola Süresi (dakika)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={5}
                    value={shiftForm.breakMinutes}
                    onChange={(e) =>
                      setShiftForm({
                        ...shiftForm,
                        breakMinutes: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                  />
                </div>
              </div>
              <Button className="self-end" onClick={addShift}>
                <Plus className="mr-2 h-4 w-4" />
                Ekle
              </Button>
            </div>
            {shifts.length === 0 ? (
              <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Henüz vardiya tanımlanmadı. Örn: Gündüz (08:00-16:00), Akşam (16:00-00:00), Gece
                (00:00-08:00).
              </p>
            ) : (
              <ul className="space-y-2">
                {shifts.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5"
                  >
                    <Timer className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-foreground">{s.name}</span>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {s.start} - {s.end}
                    </span>
                    {shiftCrossesMidnight(s) && (
                      <span className="rounded-full bg-brand-navy px-2 py-0.5 text-[10px] font-bold text-brand-navy-foreground">
                        GECE VARDİYASI
                      </span>
                    )}
                    <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Coffee className="h-3.5 w-3.5" />
                      {s.breakMinutes} dk mola
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        saveShifts(shifts.filter((x) => x.id !== s.id));
                        toast.success("Vardiya silindi.");
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">
              Bitiş saati başlangıçtan küçükse vardiya gece yarısını aşar; ertesi sabah yapılan çıkış
              okutması önceki günün mesaisine yazılır.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShiftOpen(false)}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={holidayOpen} onOpenChange={setHolidayOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resmi Tatil Takvimi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Tarih</Label>
                  <Input
                    type="date"
                    value={holidayForm.date}
                    onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tatil Adı</Label>
                  <Input
                    value={holidayForm.name}
                    placeholder="Örn: 29 Ekim Cumhuriyet Bayramı"
                    onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                  />
                </div>
              </div>
              <Button className="self-end" onClick={addHoliday}>
                <Plus className="mr-2 h-4 w-4" />
                Ekle
              </Button>
            </div>
            {holidays.length === 0 ? (
              <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Henüz resmi tatil tanımlanmadı.
              </p>
            ) : (
              <ul className="space-y-2">
                {holidays.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5"
                  >
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-foreground">{h.name}</span>
                    <span className="ml-auto text-sm tabular-nums text-muted-foreground">
                      {h.date}
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        saveHolidays(holidays.filter((x) => x.id !== h.id));
                        toast.success("Resmi tatil silindi.");
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">
              Bu günlerde yapılan çalışmalar puantajda "Resmi Tatil Mesaisi" olarak raporlanır.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHolidayOpen(false)}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PlanLimitDialog info={limitInfo} onClose={() => setLimitInfo(null)} />
    </PdksShell>
  );
}
