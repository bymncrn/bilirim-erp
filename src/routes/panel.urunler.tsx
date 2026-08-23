import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, Search, FileSpreadsheet, ImagePlus, X, Download } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PanelShell } from "@/components/panel/PanelShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePermissions } from "@/lib/permissions";
import { money } from "@/lib/format";
import { useCategories, useCategoryResolver } from "@/lib/categories-store";
import {
  useCatalog,
  upsertProduct,
  removeProduct,
  newProductId,
  bulkImportProducts,
  uploadProductImage,
  removeProductImage,
  signedProductImageUrls,
  type CatalogProduct,
} from "@/lib/catalog-store";

export const Route = createFileRoute("/panel/urunler")({
  head: () => ({
    meta: [
      { title: "Ürünler & Stok — Bilirim Restoran POS" },
      {
        name: "description",
        content: "Menü ürünleri ve depo stoklarını yönetin, kritik seviyeleri anında görün.",
      },
      { property: "og:title", content: "Ürünler & Stok — Bilirim Restoran POS" },
      {
        property: "og:description",
        content: "Menü ürünleri ve depo stoklarını yönetin, kritik seviyeleri anında görün.",
      },
    ],
  }),
  component: ProductsPage,
});

const num = (v: string) => Number(String(v).replace(",", ".")) || 0;

function ProductsPage() {
  const { can: canPerm } = usePermissions();
  const rows = useCatalog();
  const categories = useCategories();
  const catName = useCategoryResolver();
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [editing, setEditing] = useState<CatalogProduct | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const canView = canPerm("urunler");

  const filtered = useMemo(() => {
    const term = q.trim().toLocaleLowerCase("tr");
    return rows.filter((r) => {
      const cat = catName(r.category);
      const catOk = !activeCat || cat === activeCat;
      const qOk =
        !term ||
        `${r.name} ${cat} ${r.barcode ?? ""}`.toLocaleLowerCase("tr").includes(term);
      return catOk && qOk;
    });
  }, [rows, q, activeCat, catName]);

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw new Error("empty");
      const sheet = wb.Sheets[sheetName];
      if (!sheet) throw new Error("empty");
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const pick = (r: Record<string, unknown>, keys: string[]) => {
        for (const k of Object.keys(r)) {
          const norm = k.toLocaleLowerCase("tr").trim();
          if (keys.some((c) => norm.includes(c))) return String(r[k] ?? "").trim();
        }
        return "";
      };
      const parsed = json.map((r) => ({
        name: pick(r, ["ürün", "urun", "ad", "name"]),
        barcode: pick(r, ["barkod", "stok kodu", "sku", "barcode"]),
        category: pick(r, ["kategori", "category"]),
        unit: pick(r, ["birim", "unit"]),
        cost: num(pick(r, ["alış", "alis", "maliyet", "cost"])),
        price: num(pick(r, ["satış", "satis", "fiyat", "price"])),
        vat: num(pick(r, ["kdv", "vat"])) || 20,
        stock: num(pick(r, ["stok", "miktar", "stock"])),
      }));
      const count = await bulkImportProducts(parsed);
      if (!count) {
        toast.error("Dosyada geçerli ürün satırı bulunamadı.");
        return;
      }
      toast.success(`${count} ürün Supabase'e aktarıldı.`);
    } catch (e) {
      console.error(e);
      toast.error("Excel dosyası aktarılamadı. Lütfen şablona uygun bir dosya seçin.");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const downloadTemplate = () => {
    const csv = [
      ["Ürün Adı", "Barkod", "Kategori", "Birim", "Alış", "Satış", "KDV", "Stok"],
      ["Örnek Ürün", "8690000000000", "Genel", "adet", "10", "15", "20", "25"],
    ]
      .map((r) => r.join(";"))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "urun-sablon.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!canView) {
    return (
      <PanelShell title="Ürünler & Stok">
        <p className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Bu modülü görüntüleme yetkiniz bulunmuyor.
        </p>
      </PanelShell>
    );
  }

  return (
    <PanelShell
      title="Ürünler & Stok"
      description={`${rows.length} kayıt`}
      actions={
        canPerm("urunler") ? (
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleImport(f);
              }}
            />
            <Button size="sm" variant="outline" onClick={downloadTemplate}>
              <Download className="mr-1.5 h-4 w-4" />
              Şablon
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="border border-primary/40"
              disabled={importing}
              onClick={() => fileRef.current?.click()}
            >
              <FileSpreadsheet className="mr-1.5 h-4 w-4" />
              {importing ? "Aktarılıyor…" : "Excel'den Aktar"}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const created: CatalogProduct = {
                  id: newProductId(),
                  name: "Yeni Ürün",
                  category: categories[0]?.name ?? "Genel",
                  unit: "adet",
                  barcode: "",
                  stock: 0,
                  critical: 5,
                  cost: 0,
                  price: 0,
                  color: "apple",
                  images: [],
                };
                upsertProduct(created);
                setEditing(created);
                toast.success("Yeni ürün eklendi. Detayları düzenleyebilirsiniz.");
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Yeni Ürün
            </Button>
          </div>
        ) : null
      }
    >
      <ProductDetailDialog
        product={editing ? (rows.find((r) => r.id === editing.id) ?? editing) : null}
        onClose={() => setEditing(null)}
      />

      <div className="mx-auto max-w-6xl space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ürün adı, barkod veya kategori ile ara..."
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCat(null)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              !activeCat
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            Tümü
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCat((prev) => (prev === c.name ? null : c.name))}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                activeCat === c.name
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="pos-shadow overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Ürün</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Stok</th>
                <th className="px-4 py-3">Maliyet</th>
                <th className="px-4 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                  onClick={() => setEditing(r)}
                >
                  <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{catName(r.category)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        r.stock <= r.critical
                          ? "bg-destructive/15 text-destructive"
                          : "bg-pos-apple text-pos-apple-foreground"
                      }`}
                    >
                      {r.stock} {r.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{money(r.cost)}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {canPerm("urunler") ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => {
                          removeProduct(r.id);
                          toast.success("Ürün silindi.");
                        }}
                        aria-label="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PanelShell>
  );
}

/* ---------------- Ürün detay / düzenleme ---------------- */

function ProductDetailDialog({
  product,
  onClose,
}: {
  product: CatalogProduct | null;
  onClose: () => void;
}) {
  const categories = useCategories();
  const resolveCat = useCategoryResolver();
  const [form, setForm] = useState({
    name: "",
    barcode: "",
    category: "",
    unit: "adet",
    stock: "0",
    critical: "5",
    cost: "0",
    price: "0",
  });
  const [gallery, setGallery] = useState<{ path: string; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!product) return;
    setForm({
      name: product.name,
      barcode: product.barcode ?? "",
      category: resolveCat(product.category),
      unit: product.unit,
      stock: String(product.stock),
      critical: String(product.critical),
      cost: String(product.cost),
      price: String(product.price),
    });
  }, [product?.id]);

  useEffect(() => {
    let active = true;
    const paths = product?.images ?? [];
    if (!paths.length) {
      setGallery([]);
      return;
    }
    void signedProductImageUrls(paths).then((list) => {
      if (active) setGallery(list);
    });
    return () => {
      active = false;
    };
  }, [product?.id, (product?.images ?? []).join("|")]);

  if (!product) return null;

  const save = () => {
    if (!form.name.trim()) {
      toast.error("Ürün adı zorunludur.");
      return;
    }
    upsertProduct({
      ...product,
      name: form.name.trim(),
      barcode: form.barcode.trim(),
      category: form.category.trim() || "Genel",
      unit: form.unit.trim() || "adet",
      stock: num(form.stock),
      critical: num(form.critical),
      cost: num(form.cost),
      price: num(form.price),
    });
    toast.success("Ürün güncellendi. POS ve Adisyon ekranlarına anında yansır.");
    onClose();
  };

  const addImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Lütfen bir görsel dosyası seçin.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Görsel boyutu en fazla 5 MB olabilir.");
      return;
    }
    setBusy(true);
    try {
      await uploadProductImage(product, file);
      toast.success("Fotoğraf yüklendi.");
    } catch {
      toast.error("Fotoğraf yüklenemedi. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
      if (imgRef.current) imgRef.current.value = "";
    }
  };

  const dropImage = async (path: string) => {
    setBusy(true);
    try {
      await removeProductImage(product, path);
      toast.success("Fotoğraf kaldırıldı.");
    } catch {
      toast.error("Fotoğraf kaldırılamadı.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ürün Detayı</DialogTitle>
          <DialogDescription>
            Stok miktarını, fiyatları ve ürün fotoğraflarını buradan yönetin.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Ürün Adı *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Barkod / Stok Kodu</Label>
            <Input
              value={form.barcode}
              onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <select
              aria-label="Kategori"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Seçiniz…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
              {form.category && !categories.some((c) => c.name === form.category) && (
                <option value={form.category}>{form.category}</option>
              )}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Birim</Label>
            <Input
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Stok Miktarı (manuel güncelleme)</Label>
            <Input
              inputMode="decimal"
              value={form.stock}
              onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Kritik Stok</Label>
            <Input
              inputMode="decimal"
              value={form.critical}
              onChange={(e) => setForm((f) => ({ ...f, critical: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Maliyet (₺)</Label>
            <Input
              inputMode="decimal"
              value={form.cost}
              onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Satış Fiyatı (₺)</Label>
            <Input
              inputMode="decimal"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-border p-3">
          <div className="flex items-center justify-between">
            <Label>Ürün Fotoğrafları</Label>
            <input
              ref={imgRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void addImage(f);
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => imgRef.current?.click()}
            >
              <ImagePlus className="mr-1.5 h-4 w-4" />
              Fotoğraf Ekle
            </Button>
          </div>
          {gallery.length ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {gallery.map((g) => (
                <div
                  key={g.path}
                  className="group relative overflow-hidden rounded-lg border border-border"
                >
                  <img src={g.url} alt={form.name} className="h-24 w-full object-cover" />
                  <button
                    type="button"
                    aria-label="Fotoğrafı sil"
                    disabled={busy}
                    onClick={() => void dropImage(g.path)}
                    className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Henüz fotoğraf yüklenmedi.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Vazgeç
          </Button>
          <Button onClick={save}>Kaydet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
