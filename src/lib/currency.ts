export const CURRENCIES = [
  { code: "TRY", label: "₺ Türk Lirası (TL)", symbol: "₺" },
  { code: "USD", label: "$ Amerikan Doları (USD)", symbol: "$" },
  { code: "EUR", label: "€ Euro (EUR)", symbol: "€" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const isCurrency = (v: unknown): v is CurrencyCode =>
  CURRENCIES.some((c) => c.code === v);

export const normalizeCurrency = (v: unknown): CurrencyCode => (isCurrency(v) ? v : "TRY");

const cache = new Map<string, Intl.NumberFormat>();

/** Tutarı seçili para birimiyle Türkçe biçimde yazar. */
export function fmtMoney(amount: number, currency: string = "TRY") {
  const code = normalizeCurrency(currency);
  let f = cache.get(code);
  if (!f) {
    f = new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
    });
    cache.set(code, f);
  }
  return f.format(Number.isFinite(amount) ? amount : 0);
}

export const currencySymbol = (currency: string = "TRY") =>
  CURRENCIES.find((c) => c.code === normalizeCurrency(currency))?.symbol ?? "₺";
