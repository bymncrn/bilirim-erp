import { Share, X } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "bilirim.pdks.install-hint";

/** Ana ekrana ekleme yonergesini gosteren bilgilendirme balonu. */
export function InstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    if (window.localStorage.getItem(KEY) === "dismissed") return;
    const t = window.setTimeout(() => setShow(true), 1200);
    return () => window.clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 z-40 px-4">
      <div className="pos-shadow mx-auto flex w-full max-w-[440px] items-start gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Share className="size-4" />
        </div>
        <p className="min-w-0 text-xs leading-relaxed text-muted-foreground">
          Lütfen daha iyi bir deneyim için tarayıcı menüsünden{" "}
          <span className="font-semibold text-foreground">Ana Ekrana Ekle</span> seçeneğine
          dokunun.
        </p>
        <button
          type="button"
          aria-label="Kapat"
          onClick={() => {
            window.localStorage.setItem(KEY, "dismissed");
            setShow(false);
          }}
          className="ml-auto shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}