import { ModuleGuard } from "@/components/subscription/ModuleGuard";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  useServiceTickets,
  serviceCollection,
  createServiceTicket,
  type ServiceTicket,
} from "@/lib/service-store";
import { useCompany } from "@/lib/company-store";
import { printElementById } from "@/lib/print-receipt";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Clock,
  PackageSearch,
  CheckCircle2,
  CalendarCheck,
  Search,
  Plus,
  Eye,
  RefreshCw,
  Printer,
  Wrench,
  FileText,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "react-qr-code";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { cariCollection } from "@/lib/accounting-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/servis")({
  head: () => ({
    meta: [
      { title: "Teknik Servis Modülü — Bilirim ERP" },
      {
        name: "description",
        content:
          "Cihaz kabul, arıza takibi ve servis fişi yönetimi: bekleyen, parça bekleyen ve teslime hazır cihazlar tek ekranda.",
      },
      { property: "og:title", content: "Teknik Servis Modülü — Bilirim ERP" },
      {
        property: "og:description",
        content: "Servis kayıtları, durum takibi, tahmini tutarlar ve hızlı cihaz kabul işlemleri.",
      },
    ],
  }),
  component: () => (
    <ModuleGuard module="servis">
      <ServisPage />
    </ModuleGuard>
  ),
});

const TRY = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
});

type Status =
  | "Beklemede"
  | "Onarımda"
  | "Parça Bekliyor"
  | "Hazır"
  | "Tamamlandı"
  | "Teslim Edildi"
  | "Faturalandırıldı";

const STATUS_FLOW: Status[] = [
  "Beklemede",
  "Onarımda",
  "Parça Bekliyor",
  "Hazır",
  "Tamamlandı",
  "Teslim Edildi",
];

const STATUS_TONE: Record<Status, string> = {
  Beklemede: "bg-pos-cheese text-pos-cheese-foreground",
  Onarımda: "bg-pos-sky text-pos-sky-foreground",
  "Parça Bekliyor": "bg-pos-tomato text-pos-tomato-foreground",
  Hazır: "bg-pos-apple text-pos-apple-foreground",
  Tamamlandı: "bg-pos-apple text-pos-apple-foreground",
  "Teslim Edildi": "bg-muted text-muted-foreground",
  Faturalandırıldı: "bg-primary text-primary-foreground",
};

type Ticket = {
  id: string;
  rowId: string;
  customer: string;
  phone: string;
  device: string;
  issue: string;
  date: string;
  amount: number;
  status: Status;
};

function ServisPage() {
  const rows = useServiceTickets();
  const tickets = useMemo<Ticket[]>(
    () =>
      rows.map((t) => ({
        id: t.number || t.id,
        rowId: t.id,
        customer: t.customer || "—",
        phone: t.phone,
        device: [t.deviceBrand, t.deviceModel].filter(Boolean).join(" ") || t.deviceType,
        issue: t.problem,
        date: t.createdAt ? new Date(t.createdAt).toLocaleDateString("tr-TR") : "",
        amount: t.estimatedCost,
        status: (t.status as Status) ?? "Beklemede",
      })),
    [rows],
  );
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailTicket = useMemo(
    () => rows.find((r) => r.id === detailId) ?? null,
    [rows, detailId],
  );

  const kpis = useMemo(() => {
    const by = (s: Status) => tickets.filter((t) => t.status === s).length;
    return {
      waiting: by("Beklemede"),
      parts: by("Parça Bekliyor"),
      ready: by("Hazır"),
      done: by("Teslim Edildi"),
    };
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    if (!q) return tickets;
    return tickets.filter((t) =>
      [t.id, t.customer, t.phone, t.device, t.issue]
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(q),
    );
  }, [tickets, query]);

  const cycleStatus = (id: string) => {
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket) return;
    const next = STATUS_FLOW[(STATUS_FLOW.indexOf(ticket.status) + 1) % STATUS_FLOW.length]!;
    void serviceCollection.patch(ticket.rowId, { status: next });
    toast.success(`${ticket.id} durumu "${next}" olarak güncellendi.`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/dashboard">
            <Button variant="outline" size="lg" className="h-12 gap-2 px-5 text-base font-semibold">
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Ana Panele Dön</span>
            </Button>
          </Link>
          <div className="ml-1 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-pos-cashew text-pos-cashew-foreground">
              <Wrench className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                Teknik Servis Modülü
              </h1>
              <p className="text-xs text-muted-foreground">Cihaz Kabul & Arıza Takip</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Bekleyen Cihazlar"
            value={String(kpis.waiting)}
            hint="İşleme alınmayı bekliyor"
            icon={Clock}
            tone="bg-pos-cheese text-pos-cheese-foreground"
          />
          <KpiCard
            label="Parça / Onay Bekleyenler"
            value={String(kpis.parts)}
            hint="Tedarik veya müşteri onayı"
            icon={PackageSearch}
            tone="bg-pos-tomato text-pos-tomato-foreground"
          />
          <KpiCard
            label="Teslime Hazır Cihazlar"
            value={String(kpis.ready)}
            hint="Müşteri bilgilendirilecek"
            icon={CheckCircle2}
            tone="bg-pos-apple text-pos-apple-foreground"
          />
          <KpiCard
            label="Bu Ay Tamamlanan"
            value={String(kpis.done)}
            hint="Teslim edilen cihazlar"
            icon={CalendarCheck}
            tone="bg-pos-sky text-pos-sky-foreground"
          />
        </section>

        <section className="mt-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 pos-shadow sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Müşteri adı, Telefon veya Servis No ile ara..."
              className="h-11 pl-9"
              aria-label="Servis kayıtlarında ara"
            />
          </div>
          <Button
            onClick={() => setFormOpen(true)}
            className="h-11 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Yeni Cihaz Kaydı Oluştur
          </Button>
        </section>

        <NewTicketDialog open={formOpen} onOpenChange={setFormOpen} />
        <TicketDetailDialog
          ticket={detailTicket}
          onClose={() => setDetailId(null)}
        />

        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card pos-shadow">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servis No</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Cihaz</TableHead>
                  <TableHead>Arıza Tanımı</TableHead>
                  <TableHead>Kayıt Tarihi</TableHead>
                  <TableHead className="text-right">Tahmini Tutar</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer"
                    onClick={() => setDetailId(t.rowId)}
                  >
                    <TableCell className="font-semibold text-foreground">{t.id}</TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{t.customer}</div>
                      <div className="text-xs text-muted-foreground">{t.phone}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-foreground">{t.device}</TableCell>
                    <TableCell className="max-w-[16rem] text-muted-foreground">{t.issue}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {t.date}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-semibold text-foreground">
                      {TRY.format(t.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${STATUS_TONE[t.status]} whitespace-nowrap border-0`}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Detay"
                          aria-label={`${t.id} detay`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailId(t.rowId);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Durum Değiştir"
                          aria-label={`${t.id} durum değiştir`}
                          onClick={(e) => {
                            e.stopPropagation();
                            cycleStatus(t.id);
                          }}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Servis Fişi Bas"
                          aria-label={`${t.id} servis fişi bas`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailId(t.rowId);
                          }}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Aramanızla eşleşen servis kaydı bulunamadı.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </main>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 pos-shadow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  customer: "",
  phone: "",
  deviceType: "",
  deviceBrand: "",
  deviceModel: "",
  serialNo: "",
  problem: "",
  estimatedCost: "",
  technician: "",
  note: "",
};

function NewTicketDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const cariler = cariCollection.useItems();
  const set = (key: keyof typeof EMPTY_FORM) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer.trim()) {
      toast.error("Müşteri adı zorunludur.");
      return;
    }
    if (!form.deviceType.trim() && !form.deviceBrand.trim()) {
      toast.error("Cihaz türü veya markası girilmelidir.");
      return;
    }
    if (!form.problem.trim()) {
      toast.error("Arıza tanımı zorunludur.");
      return;
    }
    setSaving(true);
    try {
      const number = await createServiceTicket({
        customer: form.customer,
        phone: form.phone,
        deviceType: form.deviceType,
        deviceBrand: form.deviceBrand,
        deviceModel: form.deviceModel,
        serialNo: form.serialNo,
        problem: form.problem,
        estimatedCost: Number(form.estimatedCost.replace(",", ".")) || 0,
        technician: form.technician,
        note: form.note,
      });
      toast.success(`${number} numaralı servis kaydı oluşturuldu.`);
      setForm(EMPTY_FORM);
      onOpenChange(false);
    } catch (err) {
      console.error("[servis] kayıt oluşturulamadı", err);
      toast.error("Servis kaydı oluşturulamadı. Lütfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Yeni Cihaz Kaydı</DialogTitle>
          <DialogDescription>
            Cihaz kabul bilgilerini doldurun; kayıt doğrudan veritabanına işlenir.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Müşteri Adı *">
            <div className="space-y-1.5">
              <Combobox
                ariaLabel="Kayıtlı müşteri seç"
                value={form.customer}
                placeholder="Kayıtlı müşterilerde ara…"
                searchPlaceholder="Ad, telefon veya vergi no…"
                emptyText="Müşteri bulunamadı. Aşağıya yazarak yeni kayıt açabilirsiniz."
                options={cariler.map((c) => ({
                  value: c.name,
                  label: c.name,
                  keywords: `${c.type} ${c.phone} ${c.taxNo ?? ""}`,
                  hint: c.phone ? `${c.type} · ${c.phone}` : c.type,
                }))}
                onValueChange={(name) => {
                  const c = cariler.find((x) => x.name === name);
                  set("customer")(name);
                  if (c?.phone) set("phone")(c.phone);
                }}
              />
              <Input
                value={form.customer}
                placeholder="veya yeni müşteri adı yazın"
                onChange={(e) => set("customer")(e.target.value)}
              />
            </div>
          </Field>
          <Field label="Telefon">
            <Input value={form.phone} onChange={(e) => set("phone")(e.target.value)} />
          </Field>
          <Field label="Cihaz Türü">
            <Input
              value={form.deviceType}
              onChange={(e) => set("deviceType")(e.target.value)}
              placeholder="Laptop, Telefon..."
            />
          </Field>
          <Field label="Marka">
            <Input value={form.deviceBrand} onChange={(e) => set("deviceBrand")(e.target.value)} />
          </Field>
          <Field label="Model">
            <Input value={form.deviceModel} onChange={(e) => set("deviceModel")(e.target.value)} />
          </Field>
          <Field label="Seri No">
            <Input value={form.serialNo} onChange={(e) => set("serialNo")(e.target.value)} />
          </Field>
          <Field label="Tahmini Tutar (₺)">
            <Input
              inputMode="decimal"
              value={form.estimatedCost}
              onChange={(e) => set("estimatedCost")(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Teknisyen">
            <Input value={form.technician} onChange={(e) => set("technician")(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Arıza Tanımı *">
              <Textarea
                value={form.problem}
                onChange={(e) => set("problem")(e.target.value)}
                rows={3}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Not">
              <Textarea value={form.note} onChange={(e) => set("note")(e.target.value)} rows={2} />
            </Field>
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

type PrintLine = { id: string; name: string; qty: number; price: number };

function TicketDetailDialog({
  ticket,
  onClose,
}: {
  ticket: ServiceTicket | null;
  onClose: () => void;
}) {
  const company = useCompany();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ServiceTicket | null>(null);
  const [saving, setSaving] = useState(false);
  const current = draft && ticket && draft.id === ticket.id ? draft : ticket;

  if (!ticket || !current) return null;

  const set = <K extends keyof ServiceTicket>(key: K, value: ServiceTicket[K]) =>
    setDraft({ ...current, [key]: value });

  const lines = current.lines ?? [];
  const linesTotal = lines.reduce((s, l) => s + (l.qty || 0) * (l.price || 0), 0);
  const grandTotal = linesTotal > 0 ? linesTotal : current.estimatedCost;

  const setLine = (id: string, patch: Partial<PrintLine>) =>
    set(
      "lines",
      lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    );
  const addLine = () =>
    set("lines", [...lines, { id: `l${Date.now()}`, name: "", qty: 1, price: 0 }]);
  const removeLine = (id: string) =>
    set(
      "lines",
      lines.filter((l) => l.id !== id),
    );

  const persist = async (extra?: Partial<Record<string, unknown>>) => {
    await serviceCollection.patch(ticket.id, {
      device_type: current.deviceType,
      device_brand: current.deviceBrand,
      device_model: current.deviceModel,
      serial_no: current.serialNo,
      problem: current.problem,
      estimated_cost: grandTotal,
      status: current.status,
      technician: current.technician,
      note: current.note,
      lines,
      ...(extra ?? {}),
    } as never);
  };

  const save = async () => {
    setSaving(true);
    try {
      await persist();
      toast.success("Servis fişi güncellendi.");
      setDraft(null);
      onClose();
    } catch (err) {
      console.error("[servis] güncelleme hatası", err);
      toast.error("Servis fişi güncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  const deviceLine =
    [current.deviceBrand, current.deviceModel].filter(Boolean).join(" ") ||
    current.deviceType ||
    "—";

  const invoiced = current.status === "Faturalandırıldı";
  const canInvoice = current.status === "Tamamlandı";

  const convertToInvoice = async () => {
    const payload = {
      account: current.customer,
      phone: current.phone,
      note: `${current.number} numaralı servis fişi`,
      lines: (lines.length
        ? lines
        : [{ id: "l1", name: `Servis Hizmeti (${deviceLine})`, qty: 1, price: current.estimatedCost }]
      ).map((l) => ({ id: l.id, name: l.name, qty: String(l.qty), price: String(l.price), vat: "20" })),
    };
    try {
      await persist({ status: "Faturalandırıldı" });
      sessionStorage.setItem("servis:invoice-prefill", JSON.stringify(payload));
      toast.success("Fiş faturaya aktarıldı, e-Fatura taslağı açılıyor.");
      setDraft(null);
      onClose();
      void navigate({ to: "/muhasebe" });
    } catch (err) {
      console.error("[servis] faturaya çevirme hatası", err);
      toast.error("Fiş faturaya çevrilemedi.");
    }
  };

  const dateLabel = current.createdAt
    ? new Date(current.createdAt).toLocaleDateString("tr-TR")
    : "—";

  return (
    <Dialog
      open={!!ticket}
      onOpenChange={(v) => {
        if (!v) {
          setDraft(null);
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div>
              <DialogTitle>{current.number || "Servis Fişi"}</DialogTitle>
              <DialogDescription>
                Fiş bilgilerini ve kalemleri güncelleyin, çift nüsha (A4'e 2 adet A5) çıktı alın.
              </DialogDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(canInvoice || invoiced) && (
                <Button
                  className="gap-2"
                  disabled={invoiced}
                  onClick={() => void convertToInvoice()}
                >
                  <FileText className="h-4 w-4" />
                  {invoiced ? "Faturalandırıldı" : "Faturaya Çevir (e-Fatura)"}
                </Button>
              )}
              <Button
                variant="outline"
                className="gap-2"
                onClick={() =>
                  printElementById("service-slip", { pageSize: "A4 landscape", widthMm: 277 })
                }
              >
                <Printer className="h-4 w-4" /> Yazdır
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Müşteri">
            <Input value={current.customer} readOnly />
          </Field>
          <Field label="Telefon">
            <Input value={current.phone} readOnly />
          </Field>
          <Field label="Cihaz Türü">
            <Input value={current.deviceType} onChange={(e) => set("deviceType", e.target.value)} />
          </Field>
          <Field label="Marka">
            <Input
              value={current.deviceBrand}
              onChange={(e) => set("deviceBrand", e.target.value)}
            />
          </Field>
          <Field label="Model">
            <Input
              value={current.deviceModel}
              onChange={(e) => set("deviceModel", e.target.value)}
            />
          </Field>
          <Field label="Seri No">
            <Input value={current.serialNo} onChange={(e) => set("serialNo", e.target.value)} />
          </Field>
          <Field label="Durum">
            <Select value={current.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Durum seçin" />
              </SelectTrigger>
              <SelectContent>
                {[
                  "Beklemede",
                  "Onarımda",
                  "Parça Bekliyor",
                  "Hazır",
                  "Tamamlandı",
                  "Teslim Edildi",
                  "Faturalandırıldı",
                ].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Teknisyen">
            <Input value={current.technician} onChange={(e) => set("technician", e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Arıza Tanımı">
              <Textarea
                rows={3}
                value={current.problem}
                onChange={(e) => set("problem", e.target.value)}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Servis Notu">
              <Textarea
                rows={2}
                value={current.note}
                onChange={(e) => set("note", e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* Kullanılan malzemeler / hizmetler */}
        <section className="mt-2 rounded-xl border border-border">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">
              Kullanılan Malzemeler / Hizmetler
            </h3>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={addLine}>
              <Plus className="h-4 w-4" /> Kalem Ekle
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[12rem]">Açıklama</TableHead>
                  <TableHead className="w-24">Miktar</TableHead>
                  <TableHead className="w-32">Birim Fiyat</TableHead>
                  <TableHead className="w-32 text-right">Toplam</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <Input
                        value={l.name}
                        placeholder="Servis Ücreti, Anakart Değişimi..."
                        onChange={(e) => setLine(l.id, { name: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        inputMode="decimal"
                        value={String(l.qty)}
                        onChange={(e) =>
                          setLine(l.id, { qty: Number(e.target.value.replace(",", ".")) || 0 })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        inputMode="decimal"
                        value={String(l.price)}
                        onChange={(e) =>
                          setLine(l.id, { price: Number(e.target.value.replace(",", ".")) || 0 })
                        }
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-semibold text-foreground">
                      {TRY.format((l.qty || 0) * (l.price || 0))}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Kalemi sil"
                        onClick={() => removeLine(l.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {lines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                      Henüz kalem eklenmedi. Tahmini ücret üzerinden hesaplanır.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-sm text-muted-foreground">Fiş Genel Toplamı</span>
            <span className="text-lg font-bold text-foreground">{TRY.format(grandTotal)}</span>
          </div>
        </section>

        {/* Yazdırma şablonu: ekranda gizli, sadece çıktıda görünür (A4 yatay / 2 adet A5) */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed left-[-10000px] top-0 h-0 w-0 overflow-hidden"
        >
          <div
            id="service-slip"
            className="grid grid-cols-2 gap-4 bg-white text-[10px] leading-snug text-black"
          >
            <SlipCopy
              copyLabel="İşletme Nüshası"
              company={company}
              ticket={current}
              deviceLine={deviceLine}
              dateLabel={dateLabel}
              lines={lines}
              total={grandTotal}
            />
            <SlipCopy
              copyLabel="Müşteri Nüshası"
              company={company}
              ticket={current}
              deviceLine={deviceLine}
              dateLabel={dateLabel}
              lines={lines}
              total={grandTotal}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setDraft(null);
              onClose();
            }}
          >
            Kapat
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Tek bir A5 servis fişi nüshası (A4 yatay çıktıda yan yana iki adet basılır). */
function SlipCopy({
  copyLabel,
  company,
  ticket,
  deviceLine,
  dateLabel,
  lines,
  total,
}: {
  copyLabel: string;
  company: { name?: string; address?: string; phone?: string; email?: string } | null;
  ticket: ServiceTicket;
  deviceLine: string;
  dateLabel: string;
  lines: PrintLine[];
  total: number;
}) {
  return (
    <div className="break-inside-avoid border border-black/40 p-3">
      <div className="mb-2 border-b border-dashed border-black/40 pb-1 text-center text-[10px] font-bold uppercase tracking-wide">
        {copyLabel}
      </div>
      <div className="flex items-start justify-between gap-3 border-b border-black/30 pb-2">
        <div>
          <p className="text-sm font-bold uppercase">{company?.name || "Firma Adı"}</p>
          <p>{company?.address || ""}</p>
          <p>
            {company?.phone || ""} {company?.email ? `· ${company.email}` : ""}
          </p>
          <p className="mt-1 text-[11px] font-bold">TEKNİK SERVİS FİŞİ</p>
          <p>Tarih: {dateLabel}</p>
        </div>
        <div className="flex w-[26mm] shrink-0 flex-col items-center text-center">
          <QRCode
            value={`https://app.bilirim.com.tr/servis-durumu?fisNo=${encodeURIComponent(ticket.number)}`}
            size={90}
            style={{ width: "22mm", height: "22mm" }}
          />
          <p className="mt-1 text-[10px] font-bold leading-tight">Fiş No: {ticket.number}</p>
          <p className="text-[6px] leading-tight text-black/70">
            Cihazınızın durumunu öğrenmek için okutunuz
          </p>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="border border-black/30 p-1.5">
          <p className="mb-0.5 font-bold uppercase">Müşteri</p>
          <p>{ticket.customer || "—"}</p>
          <p>{ticket.phone || "—"}</p>
        </div>
        <div className="border border-black/30 p-1.5">
          <p className="mb-0.5 font-bold uppercase">Cihaz</p>
          <p>{deviceLine}</p>
          <p>Seri No: {ticket.serialNo || "—"}</p>
        </div>
      </div>

      <div className="mt-2 border border-black/30 p-1.5">
        <p className="mb-0.5 font-bold uppercase">Arıza / Şikayet</p>
        <p className="min-h-6 whitespace-pre-wrap">{ticket.problem || "—"}</p>
      </div>

      <table className="mt-2 w-full border-collapse text-[9px]">
        <thead>
          <tr>
            <th className="border border-black/30 p-1 text-left">Açıklama</th>
            <th className="border border-black/30 p-1 text-right">Mik.</th>
            <th className="border border-black/30 p-1 text-right">B. Fiyat</th>
            <th className="border border-black/30 p-1 text-right">Toplam</th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 && (
            <tr>
              <td className="border border-black/30 p-1" colSpan={4}>
                —
              </td>
            </tr>
          )}
          {lines.map((l) => (
            <tr key={l.id}>
              <td className="border border-black/30 p-1">{l.name || "—"}</td>
              <td className="border border-black/30 p-1 text-right">{l.qty}</td>
              <td className="border border-black/30 p-1 text-right">{TRY.format(l.price)}</td>
              <td className="border border-black/30 p-1 text-right">
                {TRY.format((l.qty || 0) * (l.price || 0))}
              </td>
            </tr>
          ))}
          <tr>
            <td className="border border-black/30 p-1 font-bold" colSpan={3}>
              GENEL TOPLAM
            </td>
            <td className="border border-black/30 p-1 text-right font-bold">{TRY.format(total)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-1.5 flex justify-between">
        <span>Durum: {ticket.status}</span>
        <span>Teknisyen: {ticket.technician || "—"}</span>
      </div>

      <p className="mt-1.5 text-[8px] leading-tight">
        Cihazınızı teslim alırken bu fişi ibraz etmeniz gerekmektedir. 30 gün içinde teslim
        alınmayan cihazlardan firmamız sorumlu değildir.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="border-t border-black/50 pt-0.5 text-center">Teslim Eden</div>
        <div className="border-t border-black/50 pt-0.5 text-center">Teslim Alan</div>
      </div>
    </div>
  );
}
