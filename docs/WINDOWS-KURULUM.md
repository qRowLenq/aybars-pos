# Windows 10/11 için Aybars POS

Bu sürüm bilgisayara kurulur; açılışta GitHub, web sunucusu, Node.js veya internet gerekmez.
Her kurulum tek mağazaya aittir. İlk açılışta müşteri, satış, tedarikçi ve ürün kayıtları boştur.
Ürünleri uygulamada ekleyin veya işletmenin JSON yedeğini **Yükle** düğmesinden aktarın.
GitHub Pages sürümü ayrı, izole demo olarak kalır.

## Müşteri bilgisayarına kurulum

1. `Aybars-POS-Kurulum-1.0.0.exe` dosyasını 64 bit Windows 10/11 bilgisayarda çalıştırın.
2. Masaüstündeki **Aybars POS** simgesini açın.
3. **Mağaza & Bağlantı** ekranından mağaza adını kaydedin. E-Tablo olmadan kasa kullanılabilir.
4. İşletmenin ürünlerini ve başlangıç stoklarını ekleyin.

Güncellemeden önce programı kapatın ve dosya yedeği alın; yeni kurulum paketini çalıştırın.
Program dosyaları `%LOCALAPPDATA%\Programs\Aybars POS` altında, kayıtlar ise
`%APPDATA%\aybars-pos\data\aybars.sqlite` altında ayrı tutulur.
Güncelleme ve kaldırma mağaza verilerini silmez. Veri klasörünü müşteriler arasında kopyalamayın.
Program dijital imzalı değildir; Windows SmartScreen yayıncı doğrulaması gösterilebilir.
Bu bulut ortamında Electron arayüzü Linux üzerinde test edilmiştir; Windows üzerinde ilk
kurulum, yeniden açılış ve kaldırıp tekrar kurulum kabul kontrolünü müşteri tesliminden önce yapın.

## Her petshop için ayrı Google E-Tablo

Her müşteri kendi Google hesabında ayrı bir tablo oluşturmalıdır. Eski Aybars adresi yerel
sürümde kullanılmaz. Google bağlantısı bir kez kurulur; kasa çalışırken tarayıcı açılmaz.

1. Yeni tablonun **Uzantılar → Apps Script** ekranını açın.
2. Bu depodaki güncel `Code.gs` içeriğini projeye kopyalayıp kaydedin.
3. Programın **Mağaza & Bağlantı** ekranındaki mağaza kimliğini alın.
4. Apps Script **Proje ayarları → Komut dosyası özellikleri** bölümünde iki özellik ekleyin:
   `POS_STORE_ID` = mağaza kimliği; `POS_API_KEY` = mağazaya özel, en az 24 karakterlik rastgele anahtar.
   Anahtarı herkese açık dosyalara, GitHub'a veya sohbetlere yazmayın.
5. **Dağıt → Yeni dağıtım → Web uygulaması** seçin. Kendi hesabınız olarak yürütün;
   erişimi bağlantı anahtarıyla çalışan uygulamanın ulaşabileceği şekilde **Herkes** yapın.
   Workspace yöneticisi bu erişimi yasaklıyorsa yöneticinin izni gerekir.
6. Google izinlerini verip `/exec` ile biten adresi alın. Adresi ve aynı bağlantı anahtarını
   programda girin; **Bağlantıyı doğrula ve kaydet** düğmesine basın.
7. İlk gerçek işlemi müşterinin tablosunda kontrol edin. Kod değiştirildiğinde mevcut dağıtımı
   yeni sürümle güncelleyin; yalnızca editöre kaydetmek web uygulamasını güncellemez.

Anahtar Windows hesabının güvenli saklama sistemiyle şifrelenir. Her kurulumun mağaza kimliği
ayrıdır; başka petshopun tablosu kimlik kontrolünden geçmez. İki kasa bilgisayarı arasında ortak
yerel stok veya veri paylaşımı bu sürümün kapsamı dışındadır.

## İnternet kesildiğinde

Kasa, stok ve kayıtlar SQLite veritabanına yazılır. E-Tablo olayları aynı veritabanındaki kalıcı
kuyrukta bekler. Program açıkken bağlantı 15 saniyede bir denenir; hatalarda artan bekleme
uygulanır. Uygulama kapalıyken aktarım yapılmaz; yeniden açıldığında kaldığı yerden devam eder.
Bekleyen kayıt varken kurulmuş tablonun adresi değiştirilemez. Anahtar yenilenebilir.
Ekrandaki bekleyen kayıt sayısını kontrol edin; **Şimdi aktar** ile elle tekrar deneyebilirsiniz.

`_AYBARS_SYNC` sekmesi işlem kimliklerini saklar. Başarıyla işlenen bir olay tekrar gelirse
ikinci kez satış yazılmaz. Apps Script işlem ortasında kesilirse durum `processing` kalır ve
otomatik aktarım durur. Bu durumda teknik destek, ilgili satış/gider kaydını tablodan kontrol
etmelidir: tamamlandıysa durum hücresini `done`, hiçbir etkisi olmadıysa `retry` yapmalıdır.
Kısmen işlendiğinde önce tabloyu düzeltin; körlemesine `retry` yapmayın. Ardından programda
**Şimdi aktar** kullanın. Bu sekmeyi silmek veya işlem kimliklerini değiştirmek çift kayda yol açabilir.
Bu güvenlik mekanizması kesinti sırasında hatalı başarı bildirmek yerine inceleme gerektirir.

## Yedekler ve geri yükleme

Açılışta, saatte bir ve normal kapanışta tutarlı SQLite yedeği alınır; son 30 dosya
`data\backups` altında tutulur. Kuyruk ve mağaza ayarları da yedeğe dahildir.
**Mağaza & Bağlantı → Dosya yedeği al** ile USB veya başka diske ayrıca kopyalayın.
Aynı diskteki otomatik yedekler disk arızasına karşı yeterli değildir.

Tam geri yükleme için programı kapatın. **Veri klasörünü aç** ile bulunan `data` klasörünün
tamamını önce başka yere kopyalayın. Bu kopya doğrulandıktan sonra mevcut `aybars.sqlite`,
`aybars.sqlite-wal` ve `aybars.sqlite-shm` dosyalarını veri klasöründen taşıyın.
Seçilen tutarlı `.sqlite` yedeğini `aybars.sqlite` adıyla yerleştirin ve programı açın.
Bu işlemi açık uygulamada yapmayın. Başka Windows hesabında bağlantı anahtarı tekrar girilmelidir.
Eski yedek sonrası, yedekten sonra gerçekleşen satışlar otomatik geri gelmez; önce mutabakat yapın.

## Geliştirici

Node.js 24 ile `npm ci`, ardından `npm start` kullanın. Linux Electron kurulumu için gerektiğinde
`NODE_USE_ENV_PROXY=1 node node_modules/electron/install.js` proxy desteğini etkinleştirir;
TLS ve paket checksum kontrolleri korunur. `npm test` veritabanı/kuyruk/Apps Script sözleşmesini,
`npm run test:ui` boş mağaza, satış ve yeniden açılış kalıcılığını sınar.
Linux arayüz testinde Xvfb gerekir; standart komut `xvfb-run -a npm run test:ui`.

`npm run dist:win` Windows kurulum dosyasını `dist` altında üretir. Özel NSIS betiği
uygulamayı ve Windows kaldırma programını standart NSIS araçlarıyla üretir; Linux'ta Wine gerekmez.
Windows GitHub Actions iş akışı da aynı paketi artifact olarak üretir; müşterinin bilgisayarı
bu iş akışına veya GitHub erişimine ihtiyaç duymaz. Kurulum dosyaları Git deposuna eklenmez.
