import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { Ban, CheckCircle2, Loader2, LogOut, RefreshCw, ShieldCheck, Ticket, Trash2, XCircle } from "lucide-react";
import { cancelCompanySubscription, deleteCompany, updateCompanyByAdmin } from "@/lib/admin-companies.functions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
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
  approveSubscriptionOrder,
  rejectSubscriptionOrder,
  usePendingOrders,
} from "@/lib/subscription-orders";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Süper Admin Paneli — Bilirim ERP" },
      {
        name: "description",
        content:
          "Platform yöneticileri için şirket listesi, abonelik uzatma ve e-Belge kontör yükleme kontrol merkezi.",
      },
      { property: "og:title", content: "Süper Admin Paneli — Bilirim ERP" },
      {
        property: "og:description",
        content: "Tüm kiracı şirketleri yönetin; abonelik ve kontör işlemlerini yapın.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuperAdminPage,
});

type Row = {
  id: string;
  name: string;
  created_at: string;
  plan: string;
  edoc_credits: number;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
};

const DAY = 24 * 60 * 60 * 1000;

function daysLeft(row: Row) {
  const raw = row.subscription_ends_at ?? row.trial_ends_at;
  if (!raw) return 0;
  const diff = new Date(raw).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / DAY));
}

/** Returns a fresh, valid access token (refreshing if needed) or null. */
async function freshAuthHeaders(): Promise<Record<string, string> | null> {
  let { data } = await supabase.auth.getSession();
  let session = data.session;
  const exp = session?.expires_at ? session.expires_at * 1000 : 0;
  if (!session || exp - Date.now() < 60_000) {
    const r = await supabase.auth.refreshSession();
    session = r.data.session;
  }
  const token = session?.access_token;
  if (!token || token.split(".").length !== 3) return null;
  return { Authorization: `Bearer ${token}` };
}

function AdminLogin({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      toast.error("Giriş başarısız: e-posta veya şifre hatalı.");
      return;
    }
    onDone();
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <form
        onSubmit={(e) => void submit(e)}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-8 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Süper Admin Girişi</h1>
        </div>
        <div className="space-y-1.5">
          <Label>E-posta</Label>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Şifre</Label>
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Giriş Yap
        </Button>
      </form>
    </div>
  );
}

function SuperAdminPage() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [authTick, setAuthTick] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [extend, setExtend] = useState<Row | null>(null);
  const [credit, setCredit] = useState<Row | null>(null);
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);
  const orders = usePendingOrders();
  const cancelSub = useServerFn(cancelCompanySubscription);
  const delCompany = useServerFn(deleteCompany);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("companies")
      .select("id,name,created_at,plan,edoc_credits,trial_ends_at,subscription_ends_at")
      .order("created_at", { ascending: false });
    if (error) toast.error("Şirket listesi yüklenemedi.");
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!active) return;
      if (!auth.user) {
        setAllowed(false);
        setNeedLogin(true);
        return;
      }
      setNeedLogin(false);
      const { data: superAdmin } = await supabase.rpc("is_super_admin", {
        _user_id: auth.user.id,
      });
      if (!active) return;
      if (!superAdmin) {
        setAllowed(false);
        return;
      }
      setAllowed(true);
      void load();
    })();
    return () => {
      active = false;
    };
  }, [load, authTick]);

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Çıkış yapıldı.");
    setAllowed(null);
    setRows([]);
    setAuthTick((t) => t + 1);
  };

  /** Calls a protected server action with a fresh token; asks to sign in if missing. */
  const authed = async <T,>(fn: (headers: Record<string, string>) => Promise<T>) => {
    const headers = await freshAuthHeaders();
    if (!headers) {
      toast.error("Oturumunuz sona erdi. Lütfen tekrar giriş yapın.");
      setAllowed(false);
      setNeedLogin(true);
      throw new Error("Oturum yok");
    }
    return fn(headers);
  };

  if (needLogin) return <AdminLogin onDone={() => setAuthTick((t) => t + 1)} />;

  if (allowed === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="max-w-md space-y-4 rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-lg font-bold text-foreground">Erişim engellendi</h1>
          <p className="text-sm text-muted-foreground">
            Bu hesap Süper Admin yetkisine sahip değil.
          </p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => void navigate({ to: "/" })}>
              Ana Sayfa
            </Button>
            <Button onClick={() => void logout()}>
              <LogOut className="mr-2 h-4 w-4" /> Farklı Hesapla Giriş
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (allowed !== true) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-4">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div className="flex-1">
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Süper Admin — SaaS Kontrol Merkezi
            </h1>
            <p className="text-xs text-muted-foreground">
              Kayıtlı tüm şirketler, abonelik ve kontör yönetimi
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
          <Button variant="outline" onClick={() => void logout()}>
            <LogOut className="mr-2 h-4 w-4" /> Çıkış Yap
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-6">
        <section className="pos-shadow mb-6 overflow-x-auto rounded-2xl border border-amber-500/40 bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <h2 className="text-sm font-bold text-foreground">Bekleyen Abonelik Onayları</h2>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-600">
              {orders.rows.length}
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold">
                <th>Müşteri</th>
                <th>Paket</th>
                <th>Gönderici</th>
                <th>Tutar</th>
                <th className="text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {orders.rows.map((o) => (
                <tr key={o.id} className="border-b border-border/60 [&>td]:px-4 [&>td]:py-3">
                  <td className="font-semibold text-foreground">
                    {o.company_name || o.company_id}
                    <span className="block text-xs font-normal text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString("tr-TR")}
                    </span>
                  </td>
                  <td className="text-muted-foreground">
                    {o.module}
                    {o.plan ? ` · ${o.plan}` : ""} ({o.period === "yearly" ? "Yıllık" : "Aylık"})
                  </td>
                  <td className="text-muted-foreground">{o.sender_name}</td>
                  <td className="font-semibold text-foreground">
                    {o.amount.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          void (async () => {
                            try {
                              await rejectSubscriptionOrder(o.id);
                              toast.success("Sipariş reddedildi.");
                              void orders.reload();
                            } catch {
                              toast.error("İşlem başarısız oldu.");
                            }
                          })();
                        }}
                      >
                        <XCircle className="mr-1.5 h-4 w-4" /> Reddet
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          void (async () => {
                            try {
                              const ends = await approveSubscriptionOrder(o);
                              toast.success(
                                `${o.company_name} aboneliği ${ends.toLocaleDateString("tr-TR")} tarihine kadar aktif edildi.`,
                              );
                              void orders.reload();
                              void load();
                            } catch {
                              toast.error("Onaylama başarısız oldu.");
                            }
                          })();
                        }}
                      >
                        <CheckCircle2 className="mr-1.5 h-4 w-4" /> Ödemeyi Onayla ve Aktif Et
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!orders.loading && orders.rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Bekleyen abonelik onayı bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <div className="pos-shadow overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold">
                <th>Şirket Unvanı</th>
                <th>Kayıt Tarihi</th>
                <th>Kalan Abonelik Günü</th>
                <th>Kalan Kontör</th>
                <th className="text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const d = daysLeft(r);
                return (
                  <tr key={r.id} className="border-b border-border/60 [&>td]:px-4 [&>td]:py-3">
                    <td className="font-semibold text-foreground">{r.name}</td>
                    <td className="text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("tr-TR")}
                    </td>
                    <td>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          d > 0
                            ? "bg-primary/10 text-primary"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {d > 0 ? `${d} gün` : "Süresi doldu"}
                      </span>
                    </td>
                    <td className="font-semibold text-foreground">
                      {(r.edoc_credits ?? 0).toLocaleString("tr-TR")}
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setExtend(r)}>
                          Abonelik Uzat
                        </Button>
                        <Button size="sm" onClick={() => setCredit(r)}>
                          <Ticket className="mr-1.5 h-4 w-4" /> Kontör Yükle
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            if (!confirm(`"${r.name}" üyeliği iptal edilsin mi? Modüller hemen kilitlenecek.`)) return;
                            try {
                              await authed((headers) =>
                                cancelSub({ data: { companyId: r.id }, headers }),
                              );
                              toast.success("Üyelik iptal edildi.");
                              void load();
                            } catch (e) {
                              if ((e as Error).message !== "Oturum yok") toast.error((e as Error).message);
                            }
                          }}
                        >
                          <Ban className="mr-1.5 h-4 w-4" /> Üyeliği İptal Et
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setToDelete(r)}>
                          <Trash2 className="mr-1.5 h-4 w-4" /> Firmayı Sil
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    Kayıtlı şirket bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && !deleting && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Firmayı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.name} firmasını silmek üzeresiniz. Emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>İptal</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                const r = toDelete;
                if (!r) return;
                void (async () => {
                  setDeleting(true);
                  try {
                    await authed((headers) => delCompany({ data: { companyId: r.id }, headers }));
                    toast.success("Firma silindi.");
                    setToDelete(null);
                    void load();
                  } catch (err) {
                    if ((err as Error).message !== "Oturum yok") toast.error((err as Error).message);
                  } finally {
                    setDeleting(false);
                  }
                })();
              }}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Evet, Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {extend && (
        <ExtendDialog
          row={extend}
          onClose={() => setExtend(null)}
          onDone={() => {
            setExtend(null);
            void load();
          }}
        />
      )}
      {credit && (
        <CreditDialog
          row={credit}
          onClose={() => setCredit(null)}
          onDone={() => {
            setCredit(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function ExtendDialog({
  row,
  onClose,
  onDone,
}: {
  row: Row;
  onClose: () => void;
  onDone: () => void;
}) {
  const current = row.subscription_ends_at ?? row.trial_ends_at;
  const base = current && new Date(current).getTime() > Date.now() ? new Date(current) : new Date();
  const [days, setDays] = useState("30");
  const [date, setDate] = useState(
    new Date(base.getTime() + 30 * DAY).toISOString().slice(0, 10),
  );
  const [saving, setSaving] = useState(false);
  const update = useServerFn(updateCompanyByAdmin);

  const applyDays = (value: string) => {
    setDays(value);
    const n = Number(value);
    if (Number.isFinite(n)) setDate(new Date(base.getTime() + n * DAY).toISOString().slice(0, 10));
  };

  const save = async () => {
    const target = new Date(`${date}T23:59:59`);
    if (Number.isNaN(target.getTime())) {
      toast.error("Geçerli bir tarih seçin.");
      return;
    }
    setSaving(true);
    let error: Error | null = null;
    try {
      const headers = await freshAuthHeaders();
      if (!headers) throw new Error("Oturumunuz sona erdi, tekrar giriş yapın.");
      await update({ data: { companyId: row.id, subscriptionEndsAt: target.toISOString() }, headers });
    } catch (e) {
      error = e as Error;
    }
    setSaving(false);
    if (error) {
      toast.error(`Abonelik güncellenemedi: ${error.message}`);
      return;
    }
    toast.success(`${row.name} aboneliği ${target.toLocaleDateString("tr-TR")} tarihine uzatıldı.`);
    onDone();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abonelik Uzat — {row.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Eklenecek Gün</Label>
            <Input
              inputMode="numeric"
              value={days}
              onChange={(e) => applyDays(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Bitiş Tarihi</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Vazgeç
          </Button>
          <Button disabled={saving} onClick={() => void save()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreditDialog({
  row,
  onClose,
  onDone,
}: {
  row: Row;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState("100");
  const [saving, setSaving] = useState(false);
  const update = useServerFn(updateCompanyByAdmin);

  const save = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n === 0) {
      toast.error("Geçerli bir kontör miktarı girin.");
      return;
    }
    setSaving(true);
    let error: Error | null = null;
    try {
      const headers = await freshAuthHeaders();
      if (!headers) throw new Error("Oturumunuz sona erdi, tekrar giriş yapın.");
      await update({
        headers,
        data: { companyId: row.id, edocCredits: Math.max(0, (row.edoc_credits ?? 0) + Math.trunc(n)) },
      });
    } catch (e) {
      error = e as Error;
    }
    setSaving(false);
    if (error) {
      toast.error(`Kontör yüklenemedi: ${error.message}`);
      return;
    }
    toast.success(`${row.name} hesabına ${n} kontör yüklendi.`);
    onDone();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kontör Yükle — {row.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Yüklenecek Kontör Adedi</Label>
          <Input
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d-]/g, ""))}
          />
          <p className="text-xs text-muted-foreground">
            Mevcut bakiye: {(row.edoc_credits ?? 0).toLocaleString("tr-TR")} kontör
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Vazgeç
          </Button>
          <Button disabled={saving} onClick={() => void save()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Yükle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
