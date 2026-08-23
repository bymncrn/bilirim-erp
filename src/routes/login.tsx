import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Store } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { trMessage } from "@/lib/auth-errors";
import { useAttemptLock } from "@/lib/auth-security";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Giriş Yap — Bilirim ERP" },
      {
        name: "description",
        content:
          "Bilirim ERP hesabınıza giriş yapın; ön muhasebe, POS, adisyon, teknik servis ve PDKS panellerine erişin.",
      },
      { property: "og:title", content: "Giriş Yap — Bilirim ERP" },
      {
        property: "og:description",
        content: "Bilirim ERP yönetim panellerine güvenli giriş.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const loginLock = useAttemptLock("login");
  const resetLock = useAttemptLock("reset", { maxAttempts: 3 });

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
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
      toast.error(
        res.locked
          ? "5 hatalı deneme yapıldı. Giriş 3 dakika boyunca kapatıldı."
          : `${trMessage(error.message)} (Kalan deneme: ${res.remaining})`,
      );
      return;
    }
    loginLock.reset();
    toast.success("Giriş başarılı.");
    void navigate({ to: "/dashboard", replace: true });
  };

  const onForgot = async () => {
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 shadow-sm">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Store className="h-5 w-5" />
          </span>
          <span className="text-base font-extrabold tracking-tight text-foreground">
            bilirim<span className="text-primary">.com.tr</span>
          </span>
        </Link>
        <h1 className="text-xl font-bold text-foreground">Giriş Yap</h1>
        <p className="mt-1 text-sm text-muted-foreground">Hesabınızla panele erişin.</p>
        <form className="mt-6 space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Şifre</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" className="h-12 w-full" disabled={busy || loginLock.locked}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
            onClick={() => void onForgot()}
            disabled={busy || resetLock.locked}
            className="w-full text-center text-xs font-semibold text-primary disabled:opacity-50"
          >
            {resetLock.locked ? `Şifremi Unuttum (${resetLock.remainingLabel})` : "Şifremi Unuttum"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Hesabınız yok mu?{" "}
          <Link to="/" className="font-semibold text-primary">
            Ücretsiz deneyin
          </Link>
        </p>
      </div>
    </div>
  );
}
