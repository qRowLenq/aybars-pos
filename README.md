# 🐾 Petshop Kasa & Envanter Yönetim Sistemi

Modern esnaf ihtiyaçları ile bulut mimarisini harmanlayan, istemci tarafında tam yetenekli (Client-Side Rendered) bir POS ve ERP çözümü.

## 🚀 Canlı Demo & Dağıtım Linkleri

| Sistem / Şube | GitHub Deposu | Canlı Demo (GitHub Pages) |
|---|---|---|
| **🐾 Aybars** | [budakhuseyin/aybars](https://github.com/budakhuseyin/aybars) | [https://budakhuseyin.github.io/aybars/](https://budakhuseyin.github.io/aybars/) |
| **🛒 Aybars POS** | [qRowLenq/aybars-pos](https://github.com/qRowLenq/aybars-pos) | [https://qrowlenq.github.io/aybars-pos/](https://qrowlenq.github.io/aybars-pos/) |
| **💙 Bluepetshop** | [qRowLenq/bluepetshop](https://github.com/qRowLenq/bluepetshop) | [https://qrowlenq.github.io/bluepetshop/](https://qrowlenq.github.io/bluepetshop/) |

---

## ⚙️ Google Script & Bulut Mimarisi

Sistem, çalışma ortamını URL ve alan adına göre dinamik olarak tespit eder ve şubeye özel Google Apps Script uç noktasına otomatik olarak bağlanır:
- **Aybars & Aybars POS:** `AKfycby4ue2uUwGkZUju68CFkaV6fSUZr1zOb57Q08rsVaeA__a1j214ShzK0H5_a6GOOyl_`
- **Bluepetshop:** `AKfycbzVo_f31p2ys12zv8aXEOtIrwyRnHCtsN_rrGLReUjL0U5I_lktxDUW4ixM6i50Bvwi`

---

## ✨ Özellikler

### 🛒 POS & Satış Motoru
- Anlık sepet hesaplamaları ve real-time stok düşümü
- Otomatik donanım barkod okuyucu desteği (hızlı okuma ve otomatik sepete ekleme)
- Çoklu ödeme yöntemi: Nakit, Kredi Kartı, Parçalı Tahsilat, Veresiye, Havale / IBAN
- İade/İptal mekanizması ile transaction güvenliği
- Askıdaki sepet yönetimi
- Gidecek sipariş (teslimat) desteği

### 📦 Stok & Envanter
- Ürün CRUD işlemleri ve kategori yönetimi
- Kalıcı ürün silme (tombstone koruması ile silinen ürünlerin geri gelmesini önleme)
- Ağırlıklı ortalama maliyet (WAC) hesabı
- Kâr marjı takibi
- Kritik stok uyarıları (≤ 2 adet)
- Eksik listesi ve akıllı sipariş önerileri

### 🎁 Kampanya / Paket (Bundle) Motoru
- Sanal ürün mantığıyla çalışan kombo paketler
- Atomik stok düşümü (alt ürünler otomatik düşer)

### 🗑️ Fire / Zayi Takibi
- Gerekçeli stok düşümü
- WAC üzerinden zayi maliyet hesabı

### 👥 CRM & Veresiye Defteri
- Müşteri profilleri ve evcil hayvan bilgileri
- Alışveriş geçmişi takibi
- Açık hesap / borç yönetimi
- Veresiye tahsilat mekanizması

### 📦 Tedarik & Toptancı Yönetimi
- Toptancı cari hesap takibi
- Fatura görseli (Base64) saklama
- Çift yönlü cari mutabakat
- Borç ödeme ve E-Tablo senkronizasyonu

### 💸 Gider Yönetimi
- Ürün alımları (Toptancı faturaları)
- Sabit giderler (Kira, fatura, maaş)
- Günlük küçük masraflar

### 🏁 Gün Sonu Kapanış
- Banknot sayımı ile kasa mutabakatı
- Ciro/fark hesaplama

### ☁️ Google E-Tablo Entegrasyonu
- Serverless backend (Google Apps Script)
- Satış, gider ve cari hareketlerin otomatik E-Tablo'ya yazılması

### 💾 Yedekleme
- JSON formatında tam yedek indirme/yükleme
- localStorage tabanlı kalıcı veri saklama

## 🛠️ Teknik Altyapı

| Bileşen | Teknoloji |
|---------|-----------|
| Frontend | HTML5 + CSS3 + Vanilla JavaScript |
| State Management | localStorage (Reactive DOM Binding) |
| Backend | Google Apps Script (Serverless) |
| Veri Katmanı | Google Sheets (NoSQL-like) |
| Hosting | GitHub Pages (Static) |
| Mimari | SPA (Single Page Application) |

## 📋 Kurulum

**Kurulum gerektirmez!** Doğrudan `index.html` dosyasını tarayıcıda açın veya GitHub Pages üzerinden erişin.

## 📞 İletişim

Aybars & Bluepetshop Kasa Sistemi © 2026
