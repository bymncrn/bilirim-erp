import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TeamMember = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  perms: Record<string, boolean>;
  salesScope: string;
  allowedAccounts: string[];
};

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Bu işlem için yönetici yetkisi gerekiyor.");
  const { data: profile } = await context.supabase
    .from("profiles")
    .select("company_id")
    .eq("id", context.userId)
    .maybeSingle();
  if (!profile?.company_id) throw new Error("İşletme bilgisi bulunamadı.");
  return profile.company_id as string;
}

const ALLOWED = ["admin", "muhasebe", "kasiyer", "garson", "teknik_servis"];

export const listTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TeamMember[]> => {
    const companyId = await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .eq("company_id", companyId);
    const ids = (profiles ?? []).map((p) => p.id);
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const roleById = new Map((roles ?? []).map((r) => [r.user_id, String(r.role)]));
    const { data: perms } = await supabaseAdmin
      .from("user_permissions")
      .select("user_id, perms, sales_scope, allowed_accounts")
      .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const permById = new Map((perms ?? []).map((p) => [p.user_id, p]));
    return (profiles ?? []).map((p) => ({
      id: p.id,
      fullName: p.full_name ?? "",
      email: p.email ?? "",
      role: roleById.get(p.id) ?? "admin",
      perms: (permById.get(p.id)?.perms ?? {}) as Record<string, boolean>,
      salesScope: String(permById.get(p.id)?.sales_scope ?? "all"),
      allowedAccounts: (permById.get(p.id)?.allowed_accounts ?? []) as string[],
    }));
  });

export const saveTeamPermissions = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      userId: string;
      perms: Record<string, boolean>;
      salesScope: string;
      allowedAccounts: string[];
    }) => {
      if (!["own", "all"].includes(input.salesScope)) throw new Error("Geçersiz satış kapsamı.");
      return input;
    },
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const companyId = await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("company_id")
      .eq("id", data.userId)
      .maybeSingle();
    if (target?.company_id !== companyId) throw new Error("Kullanıcı bu işletmeye ait değil.");
    const { error } = await supabaseAdmin.from("user_permissions").upsert(
      {
        user_id: data.userId,
        company_id: companyId,
        perms: data.perms,
        sales_scope: data.salesScope,
        allowed_accounts: data.allowedAccounts,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createTeamMember = createServerFn({ method: "POST" })
  .inputValidator((input: { fullName: string; email: string; password: string; role: string }) => {
    if (!input.email.includes("@")) throw new Error("Geçerli bir e-posta girin.");
    if (input.password.length < 6) throw new Error("Şifre en az 6 karakter olmalıdır.");
    if (!ALLOWED.includes(input.role)) throw new Error("Geçersiz rol.");
    return input;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const companyId = await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Kullanıcı oluşturulamadı.");
    const newId = created.user.id;

    const { data: newProfile } = await supabaseAdmin
      .from("profiles")
      .select("company_id")
      .eq("id", newId)
      .maybeSingle();
    const orphanCompany = newProfile?.company_id ?? null;

    await supabaseAdmin
      .from("profiles")
      .update({ company_id: companyId, full_name: data.fullName, email: data.email })
      .eq("id", newId);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", newId);
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newId, role: data.role as never, company_id: companyId });

    if (orphanCompany && orphanCompany !== companyId) {
      await supabaseAdmin.from("companies").delete().eq("id", orphanCompany);
    }
    return { id: newId };
  });

export const updateTeamRole = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; role: string }) => {
    if (!ALLOWED.includes(input.role)) throw new Error("Geçersiz rol.");
    return input;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const companyId = await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("company_id")
      .eq("id", data.userId)
      .maybeSingle();
    if (target?.company_id !== companyId) throw new Error("Kullanıcı bu işletmeye ait değil.");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role as never, company_id: companyId });
    return { ok: true };
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const companyId = await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("Kendi hesabınızı silemezsiniz.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("company_id")
      .eq("id", data.userId)
      .maybeSingle();
    if (target?.company_id !== companyId) throw new Error("Kullanıcı bu işletmeye ait değil.");
    await supabaseAdmin.auth.admin.deleteUser(data.userId);
    return { ok: true };
  });