export type OrderLine = { id: string; name: string; price: number; qty: number };

export const money = (n: number) =>
  `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
