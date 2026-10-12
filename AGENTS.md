# Codexle Petshop Stok Takip — Proje ve Dağıtım Kuralları

## 🎯 Hedef Depolar
Bu projenin geliştirme ve demo deposu yalnızca `https://github.com/qRowLenq/aybars-pos.git`, demo adresi ise `https://qrowlenq.github.io/aybars-pos/` adresidir.

- **Bluepetshop canlı mağaza sistemidir.** Kullanıcı ayrıca açıkça izin verene kadar `qRowLenq/bluepetshop` deposuna, `https://qrowlenq.github.io/bluepetshop/` sitesine ve bu sisteme bağlı gerçek mağaza verilerine hiçbir değişiklik, push veya dağıtım yapılmamalıdır.
- Diğer depolar bu çalışma kapsamında değildir. Kod değişiklikleri ve dağıtımlar yalnızca `qRowLenq/aybars-pos` deposuna uygulanmalıdır.
- Web demosunun izole tarayıcı verileri ve kapalı Google E-Tablo gönderimleri korunmalıdır. Kurulu Windows sürümü ayrı olarak yerel SQLite ve mağazaya özel bağlantı kullanır.

## ⚙️ Google Script URL Mimarisi
- `bluepetshop` deposu ve canlı adresi kendi özel Google Apps Script URL'sini (`AKfycbzVo_f31p2ys12zv8aXEOtIrwyRnHCtsN_rrGLReUjL0U5I_lktxDUW4ixM6i50Bvwi`) kullanır.
- `aybars` ve `aybars-pos` depoları Aybars Google Apps Script URL'sini (`AKfycby4ue2uUwGkZUju68CFkaV6fSUZr1zOb57Q08rsVaeA__a1j214ShzK0H5_a6GOOyl_`) kullanır.
- Bu ayrım `js/state.js` içerisindeki dinamik `GOOGLE_SCRIPT_URL` mantığıyla otomatik olarak yönetilir.
