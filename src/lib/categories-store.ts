import { createCollection } from "@/lib/supa-collection";

export type Category = {
  id: string;
  name: string;
  color?: string | undefined;
  icon?: string | undefined;
};

export const CATEGORY_COLORS = [
  { id: "apple", label: "Yeşil", className: "bg-pos-apple text-pos-apple-foreground" },
  { id: "tomato", label: "Kırmızı", className: "bg-pos-tomato text-pos-tomato-foreground" },
  { id: "cheese", label: "Sarı", className: "bg-pos-cheese text-pos-cheese-foreground" },
  { id: "cashew", label: "Kahve", className: "bg-pos-cashew text-pos-cashew-foreground" },
  { id: "sky", label: "Mavi", className: "bg-pos-sky text-pos-sky-foreground" },
] as const;

export const CATEGORY_ICONS = ["apple", "carrot", "nut", "milk", "beef", "package"] as const;

export function categoryColorClass(color?: string) {
  return (
    CATEGORY_COLORS.find((c) => c.id === color)?.className ??
    "bg-secondary text-secondary-foreground"
  );
}

const collection = createCollection<Category>({
  table: "product_categories",
  generatedId: true,
  order: { column: "name" },
  fromRow: (r) => ({
    id: String(r["id"]),
    name: String(r["name"] ?? ""),
    color: String(r["color"] ?? "apple"),
    icon: String(r["icon"] ?? ""),
  }),
  toRow: (c) => ({ id: c.id, name: c.name, color: c.color ?? "apple", icon: c.icon ?? "" }),
});

export function useCategories() {
  return collection.useItems();
}

/**
 * Ürün kaydındaki kategori değeri bazı kayıtlarda kategori adı, bazılarında
 * kategori id'si olarak tutuluyor. Bu hook her iki durumu da kategori adına çevirir.
 */
export function useCategoryResolver() {
  const cats = useCategories();
  return (value: string | null | undefined) => {
    const v = (value ?? "").trim();
    if (!v) return "";
    const byId = cats.find((c) => c.id === v);
    if (byId) return byId.name;
    const byName = cats.find(
      (c) => c.name.toLocaleLowerCase("tr") === v.toLocaleLowerCase("tr"),
    );
    return byName ? byName.name : v;
  };
}

export function addCategory(name: string, color?: string, icon?: string) {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (
    collection
      .peek()
      .some((c) => c.name.toLocaleLowerCase("tr") === trimmed.toLocaleLowerCase("tr"))
  )
    return false;
  void collection.insertRaw({ name: trimmed, color: color ?? "apple", icon: icon ?? "" });
  return true;
}

export function renameCategory(id: string, name: string) {
  return updateCategory(id, { name });
}

export function updateCategory(id: string, patch: Partial<Omit<Category, "id">>) {
  if (patch.name !== undefined && !patch.name.trim()) return false;
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row["name"] = patch.name.trim();
  if (patch.color !== undefined) row["color"] = patch.color;
  if (patch.icon !== undefined) row["icon"] = patch.icon;
  void collection.patch(id, row);
  return true;
}

export function removeCategory(id: string) {
  void collection.remove(id);
}
