import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PickableProduct } from "@/components/products/ProductPicker";
import { productsCollection } from "@/lib/accounting-store";

/**
 * Fatura / teklif ekranından ayrılmadan stokta olmayan bir ürünü
 * hızlıca oluşturur ve oluşturulan ürünü çağırana geri verir.
 */
export function QuickProductDialog({
  open,
  initialName = "",
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  initialName?: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (product: PickableProduct) => void;
}) {
  const [name, setName] = useState(initialName);
  const [unit, setUnit] = useState("adet");
  const [price, setPrice] = useState("");
  const [vat, setVat] = useState("20");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setUnit("adet");
      setPrice("");
      setVat("20");
    }
  }, [open, initialName]);

  const num = (v: string) => Number(String(v).replace(",", ".")) || 0;

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Ürün adı zorunludur.");
      return;
    }
    setSaving(true);
    try {
      const product = {
        id: `p-${Date.now().toString(36)}`,
        name: name.trim(),
        barcode: "",
        categoryId: "",
        stock: 0,
        unit: unit.trim() || "adet",
        buy: 0,
        sell: num(price),
        vat: num(vat),
        images: [] as string[],
      };
      await productsCollection.upsert(product);
      onCreated({
        id: product.id,
        name: product.name,
        unit: product.unit,
        sell: product.sell,
        vat: product.vat,
        barcode: "",
      });
      toast.success("Ürün eklendi ve kaleme işlendi.");
      onOpenChange(false);
    } catch {
      toast.error("Ürün kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Stokta Olmayan Ürün Ekle</DialogTitle>
          <DialogDescription>
            Ürün stoğa kaydedilir ve seçili kaleme otomatik olarak eklenir.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="qp-name">Ürün / Hizmet Adı</Label>
            <Input id="qp-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="qp-unit">Birim</Label>
              <Input id="qp-unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="qp-price">Birim Fiyat</Label>
              <Input
                id="qp-price"
                inputMode="decimal"
                placeholder="0,00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="qp-vat">KDV (%)</Label>
              <Input
                id="qp-vat"
                inputMode="decimal"
                value={vat}
                onChange={(e) => setVat(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button disabled={saving} onClick={() => void handleSave()}>
            Kaydet ve Ekle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
