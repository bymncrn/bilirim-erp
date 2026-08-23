import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, Wrench, CheckCircle2, Clock, PackageSearch, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  lookupServiceStatus,
  type PublicServiceStatus,
} from "@/lib/service-status.functions";
import { fmtMoney } from "@/lib/currency";

export const Route = createFileRoute("/servis-durumu")({
  validateSearch: (search: Record<string, unknown>) => ({
    fisNo: typeof search["fisNo"] === "string" ? search["fisNo"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Servis Durumu Sorgulama — Bilirim ERP" },
      {
        name: "description",
        content:
          "Teknik servis fiş numaranızı girerek cihazınızın onarım durumunu anında öğrenin. Üyelik veya giriş gerekmez.",
      },
      { property: "og:title", content: "Servis Durumu Sorgulama — Bilirim ERP" },
      {
        property: "og:description",
        content: "Fiş numaranızla cihazınızın güncel servis durumunu takip edin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ServiceStatusPage,
});

const STEPS = ["Beklemede", "Onarımda", "Parça Bekliyor", "Hazır", "Tamamlandı"];

const STEP_ICON = [Clock, Wrench, PackageSearch, CheckCircle2, CheckCircle2];

function ServiceStatusPage() {
  const { fisNo } = Route.useSearch();
  const navigate = useNavigate();
  const lookup = useServerFn(lookupServiceStatus);
  const [query, setQuery] = useState(fisNo ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PublicServiceStatus | null>(null);
  const [notFound, setNotFound] = useState(false);

  const run = async (no: string) => {
    const value = no.trim();
    if (!value) return;
    setLoading(true);
    setNotFound(false);
    try {
      const res = await lookup({ data: { number: value } });
      if (res.ok) {
        setResult(res.ticket);
      } else {
        setResult(null);
        setNotFound(true);
      }
    } catch {
      setResult(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fisNo) void run(fisNo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fisNo]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void navigate({ to: "/servis-durumu", search: { fisNo: query.trim() } });
    void run(query);
  };

  const activeIndex = result
    ? result.status === "Teslim Edildi" || result.status === "Faturalandırıldı"
      ? STEPS.length - 1
      : STEPS.indexOf(result.status)
    : -1;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
              Servis Durumu Sorgulama
            </h1>
            <p className="text-xs text-muted-foreground">
              Cihazınızın onarım sürecini fiş numaranızla takip edin
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <form
          onSubmit={submit}
          className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-md sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Servis Fiş Numaranızı Giriniz"
              aria-label="Servis fiş numarası"
              className="h-12 pl-9 text-base"
            />
          </div>
          <Button type="submit" disabled={loading} className="h-12 gap-2 px-6 text-base">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Sorgula
          </Button>
        </form>

        {notFound && (
          <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="font-semibold text-foreground">Kayıt bulunamadı</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Girdiğiniz fiş numarasına ait bir servis kaydı bulunamadı. Lütfen numarayı kontrol
              edin.
            </p>
          </div>
        )}

        {result && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-md">
            <div className="border-b border-border bg-primary/5 px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {result.companyName || "Teknik Servis"}
              </p>
              <p className="mt-0.5 text-xl font-bold tracking-tight text-foreground">
                {result.number}
              </p>
            </div>

            <dl className="grid gap-4 px-5 py-4 sm:grid-cols-2">
              <Info label="Müşteri" value={result.customerMasked} />
              <Info label="Cihaz" value={result.device} />
              <Info
                label="Kayıt Tarihi"
                value={
                  result.createdAt ? new Date(result.createdAt).toLocaleDateString("tr-TR") : "—"
                }
              />
              <Info label="Güncel Durum" value={result.status} />
            </dl>

            <div className="border-t border-border px-5 py-5">
              <p className="mb-4 text-sm font-semibold text-foreground">Servis Süreci</p>
              <ol className="space-y-4">
                {STEPS.map((s, i) => {
                  const Icon = STEP_ICON[i] ?? Clock;
                  const done = activeIndex >= 0 && i <= activeIndex;
                  const isCurrent = i === activeIndex;
                  return (
                    <li key={s} className="flex items-start gap-3">
                      <span
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${
                          done
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="pt-1.5">
                        <p
                          className={`text-sm ${isCurrent ? "font-bold text-foreground" : done ? "font-medium text-foreground" : "text-muted-foreground"}`}
                        >
                          {s}
                        </p>
                        {isCurrent && (
                          <p className="text-xs text-muted-foreground">
                            Cihazınız şu anda bu aşamada.
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            {result.total !== null && (
              <div className="border-t border-border px-5 py-4">
                {result.lines.length > 0 && (
                  <ul className="mb-3 space-y-1.5">
                    {result.lines.map((l, i) => (
                      <li key={i} className="flex justify-between text-sm text-muted-foreground">
                        <span>
                          {l.name} × {l.qty}
                        </span>
                        <span>{fmtMoney(l.qty * l.price)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Toplam Tutar</span>
                  <span className="text-2xl font-bold text-foreground">
                    {fmtMoney(result.total)}
                  </span>
                </div>
              </div>
            )}
          </section>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Gizliliğiniz için müşteri adı maskelenir ve iletişim bilgileri gösterilmez.
        </p>
      </main>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}
