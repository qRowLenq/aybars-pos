# 🐾 Petshop Kasa & Envanter Yönetim Sistemi

Modern esnaf ihtiyaçları ile bulut mimarisini harmanlayan, istemci tarafında tam yetenekli (Client-Side Rendered) bir POS ve ERP çözümü.

## 🚀 Canlı Demo

**[https://budakhuseyin.github.io/aybars/](https://budakhuseyin.github.io/aybars/)**

## ✨ Özellikler

### 🛒 POS & Satış Motoru
- Anlık sepet hesaplamaları ve real-time stok düşümü
- Çoklu ödeme yöntemi: Nakit, Kredi Kartı, Parçalı Tahsilat, Veresiye
- İade/İptal mekanizması ile transaction güvenliği
- Askıdaki sepet yönetimi
- Gidecek sipariş (teslimat) desteği

### 📦 Stok & Envanter
- Ürün CRUD işlemleri ve kategori yönetimi
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

### GitHub Pages Aktifleştirme

1. Bu repoyu GitHub'a push edin
2. **Settings → Pages** sekmesine gidin
3. **Source** olarak `Deploy from a branch` seçin
4. **Branch** olarak `main` ve `/ (root)` seçin
5. **Save** butonuna basın
6. Site birkaç dakika içinde `https://budakhuseyin.github.io/aybars/` adresinde yayına alınır

## 📞 İletişim

Aybars Petshop Kasa Sistemi © 2026
