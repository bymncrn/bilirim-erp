import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Calculator, Check, Fingerprint, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { applyOnboardingChoice, type OnboardingModule } from "@/lib/onboarding";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Kurulum — Modülünüzü Seçin | Bilirim ERP" },
      {
        name: "description",
        content:
          "Bilirim ERP kurulumunu tamamlayın: Muhasebe & Satış veya PDKS Yönetimi modülünü seçip 30 günlük denemenizi başlatın.",
      },
      { property: "og:title", content: "Kurulum — Modülünüzü Seçin | Bilirim ERP" },
      {
        property: "og:description",
        content: "İşletmenize uygun modülü seçin, 30 günlük ücretsiz deneme anında başlasın.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingPage,
});

const CARDS: {
  key: OnboardingModule;
  title: string;
  description: string;
  icon: typeof Calculator;
  iconBox: string;
  border: string;
  glow: string;
  pill: string;
  button: string;
  features: string[];
}[] = [
  {
    key: "muhasebe",
    title: "Muhasebe & Satış",
    description: "Ön muhasebe, Pos, adisyon, teknik servis",
    icon: Calculator,
    iconBox: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25",
    border: "border-emerald-200/70 hover:border-emerald-400",
    glow: "hover:shadow-2xl hover:shadow-emerald-500/20",
    pill: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    button:
      "bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-700",
    features: ["Ön Muhasebe", "Hızlı POS Kasa", "Adisyon & Masa", "Teknik Servis"],
  },
  {
    key: "pdks",
    title: "PDKS Yönetimi",
    description: "Personel takibi, QR giriş, puantaj ve vardiyalar",
    icon: Fingerprint,
    iconBox: "bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/25",
    border: "border-indigo-200/70 hover:border-indigo-400",
    glow: "hover:shadow-2xl hover:shadow-indigo-500/20",
    pill: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
    button:
      "bg-gradient-to-r from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-blue-700",
    features: ["QR Okutma", "Gece Vardiyaları", "Otomatik Puantaj", "GPS Konum Doğrulama"],
  },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [busy, setBusy] = useState<OnboardingModule | null>(null);

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/login", replace: true });
  }, [loading, session, navigate]);

  const choose = async (key: OnboardingModule) => {
    setBusy(key);
    try {
      const to = await applyOnboardingChoice(key);
      toast.success("30 günlük ücretsiz denemeniz başladı!");
      void navigate({ to, replace: true });
    } catch {
      toast.error("Seçiminiz kaydedilemedi, lütfen tekrar deneyin.");
      setBusy(null);
    }
  };

  if (loading || !session) {
    return (
      <div className="app-aurora flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="app-aurora flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <div className="fade-in-up mb-10 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Hangi alanda başlamak istersiniz?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Seçiminize göre paketiniz otomatik tanımlanır ve 30 günlük ücretsiz denemeniz başlar.
        </p>
      </div>

      <div className="grid w-full max-w-3xl gap-5 sm:grid-cols-2">
        {CARDS.map((card, i) => (
          <button
            key={card.key}
            type="button"
            disabled={busy !== null}
            onClick={() => void choose(card.key)}
            style={{ animationDelay: `${120 + i * 120}ms` }}
            className={`fade-in-up group flex min-h-[300px] flex-col items-start gap-5 rounded-3xl border-2 bg-white/80 p-7 text-left shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 disabled:opacity-60 ${card.border} ${card.glow}`}
          >
            <span
              className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 ${card.iconBox}`}
            >
              {busy === card.key ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : (
                <card.icon className="h-7 w-7" />
              )}
            </span>
            <div className="flex-1">
              <h2 className="text-xl font-extrabold tracking-tight text-foreground">{card.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {card.features.map((f) => (
                  <span
                    key={f}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${card.pill}`}
                  >
                    <Check className="h-3 w-3" />
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <span
              className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition-all duration-300 group-hover:gap-3 ${card.button}`}
            >
              Bu modülle başla <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
