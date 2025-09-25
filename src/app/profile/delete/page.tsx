"use client"

import { useUser } from "@supabase/auth-helpers-react"
import { supabase } from "../../../../lib/supabaseClient"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { TriangleAlert, Trash2, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function DeleteAccountPage() {
  const user = useUser()
  const isLoadingUser = user === undefined
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [confirmation, setConfirmation] = useState("")
  const [showConfirmation, setShowConfirmation] = useState(false)

  const handleDeleteAccount = async () => {
    if (confirmation !== "SİL") {
      alert("Lütfen 'SİL' yazarak onaylayın.")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/user/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        await supabase.auth.signOut()
        window.location.href = "/"
      } else {
        const errorData = await response.json()
        alert(`Hesap silme hatası: ${errorData.error || "Bilinmeyen hata"}`)
      }
    } catch (error) {
      console.error("Account deletion error:", error)
      alert("Hesap silinirken bir hata oluştu. Lütfen tekrar deneyin.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!user) {
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
                <TriangleAlert className="w-6 h-6 text-red-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Hesabı Sil</h1>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <div className="flex">
                <TriangleAlert className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    Bu işlem geri alınamaz
                  </h3>
                  <p className="text-sm text-red-700 mt-1">
                    Hesabınızı sildiğinizde, tüm verileriniz kalıcı olarak silinecektir.
                    Bu işlem KVKK (Kişisel Verilerin Korunması Kanunu) kapsamında
                    veri silme hakkınızı kullanmanızı sağlar.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Silinecek Veriler
                </h3>
                <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
                  <li>Profil bilgileriniz (ad, e-posta, bio, vb.)</li>
                  <li>Tüm oyuncu değerlendirmeleriniz</li>
                  <li>Performans kayıtlarınız</li>
                  <li>Hesap ayarlarınız</li>
                  <li>Oturum bilgileriniz</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  KVKK Veri Silme Hakkı
                </h3>
                <p className="text-sm text-gray-700 mb-3">
                  KVKK'nın 11. maddesi uyarınca, kişisel verilerinizin silinmesini
                  talep etme hakkına sahipsiniz. Bu işlem, verilerinizin tamamen
                  ve geri döndürülemez şekilde silinmesini sağlar.
                </p>
                <p className="text-sm text-gray-700">
                  Hesap silme işlemi 30 gün içinde tamamlanacaktır. Bu süre
                  zarfında hesabınıza erişiminiz kısıtlanacaktır.
                </p>
              </div>

              {!showConfirmation ? (
                <Button
                  onClick={() => setShowConfirmation(true)}
                  variant="outline"
                  className="w-full border-red-300 text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Hesabımı Silmek İstiyorum
                </Button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Onay için "SİL" yazın
                    </label>
                    <input
                      type="text"
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                      placeholder="SİL"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      onClick={() => setShowConfirmation(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      İptal
                    </Button>
                    <Button
                      onClick={handleDeleteAccount}
                      disabled={isLoading || confirmation !== "SİL"}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {isLoading ? "Siliniyor..." : "Hesabı Kalıcı Olarak Sil"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 