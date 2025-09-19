"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { TriangleAlert, ArrowLeft } from "lucide-react"

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case "Configuration":
        return "Sunucu yapılandırma hatası. Lütfen daha sonra tekrar deneyin."
      case "AccessDenied":
        return "Giriş erişimi reddedildi. Lütfen tekrar deneyin."
      case "Verification":
        return "E-posta doğrulama hatası. Lütfen tekrar deneyin."
      case "OAuthSignin":
        return "OAuth giriş hatası. Lütfen tekrar deneyin."
      case "OAuthCallback":
        return "OAuth geri çağrı hatası. Lütfen tekrar deneyin."
      case "OAuthCreateAccount":
        return "OAuth hesap oluşturma hatası. Lütfen tekrar deneyin."
      case "EmailCreateAccount":
        return "E-posta hesap oluşturma hatası. Lütfen tekrar deneyin."
      case "Callback":
        return "Geri çağrı hatası. Lütfen tekrar deneyin."
      case "OAuthAccountNotLinked":
        return "Bu e-posta adresi farklı bir hesapla ilişkili. Lütfen doğru hesapla giriş yapın."
      case "EmailSignin":
        return "E-posta giriş hatası. Lütfen tekrar deneyin."
      case "CredentialsSignin":
        return "Kimlik bilgileri hatası. Lütfen bilgilerinizi kontrol edin."
      case "SessionRequired":
        return "Oturum gerekli. Lütfen giriş yapın."
      case "Default":
      default:
        return "Bir hata oluştu. Lütfen tekrar deneyin."
    }
  }

  const content = (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <TriangleAlert className="mx-auto h-12 w-12 text-red-600" />
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Giriş Hatası
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Giriş yaparken bir sorun oluştu
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mb-6">
              <p className="text-sm text-gray-700">
                {getErrorMessage(error)}
              </p>
            </div>

            <div className="space-y-4">
              <Link href="/auth/signin">
                <Button className="w-full">
                  Tekrar Dene
                </Button>
              </Link>

              <Link href="/">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Ana Sayfaya Dön
                </Button>
              </Link>
            </div>

            {error && (
              <div className="mt-6 p-4 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-500">
                  Hata Kodu: {error}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
  return <Suspense fallback={null}>{content}</Suspense>
} 