import { useCompany } from "@/lib/company-store";

export type PdksPlanKey = "starter" | "pro" | "enterprise";

export type PdksPlanLimits = {
  key: PdksPlanKey;
  name: string;
  staff: number;
  sites: number;
  excelImport: boolean;
};

export const PDKS_PLAN_LIMITS: Record<PdksPlanKey, PdksPlanLimits> = {
  starter: { key: "starter", name: "Başlangıç", staff: 25, sites: 1, excelImport: false },
  pro: { key: "pro", name: "Profesyonel", staff: 150, sites: 5, excelImport: true },
  enterprise: {
    key: "enterprise",
    name: "Kurumsal",
    staff: Number.POSITIVE_INFINITY,
    sites: Number.POSITIVE_INFINITY,
    excelImport: true,
  },
};

/** Varsayılan paket (şirkete atanmış paket yoksa). */
export const currentPlan: PdksPlanKey = "starter";

/** Veritabanındaki paket değerini uygulama paketine eşler. */
export function normalizePdksPlan(value: string | null | undefined): PdksPlanKey {
  switch (value) {
    case "pro":
    case "profesyonel":
      return "pro";
    case "enterprise":
    case "kurumsal":
      return "enterprise";
    default:
      return "starter";
  }
}

export function usePdksPlan() {
  const company = useCompany() as ({ pdks_plan?: string | null } & Record<string, unknown>) | null;
  return PDKS_PLAN_LIMITS[normalizePdksPlan(company?.pdks_plan ?? currentPlan)];
}
