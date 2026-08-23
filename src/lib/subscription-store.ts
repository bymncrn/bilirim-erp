import { useCompany, updateCompany } from "@/lib/company-store";

export type ModuleKey = "muhasebe" | "pos" | "adisyon" | "servis" | "panel";

export const MODULE_LABELS: Record<ModuleKey, string> = {
  muhasebe: "Ön Muhasebe",
  pos: "POS Satış Kasası",
  adisyon: "Adisyon / Masa Yönetimi",
  servis: "Teknik Servis",
  panel: "Restoran Yönetim Paneli",
};

export type PackageKey = "retail" | "restaurant" | "service" | "full" | "pdks";

export type SubscriptionPackage = {
  key: PackageKey;
  name: string;
  price: string;
  description: string;
  modules: ModuleKey[];
};

export const PACKAGES: SubscriptionPackage[] = [
  {
    key: "retail",
    name: "Hızlı Perakende POS Paketi",
    price: "499 ₺/ay",
    description: "Market, manav ve şarküteriler için hızlı satış çözümü.",
    modules: ["muhasebe", "pos"],
  },
  {
    key: "restaurant",
    name: "Restoran & Cafe Paketi",
    price: "499 ₺/ay",
    description: "Adisyon, masa yönetimi ve restoran yönetim paneli dahil.",
    modules: ["muhasebe", "pos", "adisyon", "panel"],
  },
  {
    key: "service",
    name: "Teknik Servis Paketi",
    price: "499 ₺/ay",
    description: "Cihaz kabul, arıza takip ve ön muhasebe.",
    modules: ["muhasebe", "servis"],
  },
  {
    key: "full",
    name: "Full Paket (Tümü)",
    price: "799 ₺/ay",
    description: "Tüm modüllere sınırsız erişim.",
    modules: ["muhasebe", "pos", "adisyon", "servis", "panel"],
  },
  {
    key: "pdks",
    name: "PDKS Yönetimi",
    price: "—",
    description: "Personel takibi, QR giriş, puantaj ve vardiya yönetimi.",
    modules: [],
  },
];

const FALLBACK: PackageKey = "full";

export function useActivePackageKey(): PackageKey {
  const company = useCompany();
  const key = company?.plan as PackageKey | undefined;
  return key && PACKAGES.some((p) => p.key === key) ? key : FALLBACK;
}

export function useActivePackage(): SubscriptionPackage {
  const key = useActivePackageKey();
  return PACKAGES.find((p) => p.key === key) ?? PACKAGES[3]!;
}

export function useHasModule() {
  const company = useCompany();
  const pkg = useActivePackage();
  const modules = (
    company?.modules?.length || pkg.key === "pdks" ? (company?.modules ?? []) : pkg.modules
  ) as ModuleKey[];
  return (module: ModuleKey) => (company ? modules.includes(module) : true);
}

export function setActivePackage(key: PackageKey) {
  const pkg = PACKAGES.find((p) => p.key === key);
  if (!pkg) return;
  const endsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  void updateCompany({ plan: key, modules: pkg.modules, subscription_ends_at: endsAt });
}

/** PDKS ayrı bir modüldür: yalnızca PDKS paketi/onboarding seçimi olanlar erişebilir. */
export function useHasPdks(): boolean {
  const company = useCompany() as ({ onboarding_module?: string | null } & { plan?: string }) | null;
  if (!company) return false;
  return company.plan === "pdks" || company.onboarding_module === "pdks";
}
