import { useEffect } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { clearUser } from "@/lib/auth-store";
import { resetCompanyId } from "@/lib/session";

/** 30 dakika hareketsizlik sonrası oturumu kapatır. */
const IDLE_MS = 30 * 60 * 1000;
const EVENTS = ["mousedown", "keydown", "touchstart", "wheel", "scroll", "visibilitychange"];

export function useIdleLogout(idleMs: number = IDLE_MS) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let done = false;

    const logout = async () => {
      if (done) return;
      done = true;
      try {
        await supabase.auth.signOut();
      } catch {
        /* yoksay */
      }
      clearUser();
      resetCompanyId();
      toast.error("Güvenlik nedeniyle oturumunuz 30 dakika işlem yapılmadığı için kapatıldı.");
      window.location.href = "/";
    };

    const arm = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void logout(), idleMs);
    };

    const onActivity = () => {
      if (document.visibilityState === "hidden") return;
      arm();
    };

    arm();
    EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => {
      if (timer) clearTimeout(timer);
      EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, [idleMs]);
}
