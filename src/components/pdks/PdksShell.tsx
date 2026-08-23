import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  MapPinned,
  BarChart3,
  CalendarDays,
  CreditCard,
  Menu,
  X,
  Fingerprint,
  ArrowLeft,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useActivePackage } from "@/lib/subscription-store";
import { useSubscriptionStatus } from "@/lib/subscription-status";

const NAV = [
  { to: "/pdks-yonetim", label: "Ana Panel", icon: LayoutDashboard, exact: true },
  { to: "/pdks-yonetim/personel", label: "Personel Yönetimi", icon: Users },
  { to: "/pdks-yonetim/konumlar", label: "Konum & Mesai Ayarları", icon: MapPinned },
  { to: "/pdks-yonetim/puantaj", label: "Puantaj & İzinler", icon: CalendarDays },
  { to: "/pdks-yonetim/raporlar", label: "Mesai Raporları", icon: BarChart3 },
  { to: "/pdks-yonetim/abonelik", label: "Abonelik & Fatura", icon: CreditCard },
];

function SubscriptionWidget() {
  const pkg = useActivePackage();
  const sub = useSubscriptionStatus();
  const critical = !sub.loading && (sub.expired || sub.daysLeft <= 3);

  return (
    <Link
      to="/pdks-yonetim/abonelik"
      className={`block rounded-xl border p-3 transition-colors ${
        critical
          ? "border-destructive/50 bg-destructive/15 hover:bg-destructive/25"
          : "border-brand-navy-foreground/15 bg-brand-navy-foreground/5 hover:bg-brand-navy-foreground/10"
      }`}
    >
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-brand-navy-foreground/60">
        <CreditCard className="h-3.5 w-3.5" /> Abonelik Durumu
      </p>
      <p className="mt-1 truncate text-sm font-bold text-brand-navy-foreground">{pkg.name}</p>
      <p className="text-xs text-brand-navy-foreground/70">
        {sub.loading
          ? "Yükleniyor…"
          : sub.expired
            ? "Süresi doldu • Yenileyin"
            : sub.endsAt
              ? `Kalan Süre: ${sub.daysLeft} Gün`
              : "Süre tanımlı değil"}
      </p>
    </Link>
  );
}

export function PdksShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const brand = (
    <div className="flex items-center gap-3 px-5 py-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
        <Fingerprint className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-base font-bold tracking-tight text-brand-navy-foreground">
          Bilirim <span className="text-primary">PDKS</span>
        </p>
        <p className="truncate text-[11px] text-brand-navy-foreground/60">
          Personel Devam Kontrol
        </p>
      </div>
    </div>
  );

  const nav = (
    <nav className="flex flex-col gap-1 px-3">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              active
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-brand-navy-foreground/70 hover:translate-x-0.5 hover:bg-brand-navy-foreground/10 hover:text-brand-navy-foreground"
            }`}
          >
            <Icon className="h-4.5 w-4.5 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const sidebarInner = (
    <>
      {brand}
      <div className="mx-5 mb-3 h-px bg-brand-navy-foreground/10" />
      {nav}
      <div className="mt-auto space-y-3 p-3">
        <SubscriptionWidget />
        <Link
          to="/dashboard"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2 rounded-xl border border-brand-navy-foreground/15 px-3 py-2.5 text-sm font-medium text-brand-navy-foreground/70 transition-colors hover:bg-brand-navy-foreground/10 hover:text-brand-navy-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Ana Modüllere Dön
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen w-full bg-muted/60">
      <aside className="hidden w-72 shrink-0 flex-col bg-brand-navy lg:flex">{sidebarInner}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-brand-navy">
            <button
              onClick={() => setOpen(false)}
              aria-label="Menüyü kapat"
              className="absolute right-3 top-4 rounded-lg p-2 text-brand-navy-foreground/70 hover:bg-brand-navy-foreground/10"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebarInner}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-4 sm:px-8">
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Menüyü aç"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold tracking-tight text-foreground">{title}</h1>
              {description && (
                <p className="truncate text-xs text-muted-foreground">{description}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
