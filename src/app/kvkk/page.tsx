"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Globe, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function KVKKPage() {
  const [language, setLanguage] = useState<"en" | "tr">("en")

  const content = {
    en: {
      title: "KVKK Data Processing Terms",
      lastUpdated: "Last updated:",
      sections: [
        {
          title: "1. Data Controller",
          content: "ActorRating Yazılım A.Ş. ('we', 'us', 'our') is the data controller within the scope of the Personal Data Protection Law No. 6698 ('KVKK') and provides the following information regarding the processing of your personal data. We are a limited company registered in Istanbul, Türkiye."
        },
        {
          title: "2. Purposes of Processing Personal Data",
          content: "Your personal data is processed for the following purposes:",
          list: [
            "Account creation and management",
            "Providing actor rating and review services",
            "Improving service quality and user experience",
            "Personalizing content and recommendations",
            "Ensuring platform security and preventing fraud",
            "Fulfilling legal obligations",
            "Conducting communication activities",
            "Analyzing usage patterns for service improvement"
          ]
        },
        {
          title: "3. Categories of Personal Data Processed",
          content: "The following personal data categories are processed:",
          list: [
            "Identity information (name, surname from Google account)",
            "Contact information (email address from Google Sign-In)",
            "Profile information (profile picture, bio, location if provided)",
            "Usage data (actor ratings, performance reviews, comments)",
            "Technical data (IP address, browser information, device details)",
            "Transaction security data (login records, session information)",
            "Marketing data (preferences, analytics data)"
          ]
        },
        {
          title: "4. Transfer of Personal Data",
          content: "Your personal data may be shared with third parties in the following cases:",
          list: [
            "Within the scope of legal requirements and court orders",
            "With your explicit consent",
            "With our service providers (Google for authentication, cloud services for data storage)",
            "Within the scope of security and legal processes",
            "With analytics services for understanding platform usage",
            "With legal authorities when required by law"
          ]
        },
        {
          title: "5. Method and Legal Basis of Personal Data Collection",
          content: "Your personal data is collected through the following methods:",
          list: [
            "Data provided directly by the user through Google Sign-In",
            "Technical data collected automatically during service use",
            "Cookies and similar technologies for session management",
            "Analytics tools for understanding user behavior"
          ]
        },
        {
          title: "6. Legal Basis for Processing",
          content: "We process your personal data based on the following legal grounds:",
          list: [
            "Explicit consent (Article 5/1-a of KVKK)",
            "Performance of a contract (Article 5/2-c of KVKK)",
            "Legitimate interest (Article 5/2-f of KVKK)",
            "Legal obligation (Article 5/2-ç of KVKK)"
          ]
        },
        {
          title: "7. Your Rights Under KVKK",
          content: "Under Article 11 of KVKK, you have the following rights:",
          list: [
            "Learning whether your personal data is processed",
            "Requesting information if your personal data has been processed",
            "Learning the purpose of processing your personal data and whether they are used in accordance with their purpose",
            "Knowing the third parties to whom your personal data is transferred domestically or abroad",
            "Requesting correction of your personal data if it is incomplete or incorrectly processed",
            "Requesting deletion or destruction of your personal data within the framework of the conditions stipulated in Article 7 of KVKK",
            "Requesting notification of the operations carried out pursuant to subparagraphs (e) and (f) to third parties to whom your personal data has been transferred",
            "Objecting to the emergence of a result against you by analyzing the processed data exclusively through automated systems",
            "Requesting compensation for damages in case you suffer damage due to unlawful processing of your personal data"
          ]
        },
        {
          title: "8. How to Exercise Your Rights",
          content: "To exercise the rights mentioned above:",
          list: [
            "You can export your data from your profile page",
            "You can request data deletion from the account deletion page",
            "You can contact us via email at privacy@actorrating.com",
            "You can submit a written application to our company address",
            "You can contact the Turkish Personal Data Protection Authority (KVKK)"
          ]
        },
        {
          title: "9. Data Retention Period",
          content: "We retain your personal data for the following periods:",
          list: [
            "Account data: Until you delete your account or request deletion",
            "Usage data: Up to 3 years for analytics and service improvement",
            "Technical logs: Up to 1 year for security and troubleshooting",
            "Legal compliance: As required by applicable laws and regulations"
          ]
        },
        {
          title: "10. Data Security Measures",
          content: "We implement appropriate technical and organizational measures to protect your personal data:",
          list: [
            "Encryption of data in transit and at rest",
            "Regular security assessments and updates",
            "Access controls and authentication measures",
            "Employee training on data protection",
            "Incident response procedures",
            "Regular backup and disaster recovery procedures"
          ]
        },
        {
          title: "11. International Data Transfers",
          content: "Your data may be transferred to and processed in countries outside Türkiye. We ensure adequate protection through:",
          list: [
            "Standard contractual clauses (SCCs) where applicable",
            "Adequacy decisions by relevant authorities",
            "Other appropriate safeguards as required by KVKK and GDPR",
            "Compliance with international data protection standards"
          ]
        },
        {
          title: "12. Contact Information",
          content: "For any questions regarding this disclosure text or to exercise your rights:",
          list: [
            "Email: contact@actorrating.com",
            "Company: ActorRating Yazılım A.Ş.",
            "Address: Istanbul, Türkiye",
            "Turkish Personal Data Protection Authority (KVKK): https://www.kvkk.gov.tr"
          ]
        }
      ]
    },
    tr: {
      title: "KVKK Aydınlatma Metni",
      lastUpdated: "Son güncelleme:",
      sections: [
        {
          title: "1. Veri Sorumlusu",
          content: "ActorRating Yazılım A.Ş. ('biz', 'bizim', 'bizimki'), 6698 sayılı Kişisel Verilerin Korunması Kanunu ('KVKK') kapsamında veri sorumlusu sıfatıyla, kişisel verilerinizin işlenmesi konusunda aşağıdaki bilgileri sunmaktayız. İstanbul, Türkiye'de kayıtlı bir limited şirketiz."
        },
        {
          title: "2. Kişisel Verilerin İşlenme Amaçları",
          content: "Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:",
          list: [
            "Hesap oluşturma ve yönetimi",
            "Oyuncu değerlendirme ve yorum hizmetlerinin sağlanması",
            "Hizmet kalitesinin ve kullanıcı deneyiminin artırılması",
            "İçerik ve önerilerin kişiselleştirilmesi",
            "Platform güvenliğinin sağlanması ve dolandırıcılığın önlenmesi",
            "Yasal yükümlülüklerin yerine getirilmesi",
            "İletişim faaliyetlerinin yürütülmesi",
            "Hizmet iyileştirme için kullanım kalıplarının analiz edilmesi"
          ]
        },
        {
          title: "3. İşlenen Kişisel Veri Kategorileri",
          content: "Aşağıdaki kişisel veri kategorileri işlenmektedir:",
          list: [
            "Kimlik bilgileri (Google hesabından alınan ad, soyad)",
            "İletişim bilgileri (Google Sign-In'den alınan e-posta adresi)",
            "Profil bilgileri (profil resmi, bio, konum - sağlanırsa)",
            "Kullanım verileri (oyuncu değerlendirmeleri, performans yorumları, yorumlar)",
            "Teknik veriler (IP adresi, tarayıcı bilgileri, cihaz detayları)",
            "İşlem güvenliği verileri (giriş kayıtları, oturum bilgileri)",
            "Pazarlama verileri (tercihler, analitik veriler)"
          ]
        },
        {
          title: "4. Kişisel Verilerin Aktarılması",
          content: "Kişisel verileriniz, aşağıdaki durumlarda üçüncü kişilerle paylaşılabilir:",
          list: [
            "Yasal zorunluluklar ve mahkeme emirleri kapsamında",
            "Açık rızanızın bulunması durumunda",
            "Hizmet sağlayıcılarımızla (kimlik doğrulama için Google, veri depolama için bulut hizmetleri)",
            "Güvenlik ve hukuki süreçler kapsamında",
            "Platform kullanımını anlamak için analitik hizmetleriyle",
            "Yasa gereği gerekli olduğunda yasal makamlarla"
          ]
        },
        {
          title: "5. Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi",
          content: "Kişisel verileriniz aşağıdaki yöntemlerle toplanmaktadır:",
          list: [
            "Google Sign-In aracılığıyla kullanıcı tarafından doğrudan sağlanan veriler",
            "Hizmet kullanımı sırasında otomatik olarak toplanan teknik veriler",
            "Oturum yönetimi için çerezler ve benzer teknolojiler",
            "Kullanıcı davranışını anlamak için analitik araçlar"
          ]
        },
        {
          title: "6. İşleme Hukuki Sebebi",
          content: "Kişisel verilerinizi aşağıdaki hukuki sebeplere dayanarak işliyoruz:",
          list: [
            "Açık rıza (KVKK'nın 5/1-a maddesi)",
            "Sözleşmenin kurulması ve ifası (KVKK'nın 5/2-c maddesi)",
            "Meşru menfaat (KVKK'nın 5/2-f maddesi)",
            "Yasal yükümlülük (KVKK'nın 5/2-ç maddesi)"
          ]
        },
        {
          title: "7. KVKK Kapsamındaki Haklarınız",
          content: "KVKK'nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:",
          list: [
            "Kişisel verilerinizin işlenip işlenmediğini öğrenme",
            "Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme",
            "Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme",
            "Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme",
            "Kişisel verilerinizin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme",
            "KVKK'nın 7. maddesinde öngörülen şartlar çerçevesinde kişisel verilerinizin silinmesini veya yok edilmesini isteme",
            "Kişisel verilerinizin aktarıldığı üçüncü kişilere yukarıda sayılan (e) ve (f) bentleri uyarınca yapılan işlemlerin bildirilmesini isteme",
            "İşlenen verilerinizin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle kişiliğiniz aleyhine bir sonucun ortaya çıkmasına itiraz etme",
            "Kişisel verilerinizin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini isteme"
          ]
        },
        {
          title: "8. Haklarınızı Kullanma Yöntemi",
          content: "Yukarıda belirtilen haklarınızı kullanmak için:",
          list: [
            "Profil sayfanızdan veri dışa aktarma işlemi yapabilirsiniz",
            "Hesap silme sayfasından veri silme talebinde bulunabilirsiniz",
            "privacy@actorrating.com adresinden e-posta yoluyla bizimle iletişime geçebilirsiniz",
            "Şirket adresimize yazılı başvuru yapabilirsiniz",
            "Türk Kişisel Verilerin Korunması Kurumu'na (KVKK) başvurabilirsiniz"
          ]
        },
        {
          title: "9. Veri Saklama Süresi",
          content: "Kişisel verilerinizi aşağıdaki süreler boyunca saklıyoruz:",
          list: [
            "Hesap verileri: Hesabınızı silene kadar veya silme talebinde bulunana kadar",
            "Kullanım verileri: Analitik ve hizmet iyileştirme için 3 yıla kadar",
            "Teknik kayıtlar: Güvenlik ve sorun giderme için 1 yıla kadar",
            "Yasal uyumluluk: Geçerli yasa ve düzenlemelerin gerektirdiği şekilde"
          ]
        },
        {
          title: "10. Veri Güvenliği Önlemleri",
          content: "Kişisel verilerinizi korumak için uygun teknik ve organizasyonel önlemler uyguluyoruz:",
          list: [
            "Verilerin iletim sırasında ve bekletilirken şifrelenmesi",
            "Düzenli güvenlik değerlendirmeleri ve güncellemeler",
            "Erişim kontrolleri ve kimlik doğrulama önlemleri",
            "Veri koruma konusunda çalışan eğitimi",
            "Olay müdahale prosedürleri",
            "Düzenli yedekleme ve felaket kurtarma prosedürleri"
          ]
        },
        {
          title: "11. Uluslararası Veri Aktarımları",
          content: "Verileriniz Türkiye dışındaki ülkelere aktarılabilir ve işlenebilir. Aşağıdakiler aracılığıyla yeterli koruma sağlıyoruz:",
          list: [
            "Uygulanabilir olduğunda standart sözleşme şartları (SCCs)",
            "İlgili makamların yeterlilik kararları",
            "KVKK ve GDPR gereği gerekli diğer uygun güvenceler",
            "Uluslararası veri koruma standartlarına uyum"
          ]
        },
        {
          title: "12. İletişim Bilgileri",
          content: "Bu aydınlatma metni kapsamında herhangi bir sorunuz varsa veya haklarınızı kullanmak istiyorsanız:",
          list: [
            "E-posta: privacy@actorrating.com",
            "Şirket: ActorRating Yazılım A.Ş.",
            "Adres: İstanbul, Türkiye",
            "Türk Kişisel Verilerin Korunması Kurumu (KVKK): https://www.kvkk.gov.tr"
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