export default function PrivacyTRPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Gizlilik Politikası (Türkçe)
          </h1>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-sm text-gray-600 mb-6">
              Son güncelleme: {new Date().toLocaleDateString("tr-TR")}
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                1. Giriş
              </h2>
              <p className="text-gray-700 mb-4">
                ActorRating.com olarak, kullanıcılarımızın gizliliğini korumayı taahhüt ediyoruz. 
                Bu gizlilik politikası, hangi bilgileri topladığımızı, nasıl kullandığımızı ve 
                koruduğumuzu açıklar.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                2. Toplanan Bilgiler
              </h2>
              <p className="text-gray-700 mb-4">
                Aşağıdaki bilgileri topluyoruz:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Hesap bilgileri (ad, e-posta, profil resmi)</li>
                <li>Kullanım verileri (değerlendirmeler, yorumlar)</li>
                <li>Teknik veriler (IP adresi, tarayıcı bilgileri)</li>
                <li>Çerezler ve benzer teknolojiler</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                3. Bilgilerin Kullanımı
              </h2>
              <p className="text-gray-700 mb-4">
                Topladığımız bilgileri aşağıdaki amaçlarla kullanıyoruz:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Hizmetlerimizi sağlamak ve iyileştirmek</li>
                <li>Kullanıcı deneyimini kişiselleştirmek</li>
                <li>Güvenliği sağlamak</li>
                <li>Yasal yükümlülükleri yerine getirmek</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                4. Bilgi Paylaşımı
              </h2>
              <p className="text-gray-700 mb-4">
                Kişisel bilgilerinizi üçüncü taraflarla paylaşmıyoruz, ancak aşağıdaki 
                durumlar hariç:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Yasal zorunluluklar</li>
                <li>Hizmet sağlayıcılarımız (veri işleme amaçlı)</li>
                <li>Kullanıcı onayı ile</li>
                <li>Güvenlik amaçlı</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                5. Veri Güvenliği
              </h2>
              <p className="text-gray-700 mb-4">
                Verilerinizi korumak için aşağıdaki önlemleri alıyoruz:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>SSL şifreleme</li>
                <li>Güvenli veri depolama</li>
                <li>Düzenli güvenlik güncellemeleri</li>
                <li>Erişim kontrolü</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                6. Çerezler
              </h2>
              <p className="text-gray-700 mb-4">
                Web sitemizde çerezler kullanıyoruz. Bu çerezler:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Oturum yönetimi için gerekli</li>
                <li>Kullanıcı tercihlerini hatırlamak için</li>
                <li>Analitik amaçlı</li>
                <li>Güvenlik için</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                7. Kullanıcı Hakları
              </h2>
              <p className="text-gray-700 mb-4">
                KVKK kapsamında aşağıdaki haklara sahipsiniz:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Kişisel verilerinize erişim</li>
                <li>Verilerinizin düzeltilmesi</li>
                <li>Verilerinizin silinmesi</li>
                <li>Verilerinizin işlenmesinin kısıtlanması</li>
                <li>Veri taşınabilirliği</li>
                <li>İtiraz hakkı</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                8. İletişim
              </h2>
              <p className="text-gray-700 mb-4">
                Gizlilik politikamız hakkında sorularınız için lütfen bizimle iletişime geçin.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
} 