import { KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  PERMISSION_GROUPS,
  ROLES,
  ROLE_DEFAULT_PERMS,
  newStaffId,
  removeStaff,
  upsertStaff,
  useStaff,
  type PermKey,
  type Role,
  type Staff,
} from "@/lib/panel-store";

const empty = (): Staff => ({
  id: "",
  name: "",
  email: "",
  role: "Kasiyer",
  pin: "",
  active: true,
  perms: [...ROLE_DEFAULT_PERMS["Kasiyer"]],
});

/** POS ve Adisyon ekranlarindaki PIN girisi icin personel yonetimi. */
export function PosPinStaff() {
  const staff = useStaff();
  const [form, setForm] = useState<Staff | null>(null);

  const toggle = (key: PermKey, on: boolean) =>
    setForm((f) =>
      f ? { ...f, perms: on ? [...f.perms, key] : f.perms.filter((p) => p !== key) } : f,
    );

  const save = () => {
    if (!form) return;
    if (!form.name.trim()) {
      toast.error("Personel adı zorunludur.");
      return;
    }
    if (!/^\d{4}$/.test(form.pin)) {
      toast.error("PIN 4 haneli rakam olmalıdır.");
      return;
    }
    if (staff.some((s) => s.pin === form.pin && s.id !== form.id)) {
      toast.error("Bu PIN başka bir personelde kullanılıyor.");
      return;
    }
    upsertStaff({ ...form, id: form.id || newStaffId(), name: form.name.trim() });
    toast.success("Personel kaydedildi.");
    setForm(null);
  };

  return (
    <section className="mt-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <KeyRound className="h-4 w-4" />
            POS & Adisyon PIN Personeli
          </h2>
          <p className="text-xs text-muted-foreground">
            Bu personeller POS ve Adisyon ekranlarına 4 haneli PIN ile giriş yapar.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setForm(empty())}>
          <Plus className="mr-1.5 h-4 w-4" />
          PIN Personeli Ekle
        </Button>
      </div>

      <div className="pos-shadow overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Adı</th>
              <th className="px-4 py-3">Görev</th>
              <th className="px-4 py-3">PIN</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                  Henüz PIN personeli tanımlanmadı.
                </td>
              </tr>
            )}
            {staff.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.role}</td>
                <td className="px-4 py-3 font-mono tracking-[0.3em]">{s.pin || "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      s.active
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.active ? "Aktif" : "Pasif"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setForm({ ...s })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Düzenle
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      aria-label="PIN personelini sil"
                      onClick={() => {
                        removeStaff(s.id);
                        toast.success("Personel silindi.");
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!form} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>PIN Personeli</DialogTitle>
            <DialogDescription>
              POS ve Adisyon ekranlarında kullanılacak 4 haneli PIN ve yetkileri belirleyin.
            </DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Ad Soyad</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>E-posta (opsiyonel)</Label>
                  <Input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Görev</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.role}
                    onChange={(e) => {
                      const role = e.target.value as Role;
                      setForm({ ...form, role, perms: [...ROLE_DEFAULT_PERMS[role]] });
                    }}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>4 Haneli PIN</Label>
                  <Input
                    inputMode="numeric"
                    maxLength={4}
                    className="tracking-[0.3em]"
                    value={form.pin}
                    onChange={(e) =>
                      setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })
                    }
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3">
                <Checkbox
                  checked={form.active}
                  onCheckedChange={(v) => setForm({ ...form, active: v === true })}
                />
                <span className="text-sm font-medium">Aktif (PIN ile giriş yapabilir)</span>
              </label>

              <div className="space-y-1.5">
                <Label>Ekran Yetkileri</Label>
                <div className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-3">
                  {PERMISSION_GROUPS.map((g) => (
                    <div key={g.module}>
                      <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
                        {g.module}
                      </p>
                      <div className="space-y-1.5">
                        {g.items.map((it) => (
                          <label key={it.key} className="flex cursor-pointer items-center gap-2">
                            <Checkbox
                              checked={form.perms.includes(it.key)}
                              onCheckedChange={(v) => toggle(it.key, v === true)}
                            />
                            <span className="text-sm">{it.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              Vazgeç
            </Button>
            <Button onClick={save}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}