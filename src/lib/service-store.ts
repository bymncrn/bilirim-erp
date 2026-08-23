import { createCollection } from "@/lib/supa-collection";
import { supabase } from "@/integrations/supabase/client";
import { getCompanyId } from "@/lib/session";

export type ServiceLine = {
  id: string;
  name: string;
  qty: number;
  price: number;
};

export type ServiceTicket = {
  id: string;
  number: string;
  cariId: string | null;
  customer: string;
  phone: string;
  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  serialNo: string;
  problem: string;
  estimatedCost: number;
  status: string;
  technician: string;
  note: string;
  createdAt: string;
  lines: ServiceLine[];
};

export const serviceCollection = createCollection<ServiceTicket>({
  table: "service_tickets",
  select: "*, cariler(name, phone)",
  order: { column: "created_at", ascending: false },
  fromRow: (r) => ({
    id: String(r["id"]),
    number: String(r["number"] ?? ""),
    cariId: (r["cari_id"] as string | null) ?? null,
    customer: String((r["cariler"] as { name?: string } | null)?.name ?? ""),
    phone: String((r["cariler"] as { phone?: string } | null)?.phone ?? ""),
    deviceType: String(r["device_type"] ?? ""),
    deviceBrand: String(r["device_brand"] ?? ""),
    deviceModel: String(r["device_model"] ?? ""),
    serialNo: String(r["serial_no"] ?? ""),
    problem: String(r["problem"] ?? ""),
    estimatedCost: Number(r["estimated_cost"] ?? 0),
    status: String(r["status"] ?? "Bekliyor"),
    technician: String(r["technician"] ?? ""),
    note: String(r["note"] ?? ""),
    createdAt: String(r["created_at"] ?? ""),
    lines: Array.isArray(r["lines"])
      ? (r["lines"] as ServiceLine[]).map((l, i) => ({
          id: String(l?.id ?? `l${i}`),
          name: String(l?.name ?? ""),
          qty: Number(l?.qty ?? 0),
          price: Number(l?.price ?? 0),
        }))
      : [],
  }),
  toRow: (t) => ({
    id: t.id,
    number: t.number,
    cari_id: t.cariId,
    device_type: t.deviceType,
    device_brand: t.deviceBrand,
    device_model: t.deviceModel,
    serial_no: t.serialNo,
    problem: t.problem,
    accessories: "",
    estimated_cost: t.estimatedCost,
    status: t.status,
    technician: t.technician,
    note: t.note,
    lines: t.lines ?? [],
  }),
});

export function useServiceTickets() {
  return serviceCollection.useItems();
}

export type NewServiceTicket = {
  customer: string;
  phone: string;
  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  serialNo: string;
  problem: string;
  estimatedCost: number;
  technician: string;
  note: string;
};

/** Müşteriyi cari listesinde bulur, yoksa oluşturur. */
async function ensureCari(companyId: string, name: string, phone: string) {
  const { data: found } = await supabase
    .from("cariler")
    .select("id")
    .eq("company_id", companyId)
    .eq("name", name)
    .maybeSingle();
  if (found?.id) return found.id as string;

  const { data: created, error } = await supabase
    .from("cariler")
    .insert({
      company_id: companyId,
      name,
      type: "Müşteri",
      phone,
      email: "",
      address: "",
      note: "",
      tax_no: "",
      tax_office: "",
      balance: 0,
      opening_balance: 0,
    } as never)
    .select("id")
    .single();
  if (error) throw error;
  return (created as { id: string }).id;
}

/** Yeni servis kaydı oluşturur (doğrudan Supabase'e yazar). */
export async function createServiceTicket(input: NewServiceTicket) {
  const companyId = await getCompanyId();
  if (!companyId) throw new Error("Oturum bulunamadı. Lütfen tekrar giriş yapın.");

  const cariId = await ensureCari(companyId, input.customer.trim(), input.phone.trim());
  const number = `SRV-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-5)}`;

  const { error } = await supabase.from("service_tickets").insert({
    company_id: companyId,
    number,
    cari_id: cariId,
    device_type: input.deviceType,
    device_brand: input.deviceBrand,
    device_model: input.deviceModel,
    serial_no: input.serialNo,
    problem: input.problem,
    accessories: "",
    estimated_cost: input.estimatedCost,
    status: "Beklemede",
    technician: input.technician,
    note: input.note,
  } as never);
  if (error) throw error;

  await serviceCollection.syncAll();
  return number;
}
