import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, FileCheck2, ImageUp, Loader2, Save, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useCompany, updateCompany } from "@/lib/company-store";
import { getCompanyId } from "@/lib/session";

export const Route = createFileRoute("/hesabim")({
  head: () => ({
    meta: [
      { title: "Firma Bilgilerim — Bilirim ERP" },
      {
        name: "description",
        content:
          "Şirket unvanı, adres ve iletişim bilgilerinizi güncelleyin; fatura ve tekliflerde görünecek logonuzu yükleyin.",
      },
      { property: "og:title", content: "Firma Bilgilerim — Bilirim ERP" },
      {
        property: "og:description",
        content: "Şirket bilgilerinizi düzenleyin ve kurumsal logonuzu yükleyin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

const EMPTY = {
  name: "",
  tax_no: "",
  tax_office: "",
  phone: "",
  email: "",
  address: "",
};

function AccountPage() {
  const company = useCompany();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!company) return;
    setForm({
      name: company.name ?? "",
      tax_no: company.tax_no ?? "",
      tax_office: company.tax_office ?? "",
      phone: company.phone ?? "",
      email: company.email ?? "",
      address: company.address ?? "",
    });
  }, [company]);

  const logoPath = (company as unknown as { logo_url?: string | null } | null)?.logo_url ?? null;

  useEffect(() => {
    let active = true;
    if (!logoPath) {
      setLogoUrl(null);
      return;
    }
    void supabase.storage
      .from("company-logos")
      .createSignedUrl(logoPath, 3600)
      .then(({ data }) => {
        if (active) setLogoUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [logoPath]);

  const set = (key: keyof typeof EMPTY) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Şirket unvanı zorunludur.");
      return;
    }
    setSaving(true);
    try {
      await updateCompany({
        name: form.name.trim(),
        tax_no: form.tax_no.trim(),
        tax_office: form.tax_office.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
      });
      toast.success("Firma bilgileri güncellendi.");
    } catch {
      toast.error("Firma bilgileri kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Lütfen bir görsel dosyası seçin (PNG veya JPG).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo boyutu en fazla 2 MB olabilir.");
      return;
    }
    setUploading(true);
    try {
      const companyId = await getCompanyId();
      if (!companyId) throw new Error("no-company");
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${companyId}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("company-logos")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      await updateCompany({ logo_url: path } as never);
      toast.success("Şirket logosu yüklendi.");
    } catch {
      toast.error("Logo yüklenemedi. Lütfen tekrar deneyin.");
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    if (!logoPath) return;
    setUploading(true);
    try {
      await supabase.storage.from("company-logos").remove([logoPath]);
      await updateCompany({ logo_url: null } as never);
      toast.success("Şirket logosu kaldırıldı.");
    } catch {
      toast.error("Logo kaldırılamadı.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-5 py-4">
          <Button variant="outline" size="lg" asChild className="h-12 px-5 text-base font-semibold">
            <Link to="/dashboard">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Ana Panele Dön
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Firma Bilgilerim / Hesabım
            </h1>
            <p className="text-xs text-muted-foreground">
              Fatura ve tekliflerde görünecek kurumsal bilgiler
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-5 py-6">
        <section className="pos-shadow rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <ImageUp className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Şirket Logosu</h2>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/40">
              {logoUrl ? (
                <img src={logoUrl} alt="Şirket logosu" className="h-full w-full object-contain" />
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                aria-label="Logo dosyası seç"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f);
                  e.target.value = "";
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ImageUp className="mr-2 h-4 w-4" />
                  )}
                  Logo Yükle
                </Button>
                {logoPath ? (
                  <Button variant="outline" disabled={uploading} onClick={() => void removeLogo()}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Kaldır
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">PNG veya JPG, en fazla 2 MB.</p>
            </div>
          </div>
        </section>

        <section className="pos-shadow rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Şirket Bilgileri</h2>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Şirket Unvanı *</Label>
              <Input value={form.name} onChange={(e) => set("name")(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Vergi Dairesi</Label>
              <Input value={form.tax_office} onChange={(e) => set("tax_office")(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Vergi / TC No</Label>
              <Input value={form.tax_no} onChange={(e) => set("tax_no")(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefon</Label>
              <Input value={form.phone} onChange={(e) => set("phone")(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>E-posta</Label>
              <Input value={form.email} onChange={(e) => set("email")(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Adres</Label>
              <Textarea
                rows={3}
                value={form.address}
                onChange={(e) => set("address")(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button disabled={saving} onClick={() => void save()}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Kaydet
            </Button>
          </div>
        </section>

        <EDocumentSettings />
      </main>
    </div>
  );
}

const EMPTY_EDOC = { einvoice_username: "", einvoice_password: "", einvoice_alias: "" };

function EDocumentSettings() {
  const company = useCompany();
  const [form, setForm] = useState(EMPTY_EDOC);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!company) return;
    setForm({
      einvoice_username: company.einvoice_username ?? "",
      einvoice_password: company.einvoice_password ?? "",
      einvoice_alias: company.einvoice_alias ?? "",
    });
  }, [company]);

  const save = async () => {
    setSaving(true);
    try {
      await updateCompany({
        einvoice_username: form.einvoice_username.trim(),
        einvoice_password: form.einvoice_password.trim(),
        einvoice_alias: form.einvoice_alias.trim(),
      });
      toast.success("e-Dönüşüm entegrasyon bilgileri kaydedildi.");
    } catch {
      toast.error("e-Dönüşüm bilgileri kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="pos-shadow rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <FileCheck2 className="h-5 w-5 text-primary" />
        <h2 className="text-base font-bold text-foreground">e-Dönüşüm (e-Fatura) Entegrasyonu</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Entegratör firmanızdan aldığınız portal bilgilerini girin.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Portal Kullanıcı Adı</Label>
          <Input
            value={form.einvoice_username}
            onChange={(e) => setForm((f) => ({ ...f, einvoice_username: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Web Servis Şifresi</Label>
          <Input
            type="password"
            value={form.einvoice_password}
            onChange={(e) => setForm((f) => ({ ...f, einvoice_password: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Posta Kutusu (Alias)</Label>
          <Input
            placeholder="urn:mail:defaultpk@firma.com.tr"
            value={form.einvoice_alias}
            onChange={(e) => setForm((f) => ({ ...f, einvoice_alias: e.target.value }))}
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button disabled={saving} onClick={() => void save()}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Kaydet
        </Button>
      </div>
    </section>
  );
}