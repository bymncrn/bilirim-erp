/** Şifre sıfırlama (recovery) linkiyle gelinip gelinmediğini anlar. */
export function hasRecoveryParams(): boolean {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const type = url.searchParams.get("type") ?? hash.get("type");
  return (
    type === "recovery" ||
    !!hash.get("access_token") ||
    !!url.searchParams.get("code") ||
    !!url.searchParams.get("token_hash")
  );
}
