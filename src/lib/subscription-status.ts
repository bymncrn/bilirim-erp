import { useCompany } from "@/lib/company-store";

export type SubscriptionStatus = {
  loading: boolean;
  /** "trial" = deneme sürümü, "paid" = ücretli abonelik */
  kind: "trial" | "paid";
  endsAt: Date | null;
  daysLeft: number;
  expired: boolean;
  label: string;
};

const DAY = 24 * 60 * 60 * 1000;

export function useSubscriptionStatus(): SubscriptionStatus {
  const company = useCompany() as
    | ({ trial_ends_at?: string | null; subscription_ends_at?: string | null } & Record<
        string,
        unknown
      >)
    | null;

  if (!company) {
    return {
      loading: true,
      kind: "trial",
      endsAt: null,
      daysLeft: 0,
      expired: false,
      label: "Abonelik bilgisi yükleniyor…",
    };
  }

  const paidRaw = company.subscription_ends_at ?? null;
  const trialRaw = company.trial_ends_at ?? null;
  const kind: "trial" | "paid" = paidRaw ? "paid" : "trial";
  const raw = paidRaw ?? trialRaw;
  const endsAt = raw ? new Date(raw) : null;

  if (!endsAt || Number.isNaN(endsAt.getTime())) {
    return {
      loading: false,
      kind,
      endsAt: null,
      daysLeft: 0,
      expired: false,
      label: "Abonelik süresi tanımlı değil.",
    };
  }

  const diff = endsAt.getTime() - Date.now();
  const daysLeft = Math.max(0, Math.ceil(diff / DAY));
  const expired = diff <= 0;

  const label = expired
    ? kind === "trial"
      ? "Deneme sürünüz sona erdi."
      : "Aboneliğinizin süresi doldu."
    : kind === "trial"
      ? `Deneme sürümünüzün bitmesine ${daysLeft} gün kaldı`
      : `Aboneliğinizin yenilenmesine ${daysLeft} gün kaldı`;

  return { loading: false, kind, endsAt, daysLeft, expired, label };
}
