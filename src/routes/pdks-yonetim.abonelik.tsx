import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PdksShell } from "@/components/pdks/PdksShell";
import { KvkkBadge, PdksPlanCards } from "@/components/pricing/PdksPlans";

export const Route = createFileRoute("/pdks-yonetim/abonelik")({
  head: () => ({
    meta: [
      { title: "Abonelik & Fatura — Bilirim PDKS" },
      { name: "description", content: "Paket yükseltme, personel kotası ve geçmiş faturalar bu ekrandan yönetilir." },
      { property: "og:title", content: "Abonelik & Fatura — Bilirim PDKS" },
      { property: "og:description", content: "Paket yükseltme, personel kotası ve geçmiş faturalar bu ekrandan yönetilir." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PdksShell title="Abonelik & Fatura" description="Bilirim PDKS paket ve fatura yönetimi">
      <SubscriptionContent />
    </PdksShell>
  );
}

function SubscriptionContent() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-6xl">
      <div className="text-center">
        <h2 className="mx-auto max-w-3xl text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Donanım Maliyetlerine Son Verin. Sadece İhtiyacınız Olanı Ödeyin.
        </h2>
        <div className="mt-4 flex justify-center">
          <KvkkBadge />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <span
          className={`text-sm font-semibold ${billing === "monthly" ? "text-foreground" : "text-muted-foreground"}`}
        >
          Aylık Ödeme
        </span>
        <button
          type="button"
          aria-label="Ödeme dönemi değiştir"
          onClick={() => setBilling((p) => (p === "monthly" ? "yearly" : "monthly"))}
          className="relative inline-flex h-7 w-12 items-center rounded-full bg-brand-orange transition-colors"
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-brand-orange-foreground transition-transform ${
              billing === "yearly" ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <span
          className={`text-sm font-semibold ${billing === "yearly" ? "text-foreground" : "text-muted-foreground"}`}
        >
          Yıllık Ödeme
        </span>
        <span className="rounded-full bg-pos-success/15 px-2.5 py-1 text-xs font-semibold text-pos-success">
          %20 İndirimli
        </span>
      </div>

      <div className="mt-10">
        <PdksPlanCards
          billing={billing}
          ctaLabel="Paketi Seç"
          onSelect={(p) => {
            toast.success(`${p.name} paketi seçildi. Ödeme adımına yönlendiriliyorsunuz.`);
            void navigate({ to: "/odeme", search: { tab: "abonelik" } });
          }}
        />
      </div>
    </div>
  );
}
