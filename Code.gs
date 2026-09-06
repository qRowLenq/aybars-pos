/**
 * ===================================================================
 * PETSHOP KASA & ENVANTER YÖNETİMİ — GOOGLE APPS SCRIPT BACKEND
 * Dual-Layer "Real Profit vs. Tax Exposure" Engine & Sheets Sync
 * Version: 2.3.0 (Fixed Alignment & KPI Dashboard Card Layout)
 * ===================================================================
 * 
 * BU GÜNCELLEME İLE DÜZELTİLENLER:
 * 1. GİDERLER TABLOSU DÜZELTİLDİ:
 *    - Yeni giderler satır 20 yerine en son dolu satırın hemen altına (örn. satır 8'e) ardışık eklenir.
 *    - Kolon hizalaması tam 7 kolon olarak kilitlendi:
 *      Tarih (A) | Saat (B) | Kategori (C) | Kaynak (D) | Açıklama (E) | Tutar (F) | Fatura Durumu (G)
 *    - "Faturalı" etiketinin M kolonuna taşması engellendi (H-Z kolonları temizlenir).
 *    - Hatalı "12.312.312,00 TL" değeri otomatik temizlenir ve TOPLAM formülü =SUM(F2:F...) olarak doğru yere konur.
 * 
 * 2. MALİ RAPOR & VERGİ SEKME YENİLİĞİ:
 *    - 11 kolonluk geniş tablo yerine 2 adet şık KPI Dashboard Kartı oluşturuldu:
 *      * KART 1: 🏛️ KDV MUTABAKATI (Tahsil Edilen KDV, İndirilecek KDV, Net Ödenecek / Devreden KDV)
 *      * KART 2: 🛡️ RESMİ KÂR & VERGİ KALKANI (Resmi Satışlar, Faturalı Giderler, Vergi Matrahı, %20 Gelir Vergisi, Fiili Kasa Kârı)
 *    - Tüm kolon genişlikleri cömertçe ayarlandı, "Toplam Tutar" veya rakamların kırpılması önlendi.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = data.action || "";

    switch (action) {
      case "save_sale":
        handleSaveSale(ss, data);
        break;

      case "save_expense":
        handleSaveExpense(ss, data);
        break;

      case "daily_close":
        handleDailyClose(ss, data);
        break;

      case "sync_tax_report":
        handleSyncTaxReport(ss, data);
        break;

      default:
        break;
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", action: action }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Petshop Kasa & Vergi Motoru Aktif — v2.3.0")
    .setMimeType(ContentService.MimeType.TEXT);
}

// ── 1. SATIŞLAR TABLOSU ──
function handleSaveSale(ss, data) {
  var sheetName = "Satışlar";
  var sheet = ss.getSheetByName(sheetName);
  var headers = [
    "Tarih", "Saat", "Müşteri", "Kanal", "Satılan Kalemler",
    "Ödeme Türü", "Toplam Tutar (TL)", "KDV Tutarı (TL)", "Mali Statü"
  ];

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    formatHeaderRow(sheet, headers.length);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    formatHeaderRow(sheet, headers.length);
  }

  var isOff = (data.isOfficial === true || data.isOfficial === "true");
  var statusText = isOff ? "Resmi (Fişli)" : "İç Kayıt (Fişsiz)";

  var row = [
    data.date || getTodayFormatted(),
    data.time || getTimeFormatted(),
    data.customerName || "Tezgâh",
    data.channel || "Tezgâh",
    data.itemsSummary || "",
    data.paymentType || "Nakit",
    Number(data.total || 0),
    Number(data.vatTotal || 0),
    statusText
  ];

  sheet.appendRow(row);
  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 7, 1, 2).setNumberFormat("₺#,##0.00");
}

// ── 2. GİDERLER TABLOSU (KESİN KOLON A-G VE ARDIŞIK SATIR HİZALAMASI) ──
function handleSaveExpense(ss, data) {
  var sheetName = "Giderler";
  var sheet = ss.getSheetByName(sheetName);
  var standardHeaders = [
    "Tarih", "Saat", "Kategori", "Ödeme Kaynağı", "Açıklama", "Tutar (TL)", "Fatura Durumu"
  ];

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  // Başlık satırını (A1:G1) tam 7 kolon olarak sabitle
  sheet.getRange(1, 1, 1, 7).setValues([standardHeaders])
    .setBackground("#1e293b")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(10.5)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 32);
  sheet.setFrozenRows(1);

  // 1. Buglu 12.312.312 değerlerini ve H:Z arası taşan kolonları temizle
  cleanGiderlerSheet(sheet);

  // 2. Ardışık olarak son dolu satırın hemen altını tespit et (Örn: satır 7'den sonra satır 8)
  var targetRow = getNextSequentialExpenseRow(sheet);

  // 3. Veri hazırlığı
  var hasInv = (data.hasInvoice === true || data.hasInvoice === "true" || data.isInvoice === true || data.isInvoice === "true" || String(data.invoiceStatus || "").indexOf("Faturalı") !== -1);
  var invText = hasInv ? "🧾 Faturalı" : "⚠️ Faturasız";
  var cat = data.category || data.expenseType || "Genel Gider";
  var src = data.paymentSource || data.source || "Kasa (Nakit)";
  var desc = data.description || data.desc || "-";
  var amt = Number(data.amount || 0);

  var rowData = [
    data.date || getTodayFormatted(),
    data.time || getTimeFormatted(),
    cat,
    src,
    desc,
    amt,
    invText
  ];

  // 4. Veriyi tam A-G (1-7) aralığına yaz (Kolon taşması kesin olarak imkansızdır)
  var rowRange = sheet.getRange(targetRow, 1, 1, 7);
  rowRange.setValues([rowData])
    .setFontSize(10)
    .setVerticalAlignment("middle")
    .setBackground("#ffffff");
  
  sheet.setRowHeight(targetRow, 26);
  sheet.getRange(targetRow, 1, 1, 2).setHorizontalAlignment("center");
  sheet.getRange(targetRow, 4).setHorizontalAlignment("center");
  sheet.getRange(targetRow, 6).setNumberFormat("₺#,##0.00").setFontWeight("bold").setHorizontalAlignment("right");
  sheet.getRange(targetRow, 7).setHorizontalAlignment("center");

  if (hasInv) {
    sheet.getRange(targetRow, 7).setBackground("#dcfce7").setFontColor("#166534").setFontWeight("bold");
  } else {
    sheet.getRange(targetRow, 7).setBackground("#fee2e2").setFontColor("#991b1b").setFontWeight("bold");
  }

  // 5. Bir sonraki satıra TOPLAM formülünü düzgün yerleştir
  var summaryRow = targetRow + 1;
  sheet.getRange(summaryRow, 1, 1, 7).clearContent().clearFormat();
  
  sheet.getRange(summaryRow, 5).setValue("TOPLAM GENEL GİDER:")
    .setFontWeight("bold")
    .setFontSize(10)
    .setHorizontalAlignment("right")
    .setBackground("#f1f5f9");

  sheet.getRange(summaryRow, 6).setFormula("=SUM(F2:F" + targetRow + ")")
    .setFontWeight("bold")
    .setFontSize(10.5)
    .setNumberFormat("₺#,##0.00")
    .setHorizontalAlignment("right")
    .setBackground("#f1f5f9");

  sheet.setRowHeight(summaryRow, 28);

  // 6. Kolon genişliklerini otomatik ayarla ve sabitle
  sheet.setColumnWidth(1, 105); // Tarih
  sheet.setColumnWidth(2, 75);  // Saat
  sheet.setColumnWidth(3, 160); // Kategori
  sheet.setColumnWidth(4, 150); // Ödeme Kaynağı
  sheet.setColumnWidth(5, 260); // Açıklama
  sheet.setColumnWidth(6, 140); // Tutar
  sheet.setColumnWidth(7, 130); // Fatura Durumu
}

// Giderler tablosundaki gereksiz M sütununa taşan hücreleri ve buglı değerleri temizler
function cleanGiderlerSheet(sheet) {
  var maxRows = Math.min(sheet.getMaxRows(), 100);
  var maxCols = sheet.getMaxColumns();

  // 1. H sütunundan (8. kolon) son sütuna kadar olan gereksiz verileri sil (M kolonuna taşmayı önler)
  if (maxCols > 7) {
    sheet.getRange(1, 8, maxRows, maxCols - 7).clearContent().clearFormat();
  }

  // 2. Tablodaki "12.312.312" gibi buglı dummy metinleri temizle
  var checkRange = sheet.getRange(1, 1, maxRows, Math.min(maxCols, 15));
  var values = checkRange.getValues();
  for (var r = 0; r < values.length; r++) {
    for (var c = 0; c < values[r].length; c++) {
      var s = String(values[r][c] || "");
      if (s.indexOf("12.312.312") !== -1 || s.indexOf("12312312") !== -1 || s.indexOf("12,312,312") !== -1) {
        sheet.getRange(r + 1, c + 1).clearContent().clearFormat();
      }
    }
  }
}

// Kolon A'da satır 2'den itibaren ilk boş veya TOPLAM olan ardışık satırı bulur
function getNextSequentialExpenseRow(sheet) {
  var maxScan = Math.min(sheet.getMaxRows(), 100);
  var colA = sheet.getRange(1, 1, maxScan, 1).getValues();
  var colE = sheet.getRange(1, 5, maxScan, 1).getValues();

  for (var r = 1; r < colA.length; r++) {
    var valA = String(colA[r][0] || "").trim();
    var valE = String(colE[r][0] || "").trim().toUpperCase();

    // Eğer A kolonu boşsa veya E kolonunda TOPLAM formülü varsa bu satıra yaz
    if (valA === "" || valE.indexOf("TOPLAM") !== -1) {
      return r + 1;
    }
  }
  return colA.length + 1;
}

// ── 3. GÜN SONU KASA MUTABAKATI ──
function handleDailyClose(ss, data) {
  var sheetName = "Gün Sonu Kasa";
  var sheet = ss.getSheetByName(sheetName);
  var headers = ["Tarih", "Saat", "Sayılan Nakit", "Kasa Farkı (Açık/Fazla)"];

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    formatHeaderRow(sheet, headers.length);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    formatHeaderRow(sheet, headers.length);
  }

  sheet.appendRow([
    data.date || getTodayFormatted(),
    data.time || getTimeFormatted(),
    data.actualCash || "0.00 ₺",
    data.difference || "0.00 ₺"
  ]);
}

// ── 4. MALİ RAPOR & VERGİ YÜKÜ (KPI DASHBOARD CARD LAYOUT) ──
function handleSyncTaxReport(ss, data) {
  var sheetName = "Mali Rapor & Vergi";
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  // Dashboard Kartlarını oluştur ve güncelle
  renderTaxDashboardCards(sheet, data);

  // Tarihsel log satırını kartların altına ekle
  appendTaxHistoricalLogRow(sheet, data);
}

function renderTaxDashboardCards(sheet, data) {
  // Sayfa başlık bannerı
  sheet.getRange("B2:H2").merge()
    .setValue("🐾 AYBARS PETSHOP — MALİ RAPOR & VERGİ YÖNETİM PANELİ")
    .setBackground("#0f172a")
    .setFontColor("#f8fafc")
    .setFontSize(13.5)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(2, 38);

  sheet.getRange("B3:H3").merge()
    .setValue("Dual-Layer Finansal Takip: KDV Mutabakatı (Devlet) vs. Resmi Kâr & Vergi Kalkanı (Cebe Giren)")
    .setBackground("#1e293b")
    .setFontColor("#94a3b8")
    .setFontSize(9.5)
    .setFontStyle("italic")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(3, 22);

  sheet.getRange("B4:H4").merge()
    .setValue("🕒 Son Güncelleme: " + (data.date || getTodayFormatted()) + " " + (data.time || getTimeFormatted()) + "  •  Durum: Canlı Kasa Senkronize")
    .setBackground("#f8fafc")
    .setFontColor("#475569")
    .setFontSize(9)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(4, 22);

  sheet.setRowHeight(5, 14); // Boşluk

  // ════════════════════════════════════════════════════════════════
  // KART 1: 🏛️ KDV MUTABAKATI (B6:D11)
  // ════════════════════════════════════════════════════════════════
  sheet.getRange("B6:D6").merge()
    .setValue("🏛️ KART 1: KDV MUTABAKATI (AY SONU DEVLET DENGESİ)")
    .setBackground("#1e293b")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(10.5)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(6, 30);

  sheet.getRange("B7:D7").setValues([["Mali Gösterge", "Tutar (TL)", "Açıklama / Durum"]])
    .setBackground("#334155")
    .setFontColor("#f8fafc")
    .setFontWeight("bold")
    .setFontSize(9.5)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(7, 24);

  var collectedVat = Number(data.collectedVat !== undefined ? data.collectedVat : (data.officialSales ? data.officialSales * 0.20 : 0));
  var deductibleVat = Number(data.deductibleVat !== undefined ? data.deductibleVat : (data.payableVat ? Math.max(0, collectedVat - data.payableVat) : 0));
  var payableVat = Number(data.payableVat || 0);
  var isVatPayable = payableVat > 0;

  var card1Rows = [
    ["📈 Tahsil Edilen KDV", collectedVat, "Resmi satışlardan müşteriden alınan KDV"],
    ["📥 İndirilecek KDV", deductibleVat, "Faturalı mal alımı ve giderlerden düşülen KDV"],
    ["⚖️ Net Ödenecek KDV", payableVat, isVatPayable ? "⚠️ Devlete bu ay ödenecek KDV borcu" : "✅ Ödenecek KDV çıkmıyor (Devir)"],
    ["🏷️ KDV Beyan Özeti", isVatPayable ? "ÖDENECEK KDV VAR" : "DEVREDEN KDV", isVatPayable ? "Beyannamede vergi ödemesi tahakkuk eder" : "Gelecek aya devreden KDV alacağı oluştu"]
  ];

  sheet.getRange("B8:D11").setValues(card1Rows)
    .setFontSize(9.5)
    .setVerticalAlignment("middle");
  
  sheet.getRange("C8:C10").setNumberFormat("₺#,##0.00").setFontWeight("bold").setHorizontalAlignment("right");
  sheet.getRange("C11").setHorizontalAlignment("center").setFontWeight("bold");

  if (isVatPayable) {
    sheet.getRange("C10").setFontColor("#dc2626");
    sheet.getRange("C11").setBackground("#fee2e2").setFontColor("#991b1b");
  } else {
    sheet.getRange("C10").setFontColor("#059669");
    sheet.getRange("C11").setBackground("#dcfce7").setFontColor("#166534");
  }

  // ════════════════════════════════════════════════════════════════
  // KART 2: 🛡️ RESMİ KÂR & VERGİ KALKANI (F6:H12)
  // ════════════════════════════════════════════════════════════════
  sheet.getRange("F6:H6").merge()
    .setValue("🛡️ KART 2: RESMİ KÂR & VERGİ KALKANI (GİB / MATRAH)")
    .setBackground("#0f172a")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(10.5)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  sheet.getRange("F7:H7").setValues([["Mali Gösterge", "Tutar (TL)", "Açıklama / Analiz"]])
    .setBackground("#334155")
    .setFontColor("#f8fafc")
    .setFontWeight("bold")
    .setFontSize(9.5)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  var offSales = Number(data.officialSales || 0);
  var invExpenses = Number(data.expensesTotal || data.invoicedPurchases || 0);
  var taxBase = Number(data.taxBase || data.officialTaxBase || 0);
  var incTax = Number(data.estimatedIncomeTax || 0);
  var netCashProfit = Number(data.netCashProfit || 0);
  var riskAmt = Number(data.riskAmount || 0);
  var riskStatus = data.riskStatus || (riskAmt > 0 ? "Yüksek Risk" : "Güvenli");

  var card2Rows = [
    ["💳 Resmi Satışlar (Ciro)", offSales, "Banka POS ve faturalı resmi satışlar"],
    ["🧾 Faturalı Gider & Alış", invExpenses, "Vergi kalkanı sağlayan faturalı harcamalar"],
    ["🏛️ Resmi Vergi Matrahı", taxBase, taxBase > 0 ? "Vergiye tabi net yasal ticari kâr" : "Mali zarar (Vergi çıkmaz)"],
    ["💸 %20 Gelir Vergisi Yükü", incTax, "Yasal matrah üzerinden hesaplanan %20 vergi"],
    ["💰 Fiili Net Kasa Kârı", netCashProfit, "Gerçek cebe giren brüt kâr (Ciro − Maliyet)"],
    ["🚨 Vergi Riski Hacmi", riskAmt, riskAmt > 0 ? "⚠️ Kartlı satış faturalı stoğu aşıyor!" : "✅ Kartlı satışlar faturalı alımla güvende"]
  ];

  sheet.getRange("F8:H13").setValues(card2Rows)
    .setFontSize(9.5)
    .setVerticalAlignment("middle");

  sheet.getRange("G8:G13").setNumberFormat("₺#,##0.00").setFontWeight("bold").setHorizontalAlignment("right");
  sheet.getRange("G12").setFontColor("#059669").setFontSize(10.5); // Fiili kâr yeşil

  if (riskAmt > 0) {
    sheet.getRange("G13").setFontColor("#dc2626");
    sheet.getRange("H13").setFontColor("#dc2626").setFontWeight("bold");
  } else {
    sheet.getRange("G13").setFontColor("#059669");
    sheet.getRange("H13").setFontColor("#166534");
  }

  // Kart Kenarlıkları
  sheet.getRange("B6:D11").setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange("F6:H13").setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);

  // Kolon Genişlikleri (Asla Metin Kırpılmayacak Şekilde Sabit ve Cömert)
  sheet.setColumnWidth(1, 25);  // A (Boşluk)
  sheet.setColumnWidth(2, 230); // B (Kart 1 Gösterge)
  sheet.setColumnWidth(3, 140); // C (Kart 1 Tutar)
  sheet.setColumnWidth(4, 240); // D (Kart 1 Açıklama)
  sheet.setColumnWidth(5, 30);  // E (Kartlar Arası Boşluk)
  sheet.setColumnWidth(6, 250); // F (Kart 2 Gösterge)
  sheet.setColumnWidth(7, 150); // G (Kart 2 Tutar)
  sheet.setColumnWidth(8, 250); // H (Kart 2 Açıklama)
}

function appendTaxHistoricalLogRow(sheet, data) {
  var startRow = 16;
  
  // Başlık satırı
  sheet.getRange("B15:H15").merge()
    .setValue("📜 SENKRONİZASYON GEÇMİŞİ (TARİHSEL MALİ RAPOR LOGLARI)")
    .setBackground("#1e293b")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(10)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(15, 26);

  var logHeaders = [
    "Tarih", "Saat", "Resmi Satışlar", "Faturalı Alış & Gider",
    "Vergi Matrahı", "Ödenecek KDV", "Net Kasa Kârı"
  ];
  sheet.getRange("B16:H16").setValues([logHeaders])
    .setBackground("#334155")
    .setFontColor("#f8fafc")
    .setFontWeight("bold")
    .setFontSize(9)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(16, 24);

  // Tarihsel log için ilk boş satırı bul (satır 17'den sonra)
  var maxScan = Math.min(sheet.getMaxRows(), 150);
  var colB = sheet.getRange(17, 2, Math.max(1, maxScan - 16), 1).getValues();
  var targetRow = 17;

  for (var i = 0; i < colB.length; i++) {
    if (String(colB[i][0] || "").trim() === "") {
      targetRow = 17 + i;
      break;
    }
    if (i === colB.length - 1) {
      targetRow = 17 + colB.length;
    }
  }

  var logRow = [
    data.date || getTodayFormatted(),
    data.time || getTimeFormatted(),
    Number(data.officialSales || 0),
    Number(data.expensesTotal || data.invoicedPurchases || 0),
    Number(data.taxBase || data.officialTaxBase || 0),
    Number(data.payableVat || 0),
    Number(data.netCashProfit || 0)
  ];

  sheet.getRange(targetRow, 2, 1, 7).setValues([logRow])
    .setFontSize(9)
    .setVerticalAlignment("middle")
    .setBackground("#ffffff");
  
  sheet.setRowHeight(targetRow, 24);
  sheet.getRange(targetRow, 2, 1, 2).setHorizontalAlignment("center");
  sheet.getRange(targetRow, 4, 1, 5).setNumberFormat("₺#,##0.00").setHorizontalAlignment("right");
}

function formatHeaderRow(sheet, numCols) {
  var range = sheet.getRange(1, 1, 1, numCols);
  range.setBackground("#1e293b")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(10.5)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 30);
  sheet.setFrozenRows(1);
}

function getTodayFormatted() {
  var d = new Date();
  var day = ("0" + d.getDate()).slice(-2);
  var month = ("0" + (d.getMonth() + 1)).slice(-2);
  var year = d.getFullYear();
  return day + "." + month + "." + year;
}

function getTimeFormatted() {
  var d = new Date();
  var hours = ("0" + d.getHours()).slice(-2);
  var minutes = ("0" + d.getMinutes()).slice(-2);
  return hours + ":" + minutes;
}
