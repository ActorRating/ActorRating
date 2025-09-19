# ActorRating.com Authentication System

Bu dokümantasyon, ActorRating.com için geliştirilen kapsamlı kimlik doğrulama sistemini açıklar.

## Özellikler

### 1. Kullanıcı Kaydı

- **Google OAuth ile Giriş**: Sadece Google hesabı ile kayıt ve giriş
- **E-posta Doğrulama**: Google üzerinden otomatik e-posta doğrulama
- **Şartlar ve Koşullar**: Kullanım şartları ve gizlilik politikası onayı
- **KVKK Uyumluluğu**: Türk GDPR (KVKK) uyumluluk onayı
- **Anti-spam Koruması**: Temel spam koruması
- **Onboarding Akışı**: İlk giriş sonrası kullanıcı yönlendirme

### 2. Kullanıcı Girişi

- **Google Giriş Butonu**: Tek tıkla Google ile giriş
- **NextAuth.js Oturum Yönetimi**: Güvenli oturum işleme
- **Hesap Kilitleme Hazırlığı**: Rate limiting için altyapı
- **"Beni Hatırla"**: Google girişi için opsiyonel
- **Şifre Sıfırlama**: Şu an gerekli değil (Google OAuth)

### 3. Kullanıcı Profil Yönetimi

- **Temel Profil Düzenleme**: Ad, profil resmi, bio, vb.
- **Gizlilik Ayarları**: Profil görünürlüğü, e-posta gösterimi
- **KVKK Uyumlu Hesap Silme**: Veri silme hakkı
- **Veri Dışa Aktarma**: KVKK uyumluluğu için

### 4. Oturum Yönetimi

- **Güvenli Oturum İşleme**: JWT tabanlı oturumlar
- **Otomatik Çıkış**: İsteğe bağlı inaktivite sonrası çıkış
- **Middleware Koruması**: Giriş gerektiren sayfalar için
- **Aktif Oturum Takibi**: Temel oturum izleme

### 5. Güvenlik

- **Kullanıcı Girdisi Sanitizasyonu**: Tüm girdiler temizlenir
- **CSRF Koruması**: NextAuth.js tarafından otomatik
- **Rate Limiting Hazırlığı**: Giriş denemeleri için
- **Güvenlik Loglama**: Placeholder

## Teknik Uygulama

### Kullanılan Teknolojiler

- **NextAuth.js**: Kimlik doğrulama çerçevesi
- **Google OAuth**: Tek giriş sağlayıcısı
- **Prisma**: Veritabanı ORM
- **PostgreSQL**: Veritabanı
- **TypeScript**: Tip güvenliği
- **Tailwind CSS**: Styling

### Veritabanı Şeması

#### User Model

```prisma
model User {
  id                    String    @id @default(cuid())
  name                  String?
  email                 String?   @unique
  emailVerified         DateTime?
  image                 String?

  // Authentication and compliance fields
  termsAccepted         Boolean   @default(false)
  kvkkAccepted          Boolean   @default(false)
  onboardingCompleted   Boolean   @default(false)
  lastLoginAt           DateTime?
  loginAttempts         Int       @default(0)
  lockedUntil           DateTime?
  isActive              Boolean   @default(true)

  // Profile fields
  bio                   String?
  location              String?
  website               String?

  // Privacy settings
  profilePublic         Boolean   @default(true)
  showEmail             Boolean   @default(false)

  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  // Relations
  accounts              Account[]
  sessions              Session[]
  performances          Performance[]
  ratings               Rating[]
}
```

## Dosya Yapısı

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts    # NextAuth API
│   │   └── user/
│   │       ├── profile/route.ts           # Profil API
│   │       ├── onboarding/route.ts        # Onboarding API
│   │       ├── delete/route.ts            # Hesap silme API
│   │       └── export/route.ts            # Veri dışa aktarma API
│   ├── auth/
│   │   ├── signin/page.tsx                # Giriş sayfası
│   │   └── error/page.tsx                 # Hata sayfası
│   ├── onboarding/page.tsx                # Onboarding sayfası
│   ├── profile/
│   │   ├── page.tsx                       # Profil sayfası
│   │   ├── delete/page.tsx                # Hesap silme sayfası
│   │   └── export/page.tsx                # Veri dışa aktarma sayfası
│   ├── terms/page.tsx                     # Kullanım şartları
│   ├── privacy/page.tsx                   # Gizlilik politikası
│   └── kvkk/page.tsx                      # KVKK aydınlatma metni
├── components/
│   └── auth/
│       ├── LoginButton.tsx                # Google giriş butonu
│       └── UserMenu.tsx                   # Kullanıcı menüsü
├── lib/
│   └── auth.ts                           # NextAuth yapılandırması
└── middleware.ts                         # Route koruması
```

## Kurulum

### 1. Ortam Değişkenleri

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/actor_rating_db
```

### 2. Google OAuth Kurulumu

1. [Google Cloud Console](https://console.cloud.google.com/)'a gidin
2. Yeni bir proje oluşturun
3. OAuth 2.0 client ID oluşturun
4. Authorized redirect URIs'e `http://localhost:3000/api/auth/callback/google` ekleyin

### 3. Veritabanı Kurulumu

```bash
# Migration çalıştır
npx prisma migrate dev

# Prisma client oluştur
npx prisma generate
```

## Kullanım

### Giriş Akışı

1. Kullanıcı `/auth/signin` sayfasına gider
2. Şartları ve KVKK'yi kabul eder
3. Google ile giriş yapar
4. Onboarding sayfasına yönlendirilir
5. Onboarding tamamlandıktan sonra ana sayfaya gider

### Profil Yönetimi

- `/profile`: Profil görüntüleme ve düzenleme
- `/profile/delete`: KVKK uyumlu hesap silme
- `/profile/export`: Veri dışa aktarma

### KVKK Uyumluluğu

- **Veri Silme**: Kullanıcılar hesap ve tüm verilerini silebilir
- **Veri Dışa Aktarma**: JSON formatında tüm veriler indirilebilir
- **Aydınlatma Metni**: KVKK gereksinimleri karşılanır

## Güvenlik Önlemleri

### Oturum Güvenliği

- JWT tabanlı oturumlar
- 30 günlük oturum süresi
- Güvenli çerez ayarları

### Veri Koruması

- Tüm API endpoint'leri kimlik doğrulama gerektirir
- Kullanıcı girdisi sanitizasyonu
- SQL injection koruması (Prisma)

### Rate Limiting

- Giriş denemeleri için hazır altyapı
- Hesap kilitleme mekanizması

## Geliştirme

### Yeni Özellik Ekleme

1. Prisma şemasını güncelleyin
2. Migration oluşturun
3. API endpoint'leri ekleyin
4. UI bileşenlerini oluşturun
5. Test edin

### Test Etme

```bash
# Development server
npm run dev

# Database seed
npm run db:seed

# Build
npm run build
```

## Sorun Giderme

### Yaygın Sorunlar

1. **Google OAuth Hatası**: Client ID ve secret'ı kontrol edin
2. **Veritabanı Bağlantısı**: DATABASE_URL'i kontrol edin
3. **Middleware Hatası**: Route koruması ayarlarını kontrol edin

### Loglar

- NextAuth.js logları console'da görünür
- Prisma logları için `DEBUG=prisma:*` kullanın

## Gelecek Geliştirmeler

- [ ] E-posta doğrulama sistemi
- [ ] İki faktörlü kimlik doğrulama
- [ ] Sosyal medya entegrasyonu
- [ ] Gelişmiş profil özellikleri
- [ ] Admin paneli
- [ ] Kullanıcı istatistikleri
- [ ] Otomatik yedekleme sistemi

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.
