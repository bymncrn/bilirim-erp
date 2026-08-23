import { createServerFn } from "@tanstack/react-start";

export type PublicServiceLine = { name: string; qty: number; price: number };

export type PublicServiceStatus = {
  number: string;
  device: string;
  deviceType: string;
  status: string;
  customerMasked: string;
  createdAt: string;
  total: number | null;
  companyName: string;
  lines: PublicServiceLine[];
};

/** Müşteri adını gizlilik kuralına göre maskeler: "Bünyamin Ceran" -> "Bün**** Cer**" */
function maskName(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => (w.length <= 3 ? `${w[0]}${"*".repeat(Math.max(w.length - 1, 2))}` : `${w.slice(0, 3)}${"*".repeat(w.length - 3)}`))
      .join(" ") || "—"
  );
}

/** Fiş numarasıyla halka açık, maskelenmiş servis durumu sorgular. */
export const lookupServiceStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { number: string }) => ({
    number: String(data?.number ?? "").trim().slice(0, 40),
  }))
  .handler(async ({ data }): Promise<{ ok: true; ticket: PublicServiceStatus } | { ok: false }> => {
    if (data.number.length < 3) return { ok: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin
      .from("service_tickets")
      .select(
        "number, device_type, device_brand, device_model, status, estimated_cost, created_at, lines, cariler(name), companies(name)",
      )
      .ilike("number", data.number)
      .limit(1);

    if (error) {
      console.error("[servis-durumu] sorgu hatası", error);
      return { ok: false };
    }
    const row = rows?.[0] as
      | {
          number: string;
          device_type: string | null;
          device_brand: string | null;
          device_model: string | null;
          status: string | null;
          estimated_cost: number | null;
          created_at: string | null;
          lines: unknown;
          cariler: { name?: string } | null;
          companies: { name?: string } | null;
        }
      | undefined;
    if (!row) return { ok: false };

    const status = String(row.status ?? "Beklemede");
    const rawLines = Array.isArray(row.lines) ? (row.lines as PublicServiceLine[]) : [];
    const lines = rawLines.map((l) => ({
      name: String(l?.name ?? ""),
      qty: Number(l?.qty ?? 0),
      price: Number(l?.price ?? 0),
    }));
    const linesTotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
    const showTotal = status === "Tamamlandı" || status === "Faturalandırıldı";

    return {
      ok: true,
      ticket: {
        number: row.number,
        device:
          [row.device_brand, row.device_model].filter(Boolean).join(" ") || row.device_type || "—",
        deviceType: row.device_type ?? "",
        status,
        customerMasked: maskName(row.cariler?.name ?? ""),
        createdAt: row.created_at ?? "",
        total: showTotal ? (linesTotal > 0 ? linesTotal : Number(row.estimated_cost ?? 0)) : null,
        companyName: row.companies?.name ?? "",
        lines: showTotal ? lines : [],
      },
    };
  });
