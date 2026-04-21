"use client"

import { useState } from "react"

export default function PrivacyPage() {
  const [language, setLanguage] = useState<"en" | "tr">("en")

  const content = {
    en: {
      title: "Privacy Policy",
      lastUpdated: "Last updated:",
      sections: [
        {
          title: "1. Data Controller",
          content: "ActorRating Yazılım A.Ş. ('we', 'us', 'our') is the data controller responsible for the processing of your personal data. We are a limited company registered in Istanbul, Türkiye. For privacy matters, please contact us at contact@actorrating.com."
        },
        {
          title: "2. Personal Data We Collect",
          content: "We collect the following categories of personal data:",
          list: [
            "Account information (name, email address, profile picture from Google Sign-In)",
            "Usage data (actor ratings, performance reviews, comments)",
            "Technical data (IP address, browser type, device information)",
            "Session data (login times, user preferences)",
            "Analytics data (page views, feature usage, performance metrics)"
          ]
        },
        {
          title: "3. Legal Basis for Processing",
          content: "We process your personal data based on the following legal grounds under GDPR and KVKK:",
          list: [
            "Consent: When you explicitly agree to our data processing activities",
            "Contract performance: To provide our rating and review services",
            "Legitimate interest: To improve our services, ensure security, and prevent fraud",
            "Legal obligation: To comply with applicable laws and regulations"
          ]
        },
        {
          title: "4. How We Use Your Data",
          content: "We use your personal data for the following purposes:",
          list: [
            "Providing and maintaining our actor rating platform",
            "Processing your ratings and reviews",
            "Personalizing your user experience",
            "Ensuring platform security and preventing abuse",
            "Analyzing usage patterns to improve our services",
            "Communicating with you about your account and our services",
            "Complying with legal obligations"
          ]
        },
        {
          title: "5. Data Sharing and Third Parties",
          content: "We may share your data with the following third parties. We only share data necessary for the operation of our Service:",
          list: [
            "Google (for authentication via Google Sign-In) - See Google's Privacy Policy: https://policies.google.com/privacy",
            "Vercel (for hosting and infrastructure) - See Vercel's Privacy Policy: https://vercel.com/legal/privacy-policy",
            "PostgreSQL (self-hosted database) and application servers — processed under this policy and our hosting providers' terms.",
            "Legal authorities (when required by law or to protect our rights)",
            "Service providers (for technical support and maintenance, bound by confidentiality agreements)"
          ]
        },
        {
          title: "6. Data Retention",
          content: "We retain your personal data for as long as necessary to provide our services and comply with legal obligations:",
          list: [
            "Account data: Until you delete your account or request deletion",
            "Usage data: Up to 3 years for analytics and service improvement",
            "Technical logs: Up to 1 year for security and troubleshooting",
            "Legal compliance: As required by applicable laws"
          ]
        },
        {
          title: "7. Your Rights Under GDPR and KVKK",
          content: "You have the following rights regarding your personal data:",
          list: [
            "Right of access: Request information about your personal data",
            "Right of rectification: Correct inaccurate or incomplete data",
            "Right of erasure: Request deletion of your personal data (see Account Deletion below)",
            "Right to restrict processing: Limit how we use your data",
            "Right to data portability: Receive your data in a structured format",
            "Right to object: Object to processing based on legitimate interests",
            "Right to withdraw consent: Withdraw consent at any time",
            "Right to lodge a complaint: Contact supervisory authorities"
          ]
        },
        {
          title: "7.1. Account Deletion",
          content: "You can delete your account and all associated data at any time through the following methods:",
          list: [
            "Account Settings: Navigate to your profile settings and select 'Delete Account'",
            "Email Request: Send a deletion request to contact@actorrating.com with your account email",
            "Data Export: Before deletion, you can export your data from your profile page",
            "Processing Time: Account deletion is processed within 30 days of your request",
            "Retention Exceptions: Some data may be retained longer if required by law (e.g., transaction records for tax purposes)"
          ]
        },
        {
          title: "8. Cookies and Tracking",
          content: "We use cookies and similar technologies categorized as follows:",
          list: [
            "Essential Cookies: Required for the Service to function (e.g., maintaining your login session, security features). These cannot be disabled.",
            "Functional Cookies: Remember your preferences and settings to enhance your experience.",
            "Analytics Cookies: Help us understand platform usage and performance to improve our services. These are anonymized and aggregated.",
            "Security Cookies: Ensure security and prevent fraud, including reCAPTCHA for bot prevention."
          ]
        },
        {
          title: "9. Data Security",
          content: "We implement appropriate technical and organizational measures to protect your personal data:",
          list: [
            "Encryption of data in transit and at rest",
            "Regular security assessments and updates",
            "Access controls and authentication measures",
            "Employee training on data protection",
            "Incident response procedures"
          ]
        },
        {
          title: "9.1. Data Breach Notification",
          content: "In the event of a data breach that may affect your personal data, we will:",
          list: [
            "Notify relevant supervisory authorities within 72 hours of becoming aware of the breach (as required by GDPR)",
            "Notify affected users without undue delay if the breach is likely to result in a high risk to their rights and freedoms",
            "Provide clear information about the nature of the breach, likely consequences, and measures taken to address it",
            "Provide guidance on steps you can take to protect yourself",
            "Maintain records of all data breaches as required by law"
          ]
        },
        {
          title: "10. International Data Transfers",
          content: "Your data may be transferred to and processed in countries outside your residence. We ensure adequate protection through:",
          list: [
            "Standard contractual clauses (SCCs)",
            "Adequacy decisions by relevant authorities",
            "Other appropriate safeguards as required by law"
          ]
        },
        {
          title: "11. Children's Privacy",
          content: "Our services are not intended for children under 13 years of age. We do not knowingly collect personal data from children under 13. If you are a parent or guardian and believe your child has provided us with personal data, please contact us immediately."
        },
        {
          title: "12. Changes to This Policy",
          content: "We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on our website and updating the 'Last updated' date. Your continued use of our services after such changes constitutes acceptance of the updated policy."
        },
        {
          title: "13. Contact Information",
          content: "For any questions about this Privacy Policy or to exercise your rights, please contact us:",
          list: [
            "Email: contact@actorrating.com",
            "Company: ActorRating Yazılım A.Ş.",
            "Address: Istanbul, Türkiye",
            "For Turkish users: You may also contact the Turkish Personal Data Protection Authority (KVKK)"
          ]
        }
      ]
    },
    tr: {
      title: "Gizlilik Politikası",
      lastUpdated: "Son güncelleme:",
      sections: [
        {
          title: "1. Veri Sorumlusu",
          content: "ActorRating Yazılım A.Ş. ('biz', 'bizim', 'bizimki') kişisel verilerinizin işlenmesinden sorumlu veri sorumlusudur. İstanbul, Türkiye'de kayıtlı bir limited şirketiz. Gizlilik konuları için lütfen privacy@actorrating.com adresinden bizimle iletişime geçin."
        },
        {
          title: "2. Topladığımız Kişisel Veriler",
          content: "Aşağıdaki kişisel veri kategorilerini topluyoruz:",
          list: [
            "Hesap bilgileri (Google Sign-In'den alınan ad, e-posta adresi, profil resmi)",
            "Kullanım verileri (oyuncu değerlendirmeleri, performans yorumları, yorumlar)",
            "Teknik veriler (IP adresi, tarayıcı türü, cihaz bilgileri)",
            "Oturum verileri (giriş zamanları, kullanıcı tercihleri)",
            "Analitik veriler (sayfa görüntülemeleri, özellik kullanımı, performans metrikleri)"
          ]
        },
        {
          title: "3. İşleme Hukuki Sebebi",
          content: "Kişisel verilerinizi GDPR ve KVKK kapsamında aşağıdaki hukuki sebeplere dayanarak işliyoruz:",
          list: [
            "Rıza: Veri işleme faaliyetlerimize açıkça onay verdiğinizde",
            "Sözleşme ifası: Değerlendirme ve yorum hizmetlerimizi sağlamak için",
            "Meşru menfaat: Hizmetlerimizi iyileştirmek, güvenliği sağlamak ve dolandırıcılığı önlemek için",
            "Yasal yükümlülük: Geçerli yasa ve düzenlemelere uymak için"
          ]
        },
        {
          title: "4. Verilerinizi Nasıl Kullanıyoruz",
          content: "Kişisel verilerinizi aşağıdaki amaçlarla kullanıyoruz:",
          list: [
            "Oyuncu değerlendirme platformumuzu sağlamak ve sürdürmek",
            "Değerlendirmelerinizi ve yorumlarınızı işlemek",
            "Kullanıcı deneyiminizi kişiselleştirmek",
            "Platform güvenliğini sağlamak ve kötüye kullanımı önlemek",
            "Hizmetlerimizi iyileştirmek için kullanım kalıplarını analiz etmek",
            "Hesabınız ve hizmetlerimiz hakkında sizinle iletişim kurmak",
            "Yasal yükümlülüklere uymak"
          ]
        },
        {
          title: "5. Veri Paylaşımı ve Üçüncü Taraflar",
          content: "Verilerinizi aşağıdaki üçüncü taraflarla paylaşabiliriz. Yalnızca Hizmetimizin işleyişi için gerekli verileri paylaşıyoruz:",
          list: [
            "Google (Google Sign-In ile kimlik doğrulama için) - Google Gizlilik Politikası: https://policies.google.com/privacy",
            "Vercel (barındırma ve altyapı için) - Vercel Gizlilik Politikası: https://vercel.com/legal/privacy-policy",
            "PostgreSQL (barındırılan veritabanı) ve uygulama sunucuları — bu politika ve barındırma sağlayıcılarının koşulları kapsamında işlenir.",
            "Yasal makamlar (yasa gereği gerekli olduğunda veya haklarımızı korumak için)",
            "Hizmet sağlayıcıları (teknik destek ve bakım için, gizlilik anlaşmalarıyla bağlı)"
          ]
        },
        {
          title: "6. Veri Saklama",
          content: "Kişisel verilerinizi hizmetlerimizi sağlamak ve yasal yükümlülüklere uymak için gerekli olduğu sürece saklıyoruz:",
          list: [
            "Hesap verileri: Hesabınızı silene kadar veya silme talebinde bulunana kadar",
            "Kullanım verileri: Analitik ve hizmet iyileştirme için 3 yıla kadar",
            "Teknik kayıtlar: Güvenlik ve sorun giderme için 1 yıla kadar",
            "Yasal uyumluluk: Geçerli yasaların gerektirdiği şekilde"
          ]
        },
        {
          title: "7. GDPR ve KVKK Kapsamındaki Haklarınız",
          content: "Kişisel verilerinizle ilgili aşağıdaki haklara sahipsiniz:",
          list: [
            "Erişim hakkı: Kişisel verileriniz hakkında bilgi talep etme",
            "Düzeltme hakkı: Yanlış veya eksik verileri düzeltme",
            "Silme hakkı: Kişisel verilerinizin silinmesini talep etme (aşağıdaki Hesap Silme bölümüne bakın)",
            "İşlemeyi kısıtlama hakkı: Verilerinizi nasıl kullandığımızı sınırlama",
            "Veri taşınabilirliği hakkı: Verilerinizi yapılandırılmış bir formatta alma",
            "İtiraz hakkı: Meşru menfaatlere dayalı işlemeye itiraz etme",
            "Rızayı geri çekme hakkı: Rızanızı istediğiniz zaman geri çekme",
            "Şikayet hakkı: Denetim makamlarına başvurma"
          ]
        },
        {
          title: "7.1. Hesap Silme",
          content: "Hesabınızı ve tüm ilişkili verileri aşağıdaki yöntemlerle istediğiniz zaman silebilirsiniz:",
          list: [
            "Hesap Ayarları: Profil ayarlarınıza gidin ve 'Hesabı Sil' seçeneğini seçin",
            "E-posta Talebi: Hesap e-postanızla contact@actorrating.com adresine silme talebi gönderin",
            "Veri Dışa Aktarma: Silmeden önce, verilerinizi profil sayfanızdan dışa aktarabilirsiniz",
            "İşlem Süresi: Hesap silme, talebinizden itibaren 30 gün içinde işlenir",
            "Saklama İstisnaları: Bazı veriler yasa gereği daha uzun süre saklanabilir (örneğin, vergi amaçlı işlem kayıtları)"
          ]
        },
        {
          title: "8. Çerezler ve İzleme",
          content: "Aşağıdaki kategorilerde çerezler ve benzer teknolojiler kullanıyoruz:",
          list: [
            "Zorunlu Çerezler: Hizmetin çalışması için gerekli (örneğin, giriş oturumunuzu sürdürme, güvenlik özellikleri). Bunlar devre dışı bırakılamaz.",
            "İşlevsel Çerezler: Deneyiminizi geliştirmek için tercihlerinizi ve ayarlarınızı hatırlar.",
            "Analitik Çerezler: Hizmetlerimizi iyileştirmek için platform kullanımını ve performansını anlamamıza yardımcı olur. Bunlar anonimleştirilmiş ve toplanmıştır.",
            "Güvenlik Çerezleri: Güvenliği sağlar ve dolandırıcılığı önler, bot önleme için reCAPTCHA dahil."
          ]
        },
        {
          title: "9. Veri Güvenliği",
          content: "Kişisel verilerinizi korumak için uygun teknik ve organizasyonel önlemler uyguluyoruz:",
          list: [
            "Verilerin iletim sırasında ve bekletilirken şifrelenmesi",
            "Düzenli güvenlik değerlendirmeleri ve güncellemeler",
            "Erişim kontrolleri ve kimlik doğrulama önlemleri",
            "Veri koruma konusunda çalışan eğitimi",
            "Olay müdahale prosedürleri"
          ]
        },
        {
          title: "9.1. Veri İhlali Bildirimi",
          content: "Kişisel verilerinizi etkileyebilecek bir veri ihlali durumunda:",
          list: [
            "İlgili denetim makamlarını ihlalden haberdar olduktan sonra 72 saat içinde bilgilendireceğiz (GDPR gereği)",
            "İhlal, kullanıcıların hak ve özgürlüklerine yüksek risk oluşturuyorsa, etkilenen kullanıcıları gecikmeksizin bilgilendireceğiz",
            "İhlalin niteliği, olası sonuçları ve bunu ele almak için alınan önlemler hakkında net bilgi sağlayacağız",
            "Kendinizi korumak için atabileceğiniz adımlar hakkında rehberlik sağlayacağız",
            "Yasa gereği tüm veri ihlallerinin kayıtlarını tutacağız"
          ]
        },
        {
          title: "10. Uluslararası Veri Aktarımları",
          content: "Verileriniz ikamet ettiğiniz ülke dışındaki ülkelere aktarılabilir ve işlenebilir. Aşağıdakiler aracılığıyla yeterli koruma sağlıyoruz:",
          list: [
            "Standart sözleşme şartları (SCCs)",
            "İlgili makamların yeterlilik kararları",
            "Yasa gereği gerekli diğer uygun güvenceler"
          ]
        },
        {
          title: "11. Çocukların Gizliliği",
          content: "Hizmetlerimiz 13 yaşın altındaki çocuklar için tasarlanmamıştır. 13 yaşın altındaki çocuklardan bilerek kişisel veri toplamayız. Ebeveyn veya vasinizseniz ve çocuğunuzun bize kişisel veri sağladığına inanıyorsanız, lütfen hemen bizimle iletişime geçin."
        },
        {
          title: "12. Bu Politikadaki Değişiklikler",
          content: "Bu Gizlilik Politikasını zaman zaman güncelleyebiliriz. Önemli değişiklikler hakkında sizi web sitemizde yeni politikayı yayınlayarak ve 'Son güncelleme' tarihini güncelleyerek bilgilendireceğiz. Bu tür değişikliklerden sonra hizmetlerimizi kullanmaya devam etmeniz, güncellenmiş politikayı kabul ettiğiniz anlamına gelir."
        },
        {
          title: "13. İletişim Bilgileri",
          content: "Bu Gizlilik Politikası hakkında herhangi bir sorunuz varsa veya haklarınızı kullanmak istiyorsanız, lütfen bizimle iletişime geçin:",
          list: [
            "E-posta: privacy@actorrating.com",
            "Şirket: ActorRating Yazılım A.Ş.",
            "Adres: İstanbul, Türkiye",
            "Türk kullanıcılar için: Türk Kişisel Verilerin Korunması Kurumu'na (KVKK) da başvurabilirsiniz"
          ]
        }
      ]
    }
  }

  const currentContent = content[language]

  return (
    <div className="min-h-screen bg-black w-full relative" style={{ maxWidth: '100vw', overflowX: 'hidden' }}>
      {/* Background glow */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-[#FFC800]/15 rounded-full blur-[200px]" />
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 md:pt-24 lg:py-28 pb-16 sm:pb-24 md:pb-32 relative" style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div className="grid grid-cols-12 gap-8">
          {/* Header with language switcher */}
          <div className="col-span-12 flex items-center justify-end mb-8">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setLanguage("en")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  language === "en"
                    ? "bg-[#FFD700] text-black"
                    : "bg-transparent text-gray-400 hover:text-[#FFD700] border border-gray-600/50 hover:border-[#FFD700]/50"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage("tr")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  language === "tr"
                    ? "bg-[#FFD700] text-black"
                    : "bg-transparent text-gray-400 hover:text-[#FFD700] border border-gray-600/50 hover:border-[#FFD700]/50"
                }`}
              >
                TR
              </button>
            </div>
          </div>

          {/* Hero Section */}
          <div className="col-span-12 text-center mb-16 sm:mb-24 md:mb-32">
            <h1 
              className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-6 sm:mb-8 md:mb-12 tracking-tight leading-tight relative px-4 sm:px-0"
            >
              {currentContent.title}
            </h1>
            <p className="text-sm text-[#a3a3a3] mb-8">
              {currentContent.lastUpdated} {new Date().toLocaleDateString(language === "tr" ? "tr-TR" : "en-US")}
            </p>
          </div>

          {/* Content Sections */}
          <div className="col-span-12 lg:col-span-10 lg:col-start-2">
            <div className="space-y-6 sm:space-y-8">
              {currentContent.sections.map((section, index) => (
                <div
                  key={index}
                  className="relative p-8 xs:p-10 sm:p-12 md:p-14 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden"
                  style={{
                    boxShadow: `
                      0 25px 70px -15px rgba(0, 0, 0, 0.9),
                      0 15px 40px -10px rgba(0, 0, 0, 0.7),
                      0 0 0 1px rgba(255, 255, 255, 0.05),
                      inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                      inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                    `,
                  }}
                >
                  <div className="relative z-10">
                    <h2 
                      className="text-xl sm:text-2xl md:text-3xl font-semibold text-white mb-4 sm:mb-6"
                    >
                      {section.title}
                    </h2>
                    <p className="text-base sm:text-lg text-[#e4e4e7] leading-loose font-normal mb-4">
                      {section.content}
                    </p>
                    {section.list && (
                      <ul className="list-disc list-inside space-y-2 text-[#e4e4e7] text-base sm:text-lg leading-loose font-normal">
                        {section.list.map((item, itemIndex) => (
                          <li key={itemIndex}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 