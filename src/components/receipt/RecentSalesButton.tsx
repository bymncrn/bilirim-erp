import { useEffect, useState } from "react";
import { History, Printer, Receipt as ReceiptIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ReceiptPrintTarget, type ReceiptData } from "@/components/receipt/ReceiptModal";
import { useRecentReceipts, type RecentSource } from "@/lib/recent-receipts";
import { printElementById } from "@/lib/print-receipt";

const money = (n: number) =>
  `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;

const receiptTotal = (r: ReceiptData) => {
  const gross = r.items.reduce((s, i) => s + i.price * i.quantity, 0);
  return Math.max(0, gross - (r.discount ?? 0));
};

/** POS ve Adisyon ekranları için "Son İşlemler" hızlı yazdırma menüsü. */
export function RecentSalesButton({ source }: { source: RecentSource }) {
  const items = useRecentReceipts(source);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ReceiptData | null>(null);

  const printNow = (r: ReceiptData) => {
    setOpen(false);
    setPreview(r);
    toast.info("Fiş Yazdırılıyor...");
  };

  useEffect(() => {
    if (!preview) return;
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        printElementById("recent-thermal-receipt");
        setPreview(null);
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [preview]);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="h-9 gap-2 print:hidden">
            <History className="h-4 w-4" />
            Son İşlemler
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md print:hidden">
          <SheetHeader>
            <SheetTitle>Son İşlemler</SheetTitle>
            <SheetDescription>
              Son 10 tamamlanan işlem. Sayfadan ayrılmadan fişi yeniden yazdırabilirsiniz.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-2 overflow-y-auto pb-6">
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                <ReceiptIcon className="mx-auto mb-2 h-6 w-6 opacity-60" />
                Henüz tamamlanmış işlem yok.
              </div>
            ) : (
              items.map((r, i) => (
                <div
                  key={`${r.no}-${r.date.toISOString()}-${i}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {r.title ?? "Fiş"} #{r.no}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.date.toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" · "}
                      {r.paymentLabel}
                      {r.table ? ` · ${r.table}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                    {money(receiptTotal(r))}
                  </span>
                  <Button
                    size="icon"
                    variant="secondary"
                    aria-label="Fişi yazdır"
                    onClick={() => printNow(r)}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ReceiptPrintTarget data={preview} />
    </>
  );
}
