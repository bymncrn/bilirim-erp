import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SystemShell } from "@/components/system/SystemShell";
import { fetchAuditLogs } from "@/lib/audit-log";
import { useRole } from "@/lib/rbac";

export const Route = createFileRoute("/sistem/loglar")({
  head: () => ({
    meta: [
      { title: "Sistem Logları — Bilirim" },
      {
        name: "description",
        content:
          "İşletmenizde yapılan tüm silme ve güncelleme işlemlerini kullanıcı ve tarih bazında izleyin.",
      },
      { property: "og:title", content: "Sistem Logları — Bilirim" },
      {
        property: "og:description",
        content: "Kritik işlemlerin değiştirilemez kronolojik kaydı.",
      },
    ],
  }),
  component: LogsPage,
});

const fmt = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("tr-TR");
};

function LogsPage() {
  const { role } = useRole();
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: fetchAuditLogs,
    enabled: role === "yonetici",
  });

  if (role !== "yonetici") {
    return (
      <SystemShell title="Sistem Logları">
        <p className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Bu sayfa yalnızca Yönetici rolündeki kullanıcılara açıktır.
        </p>
      </SystemShell>
    );
  }

  return (
    <SystemShell title="Sistem Logları" description={`${logs.length} kayıt (salt okunur)`}>
      <div className="mx-auto max-w-6xl">
        <div className="pos-shadow overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3">Kullanıcı</th>
                <th className="px-4 py-3">İşlem</th>
                <th className="px-4 py-3">Özet</th>
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
              {!isLoading && logs.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                    Henüz kayıtlı işlem bulunmuyor.
                  </td>
                </tr>
              )}
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {fmt(l.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{l.userName}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                      {l.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{l.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SystemShell>
  );
}