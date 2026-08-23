import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/kvkk")({
  head: () => ({
    meta: [
      { title: "KVKK ve Gizlilik Politikası — Bilirim ERP" },
      {
        name: "description",
        content:
          "Bilirim ERP Kişisel Verilerin Korunması Kanunu kapsamında aydınlatma metni ve gizlilik politikası.",
      },
      { property: "og:title", content: "KVKK ve Gizlilik Politikası — Bilirim ERP" },
      {
        property: "og:description",
        content: "KVKK aydınlatma metni ve gizlilik politikası.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KvkkPage,
});

function KvkkPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          KVKK ve Gizlilik Politikası
        </h1>
        <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
          <p>
            KVKK ve Gizlilik Aydınlatma Metni
          </p>
          <p>
            Kullanıcıların kredi kartı veya telefon gibi verilerini PayTR (ödeme kuruluşu) ile paylaşacağın için bu metin güven verir ve yasal zorunluluktur.
          </p>
          <p className="font-bold">KİŞİSEL VERİLERİN KORUNMASI VE GİZLİLİK POLİTİKASI</p>
          <div>
            <p className="font-semibold">1. Veri Sorumlusu</p>
            <p>
              6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, kişisel verileriniz veri sorumlusu sıfatıyla CRN SOFT - ZEYNEL ABİDİN CERAN tarafından aşağıda açıklanan kapsamda işlenebilecektir.
            </p>
          </div>
          <div>
            <p className="font-semibold">2. İşlenen Kişisel Veriler ve İşlenme Amaçları</p>
            <p>
              Bilirim ERP sistemine kayıt olmanız ve abonelik satın almanız esnasında paylaştığınız ad, soyad, telefon numarası, e-posta adresi, fatura bilgileri ve IP adresiniz;
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Hizmetlerimizin size sunulması ve üyelik sözleşmesinin gerekliliklerinin yerine getirilmesi,</li>
              <li>Finans ve muhasebe işlerinin (Fatura kesimi vb.) yürütülmesi,</li>
              <li>Ödeme işlemlerinin güvenli bir şekilde gerçekleştirilmesi amaçlarıyla işlenmektedir. (Kredi kartı bilgileriniz sistemlerimizde saklanmaz, doğrudan BDDK lisanslı ödeme kuruluşuna (PayTR) şifreli olarak iletilir).</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold">3. Kişisel Verilerin Aktarımı</p>
            <p>
              Toplanan kişisel verileriniz, kanuni yükümlülüklerimizin yerine getirilmesi amacıyla yetkili kamu kurumlarına; finansal işlemlerin yürütülmesi amacıyla e-fatura entegratörlerine ve ödeme altyapısı sağlayıcılarına (PayTR vb.) aktarılabilmektedir.
            </p>
          </div>
          <div>
            <p className="font-semibold">4. İletişim ve Haklarınız</p>
            <p>
              KVKK'nın 11. maddesi uyarınca haklarınızı kullanmak ve verilerinizin silinmesini/güncellenmesini talep etmek için info@crnsoft.com adresi üzerinden bizimle iletişime geçebilirsiniz.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
