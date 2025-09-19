"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Globe, ArrowLeft } from "lucide-react"
import Link from "next/link"

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
          content: "You retain ownership of content you submit to the Service. By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and distribute your content. You represent that:",
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
          title: "9. Privacy and Data Protection",
          content: "Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices regarding the collection and use of your personal information."
        },
        {
          title: "10. Disclaimers",
          content: "THE SERVICE IS PROVIDED 'AS IS' AND 'AS AVAILABLE' WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT."
        },
        {
          title: "11. Limitation of Liability",
          content: "IN NO EVENT SHALL ACTORRATING YAZILIM A.Ş. BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES."
        },
        {
          title: "12. Indemnification",
          content: "You agree to defend, indemnify, and hold harmless ActorRating Yazılım A.Ş. from and against any claims, damages, obligations, losses, liabilities, costs, or debt arising from your use of the Service or violation of these Terms."
        },
        {
          title: "13. Termination",
          content: "We may terminate or suspend your account and access to the Service immediately, without prior notice, for any reason, including breach of these Terms. Upon termination, your right to use the Service will cease immediately."
        },
        {
          title: "14. Changes to Terms",
          content: "We reserve the right to modify these Terms at any time. We will notify users of any material changes by posting the new Terms on this page. Your continued use of the Service after such modifications constitutes acceptance of the updated Terms."
        },
        {
          title: "15. Governing Law and Jurisdiction",
          content: "These Terms shall be governed by and construed in accordance with the laws of Türkiye. Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the courts of Istanbul, Türkiye."
        },
        {
          title: "16. Severability",
          content: "If any provision of these Terms is held to be invalid or unenforceable, such provision shall be struck and the remaining provisions shall be enforced."
        },
        {
          title: "17. Contact Information",
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
          content: "Hizmete gönderdiğiniz içeriğin sahipliğini korursunuz. İçerik göndererek, bize içeriğinizi kullanma, çoğaltma ve dağıtma konusunda dünya çapında, münhasır olmayan, telif hakkı ödemesiz lisans verirsiniz. Şunları beyan edersiniz:",
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
          title: "9. Gizlilik ve Veri Koruma",
          content: "Gizliliğiniz bizim için önemlidir. Kişisel bilgilerinizin toplanması ve kullanılmasına ilişkin uygulamalarımızı anlamak için Hizmetinizi kullanımınızı da yöneten Gizlilik Politikamızı inceleyin."
        },
        {
          title: "10. Sorumluluk Reddi",
          content: "HİZMET 'OLDUĞU GİBİ' VE 'MEVCUT OLDUĞU ŞEKİLDE' HERHANGİ BİR GARANTİ OLMAKSIZIN SAĞLANIR. SATILABİLİRLİK, BELİRLİ BİR AMACA UYGUNLUK VE İHLAL ETMEME GARANTİLERİ DAHİL ANCAK BUNLARLA SINIRLI OLMAMAK ÜZERE TÜM GARANTİLERİ REDDEDERİZ."
        },
        {
          title: "11. Sorumluluk Sınırlaması",
          content: "ACTORRATING YAZILIM A.Ş. HİÇBİR DURUMDA DOLAYLI, ARİZİ, ÖZEL, SONUÇSAL VEYA CEZAİ ZARARLARDAN SORUMLU OLMAYACAKTIR, BUNLARLA SINIRLI OLMAMAK ÜZERE KAR, VERİ, KULLANIM, İTİBAR VEYA DİĞER MADDİ OLMAYAN KAYIPLAR."
        },
        {
          title: "12. Tazminat",
          content: "Hizmeti kullanımınızdan veya bu Şartların ihlalinden kaynaklanan herhangi bir talep, zarar, yükümlülük, kayıp, sorumluluk, maliyet veya borç için ActorRating Yazılım A.Ş.'yi savunmayı, tazmin etmeyi ve zararsız tutmayı kabul edersiniz."
        },
        {
          title: "13. Fesih",
          content: "Bu Şartların ihlali dahil herhangi bir nedenle, önceden haber vermeksizin hesabınızı ve Hizmete erişiminizi derhal sonlandırabilir veya askıya alabiliriz. Fesih üzerine, Hizmeti kullanma hakkınız derhal sona erecektir."
        },
        {
          title: "14. Şartlardaki Değişiklikler",
          content: "Bu Şartları herhangi bir zamanda değiştirme hakkını saklı tutarız. Önemli değişiklikler hakkında kullanıcıları bu sayfada yeni Şartları yayınlayarak bilgilendireceğiz. Bu tür değişikliklerden sonra Hizmeti kullanmaya devam etmeniz, güncellenmiş Şartları kabul ettiğiniz anlamına gelir."
        },
        {
          title: "15. Uygulanacak Hukuk ve Yetki",
          content: "Bu Şartlar Türkiye yasalarına göre yönetilecek ve yorumlanacaktır. Bu Şartlardan veya Hizmetinizi kullanımınızdan kaynaklanan herhangi bir uyuşmazlık, İstanbul, Türkiye mahkemelerinin münhasır yetkisine tabi olacaktır."
        },
        {
          title: "16. Geçerlilik",
          content: "Bu Şartların herhangi bir hükmü geçersiz veya uygulanamaz olarak kabul edilirse, bu hüküm iptal edilecek ve kalan hükümler uygulanacaktır."
        },
        {
          title: "17. İletişim Bilgileri",
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