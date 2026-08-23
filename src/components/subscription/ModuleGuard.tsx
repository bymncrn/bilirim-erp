import { useNavigate } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useHasModule, MODULE_LABELS, type ModuleKey } from "@/lib/subscription-store";
import { useSubscriptionStatus } from "@/lib/subscription-status";

export function ModuleGuard({ module, children }: { module: ModuleKey; children: ReactNode }) {
  const navigate = useNavigate();
  const hasModule = useHasModule();
  const sub = useSubscriptionStatus();
  const [checked, setChecked] = useState(false);
  const allowed = hasModule(module) && !sub.expired;

  useEffect(() => {
    if (sub.loading) return;
    if (!allowed) {
      if (sub.expired) {
        toast.error(
          sub.kind === "trial"
            ? "Deneme süreniz sona erdi. Devam etmek için bir paket seçin."
            : "Aboneliğinizin süresi doldu. Devam etmek için aboneliğinizi yenileyin.",
        );
        navigate({ to: "/abonelik", replace: true });
      } else {
        toast.error(`${MODULE_LABELS[module]} modülü mevcut paketinize dahil değildir.`);
        navigate({ to: "/dashboard", replace: true });
      }
    }
    setChecked(true);
  }, [allowed, module, navigate, sub.loading, sub.expired, sub.kind]);

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="pos-shadow flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center">
          <Lock className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">
            {sub.expired ? "Erişiminiz kısıtlandı" : "Bu modül paketinize dahil değil"}
          </p>
          <p className="text-xs text-muted-foreground">
            {sub.expired ? "Abonelik sayfasına yönlendiriliyorsunuz…" : "Ana panele yönlendiriliyorsunuz…"}
          </p>
        </div>
      </div>
    );
  }

  if (!checked) return null;
  return <>{children}</>;
}
