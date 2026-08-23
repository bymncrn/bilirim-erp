/** Fişi gizli bir iframe içinde yazdırır: sayfa düzeni bozulmaz, boş çıktı olmaz. */
export function printElementById(id: string, opts?: { pageSize?: string; widthMm?: number }) {
  const pageSize = opts?.pageSize ?? "80mm auto";
  const widthMm = opts?.widthMm ?? 80;
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (!el) return;

  const head = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((n) => n.outerHTML)
    .join("\n");

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("title", "Fiş yazdırma alanı");
  iframe.style.cssText =
    `position:fixed;left:-10000px;top:0;width:${widthMm}mm;height:1200px;border:0;opacity:0;pointer-events:none;`;
  document.body.appendChild(iframe);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    iframe.remove();
  };

  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8">${head}` +
      `<style>@page{size:${pageSize};margin:0}html,body{margin:0;padding:0;background:#fff;width:${widthMm}mm}` +
      `body *{visibility:visible !important}` +
      `#${id}{position:static !important;width:${widthMm}mm !important;max-width:${widthMm}mm !important;` +
      `padding:${widthMm > 100 ? "8mm 7mm" : "4mm 2mm"} !important;border-radius:0 !important;box-shadow:none !important;` +
      `background:#fff !important;color:#000 !important}</style>` +
      `</head><body>${el.outerHTML}</body></html>`,
  );
  doc.close();

  const run = () => {
    const w = iframe.contentWindow;
    if (!w) return cleanup();
    const printWhenReady = async () => {
      try {
        await doc.fonts?.ready;
        const images = Array.from(doc.images);
        await Promise.all(
          images.map((image) =>
            image.complete
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  image.addEventListener("load", () => resolve(), { once: true });
                  image.addEventListener("error", () => resolve(), { once: true });
                }),
          ),
        );
      } catch {
        // Font veya logo yüklenemese de metin fişi yazdırılır.
      }
      w.addEventListener("afterprint", cleanup, { once: true });
      w.focus();
      w.print();
      window.setTimeout(cleanup, 60_000);
    };
    window.setTimeout(() => void printWhenReady(), 150);
  };

  if (doc.readyState === "complete") run();
  else iframe.addEventListener("load", run, { once: true });
}
