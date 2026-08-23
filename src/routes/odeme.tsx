import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Copy,
  CreditCard,
  Landmark,
  Loader2,
  Send,
  Ticket,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCompany } from "@/lib/company-store";
import { createSubscriptionOrder } from "@/lib/subscription-orders";
import { useSubscriptionStatus } from "@/lib/subscription-status";

type PayTab = "abonelik" | "kontor";

type OrderSearch = {
  tab: PayTab;
  modul?: string;
  plan?: string;
  period?: "monthly" | "yearly";
  tutar?: number;
};

const tl = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
});

export const Route = createFileRoute("/odeme")({
  validateSearch: (search: Record<string, unknown>): OrderSearch => {
    const amount = Number(search["tutar"]);
    return {
      tab: search["tab"] === "kontor" ? "kontor" : "abonelik",
      ...(typeof search["modul"] === "string" ? { modul: search["modul"] } : {}),
      ...(typeof search["plan"] === "string" ? { plan: search["plan"] } : {}),
      ...(search["period"] === "yearly" || search["period"] === "monthly"
        ? { period: search["period"] as "monthly" | "yearly" }
        : {}),
      ...(Number.isFinite(amount) && amount > 0 ? { tutar: amount } : {}),
    };
  },
  head: () => ({
    meta: [
      { title: "Abonelik ve Kontör İşlemleri — Bilirim ERP" },
      {
        name: "description",
        content:
          "Sistem aboneliğinizi yenileyin veya e-Belge kontör paketi satın alın. Havale/EFT bilgileri ve ödeme bildirimi.",
      },
      { property: "og:title", content: "Abonelik ve Kontör İşlemleri — Bilirim ERP" },
      {
        property: "og:description",
        content: "Abonelik yenileme ve e-Belge kontör paketleri.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentPage,
});

const BANK = {
  bank: "Ziraat Bankası",
  branch: "Garajlar / Bursa Şubesi",
  iban: "TR58 0001 0006 8669 2747 0450 03",
  owner: "Zeynel Abidin CERAN",
};

const CREDIT_PACKAGES = [
  { key: "k200", amount: 200, price: "588 ₺" },
  { key: "k500", amount: 500, price: "1.200 ₺" },
  { key: "k1000", amount: 1000, price: "2.160 ₺" },
  { key: "k2000", amount: 2000, price: "3.960 ₺", popular: true },
  { key: "k10000", amount: 10000, price: "16.200 ₺" },
  { key: "k100000", amount: 100000, price: "118.800 ₺" },
];

const copyText = async (value: string, label: string) => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} kopyalandı.`);
  } catch {
    toast.error("Kopyalama başarısız oldu.");
  }
};

function PaymentPage() {
  const sub = useSubscriptionStatus();
  const { tab, modul, plan, period, tutar } = Route.useSearch();
  const navigate = useNavigate({ from: "/odeme" });
  const order = tutar
    ? {
        modul: modul ?? "Bilirim ERP",
        tutar,
        ...(plan ? { plan } : {}),
        ...(period ? { period } : {}),
      }
    : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-5 py-4">
          <Button variant="outline" size="lg" asChild className="h-12 px-5 text-base font-semibold">
            <Link to="/abonelik">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Aboneliğe Dön
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Abonelik ve Kontör İşlemleri
            </h1>
            <p className="text-xs text-muted-foreground">{sub.label}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {order && (
          <aside className="lg:order-2 lg:sticky lg:top-6 lg:self-start">
            <OrderSummary {...order} />
          </aside>
        )}
        <Tabs
          value={tab}
          onValueChange={(v) => navigate({ search: (prev) => ({ ...prev, tab: v as PayTab }) })}
          className="min-w-0 space-y-5 lg:order-1"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="abonelik" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Sistem Aboneliği
            </TabsTrigger>
            <TabsTrigger value="kontor" className="gap-2">
              <Ticket className="h-4 w-4" />
              e-Belge Kontör Paketleri
            </TabsTrigger>
          </TabsList>

          <TabsContent value="abonelik" className="space-y-5">
            <SubscriptionTab order={order} />
          </TabsContent>

          <TabsContent value="kontor" className="space-y-5">
            <CreditsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function OrderSummary({
  modul,
  plan,
  period,
  tutar,
}: {
  modul: string;
  plan?: string;
  period?: "monthly" | "yearly";
  tutar: number;
}) {
  return (
    <div className="rounded-3xl border-2 border-brand-orange/30 bg-card p-6 shadow-xl">
      <h2 className="text-base font-bold text-foreground">Sipariş Özeti</h2>
      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-xs uppercase text-muted-foreground">Seçilen Modül</dt>
          <dd className="mt-0.5 font-semibold text-foreground">{modul}</dd>
        </div>
        {plan && (
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Seçilen Plan</dt>
            <dd className="mt-0.5 font-semibold text-foreground">{plan}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs uppercase text-muted-foreground">Fatura Periyodu</dt>
          <dd className="mt-0.5 font-semibold text-foreground">
            {period === "yearly" ? "Yıllık" : "Aylık"}
          </dd>
        </div>
      </dl>
      <div className="mt-5 border-t border-border pt-4">
        <p className="text-xs uppercase text-muted-foreground">Toplam Ödenecek Tutar</p>
        <p className="mt-1 text-3xl font-extrabold tracking-tight text-brand-orange">
          {tl.format(tutar)}
        </p>
      </div>
    </div>
  );
}

function SubscriptionTab({
  order,
}: {
  order: { modul: string; tutar: number; plan?: string; period?: "monthly" | "yearly" } | null;
}) {
  const company = useCompany();
  const [note, setNote] = useState("");
  const [sender, setSender] = useState("");
  const [kvkk, setKvkk] = useState(false);
  const [terms, setTerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!sender.trim()) {
      toast.error("Lütfen gönderici ad-soyad / firma ünvanını yazın.");
      return;
    }
    if (!kvkk || !terms) {
      toast.error("Devam etmek için KVKK ve sözleşme onaylarını işaretleyin.");
      return;
    }
    setSaving(true);
    try {
      await createSubscriptionOrder({
        module: order?.modul ?? "Bilirim ERP",
        ...(order?.plan ? { plan: order.plan } : {}),
        period: order?.period ?? "monthly",
        amount: order?.tutar ?? 0,
        senderName: sender.trim(),
        note,
        companyName: company?.name ?? "",
      });
      // Yöneticiye sipariş e-postası gönderimi (simülasyon)
      console.info("[bildirim] Yöneticiye sipariş e-postası gönderildi", {
        company: company?.name,
        module: order?.modul,
        plan: order?.plan,
        amount: order?.tutar,
        sender: sender.trim(),
      });
      toast.success("Yöneticiye sipariş e-postası gönderildi.");
      setDone(true);
      setNote("");
    } catch {
      toast.error("Sipariş kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="pos-shadow flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">Abonelik paketinizi seçin</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Paket karşılaştırması ve süre uzatma işlemleri abonelik sayfasında yapılır.
          </p>
        </div>
        <Button asChild variant="outline" className="h-11 px-5 font-semibold">
          <Link to="/abonelik">Paketleri Görüntüle</Link>
        </Button>
      </div>

      <section className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
          <Landmark className="h-3.5 w-3.5" />
          Havale / EFT ile Ödeme
        </div>
        <BankBlock />

        <div className="space-y-3 rounded-2xl bg-muted/50 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="sender">Gönderici Ad-Soyad / Firma Ünvanı *</Label>
            <Input
              id="sender"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder="Ödemeyi gönderecek kişi veya firma ünvanı"
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Ödemenizi eşleştirebilmemiz için havale açıklamasına da bu ismi yazın.
            </p>
          </div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ödeme tarihi, tutar gibi eklemek istediğiniz notlar…"
            rows={3}
          />
          <label className="flex items-start gap-2.5 text-xs text-muted-foreground">
            <Checkbox checked={kvkk} onCheckedChange={(v) => setKvkk(v === true)} />
            <span>
              <Link
                to="/kvkk"
                target="_blank"
                className="font-medium text-foreground underline hover:text-primary"
              >
                KVKK Aydınlatma Metni
              </Link>
              'ni okudum ve kişisel verilerimin işlenmesini onaylıyorum.
            </span>
          </label>
          <label className="flex items-start gap-2.5 text-xs text-muted-foreground">
            <Checkbox checked={terms} onCheckedChange={(v) => setTerms(v === true)} />
            <span>
              <Link
                to="/mesafeli-satis"
                target="_blank"
                className="font-medium text-foreground underline hover:text-primary"
              >
                Mesafeli Satış Sözleşmesi
              </Link>
              ve Ön Bilgilendirme Formu'nu kabul ediyorum.
            </span>
          </label>
          <Button
            className="h-12 w-full text-base font-bold sm:w-auto sm:px-8"
            disabled={saving}
            onClick={() => void submit()}
          >
            {saving ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Send className="mr-2 h-5 w-5" />
            )}
            Siparişi Tamamla ve Bildir
          </Button>
        </div>
      </section>

      <Dialog open={done} onOpenChange={setDone}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              Siparişiniz Alındı!
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Talebiniz bize ulaştı. Lütfen ödemenizi ekrandaki IBAN adresine gerçekleştirin.
            Hesabınız, muhasebe departmanımız tarafından ödeme kontrolü sağlandıktan sonra en kısa
            sürede aktif edilecektir.
          </p>
          <DialogFooter>
            <Button asChild>
              <Link to="/dashboard">Panele Dön</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CreditsTab() {
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        {CREDIT_PACKAGES.map((p) => {
          const active = selected === p.key;
          return (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelected(p.key)}
              className={`pos-shadow rounded-3xl border bg-card p-6 text-left transition ${
                active ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    active ? "border-primary" : "border-muted-foreground/40"
                  }`}
                >
                  {active && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                </span>
                {p.popular && (
                  <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase text-primary-foreground">
                    En Çok Tercih Edilen
                  </span>
                )}
              </div>
              <p className="mt-4 text-2xl font-bold tracking-tight text-foreground">
                {p.amount.toLocaleString("tr-TR")} Kontör
              </p>
              <p className="mt-1 text-lg font-semibold text-primary">{p.price}</p>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Ücretlere %20 KDV dahildir.</p>

      <section className="pos-shadow space-y-4 rounded-2xl border border-border bg-card p-6">
        <BankBlock />
        <div className="space-y-2 rounded-xl bg-muted/50 p-4">
          <p className="text-xs text-muted-foreground">
            Kontör satın almak için seçtiğiniz paket tutarını yukarıdaki IBAN'a havale/EFT ile
            gönderin. Açıklama kısmına işletme adınızı ve satın aldığınız kontör adedini yazın.
            Ödemeniz onaylandığında kontörleriniz hesabınıza tanımlanır.
          </p>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ödeme tarihi, tutar ve gönderen adı gibi bilgileri yazabilirsiniz…"
            rows={3}
          />
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              if (!selected) {
                toast.error("Lütfen bir kontör paketi seçin.");
                return;
              }
              toast.success(
                "Kontör satın alma bildiriminiz alındı. Onay sonrası kontörleriniz yüklenecek.",
              );
              setNote("");
            }}
          >
            <Send className="mr-2 h-4 w-4" />
            Ödemeyi Bildir
          </Button>
        </div>
      </section>
    </>
  );
}

function BankBlock() {
  return (
    <>
      <div className="flex items-center gap-2">
        <Banknote className="h-5 w-5 text-primary" />
        <h2 className="text-base font-bold text-foreground">Banka Hesap Bilgileri</h2>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Row label="Banka" value={BANK.bank} />
        <Row label="Şube" value={BANK.branch} />
        <Row
          label="IBAN"
          value={BANK.iban}
          onCopy={() => copyText(BANK.iban.replace(/\s/g, ""), "IBAN")}
          wide
        />
        <Row label="Hesap Sahibi" value={BANK.owner} wide />
      </dl>
    </>
  );
}

function Row({
  label,
  value,
  onCopy,
  wide,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  wide?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-border p-3 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold tracking-wide text-foreground">{value}</span>
        {onCopy ? (
          <Button size="icon" variant="ghost" aria-label="Kopyala" onClick={onCopy}>
            <Copy className="h-4 w-4" />
          </Button>
        ) : null}
      </dd>
    </div>
  );
}
