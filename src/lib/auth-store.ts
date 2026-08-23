export type AuthUser = {
  fullName: string;
  company: string;
  email: string;
  phone?: string;
  sector?: string;
};

const KEY = "bilirim.auth.user";

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setUser(user: AuthUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("bilirim-auth-change"));
}

export function clearUser() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("bilirim-auth-change"));
}
