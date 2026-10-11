import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({ companyId: z.string().min(1).max(100) });

async function assertSuperAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("is_super_admin", { _user_id: context.userId });
  if (!data) throw new Error("Yetkisiz işlem");
}

/** Ends the company's subscription and trial immediately (company stays, modules lock). */
export const cancelCompanySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => input.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("companies")
      .update({ subscription_ends_at: now, trial_ends_at: now })
      .eq("id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Permanently deletes a company, all its data and its user accounts. */
export const deleteCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => input.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const id = data.companyId;

    const { data: profiles } = await db.from("profiles").select("id").eq("company_id", id);
    const userIds: string[] = (profiles ?? []).map((p: { id: string }) => p.id);
    if (userIds.includes(context.userId)) throw new Error("Kendi şirketinizi silemezsiniz.");

    const { data: invs } = await db.from("invoices").select("id").eq("company_id", id);
    const invIds = (invs ?? []).map((i: { id: string }) => i.id);
    if (invIds.length) await db.from("invoice_lines").delete().in("invoice_id", invIds);

    const tables = [
      "table_order_items", "dining_tables", "payments", "account_txns", "service_tickets",
      "instruments", "quotes", "invoices", "stock_movements", "products", "product_categories",
      "cariler", "financial_accounts", "cash_entries", "dayend_reports", "e_documents",
      "employees", "expenses", "counters", "pdks_overtime_approvals", "pdks_leaves",
      "pdks_punch_log", "pdks_staff", "pdks_shifts", "pdks_sites", "pdks_holidays",
      "staff_members", "subscription_orders", "user_permissions", "audit_logs", "users",
      "user_roles", "profiles",
    ];
    for (const t of tables) {
      const { error } = await db.from(t).delete().eq("company_id", id);
      if (error) throw new Error(`${t}: ${error.message}`);
    }
    if (userIds.length) await db.from("user_roles").delete().in("user_id", userIds);
    for (const uid of userIds) await supabaseAdmin.auth.admin.deleteUser(uid);

    const { error } = await db.from("companies").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Super-admin update of subscription end date and/or e-document credits. */
export const updateCompanyByAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().min(1).max(100),
        subscriptionEndsAt: z.string().datetime().optional(),
        edocCredits: z.number().int().min(0).max(10_000_000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = {};
    if (data.subscriptionEndsAt) patch["subscription_ends_at"] = data.subscriptionEndsAt;
    if (data.edocCredits !== undefined) patch["edoc_credits"] = data.edocCredits;
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("companies")
      .update(patch)
      .eq("id", data.companyId)
      .select("id");
    if (error) throw new Error(error.message);
    if (!rows?.length) throw new Error("Şirket bulunamadı.");
    return { ok: true };
  });
