# T.C. Menteşe Kaymakamlığı SYDV — Hane Ziyareti Bilgi Sistemi

**Menteşe Sosyal Yardımlaşma ve Dayanışma Vakfı Başkanlığı** saha inceleme görevlilerinin hane ziyaretlerini hızlı, düzenli ve dijital ortamda kayıt altına alması, fotoğraflaması, konumlandırması ve raporlaması amacıyla geliştirilmiş tam kapsamlı (Full-Stack) web uygulamasıdır.

---

## İçindekiler

1. [Projenin Amacı](#-projenin-amacı)
2. [Öne Çıkan Özellikler](#-öne-çıkan-özellikler)
3. [Teknoloji Yığını](#-teknoloji-yığını)
4. [Sistem ve Klasör Mimarisi](#-sistem-ve-klasör-mimarisi)
5. [Veritabanı Modelleri](#-veritabanı-modelleri)
6. [REST API Uç Noktaları](#-rest-api-uç-noktaları)
7. [Kurulum ve Çalıştırma](#-kurulum-ve-çalıştırma)
8. [Excel'den Toplu Aktif Hane Yükleme](#-excelden-toplu-aktif-hane-yükleme)
9. [Yapay Zeka Fotoğraf Etiketleme Yapılandırması](#-yapay-zeka-fotoğraf-etiketleme-yapılandırması)

---

## 🎯 Projenin Amacı

Vakıfta kayıtlı **15.000+ aktif haneye** yılda en az bir kez yapılan sosyal inceleme ve hane ziyaretlerinde:
* Sahada mobil cihazdan (veya bilgisayardan) yalnızca **11 haneli TC Kimlik No** girilerek hane bilgilerinin (`Ad Soyad`, `Dosya No`, `Referans No`, `Telefon`, `Adres`) ve **önceki yıllara ait ziyaret kayıtlarının** otomatik ekrana getirilmesi,
* Evin fotoğraflarının doğrudan telefon kamerasıyla çekilip **Yapay Zeka (AI)** tarafından otomatik olarak (*Dış Cephe, Salon, Oturma Odası, Mutfak, Oda, Banyo*) etiketlenmesi,
* Hanenin **GPS koordinatlarının** alınarak harita üzerinde işaretlenmesi ve sonraki ziyaretlerde tek tıkla **Yol Tarifi (Navigasyon)** alınabilmesi,
* Ziyareti gerçekleştiren **1 veya 2 vakıf personelinin** (*Ziyareti Yapan* ve *Ziyarete Katılan*) kayıt altına alınması,
* Günlük, iki tarih arası, tek hane bazlı, personel bazlı ve mahalle/adres bazlı resmi **A4 PDF / Yazıcı** ve **Excel (`.xlsx`)** raporlarının üretilmesi sağlanmaktadır.

---

## ✨ Öne Çıkan Özellikler

### 1. 15.000+ Aktif Hane Rehberi & TC Kimlik No ile Otomatik Doldurma
* Vakfın aktif hane listesi Excel (`.xlsx` veya `.csv`) dosyasından toplu olarak (`bulk upsert`) saniyeler içinde veritabanına aktarılır.
* Yeni ziyaret ekleme ekranında **TC Kimlik No** 11 haneye ulaştığı anda sistem otomatik sorgulama yapar:
  * **Kayıtlı Hane Bulunursa:** `Ad Soyad`, `Dosya No`, `Referans No`, `Telefon` ve `Adres` alanları otomatik doldurulur.
  * **Önceki Ziyaretler Varsa:** Aynı haneye geçmiş yıllarda yapılmış tüm ziyaretler (tarih, inceleme notu, fotoğraf sayısı, görevli personeller ve detay bağlantısı ile) formun içinde listelenir.
  * **Kayıtlı Hane Yoksa:** Bilgiler elle girilir; ziyaret kaydedildiği anda hane otomatik olarak Aktif Hane Rehberine de eklenir.

### 2. Mobil Kamera Entegrasyonu ve Çoklu Fotoğraf Çekimi
* Telefondan kullanımda **"Kameradan Çek"** butonu (`capture="environment"`) doğrudan cihazın arka kamerasını açar.
* `DataTransfer` tabanlı biriktirme mekanizması sayesinde sahada arka arkaya birden fazla oda fotoğrafı çekilip tek seferde haneye yüklenebilir.
* İstenirse **"Galeriden / Dosya Seç"** butonu ile cihazdaki mevcut görseller de eklenebilir.

### 3. Yapay Zeka (AI) Destekli Otomatik Oda/Bölüm Etiketleme
* Yüklenen her fotoğraf çift katmanlı hibrit yapay zeka sınıflandırıcısı tarafından analiz edilerek şu etiketlerden biriyle otomatik etiketlenir:
  * `Dış Cephe` (`dis`)
  * `Salon` (`salon`)
  * `Oturma Odası` (`oturma_odasi`)
  * `Mutfak` (`mutfak`)
  * `Oda` (`oda`)
  * `Banyo` (`banyo`)
  * `Diğer` (`diger`)
* **1. Katman (Google Gemini 2.5 Flash Vision API):** `GEMINI_API_KEY` tanımlıysa bulut görsel yapay zeka modeli ile yüksek doğruluklu sınıflandırma yapar.
* **2. Katman (Yerel Görsel Analiz - Offline):** API anahtarı veya internet bağlantısı yoksa Pillow tabanlı bölgesel renk, doku, gökyüzü/yeşillik, seramik/fayans ve kenar yoğunluğu algoritmasıyla yerel sınıflandırma yapar.
* **Tek Tıkla Manuel Düzeltme & Toplu Etiketleme:** Galeride her fotoğrafın üzerindeki açılır etiket menüsünden etiket anında değiştirilebilir veya **"Mevcut Fotoğrafları Yapay Zeka ile Etiketle"** butonuyla eski fotoğraflar topluca sınıflandırılabilir.

### 4. Ziyaret Görevlisi Personel Yönetimi
* `/personnel` sayfasından vakıf inceleme görevlileri (`Ad Soyad`, `Ünvan / Görev`, `Telefon`, `Aktif/Pasif`) yönetilir.
* Ziyaret kaydında yan yana **"Hane Ziyaretini Yapan Personel"** ve **"Hane Ziyaretine Katılan Personel (İsteğe Bağlı)"** seçilir.
* Aynı personelin yanlışlıkla hem yapan hem katılan olarak seçilmesi hem arayüzde hem Backend'de engellenir.
* Kurumdan ayrılan personel pasife alındığında veya silindiğinde geçmiş ziyaret kayıtları (`on_delete=SET_NULL`) korunur.

### 5. GPS Konum, Canlı Harita ve Navigasyon (Yol Tarifi)
* Ziyaret sırasında **"Konumumu Al"** butonuyla tarayıcı GPS koordinatları (`Enlem`, `Boylam`) yüksek doğrulukla alınır ve form içinde canlı harita önizlemesi gösterilir.
* Hane detay sayfasında ücretli API anahtarı gerektirmeyen canlı **OpenStreetMap** haritası üzerinde hane konumu işaretlenir.
* **"Google Haritalar'da Aç"** ve **"Yol Tarifi Al"** butonlarıyla telefondan tek dokunuşla navigasyon başlatılır.

### 6. Gelişmiş Raporlama (Resmi A4 PDF/Yazdırma ve Orijinal `.xlsx` Excel Çıktısı)
* **5 Farklı Boyutta Filtreleme ve Raporlama:**
  1. **Takvimden Seçilen Gün:** Tıklanan günde yapılan tüm ziyaretler (`Bu Günü Raporla`).
  2. **İki Tarih Arası:** Başlangıç ve bitiş tarihi arasındaki ziyaretler.
  3. **Tek Hane Raporu:** Sadece seçilen haneye (TC Kimlik No) ait geçmişten bugüne yapılan tüm ziyaretler (`Bu Hanenin Ziyaretlerini Raporla`).
  4. **Görevli Personele Göre:** Seçilen personelin yaptığı veya katıldığı ziyaretler.
  5. **Mahalle / Köy / Adrese Göre:** Belirli bir mahalle, köy veya sokak kelimesini içeren ziyaretler.
* **Resmi A4 Yazdır / PDF Kaydet:** Vakıf logolu, `T.C. Menteşe Kaymakamlığı Sosyal Yardımlaşma ve Dayanışma Vakfı Başkanlığı` başlıklı, filtre özetli ve **İnceleme Görevlisi / Vakıf Müdürü** imza bloklu resmi rapor çıktısı.
* **Orijinal Excel (`.xlsx`) İndirme:** Harici kütüphane gerektirmeden tarayıcıda gerçek `.xlsx` çalışma kitabı üretir; TC Kimlik ve telefon numaralarındaki sıfırlar bozulmaz.

---

## 🛠 Teknoloji Yığını

| Katman | Teknoloji / Kütüphane | Açıklama |
| :--- | :--- | :--- |
| **Backend** | Python 3.13, Django 6.1.3 | Temel sunucu çatısı ve ORM |
| **REST API** | Django REST Framework 3.18 | Veri serileştirme ve CRUD API uç noktaları |
| **Görsel İşleme & AI** | Pillow 13.0, Gemini 2.5 Flash API | Fotoğraf optimizasyonu ve hibrit oda sınıflandırma |
| **Frontend** | Next.js 16.4 (App Router, Turbopack) | Sunucu bileşenleri (RSC) ve Server Actions |
| **Arayüz (UI)** | React 19.3, TypeScript 5, Tailwind CSS v4 | Modern, duyarlı (responsive) ve Açık/Koyu tema destekli arayüz |
| **Veritabanı** | SQLite3 / PostgreSQL (`psycopg2-binary`) | Geliştirmede SQLite, üretimde PostgreSQL uyumlu |

---

## 📁 Sistem ve Klasör Mimarisi

```text
sydv-ziyaret/
├── backend/
│   ├── config/
│   │   ├── settings.py              # Django ayarları ve .env yükleyici
│   │   └── urls.py                  # Ana URL yönlendirmeleri (/api/, /media/)
│   ├── households/
│   │   ├── models.py                # Personnel, RegisteredHousehold, Household, HouseholdPhoto
│   │   ├── serializers.py           # DRF Serializer sınıfları ve doğrulamalar
│   │   ├── views.py                 # API ViewSet'leri, TC sorgulama, Excel aktarım ve AI etiketleme
│   │   ├── excel_importer.py        # 15.000+ hanelik .xlsx / .csv toplu aktarım motoru
│   │   ├── photo_classifier.py      # Gemini Vision API + Yerel Pillow oda sınıflandırıcı
│   │   ├── admin.py                 # Django Admin paneli yapılandırması
│   │   ├── tests.py                 # Birim testleri (Excel, TC sorgu, Personel, Fotoğraf, AI)
│   │   └── management/commands/
│   │       └── import_households.py # Terminalden Excel yükleme komutu
│   ├── manage.py
│   └── requirements.txt
│
└── frontend/
    ├── public/
    │   └── sydv-logo.png            # Menteşe SYDV resmi logosu
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx           # Kök şablon ve üst menü
    │   │   ├── page.tsx             # Ana sayfa (Takvim, filtreleme ve ziyaret listesi)
    │   │   ├── globals.css          # Tailwind v4, Koyu Tema (Dark Mode) ve A4 Yazdırma (@media print) stilleri
    │   │   ├── personnel/           # Personel Yönetimi sayfası (/personnel)
    │   │   └── households/
    │   │       ├── new/             # Yeni Hane Ziyareti Ekleme sayfası (/households/new)
    │   │       ├── import/          # Excel Aktif Hane Yükleme sayfası (/households/import)
    │   │       └── [id]/            # Hane Ziyareti Detay, Galeri ve Düzenleme sayfası (/households/[id])
    │   ├── components/
    │   │   ├── Navbar.tsx                      # Vakıf logolu üst menü ve tema değiştirici
    │   │   ├── HouseholdExplorer.tsx           # Takvim, tarih aralığı, personel/adres filtresi ve liste
    │   │   ├── HouseholdEditor.tsx             # Hane bilgileri görüntüleme ve satır içi düzenleme
    │   │   ├── HouseholdGallery.tsx            # Kamera/galeri fotoğraf yükleme, AI etiketleme ve Lightbox
    │   │   ├── HouseholdMap.tsx                # Canlı OpenStreetMap haritası ve Google Maps yol tarifi
    │   │   ├── VisitReportModal.tsx            # Resmi A4 PDF/Yazdırma önizlemesi ve .xlsx Excel üretici
    │   │   └── HouseholdSingleReportButton.tsx # Tek haneye ait tüm ziyaretleri raporlama bileşeni
    │   └── lib/
    │       └── api.ts               # Backend REST API istemci fonksiyonları ve TypeScript tipleri
    ├── next.config.ts
    └── package.json
```

---

## 🗄 Veritabanı Modelleri

1. **`RegisteredHousehold` (Vakıfta Kayıtlı 15.000+ Aktif Hane Rehberi):**
   * `tc_no` (11 hane, `unique=True`, `db_index=True`), `ad`, `soyad`, `ad_soyad`, `dosya_no`, `referans_no`, `telefon`, `adres`, `updated_at`.
2. **`Personnel` (Vakıf İnceleme Görevlisi Personeller):**
   * `ad_soyad`, `unvan`, `telefon`, `aktif` (`Boolean`), `created_at`.
3. **`Household` (Hane Ziyareti Kaydı):**
   * `tc_no` (`db_index=True`), `ad_soyad`, `dosya_no`, `referans_no`, `telefon`, `adres`, `notlar`, `basvuru_turu`, `latitude`, `longitude`, `ziyareti_yapan_personel` (`FK -> Personnel`), `katilan_personel` (`FK -> Personnel`), `created_at`.
4. **`HouseholdPhoto` (Ziyaret Fotoğrafları):**
   * `household` (`FK -> Household`), `photo` (`ImageField`), `photo_type` (`dis`, `salon`, `oturma_odasi`, `mutfak`, `oda`, `banyo`, `diger`), `created_at`.

---

## 🔌 REST API Uç Noktaları

| Metot | Uç Nokta (Endpoint) | Açıklama |
| :--- | :--- | :--- |
| `GET / POST` | `/api/households/` | Ziyaret kayıtlarını listeler / yeni ziyaret oluşturur (aktif hane rehberini de senkronize eder) |
| `GET / PATCH / DELETE` | `/api/households/{id}/` | Tekil ziyaret kaydı detayı, güncelleme ve silme |
| `GET` | `/api/households/lookup/?tc_no=11122233344` | 11 haneli TCKN ile 15.000 aktif hane bilgisini ve geçmiş ziyaret kayıtlarını döndürür |
| `GET` | `/api/registered-households/stats/` | Sistemde kayıtlı toplam aktif hane sayısını ve son güncellenme tarihini döndürür |
| `POST` | `/api/registered-households/import/` | `.xlsx` veya `.csv` dosyasından toplu aktif hane aktarımı yapar |
| `GET / POST` | `/api/personnel/` | Personel listesi ve yeni personel ekleme |
| `PATCH / DELETE` | `/api/personnel/{id}/` | Personel aktif/pasif durumu güncelleme veya silme |
| `POST` | `/api/photos/` | Haneye fotoğraf yükler ve yapay zeka ile oda etiketini otomatik belirler |
| `PATCH / DELETE` | `/api/photos/{id}/` | Fotoğrafın oda etiketini (`photo_type`) günceller veya fotoğrafı diskten siler |
| `POST` | `/api/photos/auto-classify/` | Belirtilen hanedeki mevcut fotoğrafları yapay zeka ile topluca yeniden etiketler |

---

## 🚀 Kurulum ve Çalıştırma

### 1. Backend (Django) Kurulumu

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```
*Backend varsayılan olarak `http://127.0.0.1:8000` adresinde çalışır.*

### 2. Frontend (Next.js) Kurulumu

Yeni bir terminal açarak:

```powershell
cd frontend
npm install
npm run dev
```
*Frontend varsayılan olarak `http://localhost:3000` adresinde çalışır.*

---

## 📊 Excel'den Toplu Aktif Hane Yükleme

Hazırladığınız Excel (`.xlsx`) veya `.csv` dosyasında aşağıdaki sütun başlıklarının bulunması yeterlidir (sütun sırası önemli değildir):

| `DOSYA NO` | `REFERANS NO` | `AD` | `SOYAD` | `TCKN` | `TELEFON` | `ADRES` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1042 | REF-9001 | AHMET | YILMAZ | 11122233344 | 05321112233 | Cumhuriyet Mah. No:5 |

### Yükleme Yöntemi 1 — Web Arayüzünden
1. Üst menüdeki **"Excel Hane Yükle"** butonuna tıklayın (`http://localhost:3000/households/import`).
2. `.xlsx` dosyanızı seçip **"Aktif Haneleri Veritabanına Yükle"** butonuna basın.

### Yükleme Yöntemi 2 — Terminal Komutuyla
```powershell
backend\venv\Scripts\python.exe backend\manage.py import_households "C:\dosya\yolu\aktif_haneler.xlsx"
```

---

## 🤖 Yapay Zeka Fotoğraf Etiketleme Yapılandırması

Sistem fotoğrafları otomatik etiketlerken iki katmanlı çalışır:

1. **Google Gemini Vision API (İsteğe Bağlı Bulut AI):**
   `backend/.env` dosyası oluşturup içerisine Google AI Studio'dan alınan anahtarınızı ekleyebilirsiniz:
   ```env
   GEMINI_API_KEY=sizin_gemini_api_anahtariniz
   ```
2. **Yerel Görsel Analiz (Varsayılan / Offline):**
   `GEMINI_API_KEY` tanımlanmasa bile sistem hiçbir hata vermeden Pillow tabanlı yerel görüntü analizi ile fotoğrafları *Dış Cephe, Salon, Oturma Odası, Mutfak, Oda, Banyo* olarak otomatik sınıflandırır.
