import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldAlert } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useOnboardingRedirect } from "@/lib/onboarding";
import { useHasPdks } from "@/lib/subscription-store";
import { useCompany } from "@/lib/company-store";

export const Route = createFileRoute("/pdks-yonetim")({
  component: PdksGuard,
});

function PdksGuard() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const onboardingPending = useOnboardingRedirect();
  const company = useCompany();
  const hasPdks = useHasPdks();
  const blocked = !!company && !onboardingPending && !hasPdks;

  useEffect(() => {
    if (loading || session) return;
    toast.error("Bu alana erişmek için giriş yapmalısınız.");
    navigate({ to: "/", replace: true });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!blocked) return;
    toast.error("PDKS modülü paketinize dahil değildir.");
    navigate({ to: "/abonelik", replace: true });
  }, [blocked, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
        <div className="pos-shadow flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Oturum bulunamadı</p>
          <p className="text-xs text-muted-foreground">Giriş sayfasına yönlendiriliyorsunuz…</p>
        </div>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
        <div className="pos-shadow flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">PDKS paketiniz bulunmuyor</p>
          <p className="text-xs text-muted-foreground">Abonelik sayfasına yönlendiriliyorsunuz…</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
