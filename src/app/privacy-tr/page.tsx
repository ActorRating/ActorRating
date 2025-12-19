"use client"

export const dynamic = "force-dynamic"

import Link from "next/link"
import { HomeLayout } from "@/components/layout"
import { ArrowLeft } from "lucide-react"

const sections = [
  {
    title: "1. Giriş",
    content: "ActorRating.com olarak, kullanıcılarımızın gizliliğini korumayı taahhüt ediyoruz. Bu gizlilik politikası, hangi bilgileri topladığımızı, nasıl kullandığımızı ve koruduğumuzu açıklar."
  },
  {
    title: "2. Toplanan Bilgiler",
    content: "Aşağıdaki bilgileri topluyoruz:",
    list: [
      "Hesap bilgileri (ad, e-posta, profil resmi)",
      "Kullanım verileri (değerlendirmeler, yorumlar)",
      "Teknik veriler (IP adresi, tarayıcı bilgileri)",
      "Çerezler ve benzer teknolojiler"
    ]
  },
  {
    title: "3. Bilgilerin Kullanımı",
    content: "Topladığımız bilgileri aşağıdaki amaçlarla kullanıyoruz:",
    list: [
      "Hizmetlerimizi sağlamak ve iyileştirmek",
      "Kullanıcı deneyimini kişiselleştirmek",
      "Güvenliği sağlamak",
      "Yasal yükümlülükleri yerine getirmek"
    ]
  },
  {
    title: "4. Bilgi Paylaşımı",
    content: "Kişisel bilgilerinizi üçüncü taraflarla paylaşmıyoruz, ancak aşağıdaki durumlar hariç:",
    list: [
      "Yasal zorunluluklar",
      "Hizmet sağlayıcılarımız (veri işleme amaçlı)",
      "Kullanıcı onayı ile",
      "Güvenlik amaçlı"
    ]
  },
  {
    title: "5. Veri Güvenliği",
    content: "Verilerinizi korumak için aşağıdaki önlemleri alıyoruz:",
    list: [
      "SSL şifreleme",
      "Güvenli veri depolama",
      "Düzenli güvenlik güncellemeleri",
      "Erişim kontrolü"
    ]
  },
  {
    title: "6. Çerezler",
    content: "Web sitemizde çerezler kullanıyoruz. Bu çerezler:",
    list: [
      "Oturum yönetimi için gerekli",
      "Kullanıcı tercihlerini hatırlamak için",
      "Analitik amaçlı",
      "Güvenlik için"
    ]
  },
  {
    title: "7. Kullanıcı Hakları",
    content: "KVKK kapsamında aşağıdaki haklara sahipsiniz:",
    list: [
      "Kişisel verilerinize erişim",
      "Verilerinizin düzeltilmesi",
      "Verilerinizin silinmesi",
      "Verilerinizin işlenmesinin kısıtlanması",
      "Veri taşınabilirliği",
      "İtiraz hakkı"
    ]
  },
  {
    title: "8. İletişim",
    content: "Gizlilik politikamız hakkında sorularınız için lütfen bizimle iletişime geçin."
  }
]

export default function PrivacyTRPage() {
  return (
    <HomeLayout>
      <div className="min-h-screen bg-black w-full" style={{ maxWidth: '100vw', overflowX: 'hidden' }}>
        {/* Background glow */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-[#FFC800]/15 rounded-full blur-[200px]" />
        </div>

        <div className="w-full px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 md:pt-24 lg:py-28 pb-16 sm:pb-24 md:pb-32 relative" style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div className="grid grid-cols-12 gap-8">
            {/* Header */}
            <div className="col-span-12 flex items-center justify-between mb-8">
              <Link
                href="/"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-600/50 text-gray-400 hover:text-[#FFD700] hover:bg-[#FFD700]/10 hover:border-[#FFD700]/50 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </div>

            {/* Hero Section */}
            <div className="col-span-12 text-center mb-16 sm:mb-24 md:mb-32">
              <h1 
                className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-6 sm:mb-8 md:mb-12 tracking-tight leading-tight relative px-4 sm:px-0"
              >
                Gizlilik Politikası
              </h1>
              <p className="text-sm text-[#a3a3a3] mb-8">
                Son güncelleme: {new Date().toLocaleDateString("tr-TR")}
              </p>
            </div>

            {/* Content Sections */}
            <div className="col-span-12 lg:col-span-10 lg:col-start-2">
              <div className="space-y-6 sm:space-y-8">
                {sections.map((section, index) => (
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