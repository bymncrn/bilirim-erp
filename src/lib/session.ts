import { supabase } from "@/integrations/supabase/client";

let companyIdPromise: Promise<string | null> | null = null;

/** Oturum açan kullanıcının bağlı olduğu işletme kimliği (önbellekli). */
export function getCompanyId(): Promise<string | null> {
  if (!companyIdPromise) {
    companyIdPromise = (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", auth.user.id)
        .maybeSingle();
      return data?.company_id ?? null;
    })();
  }
  return companyIdPromise;
}

export function resetCompanyId() {
  companyIdPromise = null;
}
