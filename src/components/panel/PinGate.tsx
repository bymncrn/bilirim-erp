import { Delete, Lock } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useStaff, type PermKey, type Staff } from "@/lib/panel-store";

export function PinGate({
  requiredPerm,
  hint = "Demo PIN: 1234 (Yönetici)",
  header,
  children,
}: {
  requiredPerm: PermKey;
  hint?: string;
  header?: ReactNode;
  children: (session: Staff, logout: () => void) => ReactNode;
}) {
  const staff = useStaff();
  const [session, setSession] = useState<Staff | null>(null);
  const [pin, setPin] = useState("");

  const press = (digit: string) => {
    const next = (pin + digit).slice(0, 4);
    setPin(next);
    if (next.length < 4) return;
    const found = staff.find((s) => s.pin === next);
    setTimeout(() => {
      if (!found) {
        toast.error("Hatalı PIN kodu.");
      } else if (!found.active) {
        toast.error("Bu kullanıcı pasif durumda.");
      } else if (!found.perms.includes(requiredPerm)) {
        toast.error("Bu ekran için yetkiniz bulunmuyor.");
      } else {
        setSession(found);
        toast.success(`Hoş geldiniz, ${found.name}`);
      }
      setPin("");
    }, 120);
  };

  if (session) return <>{children(session, () => setSession(null))}</>;

  return (
    <div className="min-h-screen bg-background">
      {header}
      <div className="mx-auto flex max-w-sm flex-col items-center px-5 py-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-foreground">4 Haneli PIN Kodunuz</h2>
        <p className="mt-1 text-sm text-muted-foreground">{hint}</p>

        <div className="mt-6 flex gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-4 w-4 rounded-full border-2 ${
                pin.length > i ? "border-primary bg-primary" : "border-border bg-transparent"
              }`}
            />
          ))}
        </div>

        <div className="mt-8 grid w-full grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button
              key={d}
              onClick={() => press(d)}
              className="pos-card-press pos-shadow h-16 rounded-2xl border border-border bg-card text-2xl font-bold text-foreground hover:bg-accent"
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => setPin("")}
            className="pos-card-press h-16 rounded-2xl border border-border bg-muted text-sm font-semibold text-muted-foreground"
          >
            Temizle
          </button>
          <button
            onClick={() => press("0")}
            className="pos-card-press pos-shadow h-16 rounded-2xl border border-border bg-card text-2xl font-bold text-foreground hover:bg-accent"
          >
            0
          </button>
          <button
            onClick={() => setPin((p) => p.slice(0, -1))}
            className="pos-card-press flex h-16 items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground"
            aria-label="Sil"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
