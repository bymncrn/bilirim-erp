import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Menu, Moon, ScrollText, Settings, ShieldCheck, Sun, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { UserCompanyBadge } from "@/components/auth/UserCompanyBadge";
import { Button } from "@/components/ui/button";
import { useTheme, toggleTheme } from "@/lib/theme-store";
import bilirimLogo from "@/assets/bilirim-logo.png.asset.json";

const NAV = [
  { to: "/sistem", label: "Genel Bakış", icon: ShieldCheck, exact: true },
  { to: "/sistem/kullanicilar", label: "Kullanıcılar & Yetkiler", icon: ShieldCheck },
  { to: "/sistem/loglar", label: "Sistem Logları", icon: ScrollText },
  { to: "/sistem/ayarlar", label: "Genel Ayarlar", icon: Settings },
] as const;

export function SystemShell({
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
  const theme = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      <Link
        to="/dashboard"
        onClick={() => setOpen(false)}
        className="mb-2 flex items-center gap-3 rounded-xl border border-sidebar-border px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <ArrowLeft className="h-4.5 w-4.5 shrink-0" />
        <span className="truncate">Ana Modüllere Dön</span>
      </Link>
      {NAV.map((item) => {
        const Icon = item.icon;
        const active =
          "exact" in item && item.exact ? pathname === item.to : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <Icon className="h-4.5 w-4.5 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen w-full bg-slate-50 dark:bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex items-center gap-3 border-b border-sidebar-border px-4 py-4">
          <img
            src={bilirimLogo.url}
            alt="bilirim logosu"
            className="h-10 w-auto max-w-[170px] object-contain dark:brightness-0 dark:invert"
          />
        </div>
        {nav}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-sidebar-border bg-sidebar">
            <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
              <img
                src={bilirimLogo.url}
                alt="bilirim logosu"
                className="h-9 w-auto max-w-[150px] object-contain dark:brightness-0 dark:invert"
              />
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {nav}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden"
                onClick={() => setOpen(true)}
                aria-label="Menüyü aç"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold tracking-tight text-foreground sm:text-lg">
                  {title}
                </h1>
                {description && (
                  <p className="truncate text-xs text-muted-foreground">{description}</p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {actions}
              <UserCompanyBadge />
              <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                aria-label="Tema değiştir"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
