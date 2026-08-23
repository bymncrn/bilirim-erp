import { supabase } from "@/integrations/supabase/client";
import { getCompanyId } from "@/lib/session";

export type AuditLog = {
  id: string;
  userName: string;
  action: string;
  summary: string;
  entity: string;
  createdAt: string;
};

let cachedName: string | null = null;

async function currentUser() {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  if (cachedName === null) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();
    cachedName = profile?.full_name || profile?.email || user.email || "Bilinmeyen kullanıcı";
  }
  return { id: user.id, name: cachedName };
}

export function resetAuditUser() {
  cachedName = null;
}

/** Kritik bir işlemi (silme/güncelleme) değiştirilemez işlem günlüğüne yazar. */
export async function logAudit(input: { action: string; summary: string; entity?: string }) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) return;
    const user = await currentUser();
    if (!user) return;
    await supabase.from("audit_logs").insert({
      company_id: companyId,
      user_id: user.id,
      user_name: user.name,
      action: input.action,
      summary: input.summary,
      entity: input.entity ?? "",
    });
  } catch (e) {
    console.error("[audit_logs] kayıt eklenemedi", e);
  }
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const companyId = await getCompanyId();
  if (!companyId) return [];
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, user_name, action, summary, entity, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    console.error("[audit_logs] okunamadı", error);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: String(r.id),
    userName: r.user_name ?? "",
    action: r.action ?? "",
    summary: r.summary ?? "",
    entity: r.entity ?? "",
    createdAt: r.created_at ?? "",
  }));
}