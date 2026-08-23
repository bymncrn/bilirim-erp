import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/mesafeli-satis")({
  head: () => ({
    meta: [
      { title: "Mesafeli Satış Sözleşmesi — Bilirim ERP" },
      {
        name: "description",
        content:
          "Bilirim ERP dijital hizmet aboneliklerine ilişkin mesafeli satış sözleşmesi ve ön bilgilendirme formu.",
      },
      { property: "og:title", content: "Mesafeli Satış Sözleşmesi — Bilirim ERP" },
      {
        property: "og:description",
        content: "Dijital hizmet aboneliklerine ilişkin mesafeli satış sözleşmesi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MesafeliSatisPage,
});

function MesafeliSatisPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Mesafeli Satış Sözleşmesi
        </h1>
        <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
          <p>Mesafeli Satış Sözleşmesi</p>
          <p>Bu metni, ödeme sayfasında (Checkout) o eklediğimiz onay kutucuğuna tıklandığında açılacak bir sayfa (Pop-up veya ayrı bir link) olarak eklemelisin.</p>
          <p className="font-bold">MESAFELİ SATIŞ SÖZLEŞMESİ</p>
          
          <div>
            <p className="font-semibold underline">Madde 1: Taraflar</p>
            <p><strong>Satıcı:</strong> Ünvanı: CRN SOFT - ZEYNEL ABİDİN CERAN Adresi: SAKARYA MAH. ŞHT. ASTĞM. MURAT ÖZGÜN SOK. NO:57/1 OSMANGAZİ - BURSA Vergi Dairesi ve No: ULUDAĞ - 22715040348 Telefon: 02245320276 E-Posta: info@crnsoft.com</p>
            <p className="mt-2"><strong>Alıcı:</strong> Bilirim ERP sistemi üzerinden abonelik/paket satın alan kullanıcı veya firma (Bundan böyle "Alıcı" olarak anılacaktır).</p>
          </div>

          <div>
            <p className="font-semibold underline">Madde 2: Sözleşmenin Konusu</p>
            <p>Bu sözleşmenin konusu, Alıcı'nın Satıcı'ya ait Bilirim ERP platformu (bilirim.com.tr) üzerinden elektronik ortamda siparişini verdiği yazılım abonelik paketinin (PDKS, POS, Muhasebe vb.) satışı, teslimi ve kullanımı ile ilgili 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerinin saptanmasıdır.</p>
          </div>

          <div>
            <p className="font-semibold underline">Madde 3: Hizmetin Teslimi ve Şekli</p>
            <p>Satın alınan yazılım hizmeti dijital niteliktedir. Ödeme işleminin başarıyla gerçekleşmesinin (veya havale/EFT kontrolünün yapılmasının) ardından hizmet anında Alıcı'nın erişimine açılır. Herhangi bir fiziki kargo gönderimi yapılmayacaktır.</p>
          </div>

          <div>
            <p className="font-semibold underline">Madde 4: Cayma Hakkı</p>
            <p>Taraflar, sözleşme konusunun "elektronik ortamda anında ifa edilen hizmetler" olması sebebiyle Alıcı'nın yasal cayma hakkı bulunmadığını kabul, beyan ve taahhüt eder.</p>
          </div>

          <div>
            <p className="font-semibold underline">Madde 5: Uyuşmazlıkların Çözümü</p>
            <p>İşbu Sözleşme'nin uygulanmasından doğabilecek her türlü uyuşmazlığın çözümünde, Bursa Tüketici Hakem Heyetleri ve Mahkemeleri yetkilidir.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
