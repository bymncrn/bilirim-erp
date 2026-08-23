import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, KeyRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { trMessage } from "@/lib/auth-errors";

export const Route = createFileRoute("/update-password")({
  head: () => ({
    meta: [
      { title: "Şifre Güncelle — Bilirim ERP" },
      {
        name: "description",
        content: "Bilirim ERP hesabınız için yeni bir şifre belirleyin.",
      },
      { property: "og:title", content: "Şifre Güncelle — Bilirim ERP" },
      { property: "og:description", content: "Yeni şifrenizi belirleyin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UpdatePasswordPage,
});

function passwordIssues(pw: string): string[] {
  const issues: string[] = [];
  if (pw.length < 8) issues.push("en az 8 karakter");
  if (!/[A-ZĞÜŞİÖÇ]/.test(pw)) issues.push("bir büyük harf");
  if (!/[a-zğüşıöç]/.test(pw)) issues.push("bir küçük harf");
  if (!/[0-9]/.test(pw)) issues.push("bir rakam");
  return issues;
}

function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let alive = true;
    // Recovery oturumu geldiğinde formu aç.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (alive && session) setReady(true);
    });

    void (async () => {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");
      try {
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        } else if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        } else if (tokenHash) {
          await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
        }
      } catch {
        /* aşağıda oturum kontrolü yapılıyor */
      }
      // Token'ın işlenmesi için kısa bir tolerans tanı.
      for (let i = 0; i < 10 && alive; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) break;
        await new Promise((r) => setTimeout(r, 300));
      }
      if (!alive) return;
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setExpired(true);
        return;
      }
      setReady(true);
    })();

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pw = String(fd.get("password") ?? "");
    const pw2 = String(fd.get("password2") ?? "");
    const issues = passwordIssues(pw);
    if (issues.length) {
      toast.error(`Şifre kuralları: ${issues.join(", ")}`);
      return;
    }
    if (pw !== pw2) {
      toast.error("Şifreler eşleşmiyor.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      toast.error(trMessage(error.message));
      return;
    }
    await supabase.auth.signOut();
    toast.success("Şifreniz başarıyla güncellendi.");
    void navigate({ to: "/login", replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 shadow-sm">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <KeyRound className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-foreground">Yeni Şifre Belirle</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          En az 8 karakter, büyük/küçük harf ve rakam içermelidir.
        </p>
        <form className="mt-6 space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <div className="space-y-2">
            <Label htmlFor="password">Yeni Şifre</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password2">Yeni Şifre (Tekrar)</Label>
            <Input
              id="password2"
              name="password2"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" className="h-12 w-full" disabled={busy || !ready || expired}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {expired ? "Bağlantı geçersiz" : ready ? "Şifreyi Kaydet" : "Bağlantı doğrulanıyor…"}
          </Button>
          {expired && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-center text-xs font-medium text-destructive">
              Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş. Lütfen giriş sayfasından yeni
              bir bağlantı isteyin.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
