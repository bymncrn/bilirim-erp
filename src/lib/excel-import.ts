/** Excel/CSV dosyalarını satır nesnelerine çevirir. */
export async function readSheetRows(file: File): Promise<Record<string, unknown>[]> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
}

/** Başlık adı yaklaşık eşleşmesiyle hücre değerini okur. */
export function pickCell(row: Record<string, unknown>, candidates: string[]) {
  for (const key of Object.keys(row)) {
    const norm = key.toLocaleLowerCase("tr").trim();
    if (candidates.some((c) => norm.includes(c))) return String(row[key] ?? "").trim();
  }
  return "";
}

export const toNumber = (v: string) => Number(String(v).replace(/\./g, "").replace(",", ".")) || 0;
