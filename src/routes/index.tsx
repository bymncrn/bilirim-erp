import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Calculator,
  ScanBarcode,
  UtensilsCrossed,
  Wrench,
  Users,
  Gift,
  ArrowRight,
  Check,
  CheckCircle2,
  Store,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { trMessage } from "@/lib/auth-errors";
import { PASSWORD_RULES, isStrongPassword, passwordIssues, useAttemptLock } from "@/lib/auth-security";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { HeroSlider } from "@/components/landing/HeroSlider";
import { KvkkBadge, PdksPlanCards } from "@/components/pricing/PdksPlans";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "bilirim.com.tr — Hepsi Bir Arada Ticari Yazılım" },
      {
        name: "description",
        content:
          "Ön muhasebe, POS satış kasası, adisyon ve teknik servis modülleri tek platformda. 30 gün ücretsiz deneyin.",
      },
      { property: "og:title", content: "bilirim.com.tr — Hepsi Bir Arada Ticari Yazılım" },
      {
        property: "og:description",
        content:
          "Ön muhasebe, POS, adisyon ve teknik servis modülleri tek platformda. 30 gün ücretsiz deneyin.",
      },
    ],
  }),
  component: LandingPage,
});

const featureModules = [
  {
    title: "Ön Muhasebe",
    desc: "Stok, cari hesaplar, e-Belge işlemleri, kasa/banka ve gider takibi tek ekranda.",
    icon: Calculator,
    tone: "bg-pos-apple text-pos-apple-foreground",
  },
  {
    title: "POS Satış Kasası",
    desc: "Barkod okuyucu desteği, tartılı ürün çözümlemesi ve termal fiş yazdırma.",
    icon: ScanBarcode,
    tone: "bg-pos-tomato text-pos-tomato-foreground",
  },
  {
    title: "Adisyon / Masa Yönetimi",
    desc: "Bölge bazlı görsel masa haritası, ikram, masa taşıma ve hesap aktarımı.",
    icon: UtensilsCrossed,
    tone: "bg-pos-cheese text-pos-cheese-foreground",
  },
  {
    title: "Teknik Servis",
    desc: "Cihaz kabul, arıza takibi, durum etiketleri ve servis fişi çıktısı.",
    icon: Wrench,
    tone: "bg-pos-cashew text-pos-cashew-foreground",
  },
  {
    title: "PDKS & İnsan Kaynakları",
    desc: "Sıfır cihaz maliyetiyle, KVKK uyumlu ve konum doğrulamalı mobil uygulama üzerinden personelinizi kolayca takip edin.",
    icon: Users,
    tone: "bg-pos-sky text-pos-sky-foreground",
  },
];

const plans = [
  {
    name: "Temel Muhasebe",
    priceMonthly: 349,
    tag: "Ön Muhasebe",
    features: [
      "Stok & Cari Takibi",
      "Kasa/Banka",
      "e-Fatura & e-Arşiv İşlemleri",
      "Gelir/Gider Takibi",
    ],
    highlight: false,
  },
  {
    name: "Perakende & POS Paketi",
    priceMonthly: 499,
    tag: "Perakende",
    features: [
      "Temel Muhasebe'deki her şey",
      "Hızlı POS Satış Kasası",
      "Barkod & Tartılı Terazi Entegrasyonu",
      "Fiş Yazdırma",
    ],
    highlight: false,
  },
  {
    name: "Restoran & Adisyon Paketi",
    priceMonthly: 499,
    tag: "Restoran & Kafe",
    features: [
      "Temel Muhasebe'deki her şey",
      "Adisyon & Masa Takip Haritası",
      "Mutfak Fişi",
      "Parçalı Hesabı Ödeme",
    ],
    highlight: false,
  },
  {
    name: "Teknik Servis Paketi",
    priceMonthly: 499,
    tag: "Teknik Servis",
    features: [
      "Temel Muhasebe'deki her şey",
      "Cihaz Kabul & Arıza Takip",
      "Durum Etiketleri",
      "Servis Fişi Basımı",
    ],
    highlight: false,
  },
];

const allInOnePlan = {
  name: "Tam Ticaret Paketi",
  priceMonthly: 799,
  description: "Tüm modüllere birden mi ihtiyacınız var?",
  features: ["Tüm modüller sınırsız", "Mali yönetim & raporlar", "Öncelikli destek"],
};

const sectors = [
  "Market & Manav",
  "Şarküteri",
  "Restoran & Kafe",
  "Teknik Servis",
  "Toptan Ticaret",
  "Diğer",
];

function LandingPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register" | "verify" | null>(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const loginLock = useAttemptLock("login");
  const resetLock = useAttemptLock("reset", { maxAttempts: 3 });
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [pdksBilling, setPdksBilling] = useState<"monthly" | "yearly">("monthly");

  const formatPrice = (monthly: number) => {
    if (billing === "yearly") {
      return new Intl.NumberFormat("tr-TR").format(monthly * 10);
    }
    return new Intl.NumberFormat("tr-TR").format(monthly);
  };

  const billingSuffix = billing === "yearly" ? "/yıl" : "/ay";

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    if (!email || !password) {
      toast.error("E-posta ve şifre zorunludur.");
      return;
    }
    if (loginLock.locked) {
      toast.error(`Çok fazla hatalı deneme. ${loginLock.remainingLabel} sonra tekrar deneyin.`);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      const res = loginLock.registerFailure();
      if (/email not confirmed/i.test(error.message)) {
        setPendingEmail(email);
        setMode("verify");
        toast.error(trMessage(error.message));
        return;
      }
      toast.error(
        res.locked
          ? "5 hatalı deneme yapıldı. Giriş 3 dakika boyunca kapatıldı."
          : `${trMessage(error.message)} (Kalan deneme: ${res.remaining})`,
      );
      return;
    }
    loginLock.reset();
    toast.success("Giriş başarılı, panele yönlendiriliyorsunuz.");
    setMode(null);
    navigate({ to: "/dashboard" });
  };

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const company = String(fd.get("company") ?? "").trim();
    const fullName = String(fd.get("fullName") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const sector = String(fd.get("sector") ?? "");
    if (!company || !fullName || !email || !phone || !password || !sector) {
      toast.error("Lütfen tüm alanları doldurun.");
      return;
    }
    const issues = passwordIssues(password);
    if (issues.length) {
      toast.error(`Şifre kuralları: ${issues.join(", ")}`);
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: fullName, company_name: company, phone, sector },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(trMessage(error.message));
      return;
    }
    if (!data.session) {
      setPendingEmail(email);
      setRegPassword("");
      setMode("verify");
      toast.success("Hesabınız oluşturuldu. Lütfen e-postanızı doğrulayın.");
      return;
    }
    setMode(null);
    toast.success("Hesabınız oluşturuldu. 30 günlük deneme başladı!");
    navigate({ to: "/onboarding" });
  };

  const handleResend = async () => {
    if (!pendingEmail) return;
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: pendingEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) {
      toast.error(trMessage(error.message));
      return;
    }
    toast.success("Doğrulama e-postası yeniden gönderildi.");
  };

  const handleForgotPassword = async () => {
    if (resetLock.locked) {
      toast.error(`Çok fazla istek. ${resetLock.remainingLabel} sonra tekrar deneyin.`);
      return;
    }
    const email = window.prompt("Şifre sıfırlama bağlantısı gönderilecek e-posta adresi:")?.trim();
    if (!email) return;
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Supabase şifre sıfırlama linki kullanıcıyı şifre belirleme ekranına yönlendirmeli,
      // giriş sayfasına değil. Maildeki redirect_to parametresi bu adresi taşır.
      redirectTo: `${window.location.origin}/update-password`,
    });
    setBusy(false);
    resetLock.registerFailure();
    if (error) {
      toast.error(trMessage(error.message));
      return;
    }
    toast.success("Şifre sıfırlama bağlantısı e-postanıza gönderildi.");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-5 py-3">
          <a href="#top" className="mr-auto flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Store className="h-5 w-5" />
            </span>
            <span className="text-base font-extrabold tracking-tight text-foreground">
              bilirim<span className="text-primary">.com.tr</span>
            </span>
          </a>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#ozellikler" className="hover:text-foreground">
              Özellikler
            </a>
            <a href="#sektorler" className="hover:text-foreground">
              Sektörler
            </a>
            <a href="#fiyatlar" className="hover:text-foreground">
              Fiyatlar
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-6">
            <Button variant="ghost" size="sm" onClick={() => setMode("login")}>
              Giriş Yap
            </Button>
            <Button
              size="sm"
              className="transition-all duration-200 hover:scale-105 hover:shadow-lg"
              onClick={() => setMode("register")}
            >
              30 Gün Ücretsiz Deneyin
            </Button>
          </div>
        </div>
      </header>

      <main id="top">
        <HeroSlider onStart={() => setMode("register")} onLogin={() => setMode("login")} />

        <section className="mx-auto max-w-4xl px-5 py-14 text-center">
          <span className="inline-flex rounded-full bg-brand-gray-soft px-3 py-1 text-xs font-semibold text-brand-gray">
            Kurulum gerektirmez · Bulut tabanlı
          </span>
          <h2 className="mt-5 text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
            Ticaretin ve İşletmenizin Kalbinden Gelen Hepsi Bir Arada Platform
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Ön muhasebe, POS satış kasası, adisyon ve teknik servis süreçlerinizi tek bir ekrandan
            yönetin. Stoktan e-Belgeye, kasadan raporlamaya kadar her şey bilirim'de.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              className="transition-all duration-200 hover:scale-105 hover:shadow-lg"
              onClick={() => setMode("register")}
            >
              Hemen Ücretsiz Kayıt Ol
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="transition-all duration-200 hover:scale-105 hover:shadow-lg"
              onClick={() => setMode("login")}
            >
              Giriş Yap
            </Button>
          </div>
        </section>

        <section id="ozellikler" className="border-y border-border bg-brand-gray-soft py-16">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Modüller
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
              İşletmenizin ihtiyacına göre modülleri birlikte veya ayrı ayrı kullanın.
            </p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {featureModules.map((m) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.title}
                    className="pos-shadow flex h-full flex-col rounded-3xl border border-border bg-card p-6 transition-all duration-200 hover:-translate-y-1 hover:scale-105 hover:shadow-lg"
                  >
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl ${m.tone}`}
                    >
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="mt-5 text-base font-bold text-foreground">{m.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{m.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="sektorler" className="py-16">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Sektörler
            </h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {sectors.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-all duration-200 hover:scale-105 hover:border-primary/40 hover:shadow-lg"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="fiyatlar" className="border-t border-border bg-brand-gray-soft py-16">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Sektörel Fiyatlandırma
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              İşletmenize özel paketleri seçin, ihtiyacınız arttıkça kolayca büyütün.
            </p>

            <div className="mt-8 flex items-center justify-center gap-3">
              <span
                className={`text-sm font-medium ${billing === "monthly" ? "text-foreground" : "text-muted-foreground"}`}
              >
                Aylık
              </span>
              <button
                type="button"
                aria-label="Fatura dönemi değiştir"
                onClick={() => setBilling((prev) => (prev === "monthly" ? "yearly" : "monthly"))}
                className="relative inline-flex h-7 w-12 items-center rounded-full bg-primary transition-colors"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-primary-foreground transition-transform ${
                    billing === "yearly" ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span
                className={`text-sm font-medium ${billing === "yearly" ? "text-foreground" : "text-muted-foreground"}`}
              >
                Yıllık
              </span>
              <span className="rounded-full bg-pos-success/15 px-2 py-0.5 text-xs font-semibold text-pos-success">
                2 Ay Ücretsiz
              </span>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((p) => (
                <div
                  key={p.name}
                  className="pos-shadow flex h-full flex-col rounded-3xl border border-border bg-card p-6 transition-all duration-200 hover:-translate-y-1 hover:scale-105 hover:shadow-lg"
                >
                  <span className="mb-3 inline-flex w-fit rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                    {p.tag}
                  </span>
                  <h3 className="text-base font-bold text-foreground">{p.name}</h3>
                  <p className="mt-4 text-3xl font-extrabold text-foreground">
                    {formatPrice(p.priceMonthly)}₺
                    <span className="text-sm font-medium text-muted-foreground">
                      {billingSuffix}
                    </span>
                  </p>
                  <ul className="mt-5 flex-1 space-y-2 text-sm text-muted-foreground">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-6 w-full transition-all duration-200 hover:scale-105 hover:shadow-lg"
                    variant="outline"
                    onClick={() => setMode("register")}
                  >
                    Ücretsiz Başla
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 p-6 ring-1 ring-primary/20 sm:p-8">
              <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-semibold text-primary">{allInOnePlan.description}</p>
                  <h3 className="mt-1 text-xl font-bold text-foreground">{allInOnePlan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {allInOnePlan.features.join(" · ")}
                  </p>
                </div>
                <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:items-end">
                  <p className="text-3xl font-extrabold text-foreground">
                    {formatPrice(allInOnePlan.priceMonthly)}₺
                    <span className="text-sm font-medium text-muted-foreground">
                      {billingSuffix}
                    </span>
                  </p>
                  <Button
                    size="lg"
                    className="w-full transition-all duration-200 hover:scale-105 hover:shadow-lg sm:w-auto"
                    onClick={() => setMode("register")}
                  >
                    Hemen VIP Paket Al
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pdks-fiyat" className="border-t border-border py-16">
          <div className="mx-auto max-w-6xl px-5">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                PDKS (Personel Devam Kontrol Sistemi)
              </h2>
              <p className="mx-auto mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Personel giriş-çıkışlarını takip etmek için binlerce liralık donanımlara, kartlara veya parmak izi okuyucularına ihtiyacınız yok. Sadece ihtiyacınıza uygun paketi seçin ve anında kullanmaya başlayın.
              </p>
            </div>
            <h2 className="mx-auto max-w-3xl text-center text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Donanım Maliyetlerine Son Verin. Sadece İhtiyacınız Olanı Ödeyin.
            </h2>
            <div className="mt-4 flex justify-center">
              <KvkkBadge />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <span
                className={`text-sm font-medium ${pdksBilling === "monthly" ? "text-foreground" : "text-muted-foreground"}`}
              >
                Aylık Ödeme
              </span>
              <button
                type="button"
                aria-label="PDKS fatura dönemi değiştir"
                onClick={() => setPdksBilling((prev) => (prev === "monthly" ? "yearly" : "monthly"))}
                className="relative inline-flex h-7 w-12 items-center rounded-full bg-primary transition-colors"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-primary-foreground transition-transform ${
                    pdksBilling === "yearly" ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span
                className={`text-sm font-medium ${pdksBilling === "yearly" ? "text-foreground" : "text-muted-foreground"}`}
              >
                Yıllık Ödeme
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pos-success/15 px-3 py-1 text-xs font-semibold text-pos-success">
                <Gift className="h-3.5 w-3.5" />
                🎁 Yıllık Alımda 2 Ay Ücretsiz!
              </span>
            </div>

            <div className="mt-10">
              <PdksPlanCards billing={pdksBilling} ctaLabel="30 Gün Ücretsiz Dene" onSelect={() => setMode("register")} />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card py-8">
        <div className="mx-auto max-w-6xl px-5 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} bilirim.com.tr — Tüm hakları saklıdır.
        </div>
      </footer>

      <Dialog open={mode === "login"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Giriş Yap</DialogTitle>
            <DialogDescription>Hesabınıza erişmek için bilgilerinizi girin.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-email">E-posta</Label>
              <Input id="login-email" name="email" type="email" placeholder="ornek@firma.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-password">Şifre</Label>
              <Input id="login-password" name="password" type="password" placeholder="••••••••" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="remember" name="remember" />
              <Label htmlFor="remember" className="text-sm font-normal">
                Beni Hatırla
              </Label>
            </div>
            <Button type="submit" className="w-full" disabled={busy || loginLock.locked}>
              {loginLock.locked ? `Kilitli — ${loginLock.remainingLabel}` : "Giriş Yap"}
            </Button>
            {loginLock.locked ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-center text-xs font-medium text-destructive">
                Güvenlik nedeniyle giriş geçici olarak kapatıldı. Kalan süre:{" "}
                {loginLock.remainingLabel}
              </p>
            ) : (
              loginLock.attemptsLeft < loginLock.maxAttempts && (
                <p className="text-center text-xs text-muted-foreground">
                  Kalan deneme hakkı: {loginLock.attemptsLeft}
                </p>
              )
            )}
            <button
              type="button"
              onClick={() => void handleForgotPassword()}
              disabled={busy || resetLock.locked}
              className="w-full text-center text-xs font-semibold text-primary disabled:opacity-50"
            >
              {resetLock.locked
                ? `Şifremi Unuttum (${resetLock.remainingLabel})`
                : "Şifremi Unuttum"}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              Hesabınız yok mu?{" "}
              <button
                type="button"
                className="font-semibold text-primary"
                onClick={() => setMode("register")}
              >
                Kayıt olun
              </button>
            </p>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "verify"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>E-posta Doğrulaması Bekleniyor</DialogTitle>
            <DialogDescription>
              Hesabınız <strong>Beklemede</strong> statüsünde. Giriş yapabilmek için e-posta
              adresinizi doğrulayın.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
              <p className="font-semibold text-foreground">{pendingEmail}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Bu adrese gönderilen onay bağlantısına tıkladıktan sonra giriş yapabilirsiniz.
                E-posta gelmediyse spam klasörünü kontrol edin.
              </p>
            </div>
            <Button
              className="w-full"
              variant="outline"
              disabled={busy}
              onClick={() => void handleResend()}
            >
              Doğrulama E-postasını Yeniden Gönder
            </Button>
            <Button className="w-full" onClick={() => setMode("login")}>
              Giriş Ekranına Dön
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "register"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>30 Gün Ücretsiz Deneyin</DialogTitle>
            <DialogDescription>Birkaç dakikada hesabınızı oluşturun.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="reg-company">Firma Adı</Label>
                <Input id="reg-company" name="company" placeholder="Yılmaz Market" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-name">Ad Soyad</Label>
                <Input id="reg-name" name="fullName" placeholder="Ad Soyad" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-email">E-posta</Label>
                <Input id="reg-email" name="email" type="email" placeholder="ornek@firma.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-phone">Telefon</Label>
                <Input id="reg-phone" name="phone" placeholder="0555 000 00 00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-password">Şifre</Label>
                <Input
                  id="reg-password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-sector">Sektör</Label>
                <Select name="sector">
                  <SelectTrigger id="reg-sector">
                    <SelectValue placeholder="Sektör seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <ul className="grid gap-1 rounded-xl border border-border bg-muted/40 p-3 text-xs sm:grid-cols-2">
              {PASSWORD_RULES.map((rule) => {
                const ok = rule.test(regPassword);
                return (
                  <li
                    key={rule.key}
                    className={`flex items-center gap-1.5 ${ok ? "text-pos-success" : "text-muted-foreground"}`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    {rule.label}
                  </li>
                );
              })}
            </ul>
            <Button
              type="submit"
              disabled={busy || !isStrongPassword(regPassword)}
              className="w-full bg-pos-success text-pos-success-foreground hover:bg-pos-success/90"
            >
              Ücretsiz Hesabımı Oluştur
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Zaten üye misiniz?{" "}
              <button
                type="button"
                className="font-semibold text-primary"
                onClick={() => setMode("login")}
              >
                Giriş yapın
              </button>
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
