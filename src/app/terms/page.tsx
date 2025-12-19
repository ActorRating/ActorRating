"use client"

export const dynamic = "force-dynamic"

import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { HomeLayout } from "@/components/layout"

export default function TermsPage() {
  const [language, setLanguage] = useState<"en" | "tr">("en")

  const content = {
    en: {
      title: "Terms of Service",
      lastUpdated: "Last updated:",
      sections: [
        {
          title: "1. Acceptance of Terms",
          content: "By accessing and using ActorRating.com ('the Service'), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service."
        },
        {
          title: "2. Service Description",
          content: "ActorRating.com is a platform where users can rate and evaluate the performances of film and television actors. The Service provides actor ratings, performance analysis, community interactions, and related features."
        },
        {
          title: "3. Age Requirements",
          content: "You must be at least 13 years old to use this Service. If you are under 18, you must have parental or guardian consent to use the Service. By using the Service, you represent and warrant that you meet these age requirements."
        },
        {
          title: "4. User Accounts",
          content: "To access certain features of the Service, you must create an account using Google Sign-In. You are responsible for:",
          list: [
            "Maintaining the confidentiality of your account",
            "All activities that occur under your account",
            "Providing accurate and complete information",
            "Notifying us immediately of any unauthorized use"
          ]
        },
        {
          title: "5. Acceptable Use",
          content: "You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:",
          list: [
            "Violate any applicable laws or regulations",
            "Infringe upon the rights of others",
            "Post false, misleading, or defamatory content",
            "Harass, abuse, or harm other users",
            "Attempt to gain unauthorized access to the Service",
            "Use automated systems to access the Service",
            "Interfere with or disrupt the Service",
            "Post spam, advertising, or commercial content without permission"
          ]
        },
        {
          title: "6. User-Generated Content",
          content: "You retain ownership of content you submit to the Service. By submitting content, you grant us a limited, non-exclusive, royalty-free license to use, reproduce, and display your content solely for the purpose of operating and providing the Service. This license is limited to the functionality of the Service and does not grant us rights to use your content for other commercial purposes without your consent. You represent that:",
          list: [
            "You own or have the right to use the content",
            "The content does not violate any third-party rights",
            "The content complies with these Terms",
            "You have obtained necessary permissions for any third-party content"
          ]
        },
        {
          title: "7. Content Moderation",
          content: "We reserve the right to monitor, review, and remove any content that violates these Terms. We may also suspend or terminate accounts that repeatedly violate our policies."
        },
        {
          title: "8. Intellectual Property",
          content: "The Service and its original content, features, and functionality are owned by ActorRating Yazılım A.Ş. and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws."
        },
        {
          title: "9. Copyright and DMCA Policy",
          content: "We respect intellectual property rights and expect our users to do the same. If you believe that any content on our Service infringes your copyright, please provide us with the following information in writing:",
          list: [
            "A physical or electronic signature of the copyright owner or authorized representative",
            "Identification of the copyrighted work claimed to have been infringed",
            "Identification of the material that is claimed to be infringing and information reasonably sufficient to locate it",
            "Your contact information, including address, telephone number, and email address",
            "A statement that you have a good faith belief that use of the material is not authorized by the copyright owner",
            "A statement that the information in the notification is accurate and, under penalty of perjury, that you are authorized to act on behalf of the copyright owner"
          ]
        },
        {
          title: "10. Privacy and Data Protection",
          content: "Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices regarding the collection and use of your personal information."
        },
        {
          title: "11. Disclaimers",
          content: "The Service is provided 'as is' and 'as available' without warranties of any kind, either express or implied. While we strive to provide a reliable service, we do not warrant that the Service will be uninterrupted, error-free, or completely secure. We disclaim all warranties to the extent permitted by applicable law, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. Some jurisdictions do not allow the exclusion of certain warranties, so some of the above exclusions may not apply to you."
        },
        {
          title: "12. Limitation of Liability",
          content: "To the maximum extent permitted by applicable law, ActorRating Yazılım A.Ş. shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, even if we have been advised of the possibility of such damages. Our total liability for any claims arising from or related to the Service shall not exceed the amount you paid us in the twelve (12) months preceding the claim. Some jurisdictions do not allow the exclusion or limitation of certain damages, so some of the above limitations may not apply to you."
        },
        {
          title: "13. Indemnification",
          content: "You agree to defend, indemnify, and hold harmless ActorRating Yazılım A.Ş. from and against any claims, damages, obligations, losses, liabilities, costs, or debt arising from your use of the Service or violation of these Terms."
        },
        {
          title: "14. Termination",
          content: "We may terminate or suspend your account and access to the Service immediately, without prior notice, for any reason, including breach of these Terms. Upon termination, your right to use the Service will cease immediately."
        },
        {
          title: "15. Changes to Terms",
          content: "We reserve the right to modify these Terms at any time. We will notify users of any material changes by posting the new Terms on this page. Your continued use of the Service after such modifications constitutes acceptance of the updated Terms."
        },
        {
          title: "16. Governing Law and Jurisdiction",
          content: "These Terms shall be governed by and construed in accordance with the laws of Türkiye. Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the courts of Istanbul, Türkiye."
        },
        {
          title: "17. Severability",
          content: "If any provision of these Terms is held to be invalid or unenforceable, such provision shall be struck and the remaining provisions shall be enforced."
        },
        {
          title: "18. Contact Information",
          content: "If you have any questions about these Terms of Service, please contact us:",
          list: [
            "Email: contact@actorrating.com",
            "Company: ActorRating Yazılım A.Ş.",
            "Address: Istanbul, Türkiye"
          ]
        }
      ]
    },
    tr: {
      title: "Kullanım Şartları",
      lastUpdated: "Son güncelleme:",
      sections: [
        {
          title: "1. Şartların Kabulü",
          content: "ActorRating.com ('Hizmet')'e erişerek ve kullanarak, bu anlaşmanın şartlarını ve hükümlerini kabul etmiş ve bunlara bağlı kalmayı kabul etmiş olursunuz. Yukarıdakilere uymayı kabul etmiyorsanız, lütfen bu hizmeti kullanmayın."
        },
        {
          title: "2. Hizmet Tanımı",
          content: "ActorRating.com, kullanıcıların film ve dizi oyuncularının performanslarını değerlendirebilecekleri bir platformdur. Hizmet, oyuncu değerlendirmeleri, performans analizleri, topluluk etkileşimleri ve ilgili özellikler sunar."
        },
        {
          title: "3. Yaş Gereksinimleri",
          content: "Bu Hizmeti kullanmak için en az 13 yaşında olmalısınız. 18 yaşın altındaysanız, Hizmeti kullanmak için ebeveyn veya vasi onayına sahip olmalısınız. Hizmeti kullanarak, bu yaş gereksinimlerini karşıladığınızı beyan ve garanti edersiniz."
        },
        {
          title: "4. Kullanıcı Hesapları",
          content: "Hizmetin belirli özelliklerine erişmek için Google Sign-In kullanarak bir hesap oluşturmanız gerekir. Hesabınızdan sorumlusunuz:",
          list: [
            "Hesabınızın gizliliğini korumak",
            "Hesabınız altında gerçekleşen tüm faaliyetler",
            "Doğru ve eksiksiz bilgi sağlamak",
            "Yetkisiz kullanım durumunda bizi derhal bilgilendirmek"
          ]
        },
        {
          title: "5. Kabul Edilebilir Kullanım",
          content: "Hizmeti yalnızca yasal amaçlar için ve bu Şartlara uygun olarak kullanmayı kabul edersiniz. Aşağıdakileri yapmayacağınızı kabul edersiniz:",
          list: [
            "Geçerli yasa veya düzenlemeleri ihlal etmek",
            "Başkalarının haklarını ihlal etmek",
            "Yanlış, yanıltıcı veya iftira niteliğinde içerik göndermek",
            "Diğer kullanıcıları taciz etmek, kötüye kullanmak veya zarar vermek",
            "Hizmete yetkisiz erişim sağlamaya çalışmak",
            "Hizmete erişmek için otomatik sistemler kullanmak",
            "Hizmeti engellemek veya kesintiye uğratmak",
            "İzin olmadan spam, reklam veya ticari içerik göndermek"
          ]
        },
        {
          title: "6. Kullanıcı Tarafından Oluşturulan İçerik",
          content: "Hizmete gönderdiğiniz içeriğin sahipliğini korursunuz. İçerik göndererek, bize içeriğinizi yalnızca Hizmeti işletme ve sağlama amacıyla kullanma, çoğaltma ve görüntüleme konusunda sınırlı, münhasır olmayan, telif hakkı ödemesiz lisans verirsiniz. Bu lisans Hizmetin işlevselliği ile sınırlıdır ve rızanız olmadan içeriğinizi başka ticari amaçlarla kullanma hakkı vermez. Şunları beyan edersiniz:",
          list: [
            "İçeriğin sahibi veya kullanma hakkına sahipsiniz",
            "İçerik herhangi bir üçüncü taraf hakkını ihlal etmez",
            "İçerik bu Şartlara uygun",
            "Üçüncü taraf içeriği için gerekli izinleri aldınız"
          ]
        },
        {
          title: "7. İçerik Moderasyonu",
          content: "Bu Şartları ihlal eden herhangi bir içeriği izleme, inceleme ve kaldırma hakkını saklı tutarız. Politikalarımızı tekrar tekrar ihlal eden hesapları da askıya alabilir veya sonlandırabiliriz."
        },
        {
          title: "8. Fikri Mülkiyet",
          content: "Hizmet ve orijinal içeriği, özellikleri ve işlevselliği ActorRating Yazılım A.Ş.'ye aittir ve uluslararası telif hakkı, ticari marka, patent, ticari sır ve diğer fikri mülkiyet yasaları ile korunmaktadır."
        },
        {
          title: "9. Telif Hakkı ve DMCA Politikası",
          content: "Fikri mülkiyet haklarına saygı duyuyoruz ve kullanıcılarımızdan da aynısını bekliyoruz. Hizmetimizdeki herhangi bir içeriğin telif hakkınızı ihlal ettiğini düşünüyorsanız, lütfen bize yazılı olarak aşağıdaki bilgileri sağlayın:",
          list: [
            "Telif hakkı sahibinin veya yetkili temsilcisinin fiziksel veya elektronik imzası",
            "İhlal edildiği iddia edilen telif hakkı eserinin tanımlanması",
            "İhlal edildiği iddia edilen materyalin tanımlanması ve konumunu bulmak için yeterli bilgi",
            "İletişim bilgileriniz, adres, telefon numarası ve e-posta adresi dahil",
            "Materyalin kullanımının telif hakkı sahibi tarafından yetkilendirilmediğine dair iyi niyetle inancınız",
            "Bildirimdeki bilgilerin doğru olduğu ve yalan yere yemin cezası altında, telif hakkı sahibi adına hareket etme yetkisine sahip olduğunuz beyanı"
          ]
        },
        {
          title: "10. Gizlilik ve Veri Koruma",
          content: "Gizliliğiniz bizim için önemlidir. Kişisel bilgilerinizin toplanması ve kullanılmasına ilişkin uygulamalarımızı anlamak için Hizmetinizi kullanımınızı da yöneten Gizlilik Politikamızı inceleyin."
        },
        {
          title: "11. Sorumluluk Reddi",
          content: "Hizmet, açık veya örtülü herhangi bir garanti olmaksızın 'olduğu gibi' ve 'mevcut olduğu şekilde' sağlanır. Güvenilir bir hizmet sunmaya çalışsak da, Hizmetin kesintisiz, hatasız veya tamamen güvenli olacağını garanti etmiyoruz. Geçerli yasaların izin verdiği ölçüde, satılabilirlik, belirli bir amaca uygunluk ve ihlal etmeme dahil ancak bunlarla sınırlı olmamak üzere tüm örtülü garantileri reddediyoruz. Bazı yargı bölgeleri belirli garantilerin hariç tutulmasına izin vermez, bu nedenle yukarıdaki hariç tutmalardan bazıları size uygulanmayabilir."
        },
        {
          title: "12. Sorumluluk Sınırlaması",
          content: "Geçerli yasaların izin verdiği azami ölçüde, ActorRating Yazılım A.Ş., iddia edilen talepten önceki on iki (12) ay içinde bize ödediğiniz tutarı aşmamak üzere, Hizmetten kaynaklanan veya Hizmetle ilgili herhangi bir talepten kaynaklanan toplam sorumluluğumuz dahil olmak üzere, kar, veri, kullanım, itibar veya diğer maddi olmayan kayıplar dahil ancak bunlarla sınırlı olmamak üzere dolaylı, arızi, özel, sonuçsal veya cezai zararlardan sorumlu olmayacaktır. Bazı yargı bölgeleri belirli zararların hariç tutulmasına veya sınırlandırılmasına izin vermez, bu nedenle yukarıdaki sınırlamalardan bazıları size uygulanmayabilir."
        },
        {
          title: "13. Tazminat",
          content: "Hizmeti kullanımınızdan veya bu Şartların ihlalinden kaynaklanan herhangi bir talep, zarar, yükümlülük, kayıp, sorumluluk, maliyet veya borç için ActorRating Yazılım A.Ş.'yi savunmayı, tazmin etmeyi ve zararsız tutmayı kabul edersiniz."
        },
        {
          title: "14. Fesih",
          content: "Bu Şartların ihlali dahil herhangi bir nedenle, önceden haber vermeksizin hesabınızı ve Hizmete erişiminizi derhal sonlandırabilir veya askıya alabiliriz. Fesih üzerine, Hizmeti kullanma hakkınız derhal sona erecektir."
        },
        {
          title: "15. Şartlardaki Değişiklikler",
          content: "Bu Şartları herhangi bir zamanda değiştirme hakkını saklı tutarız. Önemli değişiklikler hakkında kullanıcıları bu sayfada yeni Şartları yayınlayarak bilgilendireceğiz. Bu tür değişikliklerden sonra Hizmeti kullanmaya devam etmeniz, güncellenmiş Şartları kabul ettiğiniz anlamına gelir."
        },
        {
          title: "16. Uygulanacak Hukuk ve Yetki",
          content: "Bu Şartlar Türkiye yasalarına göre yönetilecek ve yorumlanacaktır. Bu Şartlardan veya Hizmetinizi kullanımınızdan kaynaklanan herhangi bir uyuşmazlık, İstanbul, Türkiye mahkemelerinin münhasır yetkisine tabi olacaktır."
        },
        {
          title: "17. Geçerlilik",
          content: "Bu Şartların herhangi bir hükmü geçersiz veya uygulanamaz olarak kabul edilirse, bu hüküm iptal edilecek ve kalan hükümler uygulanacaktır."
        },
        {
          title: "18. İletişim Bilgileri",
          content: "Bu Kullanım Şartları hakkında herhangi bir sorunuz varsa, lütfen bizimle iletişime geçin:",
          list: [
            "E-posta: legal@actorrating.com",
            "Şirket: ActorRating Yazılım A.Ş.",
            "Adres: İstanbul, Türkiye"
          ]
        }
      ]
    }
  }

  const currentContent = content[language]

  return (
    <HomeLayout>
      <div className="min-h-screen bg-black w-full" style={{ maxWidth: '100vw', overflowX: 'hidden' }}>
        {/* Background glow */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-[#FFC800]/15 rounded-full blur-[200px]" />
        </div>

        <div className="w-full px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 md:pt-24 lg:py-28 pb-16 sm:pb-24 md:pb-32 relative" style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div className="grid grid-cols-12 gap-8">
            {/* Header with language switcher */}
            <div className="col-span-12 flex items-center justify-between mb-8">
              <Link
                href="/"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-600/50 text-gray-400 hover:text-[#FFD700] hover:bg-[#FFD700]/10 hover:border-[#FFD700]/50 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
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
    </HomeLayout>
  )
} 