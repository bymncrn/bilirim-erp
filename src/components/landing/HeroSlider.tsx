import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroMuhasebeAsset from "@/assets/hero-muhasebe.png.asset.json";
import heroPosAsset from "@/assets/hero-pos.png.asset.json";
import heroAdisyonAsset from "@/assets/hero-adisyon.png.asset.json";
import heroServisAsset from "@/assets/hero-servis.png.asset.json";
import heroPdksAsset from "@/assets/hero-pdks.png.asset.json";

const heroMuhasebe = heroMuhasebeAsset.url;
const heroAdisyon = heroAdisyonAsset.url;
const heroPos = heroPosAsset.url;
const heroServis = heroServisAsset.url;
const heroPdks = heroPdksAsset.url;

const slides = [
  {
    tag: "Ön Muhasebe",
    title: "Ön Muhasebede Tam Kontrol",
    desc: "Gelir-gider takibi, e-fatura ve cari hesaplarınızı bulut teknolojisiyle tek ekrandan yönetin.",
    image: heroMuhasebe,
    alt: "Ofiste evrak ve hesap makinesiyle çalışan muhasebe uzmanı",
  },
  {
    tag: "Hızlı POS",
    title: "Işık Hızında Perakende Satış",
    desc: "Market ve mağazanızda terazi entegrasyonlu Bulut POS ile saniyeler içinde satış yapın.",
    image: heroPos,
    alt: "Manav ve şarküteri reyonunda POS terminali başındaki esnaf",
  },
  {
    tag: "Adisyon",
    title: "Restoran ve Kafe Yönetimi",
    desc: "QR menü, masa takibi ve mutfak sipariş ekranlarıyla işletmenizi dijitalleştirin.",
    image: heroAdisyon,
    alt: "Restoranda POS terminalinde adisyon alan garson",
  },
  {
    tag: "Teknik Servis",
    title: "Kusursuz Teknik Servis Takibi",
    desc: "Müşteri cihaz kayıtları, onarım süreçleri ve durum bildirimlerini eksiksiz takip edin.",
    image: heroServis,
    alt: "Teknik servis tezgahında telefon onaran teknisyen ve servis kayıt ekranı",
  },
  {
    tag: "PDKS",
    title: "Sıfır Cihaz Maliyetli & KVKK Uyumlu PDKS",
    desc: "Personelinizin giriş-çıkış takibini binlerce liralık cihazlar olmadan, konum doğrulamalı mobil QR sistemiyle yapın. Yeni KVKK Yönetmeliğine %100 Uygun (Biyometrik veri barındırmaz).",
    image: heroPdks,
    alt: "Şantiye girişinde telefonuyla QR kod okutarak mesai başlatan işçi",
  },
];

export function HeroSlider({ onStart, onLogin }: { onStart: () => void; onLogin: () => void }) {
  const [index, setIndex] = useState(0);

  const go = useCallback((dir: 1 | -1) => {
    setIndex((i) => (i + dir + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [index]);

  const slide = slides[index]!;

  return (
    <section className="relative overflow-hidden bg-brand-navy text-brand-navy-foreground">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-orange/20 blur-3xl" />
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:py-20 lg:grid-cols-2">
        <div key={`t-${index}`} className="animate-slide-in-left">
          <span className="inline-flex rounded-full bg-brand-orange/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-orange">
            {slide.tag}
          </span>
          <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {slide.title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-brand-navy-foreground/75 sm:text-lg">
            {slide.desc}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              onClick={onStart}
              className="bg-brand-orange text-brand-orange-foreground transition-all duration-200 hover:scale-105 hover:bg-brand-orange/90 hover:shadow-lg"
            >
              Hemen Başla
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={onLogin}
              className="border-brand-navy-foreground/30 bg-transparent text-brand-navy-foreground transition-all duration-200 hover:scale-105 hover:bg-brand-navy-foreground/10 hover:text-brand-navy-foreground hover:shadow-lg"
            >
              Giriş Yap
            </Button>
          </div>
        </div>

        <div key={`i-${index}`} className="animate-slide-in-right">
          <div className="overflow-hidden rounded-3xl border border-brand-navy-foreground/15 shadow-2xl transition-transform duration-300 hover:scale-105">
            <img
              src={slide.image}
              alt={slide.alt}
              width={1024}
              height={768}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 pb-10">
        <button
          type="button"
          aria-label="Önceki slayt"
          onClick={() => go(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-navy-foreground/25 transition-all duration-200 hover:scale-110 hover:bg-brand-orange hover:text-brand-orange-foreground hover:shadow-lg"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Sonraki slayt"
          onClick={() => go(1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-navy-foreground/25 transition-all duration-200 hover:scale-110 hover:bg-brand-orange hover:text-brand-orange-foreground hover:shadow-lg"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="ml-3 flex items-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.tag}
              type="button"
              aria-label={`${s.tag} slaytına git`}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index ? "w-8 bg-brand-orange" : "w-2 bg-brand-navy-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
