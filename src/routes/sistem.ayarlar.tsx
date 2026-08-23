import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Crown, Eye, EyeOff, Moon, Send, Server, Sun } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SystemShell } from "@/components/system/SystemShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme, toggleTheme } from "@/lib/theme-store";
import { useActivePackage } from "@/lib/subscription-store";

export const Route = createFileRoute("/sistem/ayarlar")({
  head: () => ({
    meta: [
      { title: "Ayarlar — Bilirim Restoran POS" },
      {
        name: "description",
        content: "İşletme bilgileri, KDV oranı, fiş yazıcı ve tema tercihlerinizi yönetin.",
      },
      { property: "og:title", content: "Ayarlar — Bilirim Restoran POS" },
      {
        property: "og:description",
        content: "İşletme bilgileri, KDV oranı, fiş yazıcı ve tema tercihlerinizi yönetin.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const theme = useTheme();
  const pkg = useActivePackage();
  const [form, setForm] = useState({
    vat: "10",
    serviceCharge: false,
    autoPrint: true,
  });

  return (
    <SystemShell title="Ayarlar" description="İşletme ve uygulama tercihleri">
      <Tabs defaultValue="genel" className="mx-auto max-w-5xl">
        <TabsList className="mb-4">
          <TabsTrigger value="genel">Genel Ayarlar</TabsTrigger>
          <TabsTrigger value="eposta">E-posta & Bildirim Ayarları</TabsTrigger>
          <TabsTrigger value="yerlesim">Restoran Yerleşimi</TabsTrigger>
        </TabsList>

        <TabsContent value="yerlesim" className="mx-auto max-w-3xl">
          <section className="pos-shadow rounded-2xl border border-border bg-card p-6 text-center">
            <h2 className="text-sm font-bold text-foreground">Restoran Yerleşimi</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Salon, teras ve balkon gibi alanları tanımlayın; her alandaki masaları oluşturup
              düzenleyin.
            </p>
            <Button className="mt-4" asChild>
              <Link to="/panel/yerlesim">Yerleşim Modülünü Aç</Link>
            </Button>
          </section>
        </TabsContent>

        <TabsContent value="genel" className="mx-auto max-w-3xl space-y-4">
          <section className="pos-shadow rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold text-foreground">Satış Ayarları</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>KDV Oranı (%)</Label>
                <Input
                  value={form.vat}
                  onChange={(e) => setForm({ ...form, vat: e.target.value })}
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              İşletme adı, telefon ve adres bilgileri sağ üstteki “Firma Bilgilerim / Hesabım”
              sayfasından yönetilir.
            </p>
          </section>

          <section className="pos-shadow space-y-4 rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold text-foreground">Adisyon & Yazıcı</h2>
            <div className="flex items-center justify-between">
              <Label htmlFor="service">Servis ücreti uygula (%10)</Label>
              <Switch
                id="service"
                checked={form.serviceCharge}
                onCheckedChange={(v) => setForm({ ...form, serviceCharge: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="print">Hesap kapatınca fiş otomatik yazdırılsın</Label>
              <Switch
                id="print"
                checked={form.autoPrint}
                onCheckedChange={(v) => setForm({ ...form, autoPrint: v })}
              />
            </div>
          </section>

          <section className="pos-shadow rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold text-foreground">Görünüm</h2>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Aktif tema: {theme === "dark" ? "Koyu" : "Açık"}
              </p>
              <Button variant="outline" onClick={toggleTheme}>
                {theme === "dark" ? (
                  <>
                    <Sun className="mr-1.5 h-4 w-4" /> Açık Temaya Geç
                  </>
                ) : (
                  <>
                    <Moon className="mr-1.5 h-4 w-4" /> Koyu Temaya Geç
                  </>
                )}
              </Button>
            </div>
          </section>

          <section className="pos-shadow rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold text-foreground">Abonelik</h2>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Crown className="h-4 w-4" /> Aktif paket: {pkg.name}
              </p>
              <Button variant="outline" asChild>
                <Link to="/abonelik">Mevcut Aboneliğim / Paket Değiştir</Link>
              </Button>
            </div>
          </section>

          <Button className="w-full" onClick={() => toast.success("Ayarlar kaydedildi.")}>
            Değişiklikleri Kaydet
          </Button>
        </TabsContent>

        <TabsContent value="eposta">
          <EmailNotificationSettings />
        </TabsContent>
      </Tabs>
    </SystemShell>
  );
}

type NotificationRule = {
  key: string;
  label: string;
  hint: string;
  enabled: boolean;
};

const DEFAULT_RULES: NotificationRule[] = [
  {
    key: "invoice-out",
    label: "Yeni e-Fatura / Fatura Kesildiğinde",
    hint: "Fatura PDF'i müşteriye, bilgilendirme kopyası yöneticiye gönderilir.",
    enabled: true,
  },
  {
    key: "invoice-in",
    label: "Sisteme Yeni Gelen Fatura Düştüğünde",
    hint: "Tedarikçiden gelen e-Fatura/e-Arşiv bildirimi yalnızca yöneticiye gider.",
    enabled: true,
  },
  {
    key: "payment",
    label: "POS / Kasa Üzerinden Ödeme / Tahsilat Alındığında",
    hint: "Tahsilat dekontu ödemeyi yapan cariye ve muhasebe sorumlusuna iletilir.",
    enabled: false,
  },
  {
    key: "zreport",
    label: "Gün Sonu (Z-Raporu) Kapatıldığında",
    hint: "Ciro, ödeme kırılımı ve kasa farkını içeren özet rapor yöneticiye mail atılır.",
    enabled: true,
  },
  {
    key: "stock",
    label: "Ürün Stoku Kritik Seviyenin Altına Düştüğünde",
    hint: "Kritik stok uyarısı satın alma sorumlusuna ve yöneticiye gönderilir.",
    enabled: true,
  },
];

function EmailNotificationSettings() {
  const [smtp, setSmtp] = useState({
    host: "mail.bilirim.com.tr",
    port: "587",
    user: "bildiri@bilirim.com.tr",
    password: "",
    security: "tls",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rules, setRules] = useState<NotificationRule[]>(DEFAULT_RULES);

  const toggleRule = (key: string, value: boolean) =>
    setRules((prev) => prev.map((r) => (r.key === key ? { ...r, enabled: value } : r)));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="pos-shadow space-y-4 rounded-2xl border border-border bg-card p-5">
        <header className="flex items-center gap-2">
          <Server className="h-4 w-4 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-bold text-foreground">SMTP Sunucu & Hesap Ayarları</h2>
            <p className="text-xs text-muted-foreground">
              Giden e-postalar bu sunucu üzerinden gönderilir.
            </p>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="smtp-host">SMTP Sunucu Adresi (Host)</Label>
            <Input
              id="smtp-host"
              placeholder="mail.bilirim.com.tr"
              value={smtp.host}
              onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="smtp-port">SMTP Portu</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={smtp.port === "587" ? "default" : "outline"}
                onClick={() => setSmtp({ ...smtp, port: "587" })}
              >
                587
              </Button>
              <Button
                type="button"
                size="sm"
                variant={smtp.port === "465" ? "default" : "outline"}
                onClick={() => setSmtp({ ...smtp, port: "465" })}
              >
                465
              </Button>
              <Input
                id="smtp-port"
                className="w-24"
                inputMode="numeric"
                value={smtp.port}
                onChange={(e) => setSmtp({ ...smtp, port: e.target.value.replace(/\D/g, "") })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="smtp-security">Güvenlik Tipi</Label>
            <Select value={smtp.security} onValueChange={(v) => setSmtp({ ...smtp, security: v })}>
              <SelectTrigger id="smtp-security">
                <SelectValue placeholder="Seçiniz" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ssl">SSL</SelectItem>
                <SelectItem value="tls">TLS</SelectItem>
                <SelectItem value="none">Yok</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="smtp-user">E-posta Adresi / Kullanıcı Adı</Label>
            <Input
              id="smtp-user"
              type="email"
              value={smtp.user}
              onChange={(e) => setSmtp({ ...smtp, user: e.target.value })}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="smtp-pass">Şifre</Label>
            <div className="relative">
              <Input
                id="smtp-pass"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pr-10"
                value={smtp.password}
                onChange={(e) => setSmtp({ ...smtp, password: e.target.value })}
              />
              <button
                type="button"
                aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            onClick={() =>
              smtp.host.trim() && smtp.user.trim()
                ? toast.success("SMTP ayarları kaydedildi.")
                : toast.error("Sunucu adresi ve e-posta adresi zorunludur.")
            }
          >
            Ayarları Kaydet
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.success(`Test e-postası ${smtp.user} adresine gönderildi.`)}
          >
            <Send className="mr-1.5 h-4 w-4" /> Test E-postası Gönder
          </Button>
        </div>
      </section>

      <section className="pos-shadow space-y-4 rounded-2xl border border-border bg-card p-5">
        <header className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Otomatik E-posta Bildirim Kuralları
            </h2>
            <p className="text-xs text-muted-foreground">
              Hangi olaylarda otomatik bilgilendirme maili gönderileceğini seçin.
            </p>
          </div>
        </header>

        <ul className="space-y-2.5">
          {rules.map((rule) => (
            <li
              key={rule.key}
              className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background p-3.5"
            >
              <div className="space-y-1">
                <Label htmlFor={`rule-${rule.key}`} className="text-sm font-semibold">
                  {rule.label}
                </Label>
                <p className="text-xs leading-relaxed text-muted-foreground">{rule.hint}</p>
              </div>
              <Switch
                id={`rule-${rule.key}`}
                checked={rule.enabled}
                onCheckedChange={(v) => toggleRule(rule.key, v)}
              />
            </li>
          ))}
        </ul>

        <Button className="w-full" onClick={() => toast.success("Bildirim tercihleri kaydedildi.")}>
          Bildirim Tercihlerini Kaydet
        </Button>
      </section>
    </div>
  );
}
