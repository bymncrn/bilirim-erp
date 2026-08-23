import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Calculator,
  ScanBarcode,
  UtensilsCrossed,
  Wrench,
  ArrowRight,
  LogOut,
  LayoutDashboard,
  Lock,
  Crown,
  CalendarClock,
  AlertTriangle,
  ChevronDown,
  Building2,
  Ticket,
  Fingerprint,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, signOut } from "@/hooks/use-auth";
import { useCompany } from "@/lib/company-store";
import {
  useActivePackage,
  useHasModule,
  useHasPdks,
  MODULE_LABELS,
  type ModuleKey,
} from "@/lib/subscription-store";
import { useSubscriptionStatus } from "@/lib/subscription-status";
import { usePendingOrder } from "@/lib/subscription-orders";
import { useOnboardingRedirect } from "@/lib/onboarding";
import { useRole } from "@/lib/rbac";
import bilirimLogo from "@/assets/bilirim-logo.png.asset.json";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Ana Yönetim Paneli — Bilirim ERP" },
      {
        name: "description",
        content:
          "Ön muhasebe, POS satış kasası, adisyon/masa yönetimi ve teknik servis modüllerine tek ekrandan erişin.",
      },
      { property: "og:title", content: "Ana Yönetim Paneli — Bilirim ERP" },
      {
        property: "og:description",
        content:
          "Ön muhasebe, POS satış kasası, adisyon/masa yönetimi ve teknik servis modüllerine tek ekrandan erişin.",
      },
    ],
  }),
  component: DashboardPage,
});

const modules = [
  {
    key: "muhasebe" as ModuleKey,
    title: "Ön Muhasebe",
    subtitle: "Stok, Cari, Fatura, Kasa",
    icon: Calculator,
    tone: "bg-pos-apple text-pos-apple-foreground",
    to: "/muhasebe" as const,
  },
  {
    key: "pos" as ModuleKey,
    title: "POS Satış Kasası",
    subtitle: "Hızlı Perakende & Barkod",
    icon: ScanBarcode,
    tone: "bg-pos-tomato text-pos-tomato-foreground",
    to: "/pos" as const,
  },
  {
    key: "adisyon" as ModuleKey,
    title: "Adisyon / Masa Yönetimi",
    subtitle: "Restoran & Kafe",
    icon: UtensilsCrossed,
    tone: "bg-pos-cheese text-pos-cheese-foreground",
    to: "/adisyon" as const,
  },
  {
    key: "servis" as ModuleKey,
    title: "Teknik Servis",
    subtitle: "Cihaz Kabul & Arıza Takip",
    icon: Wrench,
    tone: "bg-pos-cashew text-pos-cashew-foreground",
    to: "/servis" as const,
  },
  {
    key: "panel" as ModuleKey,
    title: "Restoran Yönetim Paneli",
    subtitle: "POS, KDS, Ürünler, Masa & Mutfak",
    icon: LayoutDashboard,
    tone: "bg-pos-sky text-pos-sky-foreground",
    to: "/panel" as const,
  },
  {
    key: "pdks" as const,
    title: "PDKS Yönetimi",
    subtitle: "Personel Devam Kontrol, Konum & Mesai",
    icon: Fingerprint,
    tone: "bg-brand-orange text-brand-orange-foreground",
    to: "/pdks-yonetim" as const,
  },
];

function DashboardPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { role } = useRole();
  const company = useCompany();
  const pkg = useActivePackage();
  const hasModule = useHasModule();
  const hasPdks = useHasPdks();
  const [locked, setLocked] = useState<ModuleKey | null>(null);
  const sub = useSubscriptionStatus();
  const { order: pendingOrder } = usePendingOrder();
  const onboardingPending = useOnboardingRedirect();

  useEffect(() => {
    if (onboardingPending) return;
    if (!sub.loading && sub.expired) {
      navigate({ to: "/abonelik", replace: true });
    }
  }, [sub.loading, sub.expired, navigate, onboardingPending]);

  const handleLogout = () => {
    void signOut().then(() => navigate({ to: "/", replace: true }));
  };

  return (
    <div className="dashboard-grid min-h-screen bg-slate-50">
      <header className="border-b border-border/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-5 py-4">
          <img
            src={bilirimLogo.url}
            alt="bilirim logosu"
            className="h-10 w-auto max-w-[190px] object-contain dark:brightness-0 dark:invert"
          />
          <div className="mr-auto">
            <p className="text-xs text-muted-foreground">Ana Yönetim Paneli</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate({ to: "/abonelik" })}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition hover:opacity-90 ${
                sub.expired || (sub.daysLeft > 0 && sub.daysLeft <= 3)
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              {sub.loading
                ? "30 Gün Deneme"
                : sub.expired
                  ? "Sona Erdi"
                  : sub.daysLeft > 0
                    ? `${sub.daysLeft} Gün`
                    : sub.kind === "trial"
                      ? "30 Gün Deneme"
                      : "Aktif"}
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/odeme", search: { tab: "kontor" } })}
              className="inline-flex items-center gap-1.5 rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-700 transition hover:opacity-90"
            >
              <Ticket className="h-3.5 w-3.5" />
              {(company?.edoc_credits ?? 0).toLocaleString("tr-TR")} Kontör
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-right transition hover:bg-accent"
                >
                  <span className="block">
                    <span className="block text-sm font-semibold text-foreground">
                      {profile?.full_name || profile?.email || "Misafir Kullanıcı"}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {company?.name ?? "İşletmem"}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Hesabım</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/hesabim" })}>
                  <Building2 className="mr-2 h-4 w-4" />
                  Firma Bilgilerim / Hesabım
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/abonelik" })}>
                  <Crown className="mr-2 h-4 w-4" />
                  Aboneliğim
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Çıkış Yap
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-1.5 h-4 w-4" />
              Çıkış Yap
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="fade-in-up hero-mesh mb-8 rounded-2xl border border-border/60 p-6 text-left sm:p-8">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Hoş geldiniz 👋
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">Çalışmak istediğiniz modülü seçin.</p>
          <div className="mt-4">
            <Badge variant="secondary" className="gap-1.5 rounded-full">
              <Crown className="h-3.5 w-3.5" /> Aktif Paket: {pkg.name}
            </Badge>
          </div>
        </div>

        {pendingOrder && (
          <div className="pos-shadow mb-8 flex flex-wrap items-center gap-4 rounded-3xl border border-amber-500/40 bg-amber-500/10 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center rounded-full bg-amber-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                Ödeme Onayı Bekleniyor
              </span>
              <p className="mt-1.5 text-sm font-bold text-foreground">
                {pendingOrder.module}
                {pendingOrder.plan ? ` · ${pendingOrder.plan}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Siparişiniz alındı. Ödemeniz muhasebe departmanımızca kontrol edildikten sonra
                paketiniz aktif edilecek; o ana kadar modüller kilitli kalır.
              </p>
            </div>
          </div>
        )}

        {role === "yonetici" && (
          <Link
            to="/sistem"
            className="mb-5 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-md transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold text-foreground">Sistem Yönetimi</span>
              <span className="block text-sm text-muted-foreground">
                Kullanıcılar, modül yetkileri, sistem logları ve genel ayarlar — sadece firma
                sahibi.
              </span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </Link>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          {modules.map((m, i) => {
            const Icon = m.icon;
            const unlocked =
              m.key === "pdks" ? hasPdks : hasModule(m.key as ModuleKey);
            return (
              <button
                key={m.key}
                type="button"
                style={{ animationDelay: `${100 + i * 80}ms` }}
                onClick={() => {
                  if (unlocked) navigate({ to: m.to });
                  else setLocked(m.key as ModuleKey);
                }}
                className="fade-in-up pos-card-press block h-full w-full text-left"
              >
                <div
                  className={`group relative flex h-full flex-col justify-between rounded-2xl border p-6 text-left transition-all duration-300 ${
                    unlocked
                      ? "border-slate-200 bg-white shadow-md hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                      : "border-slate-200 bg-white/80 opacity-80 shadow-sm"
                  }`}
                >
                  <div className="absolute right-4 top-4">
                    {unlocked ? (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          sub.kind === "trial"
                            ? "bg-amber-100 text-amber-700 ring-1 ring-amber-200"
                            : "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                        }`}
                      >
                        <span className="relative flex h-2 w-2">
                          <span
                            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                              sub.kind === "trial" ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                          />
                          <span
                            className={`relative inline-flex h-2 w-2 rounded-full ${
                              sub.kind === "trial" ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                          />
                        </span>
                        {sub.kind === "trial"
                          ? `${sub.daysLeft || 30} Gün Deneme`
                          : "Aktif Paket"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" />
                        Abonelik Gerektirir
                      </span>
                    )}
                  </div>
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 ${m.tone} ${
                      unlocked ? "" : "opacity-70 grayscale"
                    }`}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="mt-6">
                    <h3 className="text-lg font-bold text-foreground">{m.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{m.subtitle}</p>
                  </div>
                  {unlocked ? (
                    <div className="mt-6 flex items-center gap-2 text-sm font-medium text-primary">
                      Aç
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  ) : (
                    <div className="mt-6">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors group-hover:border-slate-300 group-hover:bg-slate-50 group-hover:text-slate-800">
                        Keşfet
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </main>

      <Dialog open={locked !== null} onOpenChange={(o) => !o && setLocked(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              {locked ? MODULE_LABELS[locked] : ""} kilitli
            </DialogTitle>
            <DialogDescription>
              Bu modül mevcut paketinize dahil değildir. Kullanmak için paketinizi yükseltin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocked(null)}>
              Kapat
            </Button>
            <Button
              onClick={() => {
                setLocked(null);
                navigate({ to: "/abonelik" });
              }}
            >
              Paketi Yükselt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
