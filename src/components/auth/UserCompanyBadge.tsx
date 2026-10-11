import { Building2, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCompany } from "@/lib/company-store";

/** Üst menüde giriş yapan kullanıcı ve işlem yapılan şirket bilgisini gösterir. */
export function UserCompanyBadge() {
  const { profile } = useAuth();
  const company = useCompany();
  if (!profile) return null;
  return (
    <div className="hidden items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-1.5 md:flex">
      <div className="min-w-0 text-right leading-tight">
        <p className="flex items-center justify-end gap-1 truncate text-sm font-semibold text-foreground">
          <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
          {profile.full_name || profile.email}
        </p>
        <p className="flex items-center justify-end gap-1 truncate text-xs text-muted-foreground">
          <Building2 className="h-3 w-3" />
          {company?.name ?? "—"}
        </p>
      </div>
    </div>
  );
}
