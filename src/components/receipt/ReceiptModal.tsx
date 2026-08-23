import { useEffect, useState } from "react";
import { Printer, X } from "lucide-react";
import { useCompany, getCompanyLogoUrl } from "@/lib/company-store";
import { printElementById } from "@/lib/print-receipt";

export type ReceiptItem = {
  name: string;
  quantity: number;
  unit?: string | undefined;
  /** KDV dahil birim fiyat */
  price: number;
  /** KDV oranı (%) — 1 / 10 / 20 */
  kdvRate?: number | undefined;
};

export type ReceiptData = {
  businessName?: string | undefined;
  address?: string | undefined;
  phone?: string | undefined;
  date: Date;
  /** Fiş / adisyon no */
  no: string | number;
  /** İşlemi yapan personel */
  staff?: string | undefined;
  /** Masa adı (Örn: Teras 1) */
  table?: string | undefined;
  /** Cari (müşteri) unvanı — seçilmişse fişte gösterilir */
  customer?: string | undefined;
  items: ReceiptItem[];
  /** İndirim / ikram toplamı */
  discount?: number | undefined;
  paymentLabel: string;
  /** Nakit alınan tutar */
  received?: number | undefined;
  title?: string | undefined;
};

const DIVIDER = "--------------------------------";

const money = (n: number) =>
  `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;

export function ReceiptModal({
  data,
  onClose,
  onPrint,
}: {
  data: ReceiptData | null;
  onClose: () => void;
  onPrint?: () => void;
}) {
  const company = useCompany();
  const [logoUrl, setLogoUrl] = useState("");
  useEffect(() => {
    let alive = true;
    void getCompanyLogoUrl().then((u) => {
      if (alive) setLogoUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [company?.id]);

  if (!data) return null;

  const printNow = () => {
    if (onPrint) onPrint();
    else printElementById("thermal-receipt");
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-foreground/50 px-4 py-6 backdrop-blur-sm print:static print:block print:bg-transparent print:p-0 print:backdrop-blur-none"
      role="dialog"
      aria-modal="true"
      aria-label="Fiş önizleme"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[340px] print:max-w-none">
        <ReceiptPaper id="thermal-receipt" data={data} logoUrl={logoUrl} company={company} />

        <div className="mt-5 flex gap-3 pb-6 print:hidden">
          <button
            onClick={onClose}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 font-semibold text-foreground transition-colors hover:bg-accent"
          >
            <X className="h-4 w-4" />
            Kapat
          </button>
          <button
            onClick={printNow}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-pos-success py-3.5 font-bold text-pos-success-foreground transition-all hover:bg-pos-success/90"
          >
            <Printer className="h-4 w-4" />
            Yazdır
          </button>
        </div>
      </div>
    </div>
  );
}

/** Son işlemlerden yazdırırken ekranda modal açmadan kullanılan görünmez fiş kaynağı. */
export function ReceiptPrintTarget({ data }: { data: ReceiptData | null }) {
  const company = useCompany();
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    let alive = true;
    void getCompanyLogoUrl().then((url) => {
      if (alive) setLogoUrl(url);
    });
    return () => {
      alive = false;
    };
  }, [company?.id]);

  if (!data) return null;
  return (
    <div className="pointer-events-none fixed left-[-10000px] top-0" aria-hidden="true">
      <ReceiptPaper id="recent-thermal-receipt" data={data} logoUrl={logoUrl} company={company} />
    </div>
  );
}

function ReceiptPaper({
  id,
  data,
  logoUrl,
  company,
}: {
  id: string;
  data: ReceiptData;
  logoUrl: string;
  company: ReturnType<typeof useCompany>;
}) {
  const title = data.businessName ?? company?.name ?? "";
  const gross = data.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount = data.discount ?? 0;
  const total = Math.max(0, gross - discount);
  const ratio = gross > 0 ? total / gross : 1;
  const kdvGroups = new Map<number, number>();
  for (const item of data.items) {
    const rate = item.kdvRate ?? 10;
    const lineTotal = item.price * item.quantity * ratio;
    const kdv = lineTotal - lineTotal / (1 + rate / 100);
    kdvGroups.set(rate, (kdvGroups.get(rate) ?? 0) + kdv);
  }
  const kdvTotal = [...kdvGroups.values()].reduce((s, value) => s + value, 0);
  const change = data.received !== undefined ? Math.max(0, data.received - total) : undefined;
  const stamp = `${data.date.toLocaleDateString("tr-TR")} ${data.date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  return (
    <div
      id={id}
      className="mx-auto w-full max-w-[330px] rounded-xl bg-white px-4 py-5 font-mono text-[12px] leading-[1.45] text-black pos-shadow-lg print:max-w-none print:rounded-none print:px-0 print:shadow-none"
    >
      <div className="text-center">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={title}
            className="mx-auto mb-2 w-full max-w-[150px] object-contain"
            style={{ filter: "grayscale(1) contrast(1.6)" }}
          />
        ) : null}
        <p className="text-[15px] font-bold tracking-[0.12em] uppercase">{title}</p>
        {data.customer ? (
          <p className="mt-1 text-[12px] font-semibold uppercase">Sayın {data.customer}</p>
        ) : null}
        {(data.address ?? company?.address) && (
          <p className="mt-0.5">{data.address ?? company?.address}</p>
        )}
        {(data.phone ?? company?.phone) && <p>Tel: {data.phone ?? company?.phone}</p>}
      </div>
      <Sep />
      <Row label="TARİH" value={stamp} />
      <Row label={data.title ?? "FİŞ NO"} value={String(data.no)} />
      {data.table && <Row label="MASA" value={data.table} />}
      <Row label="PERSONEL" value={data.staff ?? "Kasiyer"} />
      <Sep />

      <div className="space-y-1">
        {data.items.map((item, i) => (
          <div key={`${item.name}-${i}`} className="flex items-start justify-between gap-2">
            <span className="min-w-0 flex-1 break-words uppercase">
              {item.quantity}
              {item.unit && item.unit !== "adet" ? ` ${item.unit}` : "x"} {item.name}
            </span>
            <span className="shrink-0 tabular-nums">{money(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>
      <Sep />

      <Row label="ARA TOPLAM" value={money(gross)} />
      {discount > 0 && <Row label="İNDİRİM / İKRAM" value={`-${money(discount)}`} />}
      {[...kdvGroups.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([rate, amount]) => (
          <Row key={rate} label={`KDV %${rate}`} value={money(amount)} />
        ))}
      <Row label="TOPLAM KDV" value={money(kdvTotal)} />
      <Sep />
      <div className="flex items-center justify-between text-[17px] font-bold">
        <span>GENEL TOPLAM</span>
        <span className="tabular-nums">{money(total)}</span>
      </div>
      <Sep />

      <Row label="ÖDEME TİPİ" value={data.paymentLabel} />
      {data.received !== undefined && <Row label="ALINAN" value={money(data.received)} />}
      {change !== undefined && <Row label="PARA ÜSTÜ" value={money(change)} />}
      <Sep />

      <p className="text-center">Bizi tercih ettiğiniz için teşekkür ederiz.</p>
      <p className="text-center">Bilgi fişidir, mali değeri yoktur.</p>
      <FakeBarcode value={String(data.no)} />
    </div>
  );
}

function Sep() {
  return (
    <p className="my-1.5 overflow-hidden text-[11px] tracking-tighter opacity-70" aria-hidden>
      {DIVIDER}
    </p>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="uppercase">{label}</span>
      <span className="shrink-0 tabular-nums">{value}</span>
    </div>
  );
}

/** Basit barkod simülasyonu (görsel) */
function FakeBarcode({ value }: { value: string }) {
  const bars = Array.from({ length: 44 }, (_, i) => ((i * 7 + value.length * 3) % 5) + 1);
  return (
    <div className="mt-3 flex flex-col items-center gap-1">
      <div className="flex h-10 items-end gap-[2px]">
        {bars.map((w, i) => (
          <span
            key={i}
            className="h-full bg-black"
            style={{ width: `${w % 3 === 0 ? 2 : 1}px`, opacity: w % 4 === 0 ? 0.25 : 1 }}
          />
        ))}
      </div>
      <span className="text-[10px] tracking-[0.3em]">{value}</span>
    </div>
  );
}
