import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ScrollText, Settings, ShieldCheck } from "lucide-react";
import { SystemShell } from "@/components/system/SystemShell";

export const Route = createFileRoute("/sistem/")({
  head: () => ({
    meta: [
      { title: "Sistem Yönetimi — Bilirim ERP" },
      {
        name: "description",
        content:
          "Kullanıcı hesapları, modül yetkileri, sistem logları ve genel ayarları tek merkezden yönetin.",
      },
      { property: "og:title", content: "Sistem Yönetimi — Bilirim ERP" },
      {
        property: "og:description",
        content: "Firma sahibine özel merkezi kullanıcı, yetki ve ayar yönetimi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SystemHome,
});

const CARDS = [
  {
    to: "/sistem/kullanicilar" as const,
    title: "Kullanıcılar & Yetkiler",
    desc: "Personel hesabı açın, rol atayın ve erişebileceği modülleri seçin.",
    icon: ShieldCheck,
    tone: "bg-primary/10 text-primary",
  },
  {
    to: "/sistem/loglar" as const,
    title: "Sistem Logları",
    desc: "Silme ve güncelleme işlemlerinin kronolojik kaydını inceleyin.",
    icon: ScrollText,
    tone: "bg-brand-orange/10 text-brand-orange",
  },
  {
    to: "/sistem/ayarlar" as const,
    title: "Genel Ayarlar",
    desc: "İşletme tercihleri, bildirim ve tema ayarlarını düzenleyin.",
    icon: Settings,
    tone: "bg-pos-sky/20 text-foreground",
  },
];

function SystemHome() {
  return (
    <SystemShell
      title="Sistem Yönetimi"
      description="Firma sahibine özel merkezi yönetim paneli"
    >
      <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.to}
              to={c.to}
              className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${c.tone}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-sm font-bold text-foreground">{c.title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.desc}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                Aç
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </SystemShell>
  );
}
