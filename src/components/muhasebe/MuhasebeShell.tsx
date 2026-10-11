import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Boxes,
  Users,
  FileText,
  Wallet,
  Receipt,
  ShieldCheck,
  Menu,
  X,
  Calculator,
  ArrowLeft,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { UserCompanyBadge } from "@/components/auth/UserCompanyBadge";
import { Button } from "@/components/ui/button";

export const MUHASEBE_NAV = [
  { value: "ozet", label: "Özet Panel", icon: LayoutDashboard },
  { value: "cari", label: "Cari Hesaplar", icon: Users },
  { value: "ebelge", label: "Faturalar", icon: FileText },
  { value: "kasa", label: "Kasa & Banka", icon: Wallet },
  { value: "gider", label: "Gelir/Gider Takibi", icon: Receipt },
  { value: "stok", label: "Stok & Ürünler", icon: Boxes },
  { value: "teklif", label: "Teklifler", icon: FileText },
  { value: "mali", label: "Mali Yönetim", icon: ShieldCheck },
] as const;

export function MuhasebeShell({
  title,
  description,
  actions,
  active,
  onSelect,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  active: string;
  onSelect: (value: string) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const brand = (
    <div className="flex items-center gap-3 px-5 py-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
        <Calculator className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-base font-bold tracking-tight text-brand-navy-foreground">
          Bilirim <span className="text-primary">Muhasebe</span>
        </p>
        <p className="truncate text-[11px] text-brand-navy-foreground/60">Ön Muhasebe Modülü</p>
      </div>
    </div>
  );

  const sidebarInner = (
    <>
      {brand}
      <div className="mx-5 mb-3 h-px bg-brand-navy-foreground/10" />
      <nav className="flex flex-col gap-1 px-3">
        {MUHASEBE_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                onSelect(item.value);
                setOpen(false);
              }}
              className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-brand-navy-foreground/70 hover:translate-x-0.5 hover:bg-brand-navy-foreground/10 hover:text-brand-navy-foreground"
              }`}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="mt-auto space-y-3 p-3">
        <Link
          to="/gun-sonu"
          onClick={() => setOpen(false)}
          className="flex min-h-11 items-center gap-2 rounded-xl border border-brand-navy-foreground/15 px-3 py-2.5 text-sm font-medium text-brand-navy-foreground/70 transition-colors hover:bg-brand-navy-foreground/10 hover:text-brand-navy-foreground"
        >
          <Receipt className="h-4 w-4" />
          Gün Sonu &amp; Z-Raporu
        </Link>
        <Link
          to="/dashboard"
          onClick={() => setOpen(false)}
          className="flex min-h-11 items-center gap-2 rounded-xl border border-brand-navy-foreground/15 px-3 py-2.5 text-sm font-medium text-brand-navy-foreground/70 transition-colors hover:bg-brand-navy-foreground/10 hover:text-brand-navy-foreground"
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
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col overflow-y-auto bg-brand-navy">
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
              className="h-11 w-11 lg:hidden"
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
            <div className="flex shrink-0 items-center gap-2">{actions}<UserCompanyBadge /></div>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
