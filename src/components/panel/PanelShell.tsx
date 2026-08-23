import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ScanBarcode,
  Package,
  Users,
  Moon,
  Sun,
  Menu,
  X,
  UtensilsCrossed,
  ArrowLeft,
  LayoutGrid,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useCurrentStaff, usePanelState, setCurrentUser } from "@/lib/panel-store";
import { usePermissions, type PermKey } from "@/lib/permissions";
import { useTheme, toggleTheme } from "@/lib/theme-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import bilirimLogo from "@/assets/bilirim-logo.png.asset.json";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  perm?: PermKey;
};

const NAV_GROUPS: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { to: "/panel", label: "Ana Sayfa", icon: LayoutDashboard, exact: true },
      { to: "/panel/urunler", label: "Ürünler & Stok", icon: Package, perm: "urunler" },
      { to: "/panel/musteriler", label: "Müşteriler", icon: Users, perm: "cari" },
    ],
  },
  {
    title: "Restoran Yönetimi",
    items: [
      { to: "/panel/pos", label: "POS / Adisyon", icon: ScanBarcode, perm: "adisyon" },
      { to: "/panel/mutfak", label: "Mutfak Ekranı (KDS)", icon: UtensilsCrossed, perm: "adisyon" },
      { to: "/panel/yerlesim", label: "Restoran Yerleşimi", icon: LayoutGrid, perm: "adisyon" },
    ],
  },
];

export function PanelShell({
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
  const user = useCurrentStaff();
  const { staff } = usePanelState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { can } = usePermissions();

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((n) => {
      if (n.perm && !can(n.perm)) return false;
      return true;
    }),
  })).filter((g) => g.items.length > 0);

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
      {groups.map((group) => (
        <div key={group.title ?? "main"} className="flex flex-col gap-1">
          {group.title && (
            <p className="mt-3 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/50">
              {group.title}
            </p>
          )}
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
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
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex items-center gap-3 border-b border-sidebar-border px-4 py-4">
          <img
            src={bilirimLogo.url}
            alt="bilirim logosu"
            className="h-10 w-auto max-w-[170px] object-contain dark:brightness-0 dark:invert"
          />
        </div>
        {nav}
        <div className="mt-auto border-t border-sidebar-border p-3">
          <p className="mb-1.5 text-xs text-muted-foreground">Aktif kullanıcı</p>
          <Select value={user.id} onValueChange={setCurrentUser}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {staff.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} · {s.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
            <div className="mt-auto border-t border-sidebar-border p-3">
              <Select value={user.id} onValueChange={setCurrentUser}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · {s.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                aria-label="Tema değiştir"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.role}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
