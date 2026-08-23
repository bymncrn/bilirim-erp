import { createCollection } from "@/lib/supa-collection";
import { useCategories } from "@/lib/categories-store";
import { supabase } from "@/integrations/supabase/client";
import { getCompanyId } from "@/lib/session";

export type CatalogProduct = {
  id: string;
  name: string;
  category: string;
  unit: string;
  /** Ürün barkodu (opsiyonel) */
  barcode?: string;
  /** Satış fiyatı. 0 ise sadece depo/hammadde kaydıdır, satış ekranlarında görünmez. */
  price: number;
  cost: number;
  stock: number;
  critical: number;
  color: "apple" | "tomato" | "cashew" | "cheese";
  /** Storage yolları (product-images bucket) */
  images: string[];
};

const collection = createCollection<CatalogProduct>({
  table: "products",
  order: { column: "name" },
  fromRow: (r) => ({
    id: String(r["id"]),
    name: String(r["name"] ?? ""),
    category: String(r["category"] ?? "Genel"),
    unit: String(r["unit"] ?? "adet"),
    barcode: String(r["barcode"] ?? ""),
    price: Number(r["price"] ?? 0),
    cost: Number(r["cost"] ?? 0),
    stock: Number(r["stock"] ?? 0),
    critical: Number(r["critical_stock"] ?? 0),
    color: String(r["color"] ?? "apple") as CatalogProduct["color"],
    images: Array.isArray(r["images"]) ? (r["images"] as string[]) : [],
  }),
  toRow: (p) => ({
    id: p.id,
    name: p.name,
    sku: p.barcode ?? "",
    barcode: p.barcode ?? "",
    category: p.category,
    unit: p.unit,
    price: p.price,
    cost: p.cost,
    vat: 20,
    stock: p.stock,
    critical_stock: p.critical,
    color: p.color,
    description: "",
    images: p.images ?? [],
  }),
});

export function useCatalog() {
  return collection.useItems();
}

/** Satılabilir ürünler (fiyatı tanımlı olanlar) */
export function useSellableCatalog() {
  return useCatalog().filter((p) => p.price > 0);
}

/**
 * POS kategorileri: yalnızca kullanıcının veritabanına eklediği gerçek
 * kategoriler (product_categories) listelenir; ürünlerdeki serbest/varsayılan
 * metinler gösterilmez.
 */
export function useCatalogCategories() {
  const defined = useCategories();
  return defined.map((c) => c.name);
}

export function upsertProduct(product: CatalogProduct) {
  void collection.upsert(product);
}

export function removeProduct(id: string) {
  void collection.remove(id);
}

export function newProductId() {
  return `new-${Date.now().toString(36)}`;
}

/** Satış sonrası stok düşümü */
export function decreaseStock(lines: { id: string; quantity: number }[]) {
  const current = collection.peek();
  void Promise.all(
    lines.map((line) => {
      const product = current.find((p) => p.id === line.id);
      if (!product) return Promise.resolve();
      const stock = Number(Math.max(0, product.stock - line.quantity).toFixed(3));
      return collection.patch(product.id, { stock });
    }),
  );
}

export const catalogMoney = (n: number) =>
  `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Excel/CSV'den okunan satırları doğrudan Supabase'e yazar. */
export async function bulkImportProducts(
  rows: {
    name: string;
    barcode?: string;
    category?: string;
    unit?: string;
    cost?: number;
    price?: number;
    vat?: number;
    stock?: number;
  }[],
) {
  const companyId = await getCompanyId();
  if (!companyId) throw new Error("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
  const clean = rows.filter((r) => r.name && r.name.trim());
  if (!clean.length) return 0;
  const payload = clean.map((r, i) => ({
    id: `imp-${Date.now().toString(36)}-${i}`,
    company_id: companyId,
    name: r.name.trim(),
    sku: r.barcode ?? "",
    barcode: r.barcode ?? "",
    category: r.category?.trim() || "Genel",
    unit: r.unit?.trim() || "adet",
    price: Number(r.price ?? 0) || 0,
    cost: Number(r.cost ?? 0) || 0,
    vat: Number(r.vat ?? 20) || 0,
    stock: Number(r.stock ?? 0) || 0,
    critical_stock: 5,
    color: "apple",
    description: "",
    images: [] as string[],
  }));
  const { error } = await supabase.from("products").insert(payload as never);
  if (error) throw error;
  await collection.syncAll();
  return payload.length;
}

/** Ürün fotoğrafı yükler, storage yolunu ürüne ekler. */
export async function uploadProductImage(
  product: { id: string; images?: string[] },
  file: File,
) {
  const companyId = await getCompanyId();
  if (!companyId) throw new Error("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${companyId}/${product.id}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file);
  if (error) throw error;
  const next = [...(product.images ?? []), path];
  await collection.patch(product.id, { images: next });
  return next;
}

/** Ürün fotoğrafını hem depodan hem üründen siler. */
export async function removeProductImage(
  product: { id: string; images?: string[] },
  path: string,
) {
  await supabase.storage.from("product-images").remove([path]);
  const next = (product.images ?? []).filter((p) => p !== path);
  await collection.patch(product.id, { images: next });
  return next;
}

/** Storage yollarını görüntülenebilir imzalı adreslere çevirir. */
export async function signedProductImageUrls(paths: string[]) {
  if (!paths.length) return [];
  const { data } = await supabase.storage.from("product-images").createSignedUrls(paths, 3600);
  return (data ?? []).map((d, i) => ({ path: paths[i] as string, url: d.signedUrl ?? "" }));
}
