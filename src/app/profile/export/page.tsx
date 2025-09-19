"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Download, ArrowLeft, FileText, Clock } from "lucide-react"
import Link from "next/link"

export default function ExportDataPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [exportHistory, setExportHistory] = useState<any[]>([])

  const handleExportData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/user/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `actorrating-data-${new Date().toISOString().split("T")[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        // Refresh export history
        loadExportHistory()
      } else {
        throw new Error("Failed to export data")
      }
    } catch (error) {
      console.error("Data export error:", error)
      alert("Veri dışa aktarılırken bir hata oluştu. Lütfen tekrar deneyin.")
    } finally {
      setIsLoading(false)
    }
  }

  const loadExportHistory = async () => {
    try {
      const response = await fetch("/api/user/export")
      if (response.ok) {
        const data = await response.json()
        setExportHistory(data.exports || [])
      }
    } catch (error) {
      console.error("Failed to load export history:", error)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    router.push("/auth/signin")
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/profile"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Profile Geri Dön
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <Download className="w-6 h-6 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Veri Dışa Aktar</h1>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
              <div className="flex">
                <FileText className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800">
                    KVKK Veri Taşınabilirlik Hakkı
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">
                    KVKK'nın 11. maddesi uyarınca, kişisel verilerinizin
                    yapılandırılmış, yaygın kullanıma uygun ve makine
                    tarafından okunabilir bir formatta size verilmesini
                    talep etme hakkına sahipsiniz.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Dışa Aktarılacak Veriler
                </h3>
                <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
                  <li>Profil bilgileriniz (ad, e-posta, bio, vb.)</li>
                  <li>Tüm oyuncu değerlendirmeleriniz</li>
                  <li>Performans kayıtlarınız</li>
                  <li>Hesap ayarlarınız ve gizlilik tercihleriniz</li>
                  <li>Hesap oluşturma ve son giriş tarihleri</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Veri Formatı
                </h3>
                <p className="text-sm text-gray-700 mb-3">
                  Verileriniz JSON formatında dışa aktarılacaktır. Bu format:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  <li>İnsan tarafından okunabilir</li>
                  <li>Makine tarafından işlenebilir</li>
                  <li>Yapılandırılmış ve düzenli</li>
                  <li>Diğer sistemlere aktarılabilir</li>
                </ul>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <Button
                  onClick={handleExportData}
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isLoading ? "Hazırlanıyor..." : "Verilerimi İndir"}
                </Button>
              </div>

              {/* Export History */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Dışa Aktarma Geçmişi
                </h3>
                {exportHistory.length > 0 ? (
                  <div className="space-y-2">
                    {exportHistory.map((exportItem, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                      >
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 text-gray-500 mr-2" />
                          <span className="text-sm text-gray-700">
                            {new Date(exportItem.createdAt).toLocaleDateString("tr-TR")}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="w-4 h-4 mr-1" />
                          {new Date(exportItem.createdAt).toLocaleTimeString("tr-TR")}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Henüz veri dışa aktarma işlemi yapılmamış.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 