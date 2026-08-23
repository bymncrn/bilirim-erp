import { createFileRoute } from "@tanstack/react-router";
import { Search, Star, Phone, Mail, FileSpreadsheet, Printer, Scale } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PanelShell } from "@/components/panel/PanelShell";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  cariCollection,
  eDocsCollection,
  paymentsCollection,
  type AccCari,
} from "@/lib/accounting-store";

export const Route = createFileRoute("/panel/musteriler")({
  head: () => ({
    meta: [
      { title: "Müşteriler — Bilirim Restoran POS" },
      {
        name: "description",
        content: "Müşteri kartları, ziyaret sıklığı ve sadakat puanlarını tek listede takip edin.",
      },
      { property: "og:title", content: "Müşteriler — Bilirim Restoran POS" },
      {
        property: "og:description",
        content: "Müşteri kartları, ziyaret sıklığı ve sadakat puanlarını tek listede takip edin.",
      },
    ],
  }),
  component: CustomersPage,
});

const segmentTone: Record<string, string> = {
  Müşteri: "bg-pos-sky text-pos-sky-foreground",
  Tedarikçi: "bg-pos-cheese text-pos-cheese-foreground",
  Yeni: "bg-pos-apple text-pos-apple-foreground",
};

const TRY = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

type Movement = { date: string; desc: string; debit: number; credit: number };

function toIso(d: string) {
  if (!d) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  const [dd, mm, yy] = d.split(".");
  return dd && mm && yy ? `${yy}-${mm}-${dd}` : "";
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function printHtml(title: string, body: string) {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) {
    toast.error("Yazdırma penceresi açılamadı. Pop-up engelleyiciyi kapatın.");
    return;
  }
  w.document.write(
    `<html><head><title>${title}</title><style>
      body{font-family:system-ui,sans-serif;padding:32px;color:#111}
      h1{font-size:20px;margin:0 0 4px}
      .muted{color:#666;font-size:13px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left}
      td.r,th.r{text-align:right}
      tfoot td{font-weight:700}
    </style></head><body>${body}</body></html>`,
  );
  w.document.close();
  w.focus();
  w.print();
}

function CustomersPage() {
  const [q, setQ] = useState("");
  const cariler = cariCollection.useItems();
  const payments = paymentsCollection.useItems();
  const eDocs = eDocsCollection.useItems();
  const [selected, setSelected] = useState<AccCari | null>(null);
  const [range, setRange] = useState({ from: "", to: "" });
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [balanceValue, setBalanceValue] = useState("0");
  const CUSTOMERS = cariler.filter((c) => c.type === "Müşteri");
  const current = selected ? (cariler.find((c) => c.id === selected.id) ?? selected) : null;

  const rows: Movement[] = useMemo(() => {
    if (!current) return [];
    const docRows: Movement[] = eDocs
      .filter((d) => d.account === current.name)
      .map((d) => ({ date: d.date, desc: `${d.kind} ${d.no}`, debit: d.total, credit: 0 }));
    const payRows: Movement[] = payments
      .filter((p) => p.cariId === current.id)
      .map((p) => ({
        date: p.date,
        desc: p.note || (p.direction === "in" ? "Tahsilat" : "Ödeme"),
        debit: p.direction === "in" ? 0 : p.amount,
        credit: p.direction === "in" ? p.amount : 0,
      }));
    return [...docRows, ...payRows].sort((a, b) => (toIso(a.date) < toIso(b.date) ? -1 : 1));
  }, [current, eDocs, payments]);

  const filteredRows = rows.filter((r) => {
    const iso = toIso(r.date);
    if (range.from && iso && iso < range.from) return false;
    if (range.to && iso && iso > range.to) return false;
    return true;
  });

  const totalDebit = filteredRows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = filteredRows.reduce((s, r) => s + r.credit, 0);

  const exportExcel = () => {
    if (!current) return;
    downloadCsv(`${current.name}-ekstre.csv`, [
      ["Tarih", "Açıklama", "Borç", "Alacak"],
      ...filteredRows.map((r) => [r.date, r.desc, String(r.debit || 0), String(r.credit || 0)]),
      ["", "Toplam", String(totalDebit), String(totalCredit)],
      ["", "Bakiye", "", String(current.balance)],
    ]);
    toast.success("Ekstre Excel olarak indirildi.");
  };

  const exportPdf = () => {
    if (!current) return;
    const body = filteredRows
      .map(
        (r) =>
          `<tr><td>${r.date}</td><td>${r.desc}</td><td class="r">${r.debit ? TRY.format(r.debit) : "—"}</td><td class="r">${r.credit ? TRY.format(r.credit) : "—"}</td></tr>`,
      )
      .join("");
    printHtml(
      `${current.name} Ekstre`,
      `<h1>Cari Ekstre</h1>
       <div class="muted">${current.name} · ${current.phone || "—"}${
         range.from || range.to ? ` · ${range.from || "…"} — ${range.to || "…"}` : ""
       }</div>
       <table><thead><tr><th>Tarih</th><th>Açıklama</th><th class="r">Borç</th><th class="r">Alacak</th></tr></thead>
       <tbody>${body || '<tr><td colspan="4">Kayıt yok</td></tr>'}</tbody>
       <tfoot><tr><td colspan="2">Bakiye</td><td colspan="2" class="r">${TRY.format(
         Math.abs(current.balance),
       )} ${current.balance >= 0 ? "alacak" : "borç"}</td></tr></tfoot></table>`,
    );
  };

  const saveBalance = async () => {
    if (!current) return;
    const target = Number(balanceValue.replace(",", "."));
    if (!Number.isFinite(target)) {
      toast.error("Geçerli bir bakiye girin.");
      return;
    }
    await cariCollection.upsert({ ...current, balance: target });
    setSelected({ ...current, balance: target });
    setBalanceOpen(false);
    toast.success("Cari bakiyesi güncellendi.");
  };

  const filtered = CUSTOMERS.filter((c) =>
    `${c.name} ${c.phone} ${c.email || "—"}`
      .toLocaleLowerCase("tr")
      .includes(q.toLocaleLowerCase("tr")),
  );

  return (
    <PanelShell title="Müşteriler" description={`${CUSTOMERS.length} kayıtlı müşteri`}>
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ad, telefon veya e-posta ile ara..."
            className="pl-9"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <article
              key={c.id}
              className="pos-shadow cursor-pointer rounded-2xl border border-border bg-card p-5 transition hover:border-primary/50"
              onClick={() => {
                setSelected(c);
                setRange({ from: "", to: "" });
              }}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <h2 className="truncate text-base font-bold text-foreground">{c.name}</h2>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${segmentTone[c.type] ?? segmentTone["Yeni"]}`}
                >
                  {c.type}
                </span>
              </div>
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                {c.phone}
              </p>
              <p className="mt-1.5 flex items-center gap-2 truncate text-sm text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                {c.email || "—"}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
                <span className="text-muted-foreground">
                  {c.taxNo ? `VN: ${c.taxNo}` : "Bireysel"}
                </span>
                <span className="flex items-center gap-1 font-semibold text-foreground">
                  <Star className="h-4 w-4" />
                  {c.balance.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{c.address || "Adres kaydı yok"}</p>
            </article>
          ))}
        </div>
      </div>

      <Dialog
        open={current !== null}
        onOpenChange={(o) => {
          if (!o) {
            setSelected(null);
            setRange({ from: "", to: "" });
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{current?.name} — Cari Ekstre</DialogTitle>
            <DialogDescription>
              {current?.type} · {current?.phone || "—"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
            <div className="space-y-1">
              <Label className="text-xs">Başlangıç Tarihi</Label>
              <Input
                type="date"
                className="h-9"
                aria-label="Başlangıç tarihi"
                value={range.from}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bitiş Tarihi</Label>
              <Input
                type="date"
                className="h-9"
                aria-label="Bitiş tarihi"
                value={range.to}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              />
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-1" onClick={exportPdf}>
                <Printer className="h-3.5 w-3.5" /> PDF İndir
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={exportExcel}>
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel İndir
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => {
                  setBalanceValue(String(current?.balance ?? 0));
                  setBalanceOpen(true);
                }}
              >
                <Scale className="h-3.5 w-3.5" /> Bakiye Düzelt
              </Button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead className="text-right">Borç</TableHead>
                  <TableHead className="text-right">Alacak</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((r, i) => (
                  <TableRow key={`${r.date}-${i}`}>
                    <TableCell className="whitespace-nowrap">{r.date}</TableCell>
                    <TableCell>{r.desc}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.debit ? TRY.format(r.debit) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.credit ? TRY.format(r.credit) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Seçilen tarih aralığında hareket yok.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Borç {TRY.format(totalDebit)} · Alacak {TRY.format(totalCredit)}
            </span>
            <span
              className={`text-base font-bold ${
                (current?.balance ?? 0) >= 0 ? "text-pos-success" : "text-destructive"
              }`}
            >
              {TRY.format(Math.abs(current?.balance ?? 0))}{" "}
              <span className="text-xs font-medium text-muted-foreground">
                {(current?.balance ?? 0) >= 0 ? "alacak" : "borç"}
              </span>
            </span>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={balanceOpen} onOpenChange={setBalanceOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Bakiyeyi Güncelle (Devir Bakiye)</DialogTitle>
            <DialogDescription>
              {current?.name} carisinin bakiyesi. Pozitif değer alacak, negatif değer borç anlamına
              gelir.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void saveBalance();
            }}
          >
            <div className="space-y-1">
              <Label className="text-xs">Yeni Bakiye (₺)</Label>
              <Input
                value={balanceValue}
                inputMode="decimal"
                aria-label="Yeni cari bakiye"
                onChange={(e) => setBalanceValue(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBalanceValue("0")}>
                Sıfırla
              </Button>
              <Button type="submit">Kaydet</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PanelShell>
  );
}
