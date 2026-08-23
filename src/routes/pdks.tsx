import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  QrCode,
  MapPin,
  LogOut,
  Home,
  User,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InstallHint } from "@/components/pdks/InstallHint";
import { StaffLogin } from "@/components/pdks/StaffLogin";
import {
  usePdksSession,
  signOutStaff,
  getDeviceId,
  useStandaloneMode,
} from "@/lib/pdks-session";
import { useServerFn } from "@tanstack/react-start";
import {
  recordPunch,
  verifyStaffDevice,
  getStaffLeave,
  type StaffLeaveInfo,
} from "@/lib/pdks-auth.functions";
import { getStaffSites, type PdksSiteInfo } from "@/lib/pdks-sites.functions";
import { QrScanDialog } from "@/components/pdks/QrScanDialog";
import { distanceMeters, parseCoords } from "@/lib/geo";
import { Smartphone } from "lucide-react";

type Movement = { id: string; type: "in" | "out"; time: string; method: string };

const STORAGE_KEY = "pdks-mobile-movements";

/** ISO tarihi (2026-08-23) gun.ay.yil bicimine cevirir. */
function trDate(iso?: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

/** Taze GPS verisi ister; tarayici onbellegi kullanilmaz (maximumAge: 0). */
function getFreshPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Cihaz konum servisini desteklemiyor."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    });
  });
}

type GeoState = {
  state: "idle" | "loading" | "ok" | "far" | "error";
  siteName?: string;
  distance?: number;
  message?: string;
};

/** Taze konumu tanimli santiyelerle karsilastirip durum uretir. */
function evaluateGeo(pos: GeolocationPosition, sites: PdksSiteInfo[]): GeoState {
  const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
  const targets = sites
    .map((s) => ({ site: s, coords: parseCoords(s.coords) }))
    .filter((t) => t.coords) as { site: PdksSiteInfo; coords: { lat: number; lng: number } }[];
  if (targets.length === 0) return { state: "ok", siteName: "Konum alındı", distance: 0 };
  let best = targets[0]!;
  let bestDist = distanceMeters(me, best.coords);
  for (const t of targets.slice(1)) {
    const d = distanceMeters(me, t.coords);
    if (d < bestDist) {
      best = t;
      bestDist = d;
    }
  }
  const inside = bestDist <= (best.site.radius || 50) + (pos.coords.accuracy || 0) / 2;
  return {
    state: inside ? "ok" : "far",
    siteName: best.site.name,
    distance: Math.round(bestDist),
  };
}

function geoErrorMessage(err: unknown): string {
  const e = err as GeolocationPositionError | undefined;
  if (e && typeof e.code === "number") {
    if (e.code === 1) return "Konum izni verilmedi.";
    if (e.code === 3) return "Konum zaman aşımına uğradı, tekrar deneyin.";
  }
  return "Konum alınamadı, tekrar deneyin.";
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  return new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export const Route = createFileRoute("/pdks")({
  head: () => ({
    meta: [
      { title: "Personel Mobil PDKS — Bilirim" },
      {
        name: "description",
        content:
          "Personellerin cep telefonundan QR veya konum ile mesai giriş çıkışı yapabildiği mobil PDKS ekranı.",
      },
      { property: "og:title", content: "Personel Mobil PDKS — Bilirim" },
      {
        property: "og:description",
        content: "QR ve konum doğrulamalı mobil personel devam kontrol sistemi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PdksMobileRoute,
});

function PdksMobileRoute() {
  const { session, ready } = usePdksSession();
  const { ready: modeReady, standalone } = useStandaloneMode();
  if (!ready || !modeReady) return null;
  if (!standalone) return <LockScreen />;
  if (!session) return <StaffLogin />;
  return (
    <PdksMobile
      staffId={session.id}
      staffName={session.name}
      branch={session.branch}
      role={session.role}
    />
  );
}

function LockScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-[420px] rounded-3xl border border-border bg-card p-7 text-center pos-shadow">
        <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-destructive/10 text-destructive">
          <ShieldCheck className="size-8" />
        </div>
        <h1 className="mt-5 text-xl font-black tracking-tight">Güvenli Giriş Gerekli</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Güvenlik kuralı gereği, lütfen tarayıcı menüsünden uygulamayı Ana Ekrana Ekle diyerek
          oradan giriş yapınız.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-muted/60 p-3 text-xs font-semibold text-muted-foreground">
          <Smartphone className="size-4" />
          Tarayıcı sekmesinden mesai okutma yapılamaz.
        </div>
      </div>
    </div>
  );
}

function PdksMobile({
  staffId,
  staffName,
  branch,
  role,
}: {
  staffId: string;
  staffName: string;
  branch: string;
  role: string;
}) {
  const [tab, setTab] = useState<"home" | "profile">("home");
  const [movements, setMovements] = useState<Movement[]>([]);
  const [sites, setSites] = useState<PdksSiteInfo[]>([]);
  const [geo, setGeo] = useState<GeoState>({ state: "loading" });
  const [punching, setPunching] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const punchFn = useServerFn(recordPunch);
  const sitesFn = useServerFn(getStaffSites);
  const verifyFn = useServerFn(verifyStaffDevice);
  const leaveFn = useServerFn(getStaffLeave);
  const [leave, setLeave] = useState<StaffLeaveInfo | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setLeave(await leaveFn({ data: { staffId } }));
      } catch {
        setLeave(null);
      }
    })();
  }, [leaveFn, staffId]);

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      try {
        const res = await verifyFn({ data: { staffId, deviceId: getDeviceId() } });
        if (!stopped && !res.valid) {
          signOutStaff();
          toast.error("Cihaz kaydınız yönetici tarafından sıfırlandı. Lütfen tekrar giriş yapın.");
        }
      } catch {
        /* baglanti hatasi: oturumu koru */
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), 20000);
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [staffId, verifyFn]);

  useEffect(() => {
    void (async () => {
      try {
        setSites(await sitesFn({ data: { staffId } }));
      } catch {
        setSites([]);
      }
    })();
  }, [sitesFn, staffId]);

  /** Taze konum alir, durumu gunceller ve sonucu dondurur. */
  const refreshGeo = useCallback(async (): Promise<GeoState> => {
    setGeo({ state: "loading" });
    try {
      const pos = await getFreshPosition();
      const next = evaluateGeo(pos, sites);
      setGeo(next);
      return next;
    } catch (err) {
      const next: GeoState = { state: "error", message: geoErrorMessage(err) };
      setGeo(next);
      return next;
    }
  }, [sites]);

  const checkLocation = useCallback(() => {
    void refreshGeo();
  }, [refreshGeo]);

  useEffect(() => {
    checkLocation();
  }, [checkLocation]);

  const locationOk = geo.state === "ok";
  const actionsDisabled = geo.state === "loading" || punching || !locationOk;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY}:${todayKey()}`);
      if (raw) setMovements(JSON.parse(raw) as Movement[]);
    } catch {
      /* yok say */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}:${todayKey()}`, JSON.stringify(movements));
    } catch {
      /* yok say */
    }
  }, [movements]);

  const nextType: "in" | "out" = useMemo(
    () => (movements.length % 2 === 0 ? "in" : "out"),
    [movements],
  );

  async function punch(method: string) {
    if (punching) return;
    setPunching(true);
    try {
      // Aksiyon aninda son bir kez taze konum dogrulamasi
      const fresh = await refreshGeo();
      if (fresh.state !== "ok") {
        toast.error(
          fresh.state === "far"
            ? `Şantiye alanı dışındasınız (${fresh.distance} m).`
            : (fresh.message ?? "Konum doğrulanamadı."),
        );
        return;
      }
      const res = await punchFn({
        data: { staffId, deviceId: getDeviceId(), method },
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      const entry: Movement = {
        id: crypto.randomUUID(),
        type: nextType,
        time: nowTime(),
        method,
      };
      setMovements((prev) => [...prev, entry]);
      toast.success(
        nextType === "in"
          ? `Mesai başladı • ${entry.time} (${method})`
          : `Mesai bitti • ${entry.time} (${method})`,
      );
    } catch {
      toast.error("Okutma doğrulanamadı. Lütfen tekrar deneyin.");
    } finally {
      setPunching(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-[480px] px-5 pt-6">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Hoş geldin,</p>
            <h1 className="truncate text-2xl font-black tracking-tight">{staffName}</h1>
          </div>
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <User className="size-6" />
          </div>
        </header>

        <section
          className={cn(
            "mt-5 rounded-3xl border p-4 pos-shadow",
            locationOk
              ? "border-pos-success/30 bg-pos-success/10"
              : "border-destructive/30 bg-destructive/10",
          )}
        >
          <div className="flex items-start gap-3">
            <span className="relative mt-1.5 flex size-3 shrink-0">
              <span
                className={cn(
                  "absolute inline-flex size-full animate-ping rounded-full opacity-75",
                  locationOk ? "bg-pos-success" : "bg-destructive",
                )}
              />
              <span
                className={cn(
                  "relative inline-flex size-3 rounded-full",
                  locationOk ? "bg-pos-success" : "bg-destructive",
                )}
              />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold">
                {geo.state === "loading"
                  ? "Konum alınıyor…"
                  : locationOk
                    ? "Konum Doğrulandı"
                    : "Konum Doğrulanamadı"}
              </p>
              <p className="text-xs text-muted-foreground">
                {geo.state === "loading"
                  ? "GPS verisi bekleniyor"
                  : geo.state === "ok"
                    ? `${geo.siteName || branch || "Çalışma alanı"} içindesiniz${
                        geo.distance ? ` • ${geo.distance} m` : ""
                      }`
                    : geo.state === "far"
                      ? `${geo.siteName} alanına ${geo.distance} m uzaktasınız`
                      : (geo.message ?? "Konum alınamadı")}
              </p>
            </div>
            <button
              type="button"
              onClick={checkLocation}
              className="ml-auto shrink-0 rounded-full bg-background/70 px-3 py-1 text-[11px] font-semibold text-muted-foreground"
            >
              Yenile
            </button>
          </div>
        </section>

        {tab === "home" && (
          <>
            <section className="mt-10 flex flex-col items-center">
              <button
                type="button"
                disabled={actionsDisabled}
                onClick={() => setScanOpen(true)}
                className={cn(
                  "grid size-56 place-items-center rounded-full text-center transition-transform active:scale-95",
                  "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground",
                  "shadow-[0_18px_40px_-12px_color-mix(in_oklab,var(--primary)_60%,transparent)]",
                  "ring-8 ring-primary/10",
                  actionsDisabled && "pointer-events-none opacity-50 grayscale",
                )}
              >
                <span className="flex flex-col items-center gap-3 px-8">
                  <QrCode className="size-14" />
                  <span className="text-lg font-black leading-tight">
                    {geo.state === "loading"
                      ? "Konum Bekleniyor…"
                      : !locationOk
                        ? "Konum Doğrulanmadı"
                        : nextType === "in"
                          ? "QR Okut ve Mesaiye Başla"
                          : "QR Okut ve Mesaiyi Bitir"}
                  </span>
                </span>
              </button>

              <Button
                variant="outline"
                size="lg"
                disabled={actionsDisabled}
                onClick={() => void punch("Konum")}
                className="mt-6 h-14 w-full rounded-2xl text-base font-bold"
              >
                <MapPin className="size-5" />
                {geo.state === "loading"
                  ? "Konum Bekleniyor…"
                  : nextType === "in"
                    ? "Konum ile Giriş Yap"
                    : "Konum ile Çıkış Yap"}
              </Button>
            </section>

          </>
        )}


        {tab === "profile" && (
          <section className="mt-8 space-y-3">
            <h2 className="text-lg font-black">Profil & İzinlerim</h2>
            <div className="rounded-2xl border bg-card p-4">
              <p className="text-sm font-bold">{staffName}</p>
              <p className="text-xs text-muted-foreground">
                {role || "Personel"} • {branch || "Merkez"}
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 text-sm">
              <ShieldCheck className="size-5 text-pos-success" />
              QR ve konum doğrulama aktif
            </div>
            {leave?.onLeave ? (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-3">
                  <CalendarDays className="size-5 text-primary" />
                  <p className="text-sm font-black text-primary">İzinlisiniz</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {trDate(leave.startDate)} - {trDate(leave.endDate)} tarihleri arasında
                  izinlisiniz.
                </p>
                {leave.kind && (
                  <p className="mt-1 text-xs text-muted-foreground">İzin tipi: {leave.kind}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
                <CalendarDays className="size-5" />
                Bu dönemde tanımlı izniniz bulunmuyor.
              </div>
            )}

            <Button
              variant="outline"
              className="h-14 w-full rounded-2xl text-base font-bold"
              onClick={() => {
                signOutStaff();
                toast.success("Oturum kapatıldı.");
              }}
            >
              <LogOut className="size-4" />
              Oturumu Kapat
            </Button>
          </section>
        )}
      </div>

      <InstallHint />

      <QrScanDialog
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onResult={(text) => {
          setScanOpen(false);
          void punch(text ? "QR" : "QR");
        }}
      />

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid w-full max-w-[480px] grid-cols-3">
          {(
            [
              { id: "home", label: "Ana Sayfa", icon: Home },
              { id: "scan", label: "Okutma (QR)", icon: QrCode },
              { id: "profile", label: "Profil / İzinlerim", icon: User },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.id === "scan") {
                  setTab("home");
                  if (!actionsDisabled) setScanOpen(true);
                  return;
                }
                setTab(item.id);
              }}
              className={cn(
                "flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-semibold leading-tight transition-colors active:bg-muted",
                tab === item.id ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5 shrink-0" />
              <span className="w-full truncate text-center">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
