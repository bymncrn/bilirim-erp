import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export type PdksStaffSession = {
  id: string;
  name: string;
  phone: string;
  role: string;
  branch: string;
};

export type StaffLoginResult =
  | { ok: true; staff: PdksStaffSession }
  | { ok: false; reason: "invalid" | "device" };

/** Telefon numarasini karsilastirmak icin sadece rakamlari birakir. */
const digits = (v: string) => v.replace(/\D/g, "").replace(/^0+/, "");

function clientIp(): string {
  const headers = getRequest().headers;
  const fwd = headers.get("x-forwarded-for") ?? "";
  return String(fwd.split(",")[0]?.trim() || headers.get("cf-connecting-ip") || "");
}

/** Personelin telefon + PIN ile mobil PDKS girisini dogrular ve cihazi eslestirir. */
export const staffLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { phone: string; pin: string; deviceId: string }) => ({
    phone: String(data?.phone ?? "").slice(0, 32),
    pin: String(data?.pin ?? "").slice(0, 16),
    deviceId: String(data?.deviceId ?? "").slice(0, 64),
  }))
  .handler(async ({ data }): Promise<StaffLoginResult> => {
    const phone = digits(data.phone);
    const pin = data.pin.trim();
    if (!phone || !pin || !data.deviceId) return { ok: false, reason: "invalid" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("pdks_staff")
      .select("id, name, phone, role, branch, pin, device_id");
    if (error) throw new Error("Giriş doğrulanamadı. Lütfen tekrar deneyin.");

    const match = (rows ?? []).find(
      (r) => digits(String(r.phone ?? "")) === phone && String(r.pin ?? "").trim() === pin,
    );
    if (!match) return { ok: false, reason: "invalid" };

    const bound = String((match as Record<string, unknown>)["device_id"] ?? "").trim();
    if (bound && bound !== data.deviceId) return { ok: false, reason: "device" };
    if (!bound) {
      await supabaseAdmin
        .from("pdks_staff")
        .update({ device_id: data.deviceId })
        .eq("id", match.id);
    }

    return {
      ok: true,
      staff: {
        id: String(match.id),
        name: String(match.name ?? ""),
        phone: String(match.phone ?? ""),
        role: String(match.role ?? ""),
        branch: String(match.branch ?? ""),
      },
    };
  });

export type PunchResult = { ok: true } | { ok: false; message: string };

const RATE_WINDOW_MS = 2 * 60 * 1000;

/** Personelin cihaz eslesmesi hala gecerli mi (yonetici sifirlarsa false). */
export const verifyStaffDevice = createServerFn({ method: "POST" })
  .inputValidator((data: { staffId: string; deviceId: string }) => ({
    staffId: String(data?.staffId ?? ""),
    deviceId: String(data?.deviceId ?? "").slice(0, 64),
  }))
  .handler(async ({ data }): Promise<{ valid: boolean }> => {
    if (!data.staffId || !data.deviceId) return { valid: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: staff, error } = await supabaseAdmin
      .from("pdks_staff")
      .select("id, device_id")
      .eq("id", data.staffId)
      .maybeSingle();
    if (error) return { valid: true };
    if (!staff) return { valid: false };
    const bound = String((staff as Record<string, unknown>)["device_id"] ?? "").trim();
    return { valid: bound === data.deviceId };
  });

/** Okutma kaydi: ayni IP uzerinden 2 dk icinde farkli personel okutmasini engeller. */
export const recordPunch = createServerFn({ method: "POST" })
  .inputValidator((data: { staffId: string; deviceId: string; method: string }) => ({
    staffId: String(data?.staffId ?? ""),
    deviceId: String(data?.deviceId ?? "").slice(0, 64),
    method: String(data?.method ?? "QR").slice(0, 24),
  }))
  .handler(async ({ data }): Promise<PunchResult> => {
    if (!data.staffId) return { ok: false, message: "Personel bulunamadı." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: staff } = await supabaseAdmin
      .from("pdks_staff")
      .select("id, company_id, device_id")
      .eq("id", data.staffId)
      .maybeSingle();
    if (!staff) return { ok: false, message: "Personel bulunamadı." };

    const bound = String((staff as Record<string, unknown>)["device_id"] ?? "").trim();
    if (bound && data.deviceId && bound !== data.deviceId) {
      return { ok: false, message: "Güvenlik İhlali: Bu hesap başka bir cihaza kayıtlı." };
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data: leaves } = await supabaseAdmin
      .from("pdks_leaves")
      .select("id")
      .eq("staff_id", data.staffId)
      .lte("start_date", today)
      .gte("end_date", today)
      .limit(1);
    if ((leaves ?? []).length > 0) {
      return { ok: false, message: "İzinli olduğunuz günlerde mesai başlatılamaz." };
    }

    const ip = clientIp();
    if (ip) {
      const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
      const { data: recent } = await supabaseAdmin
        .from("pdks_punch_log")
        .select("staff_id, created_at")
        .eq("ip", ip)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20);
      const other = (recent ?? []).some((r) => String(r.staff_id) !== data.staffId);
      if (other) {
        return {
          ok: false,
          message: "Aynı bağlantı üzerinden peş peşe farklı okutma yapılamaz.",
        };
      }
    }

    await supabaseAdmin.from("pdks_punch_log").insert({
      company_id: String((staff as Record<string, unknown>)["company_id"] ?? ""),
      staff_id: data.staffId,
      ip,
      method: data.method,
    });

    return { ok: true };
  });

export type StaffLeaveInfo = {
  onLeave: boolean;
  startDate?: string;
  endDate?: string;
  kind?: string;
};

/** Personelin bugun gecerli bir izni var mi, tarih araligi ile birlikte doner. */
export const getStaffLeave = createServerFn({ method: "POST" })
  .inputValidator((data: { staffId: string }) => ({ staffId: String(data?.staffId ?? "") }))
  .handler(async ({ data }): Promise<StaffLeaveInfo> => {
    if (!data.staffId) return { onLeave: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const today = new Date().toISOString().slice(0, 10);
    const { data: rows } = await supabaseAdmin
      .from("pdks_leaves")
      .select("start_date, end_date, kind")
      .eq("staff_id", data.staffId)
      .lte("start_date", today)
      .gte("end_date", today)
      .order("end_date", { ascending: false })
      .limit(1);
    const row = (rows ?? [])[0];
    if (!row) return { onLeave: false };
    return {
      onLeave: true,
      startDate: String(row.start_date),
      endDate: String(row.end_date),
      kind: String(row.kind ?? ""),
    };
  });
