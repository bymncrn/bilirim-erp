/** Supabase kimlik doğrulama hatalarını Türkçeleştirir. */
const MAP: { match: RegExp; message: string }[] = [
  { match: /invalid login credentials/i, message: "E-posta veya şifre hatalı." },
  { match: /email not confirmed/i, message: "E-posta adresiniz henüz doğrulanmamış." },
  { match: /user already registered|already been registered/i, message: "Bu e-posta adresi zaten kayıtlı." },
  { match: /password should be at least/i, message: "Şifre en az 6 karakter olmalıdır." },
  { match: /unable to validate email|invalid email/i, message: "Geçerli bir e-posta adresi girin." },
  { match: /email rate limit|too many requests|rate limit/i, message: "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin." },
  { match: /network|failed to fetch/i, message: "Bağlantı hatası. İnternet bağlantınızı kontrol edin." },
  { match: /signups not allowed|signup is disabled/i, message: "Yeni kayıtlar şu anda kapalı." },
  { match: /token has expired|invalid token/i, message: "Bağlantının süresi dolmuş. Lütfen yeniden deneyin." },
];

export function trMessage(message?: string | null): string {
  if (!message) return "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.";
  const hit = MAP.find((m) => m.match.test(message));
  return hit ? hit.message : "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}
