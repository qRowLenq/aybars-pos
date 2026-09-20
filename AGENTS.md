# Proje ve Dağıtım Kuralları

## 🎯 Hedef Depolar
Bu projede yapılacak tüm kod değişiklikleri, geliştirmeler ve dağıtımlar aşağıdaki depolara uygulanabilir:

1. **Aybars:** `https://github.com/budakhuseyin/aybars.git` (Canlı Demo: `https://budakhuseyin.github.io/aybars/`)
2. **Aybars POS:** `https://github.com/qRowLenq/aybars-pos.git` (Canlı Demo: `https://qrowlenq.github.io/aybars-pos/`)
3. **Bluepetshop:** `https://github.com/qRowLenq/bluepetshop.git` (Canlı Demo: `https://qrowlenq.github.io/bluepetshop/`)

## ⚙️ Google Script URL Mimarisi
- `bluepetshop` deposu ve canlı adresi kendi özel Google Apps Script URL'sini (`AKfycbzVo_f31p2ys12zv8aXEOtIrwyRnHCtsN_rrGLReUjL0U5I_lktxDUW4ixM6i50Bvwi`) kullanır.
- `aybars` ve `aybars-pos` depoları Aybars Google Apps Script URL'sini (`AKfycby4ue2uUwGkZUju68CFkaV6fSUZr1zOb57Q08rsVaeA__a1j214ShzK0H5_a6GOOyl_`) kullanır.
- Bu ayrım `js/state.js` içerisindeki dinamik `GOOGLE_SCRIPT_URL` mantığıyla otomatik olarak yönetilir.
