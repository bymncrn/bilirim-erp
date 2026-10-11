import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CalendarClock, Check, Crown, Fingerprint, Lock, Ticket } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KvkkBadge, PdksPlanCards } from "@/components/pricing/PdksPlans";
import { useCompany } from "@/lib/company-store";
import { useAuth } from "@/hooks/use-auth";
import { createSubscriptionOrder } from "@/lib/subscription-orders";
import { useSubscriptionStatus } from "@/lib/subscription-status";
import {
  MODULE_LABELS,
  PACKAGES,
  useActivePackageKey,
  type ModuleKey,
} from "@/lib/subscription-store";

export const Route = createFileRoute("/abonelik")({
  head: () => ({
    meta: [
      { title: "Mevcut Aboneliğim — Bilirim ERP" },
      {
        name: "description",
        content:
          "İşletmenizin aktif abonelik paketini görüntüleyin, modül erişimlerini inceleyin ve paketler arasında geçiş yapın.",
      },
      { property: "og:title", content: "Mevcut Aboneliğim — Bilirim ERP" },
      {
        property: "og:description",
        content: "Aktif paketinizi görüntüleyin ve modül erişimlerinizi yönetin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SubscriptionPage,
});

const ALL_MODULES = Object.keys(MODULE_LABELS) as ModuleKey[];

function SubscriptionPage() {
  const activeKey = useActivePackageKey();
  const sub = useSubscriptionStatus();
  const company = useCompany();
  const credits = company?.edoc_credits ?? 0;
  const [pdksOpen, setPdksOpen] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [requested, setRequested] = useState(false);

  async function requestPackage(p: (typeof PACKAGES)[number]) {
    try {
      await createSubscriptionOrder({
        module: p.name,
        plan: p.key,
        period: "monthly",
        amount: Number(p.price.replace(/[^0-9]/g, "")) || 0,
        senderName: profile?.full_name || profile?.email || "",
        companyName: company?.name ?? "",
      });
      setRequested(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Talep oluşturulamadı.");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4">
          <Button
            variant="outline"
            size="lg"
            asChild
            className="h-12 px-5 text-base font-semibold"
          >
            <Link to="/dashboard">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Ana Panele Dön
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">Mevcut Aboneliğim</h1>
            <p className="text-xs text-muted-foreground">Paket değiştir & modül erişimleri</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10">
        {!sub.loading && sub.endsAt && (
          <div
            className={`pos-shadow mb-6 flex flex-wrap items-center gap-3 rounded-2xl border p-5 ${
              sub.expired ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"
            }`}
          >
            <CalendarClock className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">{sub.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {sub.expired
                  ? "Modüllere erişebilmek için lütfen bir paket seçin."
                  : `Bitiş tarihi: ${sub.endsAt.toLocaleDateString("tr-TR")}`}
              </p>
            </div>
            <Button asChild size="lg" className="h-11 px-5 font-semibold">
              <Link to="/odeme" search={{ tab: "abonelik" }}>
                Süre Uzat / Ödeme Yap
              </Link>
            </Button>
          </div>
        )}
        <div className="pos-shadow mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-5">
          <Ticket className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">
              Kalan e-Belge Kontörü: {credits.toLocaleString("tr-TR")} adet
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Her e-Fatura, e-Arşiv ve e-İrsaliye gönderiminde 1 kontör düşülür.
            </p>
          </div>
          <Button
            size="lg"
            variant="outline"
            className="h-11 px-5 font-semibold"
            onClick={() =>
              toast.info("Kontör satın alma talebiniz alındı. Ödeme adımına yönlendiriliyorsunuz.")
            }
            asChild
          >
            <Link to="/odeme" search={{ tab: "kontor" }}>
              Kontör Satın Al
            </Link>
          </Button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {PACKAGES.map((p) => {
            const active = p.key === activeKey;
            return (
              <div
                key={p.key}
                className={`pos-shadow rounded-3xl border bg-card p-6 ${
                  active ? "border-primary" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{p.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                  </div>
                  {active && (
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                      <Crown className="h-3.5 w-3.5" /> Aktif
                    </span>
                  )}
                </div>
                <p className="mt-4 text-2xl font-bold tracking-tight text-foreground">{p.price}</p>

                <ul className="mt-4 space-y-2">
                  {ALL_MODULES.map((m) => {
                    const included = p.modules.includes(m);
                    return (
                      <li
                        key={m}
                        className={`flex items-center gap-2 text-sm ${
                          included ? "text-foreground" : "text-muted-foreground line-through"
                        }`}
                      >
                        {included ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                        {MODULE_LABELS[m]}
                      </li>
                    );
                  })}
                </ul>

                <Button
                  className="mt-6 w-full"
                  variant={active && !sub.expired ? "outline" : "default"}
                  disabled={active && !sub.expired}
                  onClick={() => void requestPackage(p)}
                >
                  {active ? (sub.expired ? "Aboneliği Yenile" : "Kullanımda") : "Bu Pakete Geç"}
                </Button>
              </div>
            );
          })}
        </div>

        <section className="pos-shadow mt-6 rounded-3xl border-2 border-brand-orange/40 bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5 text-brand-orange" />
                <h2 className="text-lg font-bold text-foreground">
                  PDKS (Personel Devam Kontrol)
                </h2>
              </div>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                QR ve konum doğrulamalı mobil mesai takibi, puantaj, izin yönetimi ve mesai
                raporları. Ana paketten bağımsız olarak satın alınır.
              </p>
              <div className="mt-3">
                <KvkkBadge />
              </div>
            </div>
            <Button
              size="lg"
              className="h-12 bg-brand-orange px-6 font-semibold text-brand-orange-foreground hover:bg-brand-orange/90"
              onClick={() => setPdksOpen(true)}
            >
              Satın Al
            </Button>
          </div>
        </section>

        <Dialog open={requested} onOpenChange={setRequested}>
          <DialogContent className="max-w-md text-center">
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Check className="h-7 w-7 text-primary" />
              </div>
              <DialogTitle className="text-center">Talebiniz başarıyla alındı</DialogTitle>
              <DialogDescription className="text-center text-sm leading-relaxed">
                Lütfen paket tutarını{" "}
                <span className="font-mono font-bold text-foreground">TR12 3456 7890 0000 0000 0000 00</span>{" "}
                numaralı <span className="font-semibold text-foreground">Bilirim Teknoloji</span> IBAN
                hesabına gönderiniz. Ödemeniz onaylandığında paketiniz aktif edilecektir.
              </DialogDescription>
            </DialogHeader>
            <Button className="mt-2 w-full" onClick={() => setRequested(false)}>Tamam</Button>
          </DialogContent>
        </Dialog>

        <Dialog open={pdksOpen} onOpenChange={setPdksOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>PDKS Paketinizi Seçin</DialogTitle>
              <DialogDescription>
                Personel sayınıza ve lokasyon ihtiyacınıza uygun paketi seçin, ardından ödeme
                adımına geçin.
              </DialogDescription>
            </DialogHeader>
            <div className="mb-4 flex justify-center">
              <div className="inline-flex rounded-full border border-border bg-muted/50 p-1">
                {(["monthly", "yearly"] as const).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBilling(b)}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                      billing === b
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {b === "monthly" ? "Aylık" : "Yıllık (%20 indirim)"}
                  </button>
                ))}
              </div>
            </div>
            <PdksPlanCards
              billing={billing}
              ctaLabel="Bu Paketi Seç"
              onSelect={(plan) => {
                setPdksOpen(false);
                void navigate({
                  to: "/odeme",
                  search: {
                    tab: "abonelik",
                    modul: "Bilirim PDKS",
                    plan: `${plan.name} Paket — ${plan.limits}`,
                    period: billing,
                    tutar:
                      billing === "yearly"
                        ? Math.round(plan.monthly * 12 * 0.8)
                        : plan.monthly,
                  },
                });
              }}
            />
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
