import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ShieldCheck, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SystemShell } from "@/components/system/SystemShell";
import { PosPinStaff } from "@/components/panel/PosPinStaff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRole, ROLE_LABELS, toDbRole, normalizeRole, type AppRole } from "@/lib/rbac";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PERMISSION_ITEMS,
  PERM_KEYS,
  PERM_LABELS,
  nonePerms,
  normalizePerms,
  reloadPermissions,
  type PermKey,
} from "@/lib/permissions";
import { logAudit } from "@/lib/audit-log";
import {
  createTeamMember,
  listTeam,
  removeTeamMember,
  saveTeamPermissions,
  updateTeamRole,
  type TeamMember,
} from "@/lib/team.functions";

export const Route = createFileRoute("/sistem/kullanicilar")({
  head: () => ({
    meta: [
      { title: "Kullanıcılar ve Yetkiler — Bilirim" },
      {
        name: "description",
        content:
          "Alt kullanıcı oluşturun ve erişebileceği modülleri tek ekranda onay kutularıyla belirleyin.",
      },
      { property: "og:title", content: "Kullanıcılar ve Yetkiler — Bilirim" },
      {
        property: "og:description",
        content: "Personel hesapları ve modül bazlı erişim yetkileri yönetimi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsersPermissionsPage,
});

type FormState = {
  fullName: string;
  email: string;
  password: string;
  role: AppRole;
  perms: Record<PermKey, boolean>;
};

const ASSIGNABLE_ROLES: AppRole[] = ["muhasebe", "kasiyer", "garson", "teknik_servis"];

function RoleSelect({ value, onChange }: { value: AppRole; onChange: (r: AppRole) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>Rol</Label>
      <Select value={value} onValueChange={(v) => onChange(v as AppRole)}>
        <SelectTrigger>
          <SelectValue placeholder="Rol seçin" />
        </SelectTrigger>
        <SelectContent>
          {ASSIGNABLE_ROLES.map((r) => (
            <SelectItem key={r} value={r}>
              {ROLE_LABELS[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const emptyForm = (): FormState => ({
  fullName: "",
  email: "",
  password: "",
  role: "kasiyer",
  perms: nonePerms(),
});

function PermChecklist({
  perms,
  onChange,
}: {
  perms: Record<PermKey, boolean>;
  onChange: (next: Record<PermKey, boolean>) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>Erişim Yetkileri</Label>
      <div className="grid gap-1 rounded-xl border border-border p-2 sm:grid-cols-2">
        {PERMISSION_ITEMS.map((item) => (
          <label
            key={item.key}
            className="flex cursor-pointer items-start gap-3 rounded-lg p-2 transition hover:bg-accent"
          >
            <Checkbox
              checked={perms[item.key]}
              onCheckedChange={(v) => onChange({ ...perms, [item.key]: v === true })}
            />
            <span>
              <span className="block text-sm font-medium text-foreground">{item.label}</span>
              <span className="block text-xs text-muted-foreground">{item.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function UsersPermissionsPage() {
  const { role } = useRole();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm());

  const { data: team = [], isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: () => listTeam(),
    enabled: role === "yonetici",
  });

  if (role !== "yonetici") {
    return (
      <SystemShell title="Kullanıcılar ve Yetkiler">
        <p className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Bu sayfa yalnızca işletme yöneticisine açıktır.
        </p>
      </SystemShell>
    );
  }

  const submit = async () => {
    if (!form.fullName.trim() || !form.email.trim()) {
      toast.error("Ad ve e-posta zorunludur.");
      return;
    }
    setSaving(true);
    try {
      const created = await createTeamMember({
        data: {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
          role: toDbRole(form.role),
        },
      });
      await saveTeamPermissions({
        data: {
          userId: created.id,
          perms: form.perms,
          salesScope: "all",
          allowedAccounts: [],
        },
      });
      await logAudit({
        action: "Kullanıcı oluşturma",
        entity: "Kullanıcı",
        summary: `${form.fullName.trim()} (${form.email.trim()}) kullanıcısı oluşturuldu.`,
      });
      toast.success("Kullanıcı oluşturuldu.");
      setOpen(false);
      setForm(emptyForm());
      void qc.invalidateQueries({ queryKey: ["team"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kullanıcı oluşturulamadı.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (userId: string, name: string) => {
    try {
      await removeTeamMember({ data: { userId } });
      await logAudit({
        action: "Kullanıcı silme",
        entity: "Kullanıcı",
        summary: `${name} kullanıcısı silindi.`,
      });
      toast.success("Kullanıcı silindi.");
      void qc.invalidateQueries({ queryKey: ["team"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kullanıcı silinemedi.");
    }
  };

  const openEditor = (m: TeamMember) => {
    setEditing(m);
    setEditForm({
      fullName: m.fullName,
      email: m.email,
      password: "",
      role: normalizeRole(m.role),
      perms: normalizePerms(m.perms),
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (normalizeRole(editing.role) !== editForm.role) {
        await updateTeamRole({ data: { userId: editing.id, role: toDbRole(editForm.role) } });
      }
      await saveTeamPermissions({
        data: {
          userId: editing.id,
          perms: editForm.perms,
          salesScope: editing.salesScope === "own" ? "own" : "all",
          allowedAccounts: editing.allowedAccounts ?? [],
        },
      });
      await logAudit({
        action: "Yetki güncelleme",
        entity: "Kullanıcı",
        summary: `${editing.fullName || editing.email} kullanıcısının yetkileri güncellendi.`,
      });
      toast.success("Yetkiler kaydedildi.");
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ["team"] });
      reloadPermissions();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yetkiler kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SystemShell
      title="Kullanıcılar ve Yetkiler"
      description={`${team.length} kullanıcı`}
      actions={
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Yeni Personel
        </Button>
      }
    >
      <div className="mx-auto max-w-5xl">
        <div className="pos-shadow overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Adı Soyadı</th>
                <th className="px-4 py-3">E-posta</th>
                <th className="px-4 py-3">Yetkili Modüller</th>
                <th className="px-4 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                    Yükleniyor…
                  </td>
                </tr>
              )}
              {!isLoading &&
                team.map((m) => {
                  const isOwner = m.role === "admin";
                  const active = PERM_KEYS.filter((k) => normalizePerms(m.perms)[k]);
                  return (
                    <tr key={m.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium text-foreground">{m.fullName || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {isOwner ? (
                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                              Tüm Modüller (İşletme Sahibi)
                            </span>
                          ) : active.length ? (
                            active.map((k) => (
                              <span
                                key={k}
                                className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                              >
                                {PERM_LABELS[k]}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">Yetki verilmemiş</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {!isOwner && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => openEditor(m)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Düzenle
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            aria-label="Kullanıcıyı sil"
                            onClick={() => void remove(m.id, m.fullName || m.email)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          Sol menü ve sayfa erişimleri yalnızca burada işaretlenen modüllere göre çalışır.
        </p>
        <PosPinStaff />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Yeni Personel</DialogTitle>
            <DialogDescription>
              Personel bu bilgilerle giriş yapar ve yalnızca işaretlediğiniz modülleri görür.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Ad Soyad</Label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-posta</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Şifre</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <RoleSelect value={form.role} onChange={(role) => setForm({ ...form, role })} />
            <PermChecklist
              perms={form.perms}
              onChange={(perms) => setForm({ ...form, perms })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button onClick={() => void submit()} disabled={saving}>
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Kullanıcıyı Düzenle</DialogTitle>
            <DialogDescription>
              {editing?.fullName || editing?.email} kullanıcısının erişebileceği modülleri
              belirleyin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Ad Soyad</Label>
              <Input value={editForm.fullName} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>E-posta</Label>
              <Input value={editForm.email} disabled />
            </div>
            <RoleSelect
              value={editForm.role}
              onChange={(role) => setEditForm({ ...editForm, role })}
            />
            <PermChecklist
              perms={editForm.perms}
              onChange={(perms) => setEditForm({ ...editForm, perms })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Vazgeç
            </Button>
            <Button onClick={() => void saveEdit()} disabled={saving}>
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SystemShell>
  );
}
