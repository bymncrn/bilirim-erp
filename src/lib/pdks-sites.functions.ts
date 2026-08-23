import { createServerFn } from "@tanstack/react-start";

export type PdksSiteInfo = { id: string; name: string; coords: string; radius: number };

/** Personelin bagli oldugu sirketin tanimli santiye/konum listesini dondurur. */
export const getStaffSites = createServerFn({ method: "POST" })
  .inputValidator((data: { staffId: string }) => ({ staffId: String(data?.staffId ?? "") }))
  .handler(async ({ data }): Promise<PdksSiteInfo[]> => {
    if (!data.staffId) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: staff } = await supabaseAdmin
      .from("pdks_staff")
      .select("company_id")
      .eq("id", data.staffId)
      .maybeSingle();
    if (!staff) return [];
    const { data: rows } = await supabaseAdmin
      .from("pdks_sites")
      .select("id, name, coords, radius")
      .eq("company_id", String((staff as Record<string, unknown>)["company_id"] ?? ""));
    return (rows ?? []).map((r) => ({
      id: String(r.id),
      name: String(r.name ?? ""),
      coords: String(r.coords ?? ""),
      radius: Number(r.radius ?? 50),
    }));
  });
