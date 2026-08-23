import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { trMessage } from "@/lib/auth-errors";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Doğrulama — Bilirim ERP" },
      { name: "description", content: "E-posta doğrulama ve şifre sıfırlama yönlendirmesi." },
      { property: "og:title", content: "Doğrulama — Bilirim ERP" },
      { property: "og:description", content: "E-posta doğrulama yönlendirmesi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    void (async () => {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const errorDesc = url.searchParams.get("error_description") ?? hash.get("error_description");
      const code = url.searchParams.get("code");
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const type = url.searchParams.get("type") ?? hash.get("type");

      if (errorDesc) {
        toast.error(trMessage(errorDesc));
        void navigate({ to: "/login", replace: true });
        return;
      }

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }
      } catch (err) {
        toast.error(trMessage(err instanceof Error ? err.message : null));
        void navigate({ to: "/login", replace: true });
        return;
      }

      if (type === "recovery") {
        void navigate({ to: "/update-password", replace: true });
        return;
      }

      toast.success("E-posta adresiniz başarıyla doğrulandı, giriş yapabilirsiniz.");
      const { data } = await supabase.auth.getSession();
      void navigate({ to: data.session ? "/dashboard" : "/login", replace: true });
    })();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Doğrulanıyor, lütfen bekleyin…</p>
      </div>
    </div>
  );
}
