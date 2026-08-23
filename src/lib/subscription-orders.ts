import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCompanyId } from "@/lib/session";

export type SubscriptionOrder = {
  id: string;
  company_id: string;
  company_name: string;
  module: string;
  plan: string;
  period: string;
  amount: number;
  sender_name: string;
  note: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

const TABLE = "subscription_orders";

export async function createSubscriptionOrder(input: {
  module: string;
  plan?: string;
  period?: string;
  amount: number;
  senderName: string;
  note?: string;
  companyName?: string;
}) {
  const companyId = await getCompanyId();
  if (!companyId) throw new Error("Şirket bilgisi bulunamadı.");
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from(TABLE).insert({
    company_id: companyId,
    company_name: input.companyName ?? "",
    created_by: auth.user?.id ?? null,
    module: input.module,
    plan: input.plan ?? "",
    period: input.period ?? "monthly",
    amount: input.amount,
    sender_name: input.senderName,
    note: input.note ?? "",
    status: "pending",
  } as never);
  if (error) throw error;
}

/** Bu şirketin onay bekleyen siparişi var mı? */
export function usePendingOrder() {
  const [order, setOrder] = useState<SubscriptionOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      const companyId = await getCompanyId();
      if (!companyId) {
        if (active) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from(TABLE)
        .select("*")
        .eq("company_id", companyId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1);
      if (!active) return;
      setOrder(((data ?? [])[0] as unknown as SubscriptionOrder) ?? null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return { order, pending: !!order, loading };
}

/** Süper admin: tüm bekleyen siparişler */
export function usePendingOrders() {
  const [rows, setRows] = useState<SubscriptionOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from(TABLE)
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as unknown as SubscriptionOrder[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { rows, loading, reload };
}

const DAY = 24 * 60 * 60 * 1000;

export async function approveSubscriptionOrder(order: SubscriptionOrder) {
  const days = order.period === "yearly" ? 365 : 30;
  const { data: company } = await supabase
    .from("companies")
    .select("subscription_ends_at")
    .eq("id", order.company_id)
    .maybeSingle();
  const currentRaw = (company as { subscription_ends_at?: string | null } | null)
    ?.subscription_ends_at;
  const base =
    currentRaw && new Date(currentRaw).getTime() > Date.now() ? new Date(currentRaw) : new Date();
  const ends = new Date(base.getTime() + days * DAY);

  const { error: cErr } = await supabase
    .from("companies")
    .update({ subscription_ends_at: ends.toISOString() })
    .eq("id", order.company_id);
  if (cErr) throw cErr;

  const { error } = await supabase
    .from(TABLE)
    .update({ status: "approved" } as never)
    .eq("id", order.id);
  if (error) throw error;
  return ends;
}

export async function rejectSubscriptionOrder(id: string) {
  const { error } = await supabase
    .from(TABLE)
    .update({ status: "rejected" } as never)
    .eq("id", id);
  if (error) throw error;
}
