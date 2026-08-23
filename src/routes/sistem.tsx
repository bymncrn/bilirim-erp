import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useRole } from "@/lib/rbac";

export const Route = createFileRoute("/sistem")({
  component: SystemLayout,
});

function SystemLayout() {
  const { role, loading } = useRole();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-muted-foreground">
        Yükleniyor…
      </div>
    );
  }

  if (role !== "yonetici") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-foreground">Erişim engellendi</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sistem Yönetimi modülüne yalnızca firma sahibi (Super Admin) erişebilir.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
