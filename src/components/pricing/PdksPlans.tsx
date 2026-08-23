import { Check, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PdksPlan = {
  name: string;
  limits: string;
  monthly: number;
  features: string[];
  highlight: boolean;
};

export const PDKS_PLANS: PdksPlan[] = [
  {
    name: "Başlangıç",
    limits: "25 Personel · 1 Lokasyon",
    monthly: 499,
    features: [
      "Buluttan Yönetim",
      "QR ile Giriş/Çıkış",
      "Temel Puantaj",
      "Mesai Raporları",
    ],
    highlight: false,
  },
  {
    name: "Profesyonel",
    limits: "150 Personel · 5 Lokasyon",
    monthly: 1699,
    features: [
      "Başlangıç paketindeki tüm özellikler",
      "Mesai ve Vardiya Yönetimi",
      "Excel ile Toplu Personel Aktarma",
      "Gelişmiş Raporlama",
    ],
    highlight: true,
  },
  {
    name: "Kurumsal",
    limits: "Sınırsız Personel · Sınırsız Lokasyon",
    monthly: 3999,
    features: [
      "Profesyonel paketindeki tüm özellikler",
      "Özel API Entegrasyonu",
      "Öncelikli Destek",
    ],
    highlight: false,
  },
];

const nf = new Intl.NumberFormat("tr-TR");

export function KvkkBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-pos-success/15 px-3.5 py-1.5 text-xs font-semibold text-pos-success">
      <ShieldCheck className="h-4 w-4" />
      Yeni KVKK Yönetmeliğine %100 Uygun
    </span>
  );
}

export function PdksPlanCards({
  billing = "monthly",
  ctaLabel,
  onSelect,
}: {
  billing?: "monthly" | "yearly";
  ctaLabel: string;
  onSelect: (plan: PdksPlan) => void;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {PDKS_PLANS.map((p) => {
        const price = billing === "yearly" ? Math.round(p.monthly * 12 * 0.8) : p.monthly;
        return (
          <div
            key={p.name}
            className={`relative flex h-full flex-col rounded-3xl border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:scale-105 hover:shadow-xl ${
              p.highlight ? "border-2 border-brand-orange" : "border-border"
            }`}
          >
            {p.highlight && (
              <span className="absolute -top-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-brand-orange px-4 py-1.5 text-xs font-extrabold uppercase tracking-wide text-brand-orange-foreground shadow-lg ring-4 ring-brand-orange/20">
                <Star className="h-3.5 w-3.5 fill-current" />
                En Çok Tercih Edilen
              </span>
            )}
            <h3 className="text-lg font-bold text-foreground">{p.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{p.limits}</p>
            <p className="mt-5 text-3xl font-extrabold tracking-tight text-foreground">
              {nf.format(price)} ₺
              <span className="text-sm font-medium text-muted-foreground">
                {billing === "yearly" ? "/yıl" : "/ay"}
              </span>
            </p>
            <ul className="mt-5 flex-1 space-y-2.5 text-sm text-muted-foreground">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-pos-success" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              size="lg"
              className={`mt-6 w-full font-semibold ${
                p.highlight ? "bg-brand-orange text-brand-orange-foreground hover:bg-brand-orange/90" : ""
              }`}
              variant={p.highlight ? "default" : "outline"}
              onClick={() => onSelect(p)}
            >
              {ctaLabel}
            </Button>
          </div>
        );
      })}
    </div>
  );
}