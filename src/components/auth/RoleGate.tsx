import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { routePermission, usePermissions } from "@/lib/permissions";
import { hasRecoveryParams } from "@/lib/recovery";

const PUBLIC_PATHS = [
  "/",
  "/servis-durumu",
  "/login",
  "/update-password",
  "/auth/callback",
  "/kvkk",
  "/mesafeli-satis",
  "/iptal-iade",
];

/**
 * Sayfa erişimi yalnızca kullanıcıya işaretlenmiş modül yetkilerine göre kısıtlanır.
 */
export function RoleGate() {
  const { can, home, loading } = usePermissions();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const warned = useRef("");

  useEffect(() => {
    if (loading) return;
    // Şifre sıfırlama / doğrulama linkiyle gelindiyse Supabase oturumu kurana kadar dokunma.
    if (hasRecoveryParams()) return;
    if (PUBLIC_PATHS.includes(pathname)) return;
    const needed = routePermission(pathname);
    if (!needed || can(needed)) return;
    if (pathname === home) return;
    if (warned.current !== pathname) {
      warned.current = pathname;
      toast.error("Bu sayfa için yetkiniz bulunmuyor.");
    }
    navigate({ to: home, replace: true });
  }, [loading, can, home, pathname, navigate]);

  return null;
}
