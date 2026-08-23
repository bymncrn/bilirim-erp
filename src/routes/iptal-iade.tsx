import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/iptal-iade")({
  head: () => ({
    meta: [
      { title: "İptal ve İade Koşulları — Bilirim ERP" },
      {
        name: "description",
        content:
          "Bilirim ERP abonelik iptal, iade ve cayma hakkına ilişkin koşullar.",
      },
      { property: "og:title", content: "İptal ve İade Koşulları — Bilirim ERP" },
      {
        property: "og:description",
        content: "Abonelik iptal, iade ve cayma hakkına ilişkin koşullar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IptalIadePage,
});

function IptalIadePage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          İptal ve İade Koşulları
        </h1>
        <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
          <p className="font-bold">İPTAL VE İADE POLİTİKASI</p>
          <div>
            <p className="font-semibold">1. Dijital Hizmet Kapsamı</p>
            <p>
              Bilirim ERP üzerinden sunulan PDKS, Ön Muhasebe, Adisyon ve POS gibi yazılım modülleri, Mesafeli Sözleşmeler Yönetmeliği’nin 15. maddesinin 1. fıkrasının (ğ) bendi uyarınca "elektronik ortamda anında ifa edilen hizmetler veya tüketiciye anında teslim edilen gayrimaddi mallar" kapsamındadır. Bu nedenle, satın alınan abonelik paketleri anında aktif edilip kullanıma sunulduğundan, yasal cayma hakkı ve iade söz konusu değildir.
            </p>
          </div>
          <div>
            <p className="font-semibold">2. İptal İşlemleri</p>
            <p>
              Kullanıcılar, satın aldıkları aylık veya yıllık abonelik paketlerini diledikleri zaman kullanıcı panelleri üzerinden iptal edebilirler. İptal işlemi gerçekleştirildiğinde, mevcut fatura döneminin sonuna kadar sistem kullanılmaya devam edilebilir. Ancak, kullanılmayan günlerin ücreti kısmi olarak iade edilmez. Abonelik iptal edildiğinde, bir sonraki fatura dönemi için yenileme yapılmaz ve karttan ücret çekilmez.
            </p>
          </div>
          <div>
            <p className="font-semibold">3. İstisnai Durumlar</p>
            <p>
              Alınan hizmette teknik bir arıza olması ve CRN SOFT - ZEYNEL ABİDİN CERAN tarafından bu arızanın makul süre içinde giderilememesi durumunda, kullanıcının talebi üzerine inceleme yapılarak teknik ekibin onayına istinaden ücret iadesi değerlendirilebilir. İade onaylandığı takdirde, işlem 7 ila 14 iş günü içerisinde ödemenin yapıldığı kredi kartına veya banka hesabına yansıtılır.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
