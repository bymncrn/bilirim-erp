import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCompany, updateCompany } from "@/lib/company-store";

export type OnboardingModule = "muhasebe" | "pdks";

const DAY = 24 * 60 * 60 * 1000;

/** Yeni kayıt olan kullanıcı modül seçimini yapmadıysa /onboarding ekranına zorunlu yönlendirme. */
export function useOnboardingRedirect() {
  const company = useCompany() as ({ onboarding_module?: string | null } & Record<string, unknown>) | null;
  const navigate = useNavigate();
  const pending = !!company && !company.onboarding_module;

  useEffect(() => {
    if (pending) void navigate({ to: "/onboarding", replace: true });
  }, [pending, navigate]);

  return pending;
}

/** Seçilen modüle göre 30 günlük deneme ve paket ataması yapar. */
export async function applyOnboardingChoice(choice: OnboardingModule) {
  const trialEndsAt = new Date(Date.now() + 30 * DAY).toISOString();
  if (choice === "muhasebe") {
    await updateCompany({
      onboarding_module: "muhasebe",
      plan: "full",
      modules: ["muhasebe", "pos", "adisyon", "servis", "panel"],
      pdks_plan: "",
      trial_ends_at: trialEndsAt,
      subscription_ends_at: null,
    } as never);
    return "/muhasebe" as const;
  }
  await updateCompany({
    onboarding_module: "pdks",
    plan: "pdks",
    modules: [],
    pdks_plan: "pro",
    trial_ends_at: trialEndsAt,
    subscription_ends_at: null,
  } as never);
  return "/pdks-yonetim" as const;
}
