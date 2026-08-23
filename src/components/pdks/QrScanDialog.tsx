import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";

/** Telefon kamerasini acip QR kodu okuyan tam ekran katman. */
export function QrScanDialog({
  open,
  onClose,
  onResult,
}: {
  open: boolean;
  onClose: () => void;
  onResult: (text: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    if (!open) return;
    let scanner: { stop: () => void; destroy: () => void } | null = null;
    let cancelled = false;

    void (async () => {
      setError(null);
      setStarting(true);
      try {
        const { default: QrScanner } = await import("qr-scanner");
        if (cancelled || !videoRef.current) return;
        const instance = new QrScanner(
          videoRef.current,
          (result) => {
            onResult(result.data);
            instance.stop();
          },
          { preferredCamera: "environment", highlightScanRegion: true, maxScansPerSecond: 5 },
        );
        scanner = instance;
        await instance.start();
        if (!cancelled) setStarting(false);
      } catch {
        if (!cancelled) {
          setStarting(false);
          setError("Kameraya erişilemedi. Lütfen kamera iznini verin.");
        }
      }
    })();

    return () => {
      cancelled = true;
      scanner?.stop();
      scanner?.destroy();
    };
  }, [open, onResult]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-foreground/95">
      <div className="flex items-center justify-between px-5 py-4 text-background">
        <p className="text-sm font-bold">QR Kodu Okutun</p>
        <button type="button" onClick={onClose} aria-label="Kapat" className="rounded-full p-2">
          <X className="size-5" />
        </button>
      </div>
      <div className="relative flex-1">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        {(starting || error) && (
          <div className="absolute inset-0 grid place-items-center px-8 text-center text-background">
            {error ? (
              <p className="text-sm font-semibold">{error}</p>
            ) : (
              <Loader2 className="size-8 animate-spin" />
            )}
          </div>
        )}
      </div>
      <p className="px-6 pb-8 pt-4 text-center text-xs text-background/70">
        Kodu çerçevenin içine hizalayın; okuma otomatik yapılır.
      </p>
    </div>
  );
}
