import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCompanyId } from "@/lib/session";

export type Company = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  tax_no: string;
  tax_office: string;
  plan: string;
  modules: string[];
  onboarding_module: string | null;
  pdks_plan: string;
  einvoice_username: string;
  einvoice_password: string;
  einvoice_alias: string;
  edoc_credits: number;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_from: string;
  smtp_tls: boolean;
  notifications_enabled: boolean;
  notification_emails: string[];
  notify_invoice: boolean;
  notify_payment: boolean;
  notify_service_new: boolean;
  notify_service_update: boolean;
};

let company: Company | null = null;
let loaded = false;
let loading = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function load() {
  if (loading) return;
  loading = true;
  try {
    const id = await getCompanyId();
    if (!id) {
      company = null;
      loaded = true;
      emit();
      return;
    }
    const { data, error } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    company = (data as unknown as Company) ?? null;
    loaded = true;
    emit();
  } catch (e) {
    console.error("[companies] yüklenemedi", e);
    loaded = true;
    emit();
  } finally {
    loading = false;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!loaded) void load();
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => company;
const getServerSnapshot = () => null;

export function useCompany() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export async function updateCompany(patch: Partial<Company>) {
  const id = await getCompanyId();
  if (!id) return;
  const { error } = await supabase
    .from("companies")
    .update(patch as never)
    .eq("id", id);
  if (error) {
    console.error("[companies] güncellenemedi", error);
    return;
  }
  loaded = false;
  await load();
}

export function reloadCompany() {
  loaded = false;
  void load();
}

/**
 * Şirket logosunu görüntülenebilir bir adrese çevirir.
 * Logo yüklenmemişse boş string döner (kırık resim gösterilmez).
 */
export async function getCompanyLogoUrl(): Promise<string> {
  const path = (company as { logo_url?: string | null } | null)?.logo_url ?? null;
  if (!path) return "";
  if (/^(https?:|data:)/.test(path)) return path;
  const { data } = await supabase.storage.from("company-logos").createSignedUrl(path, 3600);
  return data?.signedUrl ?? "";
}
