import { Combobox } from "@/components/ui/combobox";

export type PickableProduct = {
  id: string;
  name: string;
  unit: string;
  sell: number;
  vat: number;
  barcode?: string;
};

/**
 * Stoktan akıllı arama ile ürün seçimi. Seçim yapıldığında ürünün adı,
 * birimi, birim fiyatı ve KDV oranı çağırana iletilir; ayrıca serbest
 * metinle hizmet kalemi yazılabilir.
 */
export function ProductPicker({
  products,
  value,
  onPick,
  onCreateNew,
  ariaLabel = "Ürün / hizmet",
  className,
}: {
  products: PickableProduct[];
  value: string;
  onPick: (p: PickableProduct) => void;
  onCreateNew?: (query: string) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const fmt = (n: number) =>
    n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div className={className}>
      <Combobox
        ariaLabel={`${ariaLabel} stok seçimi`}
        value={products.some((p) => p.name === value) ? value : ""}
        placeholder={value || "Stoktan ürün arayın…"}
        searchPlaceholder="Ürün adı veya barkod…"
        emptyText="Ürün bulunamadı."
        triggerClassName="h-9"
        footerAction={
          onCreateNew
            ? { label: "Stokta Olmayan Ürün Ekle", onSelect: (q) => onCreateNew(q) }
            : undefined
        }
        options={products.map((p) => ({
          value: p.name,
          label: p.name,
          keywords: `${p.barcode ?? ""} ${p.id}`,
          hint: `₺${fmt(p.sell)} · KDV %${p.vat} · ${p.unit}`,
        }))}
        onValueChange={(name) => {
          const p = products.find((x) => x.name === name);
          if (p) onPick(p);
        }}
      />
    </div>
  );
}
