import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  uploadProductImage,
  removeProductImage,
  signedProductImageUrls,
} from "@/lib/catalog-store";

/** Ürün fotoğraf galerisi: yükleme ve silme işlemlerini doğrudan Supabase'e yazar. */
export function ProductGallery({
  productId,
  images,
  label = "Ürün Fotoğrafları",
}: {
  productId: string;
  images: string[];
  label?: string;
}) {
  const [gallery, setGallery] = useState<{ path: string; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const key = images.join("|");

  useEffect(() => {
    let active = true;
    if (!images.length) {
      setGallery([]);
      return;
    }
    void signedProductImageUrls(images).then((list) => {
      if (active) setGallery(list);
    });
    return () => {
      active = false;
    };
  }, [productId, key]);

  const add = async (file: File) => {
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
      await uploadProductImage({ id: productId, images }, file);
      toast.success("Fotoğraf yüklendi.");
    } catch {
      toast.error("Fotoğraf yüklenemedi. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const drop = async (path: string) => {
    setBusy(true);
    try {
      await removeProductImage({ id: productId, images }, path);
      toast.success("Fotoğraf kaldırıldı.");
    } catch {
      toast.error("Fotoğraf kaldırılamadı.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void add(f);
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
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
              <img src={g.url} alt="Ürün fotoğrafı" className="h-20 w-full object-cover" />
              <button
                type="button"
                aria-label="Fotoğrafı sil"
                disabled={busy}
                onClick={() => void drop(g.path)}
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
  );
}
