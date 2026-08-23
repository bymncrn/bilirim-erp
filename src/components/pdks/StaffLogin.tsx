import { useServerFn } from "@tanstack/react-start";
import { Fingerprint, Loader2, LogIn } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDeviceId, signInStaff } from "@/lib/pdks-session";
import { staffLogin } from "@/lib/pdks-auth.functions";

export function StaffLogin() {
  const login = useServerFn(staffLogin);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (pin.length !== 4) {
        toast.error("PIN 4 haneli olmalıdır.");
        return;
      }
      const res = await login({ data: { phone, pin, deviceId: getDeviceId() } });
      if (!res.ok) {
        toast.error(
          res.reason === "device"
            ? "Güvenlik İhlali: Bu hesap başka bir cihaza kayıtlı."
            : "Cep telefonu numarası veya PIN hatalı.",
        );
        return;
      }
      signInStaff(res.staff);
      toast.success(`Hoş geldin ${res.staff.name}`);
    } catch {
      toast.error("Giriş yapılamadı. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center text-center">
          <div className="grid size-16 place-items-center rounded-3xl bg-primary text-primary-foreground shadow-lg">
            <Fingerprint className="size-8" />
          </div>
          <h1 className="mt-5 text-2xl font-black tracking-tight">Personel Girişi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Yöneticinizin tanımladığı cep telefonu numarası ve 4 haneli PIN ile giriş yapın.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="pos-shadow mt-8 space-y-4 rounded-3xl border border-border bg-card p-6"
        >
          <div className="space-y-2">
            <Label htmlFor="staff-phone">Cep Telefonu Numarası</Label>
            <Input
              id="staff-phone"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0555 000 00 00"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d\s+]/g, ""))}
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-pin">4 Haneli PIN</Label>
            <Input
              id="staff-pin"
              type="password"
              inputMode="numeric"
              placeholder="••••"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="h-12 text-base tracking-[0.3em]"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={busy}
            className="h-12 w-full rounded-2xl text-base font-bold"
          >
            {busy ? <Loader2 className="size-5 animate-spin" /> : <LogIn className="size-5" />}
            Giriş Yap
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Cihazınız hesabınıza eşleştirilir. Cihaz değişikliği için yöneticinizle iletişime geçin.
          </p>
        </form>
      </div>
    </div>
  );
}