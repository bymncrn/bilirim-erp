import { createFileRoute } from "@tanstack/react-router";
import {
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  RotateCcw,
  Smartphone,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PdksShell } from "@/components/pdks/PdksShell";
import { PlanLimitDialog, type PlanLimitInfo } from "@/components/pdks/PlanLimitDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  newId,
  removeStaffDocument,
  signedStaffDocumentUrl,
  uploadStaffDocument,
  usePdksShifts,
  usePdksStaff,
  DEFAULT_SHIFT,
  type PdksStaff,
} from "@/lib/pdks-store";
import { cn } from "@/lib/utils";
import { usePdksPlan } from "@/lib/pdks-plan";

export const Route = createFileRoute("/pdks-yonetim/personel")({
  head: () => ({
    meta: [
      { title: "Personel Yönetimi — Bilirim PDKS" },
      { name: "description", content: "Personel kayıtları, görev, şube ve PIN tanımları bu ekrandan yönetilir." },
      { property: "og:title", content: "Personel Yönetimi — Bilirim PDKS" },
      { property: "og:description", content: "Personel kayıtları, görev, şube ve PIN tanımları bu ekrandan yönetilir." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

const EMPTY: PdksStaff = {
  id: "",
  name: "",
  phone: "",
  role: "",
  branch: "",
  pin: "",
  deviceId: "",
  hireDate: "",
  exitDate: "",
  active: true,
  documents: [],
  shiftId: "",
};

function Page() {
  const { items, save } = usePdksStaff();
  const { items: shifts } = usePdksShifts();
  const plan = usePdksPlan();
  const [limitInfo, setLimitInfo] = useState<PlanLimitInfo>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PdksStaff>(EMPTY);
  const [toDelete, setToDelete] = useState<PdksStaff | null>(null);

  const startNew = () => {
    if (items.length >= plan.staff) {
      setLimitInfo({
        title: "Limit Aşıldı — Paketinizi Yükseltin",
        description: `${plan.name} paketi ${plan.staff} personel ile sınırlıdır. Daha fazla personel eklemek için paketinizi yükseltin.`,
      });
      return;
    }
    setForm({ ...EMPTY });
    setOpen(true);
  };

  const startEdit = (s: PdksStaff) => {
    setForm(s);
    setOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Ad-Soyad zorunludur.");
      return;
    }
    if (form.pin.trim().length !== 4) {
      toast.error("PIN 4 haneli olmalıdır.");
      return;
    }
    if (form.id) {
      save(items.map((i) => (i.id === form.id ? form : i)));
      toast.success("Personel güncellendi.");
    } else {
      save([...items, { ...form, id: newId() }]);
      toast.success("Personel eklendi.");
    }
    setOpen(false);
  };

  const remove = (s: PdksStaff) => {
    save(items.filter((i) => i.id !== s.id));
    toast.success(`${s.name} silindi.`);
  };

  const resetDevice = (s: PdksStaff) => {
    if (!s.deviceId) {
      toast.info("Bu personelde eşleşmiş cihaz yok.");
      return;
    }
    save(items.map((i) => (i.id === s.id ? { ...i, deviceId: "" } : i)));
    toast.success(`${s.name} için cihaz eşleşmesi sıfırlandı.`);
  };

  const excelImport = () => {
    if (!plan.excelImport) {
      setLimitInfo({
        title: "Bu Özellik Paketinizde Yok",
        description:
          "Excel ile toplu personel aktarma özelliği Profesyonel ve üzeri paketlerde geçerlidir.",
      });
      return;
    }
    toast.info("Excel içe aktarma sihirbazı açılıyor.");
  };

  return (
    <PdksShell
      title="Personel Yönetimi"
      description="Personel kartları, görev, şube ve PIN tanımları"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={excelImport} className="font-semibold">
            <Upload className="mr-2 h-4 w-4" />
            Excel&apos;den İçe Aktar
          </Button>
          <Button onClick={startNew} className="font-semibold">
            <Plus className="mr-2 h-4 w-4" />
            Yeni Personel Ekle
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {items.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground" />
              <h2 className="mt-3 text-base font-bold text-foreground">Henüz personel yok</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                “Yeni Personel Ekle” butonu ile ilk personelinizi tanımlayın.
              </p>
              <Button className="mt-4" onClick={startNew}>
                <Plus className="mr-2 h-4 w-4" />
                Yeni Personel Ekle
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad-Soyad</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Görev</TableHead>
                  <TableHead>Şube</TableHead>
                  <TableHead>Vardiya</TableHead>
                  <TableHead>İşe Giriş</TableHead>
                  <TableHead>İşten Çıkış</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>PIN</TableHead>
                  <TableHead>Cihaz</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s) => (
                  <TableRow key={s.id} className={cn(!s.active && "opacity-50")}>
                    <TableCell
                      className={cn(
                        "font-semibold text-foreground",
                        !s.active && "line-through decoration-muted-foreground",
                      )}
                    >
                      {s.name}
                    </TableCell>
                    <TableCell>{s.phone || "—"}</TableCell>
                    <TableCell>{s.role || "—"}</TableCell>
                    <TableCell>{s.branch || "—"}</TableCell>
                    <TableCell>
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                        {shifts.find((x) => x.id === s.shiftId)?.name ?? DEFAULT_SHIFT.name}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums">{s.hireDate || "—"}</TableCell>
                    <TableCell className="tabular-nums">{s.exitDate || "—"}</TableCell>
                    <TableCell>
                      {s.active ? (
                        <span className="rounded-full bg-pos-success/10 px-2.5 py-1 text-xs font-semibold text-pos-success">
                          Aktif
                        </span>
                      ) : (
                        <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
                          Pasif (İşten Ayrıldı)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono">{"•".repeat(s.pin.length)}</TableCell>
                    <TableCell>
                      {s.deviceId ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                          <Smartphone className="h-3.5 w-3.5" />
                          Eşleşti
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Eşleşme yok</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEdit(s)}>
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Düzenle
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resetDevice(s)}
                          title="Cihazı Sıfırla"
                        >
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                          Cihazı Sıfırla
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setToDelete(s)}>
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Sil
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Personel silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.name} kaydı kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) remove(toDelete);
                setToDelete(null);
              }}
            >
              Evet, Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Personeli Düzenle" : "Yeni Personel Ekle"}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="genel">
            <TabsList className="w-full">
              <TabsTrigger value="genel" className="flex-1">
                Genel Bilgiler
              </TabsTrigger>
              <TabsTrigger value="ozluk" className="flex-1">
                Özlük Dosyaları
              </TabsTrigger>
            </TabsList>
            <TabsContent value="genel" className="mt-4">
              <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ad-Soyad" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="Telefon" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label="Görev" value={form.role} onChange={(v) => setForm({ ...form, role: v })} />
            <Field label="Şube" value={form.branch} onChange={(v) => setForm({ ...form, branch: v })} />
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Çalışma Vardiyası</Label>
              <select
                value={form.shiftId}
                onChange={(e) => setForm({ ...form, shiftId: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">
                  {`${DEFAULT_SHIFT.name} (${DEFAULT_SHIFT.start}-${DEFAULT_SHIFT.end})`}
                </option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {`${s.name} (${s.start}-${s.end})`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Vardiyalar "Konum & Mesai Ayarları → Vardiyalar" ekranından tanımlanır.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>İşe Giriş Tarihi</Label>
              <Input
                type="date"
                value={form.hireDate}
                onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>İşten Çıkış Tarihi</Label>
              <Input
                type="date"
                value={form.exitDate}
                onChange={(e) => setForm({ ...form, exitDate: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 sm:col-span-2">
              <div>
                <Label>Çalışma Durumu</Label>
                <p className="text-xs text-muted-foreground">
                  {form.active ? "Aktif çalışan" : "Pasif — işten ayrıldı"}
                </p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
            </div>
            <div className="sm:col-span-2">
              <Field
                label="Sisteme Giriş Şifresi (4 Haneli PIN)"
                value={form.pin}
                onChange={(v) => setForm({ ...form, pin: v.replace(/\D/g, "").slice(0, 4) })}
              />
            </div>
              </div>
            </TabsContent>
            <TabsContent value="ozluk" className="mt-4">
              <DocumentsPanel staff={items.find((i) => i.id === form.id) ?? null} />
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button onClick={submit} className="h-12 w-full sm:h-10 sm:w-auto">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PlanLimitDialog info={limitInfo} onClose={() => setLimitInfo(null)} />
    </PdksShell>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/** Personelin kimlik, sabıka, İSG gibi evraklarını yükleyip görüntüler. */
function DocumentsPanel({ staff }: { staff: PdksStaff | null }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  if (!staff) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Evrak yükleyebilmek için önce personeli kaydedin.
      </p>
    );
  }

  const upload = async (file: File) => {
    setBusy(true);
    try {
      await uploadStaffDocument(staff, file);
      toast.success("Evrak yüklendi.");
    } catch {
      toast.error("Evrak yüklenemedi.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const openDoc = async (path: string) => {
    const url = await signedStaffDocumentUrl(path);
    if (url) window.open(url, "_blank", "noopener");
    else toast.error("Evrak açılamadı.");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2.5">
        <p className="text-xs text-muted-foreground">
          Kimlik fotokopisi, sabıka kaydı, İSG belgesi (PDF / JPG · maks. 10 MB)
        </p>
        <Button size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          {busy ? "Yükleniyor…" : "Evrak Yükle"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
      </div>
      {(staff.documents ?? []).length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Bu personel için henüz evrak yüklenmedi.
        </p>
      ) : (
        <ul className="space-y-2">
          {staff.documents.map((d) => (
            <li
              key={d.path}
              className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5"
            >
              <FileText className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{d.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(d.uploadedAt).toLocaleDateString("tr-TR")}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => void openDoc(d.path)}>
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Görüntüle
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  void removeStaffDocument(staff, d.path).then(() =>
                    toast.success("Evrak silindi."),
                  );
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
