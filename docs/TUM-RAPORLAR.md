# Tam E-Tablo raporları

GitHub'daki `Code.gs` eski gelir takvimini, gider defterini ve mali raporu korur.
Günlük ve aylık özetler brüt satış, iade, net ciro, nakit, kart, havale,
veresiye, platform, satış KDV'si, işlem sayısı, tahsilat ve gideri ayrı gösterir.
Müşteri, tedarikçi, satış detayları, ürün satışları, stok, ihtiyaç, sipariş,
fire, gün sonu ve kayıt arşivi de tam veri kopyasına dahildir.

## Windows üzerinden yenileme

1. Bu deponun güncel `Code.gs` dosyasını demo mağazasının bağlı Apps Script
   projesine yükleyip mevcut web uygulaması dağıtımını yeni sürümle güncelleyin.
2. `POS_STORE_ID` ve `POS_API_KEY` mağazaya özel ayarlarını tamamlayın.
3. Güncel Windows kurulumunda **Mağaza & Bağlantı → Tüm raporları E-Tabloya yenile**
   seçin. Mevcut kayıtların tam kopyası aktarım kuyruğuna alınır; daha önceki
   bekleyen işlemler sırayla aktarılır. Raporlar yeni kopyayla yenilenir.

## Demo yedeğiyle elle yenileme

1. Web demosundaki **Yedek Al** düğmesiyle tam JSON yedeğini indirin.
2. JSON dosyasını kendi Google Drive hesabınıza yükleyin.
3. Tabloya bağlı güncel Apps Script'te
   `AYBARS_JSON_YEDEKTEN_TUM_RAPORLARI_AKTAR` fonksiyonunu çalıştırın;
   istenen alana Drive JSON dosyasının kimliğini girin.
4. Bu işlem rapor sekmelerini yedekteki verilerle yeniler. Aynı yedek
   tekrar aktarıldığında ciro ikinci kez eklenmez.

Web demosunun otomatik gönderimi kapalıdır. Tek seferlik aktarılan rapor,
tarayıcıdaki sonraki işlemlerle kendiliğinden yenilenmez. Tabloya elle eklenen
rapor satırları tam kopya yenilenirken kaynak yedekle değiştirilir.

Net ciroda eski borç tahsilatı yeniden satış sayılmaz. Eksik ödeme dağılımları
**VERİ KONTROLÜ** sayfasında işaretlenir. Eksik maliyetler kârı belirsizleştirir.
Mali rapor eski uygulamanın tahmini hesaplarını gösterir; resmi beyanname değildir.
Fatura görselleri JSON yedeğinde kalır; hücrelere taşınmaz. Kaynak kayıtlarda
bulunmayan alanlar boş bırakılır.

Bu çalışma yalnızca `aybars-pos` içindir; canlı Bluepetshop'a uygulanmaz.
