"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Globe, ArrowLeft } from "lucide-react"
import Link from "next/link"

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
          content: "We may share your data with the following third parties:",
          list: [
            "Google (for authentication via Google Sign-In)",
            "Cloud service providers (for data storage and processing)",
            "Analytics services (for understanding platform usage)",
            "Legal authorities (when required by law)",
            "Service providers (for technical support and maintenance)"
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
            "Right of erasure: Request deletion of your personal data",
            "Right to restrict processing: Limit how we use your data",
            "Right to data portability: Receive your data in a structured format",
            "Right to object: Object to processing based on legitimate interests",
            "Right to withdraw consent: Withdraw consent at any time",
            "Right to lodge a complaint: Contact supervisory authorities"
          ]
        },
        {
          title: "8. Cookies and Tracking",
          content: "We use cookies and similar technologies to:",
          list: [
            "Maintain your login session",
            "Remember your preferences and settings",
            "Analyze platform usage and performance",
            "Ensure security and prevent fraud"
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
          content: "Verilerinizi aşağıdaki üçüncü taraflarla paylaşabiliriz:",
          list: [
            "Google (Google Sign-In ile kimlik doğrulama için)",
            "Bulut hizmet sağlayıcıları (veri depolama ve işleme için)",
            "Analitik hizmetleri (platform kullanımını anlamak için)",
            "Yasal makamlar (yasa gereği gerekli olduğunda)",
            "Hizmet sağlayıcıları (teknik destek ve bakım için)"
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
            "Silme hakkı: Kişisel verilerinizin silinmesini talep etme",
            "İşlemeyi kısıtlama hakkı: Verilerinizi nasıl kullandığımızı sınırlama",
            "Veri taşınabilirliği hakkı: Verilerinizi yapılandırılmış bir formatta alma",
            "İtiraz hakkı: Meşru menfaatlere dayalı işlemeye itiraz etme",
            "Rızayı geri çekme hakkı: Rızanızı istediğiniz zaman geri çekme",
            "Şikayet hakkı: Denetim makamlarına başvurma"
          ]
        },
        {
          title: "8. Çerezler ve İzleme",
          content: "Aşağıdaki amaçlarla çerezler ve benzer teknolojiler kullanıyoruz:",
          list: [
            "Giriş oturumunuzu sürdürmek",
            "Tercihlerinizi ve ayarlarınızı hatırlamak",
            "Platform kullanımını ve performansını analiz etmek",
            "Güvenliği sağlamak ve dolandırıcılığı önlemek"
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
    <div className="min-h-screen bg-background py-6 px-4 sm:py-8 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with language switcher */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center text-white hover:text-gray-300">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-gray-400" />
            <Button
              variant={language === "en" ? "default" : "outline"}
              size="sm"
              onClick={() => setLanguage("en")}
              className={language === "en" ? "bg-purple-600 hover:bg-purple-700" : "text-gray-300 border-gray-600 hover:bg-gray-800"}
            >
              EN
            </Button>
            <Button
              variant={language === "tr" ? "default" : "outline"}
              size="sm"
              onClick={() => setLanguage("tr")}
              className={language === "tr" ? "bg-purple-600 hover:bg-purple-700" : "text-gray-300 border-gray-600 hover:bg-gray-800"}
            >
              TR
            </Button>
          </div>
        </div>

        <div className="bg-secondary shadow-lg rounded-lg p-6 sm:p-8 border border-border">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6">
            {currentContent.title}
          </h1>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-sm text-gray-400 mb-6">
              {currentContent.lastUpdated} {new Date().toLocaleDateString(language === "tr" ? "tr-TR" : "en-US")}
            </p>

            {currentContent.sections.map((section, index) => (
              <section key={index} className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">
                  {section.title}
                </h2>
                <p className="text-gray-300 mb-4">
                  {section.content}
                </p>
                {section.list && (
                  <ul className="list-disc list-inside space-y-2 text-gray-300">
                    {section.list.map((item, itemIndex) => (
                      <li key={itemIndex}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 