import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getCompanyId, resetCompanyId } from "@/lib/session";

export type Profile = { id: string; company_id: string; full_name: string; email: string };

type AuthState = { session: Session | null; profile: Profile | null; loading: boolean };

let state: AuthState = { session: null, profile: null, loading: true };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
let started = false;

async function loadProfile(userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("id, company_id, full_name, email")
    .eq("id", userId)
    .maybeSingle();
  state = { ...state, profile: (data as Profile | null) ?? null, loading: false };
  emit();
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  supabase.auth.onAuthStateChange((_event, session) => {
    resetCompanyId();
    state = { session, profile: session ? state.profile : null, loading: !!session };
    emit();
    if (session) void loadProfile(session.user.id);
  });
  void supabase.auth.getSession().then(({ data }) => {
    state = { ...state, session: data.session, loading: !!data.session };
    emit();
    if (data.session) void loadProfile(data.session.user.id);
    else {
      state = { ...state, loading: false };
      emit();
    }
  });
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;
const serverState: AuthState = { session: null, profile: null, loading: true };
const getServerSnapshot = () => serverState;

export function useAuth() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export async function signOut() {
  await supabase.auth.signOut();
  resetCompanyId();
}

export { getCompanyId };
