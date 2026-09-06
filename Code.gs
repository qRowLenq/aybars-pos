/**
 * ===================================================================
 * AYBARS PETSHOP YÖNETİM SİSTEMİ — GOOGLE APPS SCRIPT BACKEND
 * Enterprise Financial Architecture & Weekly Calendar Engine
 * Sürüm: 5.0.0 (Weekly Calendar Block Layout & Executive Dashboard)
 * ===================================================================
 * 
 * 1. DİNAMİK AYLIK GELİR VE HAFTALIK TAKVİM DÜZENİ (GELİR - AY YIL):
 *    - Tek satır ardışık liste yerine yatay haftalık bloklar:
 *      [Pazartesi | Salı | Çarşamba | Perşembe | Cuma | Cumartesi | Pazar]
 *    - 1. Hafta, 2. Hafta, 3. Hafta, 4. Hafta ve 5. Hafta sütun blokları.
 *    - Satış geldiğinde satış gününün sütununa doğrudan alt alta eklenir.
 *    - Gün ve hafta alt/üst toplamları otomatik formüllerle canlı hesaplanır.
 * 
 * 2. KONSOLİDE TEK TABLO GİDER DÜZENİ (GİDER - AY YIL):
 *    - Parçalı 3 panelli karmaşa ve satır 36'ya kayma sorunu tamamen giderildi.
 *    - Üstte (Satır 1-5) sabit KPI Özet Kartları:
 *      [Bugünkü Gider] | [1. Hafta] | [2. Hafta] | [3. Hafta] | [4. Hafta] | [Aylık Sabit] | [Aylık Toplam]
 *    - Satır 6: "Önceki Aydan Devreden Toptancı Borçları" devir satırı.
 *    - Satır 7: 8 Kolonlu standart defter başlıkları:
 *      Tarih | Saat | Kategori | Ödeme Kaynağı | Açıklama | Tutar | KDV | Fatura Durumu
 *    - Satır 8+: Tüm giderler tek bir düzenli tabloda ardışık akar.
 * 
 * 3. YÖNETİCİ MALİ RAPOR & VERGİ DASHBOARD'U (TEKİL YERİNDE GÜNCELLEME):
 *    - Sürekli alt alta satır ekleme (append spamming) sonlandırıldı.
 *    - Sabit hücreli kalıcı yönetici paneli yerinde (in-place) güncellenir:
 *      * Kart 1: KDV Dengesi (Tahsil Edilen, İndirilecek, Net Ödenecek / Devreden KDV)
 *      * Kart 2: Resmi Matrah vs. Fiili Kasa (Resmi Satış, Faturalı Gider, %20 Vergi, Net Kâr)
 *      * Kart 3: Vergi Riski Uyarısı (Faturasız alınıp kartla satılan hacim)
 * 
 * 4. GÜN SONU KASA MUTABAKATI (BEKLENEN KASA HESABI):
 *    - Beklenen Kasa formülü: (Günün Nakit Satışları - Günün Kasadan Çıkan Nakit Giderleri).
 *    - Sayılan Nakit ile karşılaştırılarak Tam Mutabakat, Kasa Fazlası veya Kasa Açığı üretilir.
 */

var TURKISH_MONTHS = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];

// ===================================================================
// 1. WEB APP GİRİŞ NOKTALARI (doGet & doPost)
// ===================================================================

function doGet(e) {
  return HtmlService.createHtmlOutput(
    '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;padding:36px;line-height:1.6;color:#0f172a;max-width:760px;margin:auto;">' +
    '<h2 style="color:#059669;margin-bottom:8px;">🚀 Aybars Petshop Backend API v5.0.0 Aktif</h2>' +
    '<p style="color:#64748b;font-size:14px;margin-top:0;">Weekly Calendar & Executive Financial Architecture</p>' +
    '<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>' +
    '<div style="background:#f8fafc;border-left:4px solid #10b981;padding:14px 18px;border-radius:6px;margin-bottom:16px;">' +
      '<b>📅 Dinamik Aylık Satış Takvimi:</b> <code>GELİR - [AY YIL]</code> sayfalarında haftalık ve günlük sütun blokları.' +
    '</div>' +
    '<div style="background:#f8fafc;border-left:4px solid #ef4444;padding:14px 18px;border-radius:6px;margin-bottom:16px;">' +
      '<b>🧾 Konsolide Tek Defter:</b> <code>GİDER - [AY YIL]</code> sayfasında 8 kolonlu standart tablo, üst KPI ve devreden toptancı borcu.' +
    '</div>' +
    '<div style="background:#f8fafc;border-left:4px solid #3b82f6;padding:14px 18px;border-radius:6px;margin-bottom:16px;">' +
      '<b>🏛️ Mali Rapor Dashboard\'u:</b> <code>Mali Rapor & Vergi</code> sayfasında satır biriktirmeden yerinde güncellenen 3 yönetici kartı.' +
    '</div>' +
    '<div style="background:#f8fafc;border-left:4px solid #6366f1;padding:14px 18px;border-radius:6px;">' +
      '<b>🏁 Gün Sonu Kasa:</b> <code>Gün Sonu Kasa</code> sayfasında dinamik <i>(Nakit Satış - Nakit Gider)</i> mutabakat formülü.' +
    '</div>' +
    '</div>'
  );
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var lockAcquired = false;
  
  try {
    lockAcquired = lock.tryLock(30000);
    if (!lockAcquired) {
      return createJsonResponse({ status: "error", message: "Sunucu meşgul (Lock zaman aşımı), lütfen tekrar deneyin." });
    }

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
    var action = data.action || data.type || "";

    switch (action) {
      case "save_sale":
      case "sale":
      case "sync_sale":
        handleSaveSale(ss, data);
        break;

      case "save_expense":
      case "expense":
      case "sync_expense":
        handleSaveExpense(ss, data);
        break;

      case "sync_tax_report":
      case "tax_report":
        handleSyncTaxReport(ss, data);
        break;

      case "daily_close":
      case "close":
        handleDailyClose(ss, data);
        break;

      case "inventory_sync":
        handleInventorySync(ss, data);
        break;

      default:
        break;
    }

    return createJsonResponse({ status: "success", action: action, timestamp: new Date().toISOString() });

  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  } finally {
    if (lockAcquired) {
      lock.releaseLock();
    }
  }
}

function createJsonResponse(dataObj) {
  return ContentService.createTextOutput(JSON.stringify(dataObj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===================================================================
// 2. YARDIMCI VE TARİH DÖNÜŞTÜRÜCÜ METOTLAR
// ===================================================================

function parseDateHelper(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  
  var str = String(dateStr).trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    var parts = str.split("T")[0].split("-");
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  // DD.MM.YYYY
  if (/^\d{2}\.\d{2}\.\d{4}/.test(str)) {
    var p2 = str.split(".");
    return new Date(parseInt(p2[2], 10), parseInt(p2[1], 10) - 1, parseInt(p2[0], 10));
  }
  
  var d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

function getMonthYearTitle(dateObj) {
  var d = parseDateHelper(dateObj);
  return TURKISH_MONTHS[d.getMonth()] + " " + d.getFullYear();
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

// ===================================================================
// 3. GELİR SAYFASI & HAFTALIK TAKVİM DÜZENİ (GELİR - AY YIL)
// ===================================================================

/**
 * Dinamik GELİR - AY YIL sayfasını haftalık takvim sütun bloklarıyla kurar
 */
function getOrCreateMonthlySalesSheet(ss, monthYearStr) {
  var sheetName = "GELİR - " + monthYearStr;
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.setTabColor("#10b981"); // Canlı Zümrüt Yeşili
    
    // Toplam 5 Hafta Blokları:
    // Hafta 1: Sütun 2-8 (B..H) | Sütun 9 (I): Boşluk
    // Hafta 2: Sütun 10-16 (J..P) | Sütun 17 (Q): Boşluk
    // Hafta 3: Sütun 18-24 (R..X) | Sütun 25 (Y): Boşluk
    // Hafta 4: Sütun 26-32 (Z..AF) | Sütun 33 (AG): Boşluk
    // Hafta 5: Sütun 34-40 (AH..AN) | Sütun 41 (AO): Boşluk
    // Genel Toplam Kartı: Sütun 42-43 (AP..AQ)

    // 1. Satır: Ana Başlık Banner'ı
    sheet.getRange("A1:AQ1").merge()
      .setValue("AYBARS PETSHOP — " + monthYearStr + " GELİR TAKVİMİ (HAFTALIK / GÜNLÜK BLOK DÜZENİ)")
      .setBackground("#064e3b")
      .setFontColor("#ffffff")
      .setFontWeight("bold")
      .setFontSize(12)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");
    sheet.setRowHeight(1, 35);

    // 2. Satır: Hafta Başlıkları
    sheet.getRange("B2:H2").merge().setValue("📅 1. HAFTA (GÜN 01 - 07)").setBackground("#047857").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange("J2:P2").merge().setValue("📅 2. HAFTA (GÜN 08 - 14)").setBackground("#047857").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange("R2:X2").merge().setValue("📅 3. HAFTA (GÜN 15 - 21)").setBackground("#047857").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange("Z2:AF2").merge().setValue("📅 4. HAFTA (GÜN 22 - 28)").setBackground("#047857").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange("AH2:AN2").merge().setValue("📅 5. HAFTA (GÜN 29 - 31)").setBackground("#047857").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange("AP2:AQ2").merge().setValue("🏆 AYLIK GELİR TOPLAMI").setBackground("#0f172a").setFontColor("#38bdf8").setFontWeight("bold").setHorizontalAlignment("center");
    sheet.setRowHeight(2, 24);

    // 3. Satır: Hafta Toplamı Formülleri
    sheet.getRange("B3:H3").merge().setFormula("=SUM(B5:H5)").setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#34d399").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
    sheet.getRange("J3:P3").merge().setFormula("=SUM(J5:P5)").setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#34d399").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
    sheet.getRange("R3:X3").merge().setFormula("=SUM(R5:X5)").setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#34d399").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
    sheet.getRange("Z3:AF3").merge().setFormula("=SUM(Z5:AF5)").setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#34d399").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
    sheet.getRange("AH3:AN3").merge().setFormula("=SUM(AH5:AN5)").setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#34d399").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
    sheet.getRange("AP3:AQ3").merge().setFormula("=SUM(B3, J3, R3, Z3, AH3)").setNumberFormat("₺#,##0.00").setBackground("#064e3b").setFontColor("#fef08a").setFontWeight("bold").setFontSize(13).setHorizontalAlignment("center");
    sheet.setRowHeight(3, 28);

    // 4. Satır: Gün Başlıkları (Pazartesi .. Pazar)
    var daysW1 = ["Pzt (01)", "Sal (02)", "Çar (03)", "Per (04)", "Cum (05)", "Cmt (06)", "Paz (07)"];
    var daysW2 = ["Pzt (08)", "Sal (09)", "Çar (10)", "Per (11)", "Cum (12)", "Cmt (13)", "Paz (14)"];
    var daysW3 = ["Pzt (15)", "Sal (16)", "Çar (17)", "Per (18)", "Cum (19)", "Cmt (20)", "Paz (21)"];
    var daysW4 = ["Pzt (22)", "Sal (23)", "Çar (24)", "Per (25)", "Cum (26)", "Cmt (27)", "Paz (28)"];
    var daysW5 = ["Pzt (29)", "Sal (30)", "Çar (31)", "Per (-)", "Cum (-)", "Cmt (-)", "Paz (-)"];

    sheet.getRange(4, 2, 1, 7).setValues([daysW1]).setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold").setFontSize(9).setHorizontalAlignment("center");
    sheet.getRange(4, 10, 1, 7).setValues([daysW2]).setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold").setFontSize(9).setHorizontalAlignment("center");
    sheet.getRange(4, 18, 1, 7).setValues([daysW3]).setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold").setFontSize(9).setHorizontalAlignment("center");
    sheet.getRange(4, 26, 1, 7).setValues([daysW4]).setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold").setFontSize(9).setHorizontalAlignment("center");
    sheet.getRange(4, 34, 1, 7).setValues([daysW5]).setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold").setFontSize(9).setHorizontalAlignment("center");
    sheet.setRowHeight(4, 24);

    // 5. Satır: Günlük Subtotal Formülleri (=SUM(kolon6:kolon))
    function setDailySumFormulas(startCol, count) {
      for (var c = 0; c < count; c++) {
        var colIdx = startCol + c;
        var colLetter = getColumnLetter(colIdx);
        var cell = sheet.getRange(5, colIdx);
        cell.setFormula("=SUM(" + colLetter + "6:" + colLetter + ")")
          .setNumberFormat("₺#,##0.00")
          .setBackground("#065f46")
          .setFontColor("#a7f3d0")
          .setFontWeight("bold")
          .setFontSize(9.5)
          .setHorizontalAlignment("center");
      }
    }

    setDailySumFormulas(2, 7);  // Hafta 1
    setDailySumFormulas(10, 7); // Hafta 2
    setDailySumFormulas(18, 7); // Hafta 3
    setDailySumFormulas(26, 7); // Hafta 4
    setDailySumFormulas(34, 7); // Hafta 5
    sheet.setRowHeight(5, 24);

    // Sütun A etiketleri ve genişlikleri
    sheet.getRange("A2").setValue("Haftalar").setFontSize(8).setHorizontalAlignment("center").setFontColor("#94a3b8");
    sheet.getRange("A3").setValue("HAFTA TOPLAMI").setFontSize(8).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#0f172a").setFontColor("#94a3b8");
    sheet.getRange("A4").setValue("Günler").setFontSize(8).setHorizontalAlignment("center").setBackground("#1e293b").setFontColor("#94a3b8");
    sheet.getRange("A5").setValue("GÜN TOPLAMI").setFontSize(8).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#065f46").setFontColor("#a7f3d0");
    sheet.setColumnWidth(1, 95);

    // Günlük veri sütunları (105px) ve aralık sütunları (15px)
    for (var i = 2; i <= 40; i++) {
      if (i === 9 || i === 17 || i === 25 || i === 33) {
        sheet.setColumnWidth(i, 15);
        sheet.getRange(1, i, 5, 1).setBackground("#f1f5f9");
      } else {
        sheet.setColumnWidth(i, 105);
      }
    }
    sheet.setColumnWidth(41, 15);
    sheet.setColumnWidth(42, 110);
    sheet.setColumnWidth(43, 110);

    // Üst 5 satırı dondur
    sheet.setFrozenRows(5);
    sheet.setFrozenColumns(1);
  }

  return sheet;
}

/**
 * Satış gününe karşılık gelen sütunu bulur:
 * Gün 1-7: Hafta 1 (Sütun 2..8)
 * Gün 8-14: Hafta 2 (Sütun 10..16)
 * Gün 15-21: Hafta 3 (Sütun 18..24)
 * Gün 22-28: Hafta 4 (Sütun 26..32)
 * Gün 29-31: Hafta 5 (Sütun 34..36)
 */
function getSalesColumnForDay(dayNum) {
  var d = Math.max(1, Math.min(31, parseInt(dayNum, 10) || 1));
  if (d <= 7) {
    return 2 + (d - 1); // 2..8 (B..H)
  } else if (d <= 14) {
    return 10 + (d - 8); // 10..16 (J..P)
  } else if (d <= 21) {
    return 18 + (d - 15); // 18..24 (R..X)
  } else if (d <= 28) {
    return 26 + (d - 22); // 26..32 (Z..AF)
  } else {
    return 34 + (d - 29); // 34..36 (AH..AJ)
  }
}

function handleSaveSale(ss, data) {
  var dateObj = parseDateHelper(data.date);
  var monthYearStr = getMonthYearTitle(dateObj);
  var sheet = getOrCreateMonthlySalesSheet(ss, monthYearStr);

  var dayNum = dateObj.getDate();
  var targetCol = getSalesColumnForDay(dayNum);

  // O günün sütunundaki ilk boş satırı bul (satır 6'dan itibaren)
  var maxRows = Math.min(sheet.getMaxRows(), 500);
  var targetRow = 6;
  var colRange = sheet.getRange(6, targetCol, maxRows - 5, 1).getValues();

  for (var r = 0; r < colRange.length; r++) {
    var val = colRange[r][0];
    if (val === "" || val === null || val === undefined) {
      targetRow = 6 + r;
      break;
    }
    if (r === colRange.length - 1) {
      targetRow = 6 + colRange.length;
      sheet.insertRowAfter(targetRow - 1);
    }
  }

  var totalAmt = Number(data.total || 0);
  var isOfficial = (data.isOfficial === true || data.isOfficial === "true");

  var targetCell = sheet.getRange(targetRow, targetCol);
  targetCell.setValue(totalAmt)
    .setNumberFormat("₺#,##0.00")
    .setHorizontalAlignment("right")
    .setFontSize(9)
    .setVerticalAlignment("middle");

  if (isOfficial) {
    targetCell.setBackground("#ecfdf5"); // Fişli satış yeşil tonu
  } else {
    targetCell.setBackground("#ffffff");
  }

  // Hücre Notu (Açıklama / Kalemler / Ödeme / Müşteri)
  var noteText = "🕒 Saat: " + (data.time || getTimeFormatted()) + "\n" +
    "🛍️ Kalemler: " + (data.itemsSummary || "Muhtelif Satış") + "\n" +
    "💳 Ödeme: " + (data.paymentType || "Nakit") + "\n" +
    "👤 Müşteri: " + (data.customerName || "Tezgâh") + "\n" +
    "🧾 Fiş Durumu: " + (isOfficial ? "Resmi (Fişli)" : "İç Kayıt (Fişsiz)");
  targetCell.setNote(noteText);

  // Mali Rapor hücrelerini anında yerinde güncelle
  if (data.officialSales !== undefined || data.taxBase !== undefined) {
    handleSyncTaxReport(ss, data);
  }
}

// ===================================================================
// 4. KONSOLİDE TEK TABLO GİDER DÜZENİ (GİDER - AY YIL)
// ===================================================================

/**
 * Dinamik GİDER - AY YIL sayfasını tek ana tablo ve üst KPI kartlarıyla kurar
 */
function getOrCreateMonthlyExpenseSheet(ss, monthYearStr, supplierDebts) {
  var sheetName = "GİDER - " + monthYearStr;
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.setTabColor("#ef4444"); // Canlı Kırmızı

    // 1. Satır: Ana Başlık Banner'ı
    sheet.getRange("A1:H1").merge()
      .setValue("AYBARS PETSHOP — " + monthYearStr + " KONSOLİDE GİDER VE VERGİ DEFTERİ")
      .setBackground("#7f1d1d")
      .setFontColor("#ffffff")
      .setFontWeight("bold")
      .setFontSize(12)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");
    sheet.setRowHeight(1, 35);

    // 2. Satır: Üst KPI Kart Başlıkları (7 Adet)
    var kpiTitles = [
      "📅 BUGÜNKÜ GİDER", "1. HAFTA (1-7)", "2. HAFTA (8-14)",
      "3. HAFTA (15-21)", "4.+ HAFTA (22+)", "🏢 SABİT MASRAFLAR",
      "📦 TOPTANCI / MAL", "🏆 TOPLAM GİDER"
    ];
    sheet.getRange("A2:H2").setValues([kpiTitles])
      .setBackground("#1e293b")
      .setFontColor("#cbd5e1")
      .setFontWeight("bold")
      .setFontSize(8.5)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");
    sheet.setRowHeight(2, 22);

    // 3. Satır: Üst KPI Kart Formülleri
    sheet.getRange("A3").setFormula('=SUMIFS(F8:F, A8:A, TEXT(TODAY(),"dd.mm.yyyy"))');
    sheet.getRange("B3").setFormula('=SUMIFS(F8:F, A8:A, "01.*") + SUMIFS(F8:F, A8:A, "02.*") + SUMIFS(F8:F, A8:A, "03.*") + SUMIFS(F8:F, A8:A, "04.*") + SUMIFS(F8:F, A8:A, "05.*") + SUMIFS(F8:F, A8:A, "06.*") + SUMIFS(F8:F, A8:A, "07.*")');
    sheet.getRange("C3").setFormula('=SUMIFS(F8:F, A8:A, "08.*") + SUMIFS(F8:F, A8:A, "09.*") + SUMIFS(F8:F, A8:A, "10.*") + SUMIFS(F8:F, A8:A, "11.*") + SUMIFS(F8:F, A8:A, "12.*") + SUMIFS(F8:F, A8:A, "13.*") + SUMIFS(F8:F, A8:A, "14.*")');
    sheet.getRange("D3").setFormula('=SUMIFS(F8:F, A8:A, "15.*") + SUMIFS(F8:F, A8:A, "16.*") + SUMIFS(F8:F, A8:A, "17.*") + SUMIFS(F8:F, A8:A, "18.*") + SUMIFS(F8:F, A8:A, "19.*") + SUMIFS(F8:F, A8:A, "20.*") + SUMIFS(F8:F, A8:A, "21.*")');
    sheet.getRange("E3").setFormula('=SUM(F8:F) - SUM(B3:D3)');
    sheet.getRange("F3").setFormula('=SUMIF(C8:C, "*Kira*", F8:F) + SUMIF(C8:C, "*Sabit*", F8:F) + SUMIF(C8:C, "*Fatura*", F8:F) + SUMIF(C8:C, "*Stopaj*", F8:F)');
    sheet.getRange("G3").setFormula('=SUMIF(C8:C, "*Toptancı*", F8:F) + SUMIF(C8:C, "*Mal Alımı*", F8:F) + SUMIF(C8:C, "*Tedarikçi*", F8:F)');
    sheet.getRange("H3").setFormula('=SUM(F8:F)');

    sheet.getRange("A3:H3")
      .setNumberFormat("₺#,##0.00")
      .setBackground("#0f172a")
      .setFontColor("#38bdf8")
      .setFontWeight("bold")
      .setFontSize(10.5)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");
    sheet.getRange("H3").setFontColor("#f87171").setFontSize(12); // Toplam gider kırmızı vurgu
    sheet.setRowHeight(3, 28);

    // 4. Satır: Alt Vergi Kalkanı & KDV Bilgi Çubuğu
    sheet.getRange("A4:D4").merge()
      .setValue("🛡️ Vergi Kalkanı: Faturalı giderler gelir vergisi matrahından indirilir.")
      .setBackground("#f1f5f9")
      .setFontColor("#475569")
      .setFontStyle("italic")
      .setFontSize(8.5);
    sheet.getRange("E4:H4").merge()
      .setFormula('="🏛️ Toplam İndirilecek KDV: " & TEXT(SUM(G8:G), "₺#,##0.00")')
      .setBackground("#f1f5f9")
      .setFontColor("#047857")
      .setFontWeight("bold")
      .setFontSize(9)
      .setHorizontalAlignment("right");
    sheet.setRowHeight(4, 20);

    // 5. Satır: Ayrım Çizgisi
    sheet.getRange("A5:H5").setBackground("#ffffff");
    sheet.setRowHeight(5, 6);

    // 6. Satır: DEVREDEN BORÇ MOTORU (ROLLOVER ROW)
    var rolloverText = "Önceki Aydan Devreden Toptancı Borçları: ";
    var totalRollover = 0;

    if (supplierDebts && supplierDebts.length > 0) {
      var parts = [];
      supplierDebts.forEach(function(s) {
        var b = Number(s.balance || s.debt || 0);
        if (b > 0) {
          parts.push(s.name + " (" + b.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " TL)");
          totalRollover += b;
        }
      });
      rolloverText += (parts.length > 0 ? parts.join(" | ") : "Aktif devreden borç bulunmamaktadır.");
    } else {
      rolloverText += "0,00 TL (Bakiye Bulunmuyor)";
    }

    sheet.getRange("A6:E6").merge()
      .setValue("🔄 " + rolloverText)
      .setBackground("#fef3c7")
      .setFontColor("#92400e")
      .setFontWeight("bold")
      .setFontSize(9.5)
      .setHorizontalAlignment("left")
      .setVerticalAlignment("middle");

    sheet.getRange("F6").setValue(totalRollover)
      .setNumberFormat("₺#,##0.00")
      .setBackground("#fef3c7")
      .setFontColor("#b45309")
      .setFontWeight("bold")
      .setHorizontalAlignment("right")
      .setVerticalAlignment("middle");

    sheet.getRange("G6:H6").merge()
      .setValue("Önceki Ay Devri (Gider Toplamına Dahil Edilmez)")
      .setBackground("#fef3c7")
      .setFontColor("#78350f")
      .setFontStyle("italic")
      .setFontSize(8.5)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");
    sheet.setRowHeight(6, 26);

    // 7. Satır: 8 Kolonlu Standart Gider Tablosu Başlıkları
    var expenseHeaders = [
      "Tarih", "Saat", "Kategori", "Ödeme Kaynağı",
      "Açıklama", "Tutar", "KDV", "Fatura Durumu"
    ];
    sheet.getRange(7, 1, 1, expenseHeaders.length).setValues([expenseHeaders])
      .setBackground("#991b1b")
      .setFontColor("#ffffff")
      .setFontWeight("bold")
      .setFontSize(9.5)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");
    sheet.setRowHeight(7, 28);

    // Kolon Genişlikleri
    sheet.setColumnWidth(1, 100); // Tarih
    sheet.setColumnWidth(2, 70);  // Saat
    sheet.setColumnWidth(3, 175); // Kategori
    sheet.setColumnWidth(4, 130); // Ödeme Kaynağı
    sheet.setColumnWidth(5, 290); // Açıklama
    sheet.setColumnWidth(6, 125); // Tutar
    sheet.setColumnWidth(7, 105); // KDV
    sheet.setColumnWidth(8, 115); // Fatura Durumu

    // Üst 7 satırı dondur (KPI'lar, Devreden Borç ve Başlıklar sabit kalır)
    sheet.setFrozenRows(7);
  }

  return sheet;
}

function handleSaveExpense(ss, data) {
  var dateObj = parseDateHelper(data.date);
  var monthYearStr = getMonthYearTitle(dateObj);
  var sheet = getOrCreateMonthlyExpenseSheet(ss, monthYearStr, data.supplierDebts);

  var rawAmount = Number(data.amount || 0);
  var vatAmount = Number(data.vatAmount !== undefined ? data.vatAmount : (data.vatRate ? rawAmount - (rawAmount / (1 + data.vatRate / 100)) : 0));
  var paymentSrc = data.paymentMethod || data.paymentSource || data.source || "Kasa (Nakit)";
  var categoryText = data.category || data.mainCategory || "Dükkân Sarf";
  if (data.subType && data.subType !== categoryText) {
    categoryText = categoryText + " (" + data.subType + ")";
  }
  var invStatus = data.invoiceStatus || (data.hasInvoice ? "Faturalı" : "Faturasız");

  var nextRow = Math.max(sheet.getLastRow() + 1, 8);
  var rowData = [
    data.date || getTodayFormatted(),
    data.time || getTimeFormatted(),
    categoryText,
    paymentSrc,
    data.description || data.desc || "",
    rawAmount,
    vatAmount,
    invStatus
  ];

  sheet.getRange(nextRow, 1, 1, 8).setValues([rowData])
    .setFontSize(9)
    .setVerticalAlignment("middle");

  sheet.getRange(nextRow, 1, 1, 2).setHorizontalAlignment("center");
  sheet.getRange(nextRow, 6, 1, 2).setNumberFormat("₺#,##0.00").setHorizontalAlignment("right").setFontWeight("bold");
  sheet.getRange(nextRow, 8).setHorizontalAlignment("center");

  if (invStatus.indexOf("Faturalı") !== -1) {
    sheet.getRange(nextRow, 8).setFontColor("#047857").setFontWeight("bold");
  } else {
    sheet.getRange(nextRow, 8).setFontColor("#dc2626");
  }

  sheet.setRowHeight(nextRow, 24);

  // Mali Rapor hücrelerini anında güncelle
  if (data.officialSales !== undefined || data.taxBase !== undefined) {
    handleSyncTaxReport(ss, data);
  }
}

// ===================================================================
// 5. YÖNETİCİ MALİ RAPOR & VERGİ DASHBOARD'U (TEKİL YERİNDE GÜNCELLEME)
// ===================================================================

/**
 * Mali Raporu sabit hücrelerde tutar. Asla alt alta satır eklemez (no append spamming).
 */
function handleSyncTaxReport(ss, data) {
  var sheetName = "Mali Rapor & Vergi";
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.setTabColor("#1e3a8a");
  }

  // 1. Satır: Ana Başlık
  sheet.getRange("B1:L1").merge()
    .setValue("🐾 AYBARS PETSHOP — YÖNETİCİ MALİ RAPOR & VERGİ YÜKÜ DASHBOARD'U")
    .setBackground("#0f172a")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(12)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 35);

  // 2. Satır: Zaman Damgası
  var dateStr = data.date || getTodayFormatted();
  var timeStr = data.time || getTimeFormatted();
  sheet.getRange("B2:L2").merge()
    .setValue("Son Güncelleme: " + dateStr + " " + timeStr + " | Tekil Yönetici Paneli (Hücreler Yerinde Güncellenir)")
    .setBackground("#1e293b")
    .setFontColor("#94a3b8")
    .setFontStyle("italic")
    .setFontSize(9)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(2, 22);

  // ════════════════════════════════════════════════════════════════
  // KART 1: 🏛️ KDV DENGESİ & BEYAN RAPORU (B4:D8)
  // ════════════════════════════════════════════════════════════════
  sheet.getRange("B4:D4").merge()
    .setValue("🏛️ KART 1: KDV DENGESİ & BEYAN RAPORU")
    .setBackground("#065f46")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(10.5)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(4, 26);

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

  sheet.getRange("B5:D8").setValues(card1Rows)
    .setFontSize(9.5)
    .setVerticalAlignment("middle");

  sheet.getRange("C5:C7").setNumberFormat("₺#,##0.00").setFontWeight("bold").setHorizontalAlignment("right");
  sheet.getRange("C8").setHorizontalAlignment("center").setFontWeight("bold");

  if (isVatPayable) {
    sheet.getRange("C7").setFontColor("#dc2626");
    sheet.getRange("C8").setBackground("#fee2e2").setFontColor("#991b1b");
  } else {
    sheet.getRange("C7").setFontColor("#059669");
    sheet.getRange("C8").setBackground("#dcfce7").setFontColor("#166534");
  }

  // ════════════════════════════════════════════════════════════════
  // KART 2: 🛡️ RESMİ MATRAH VS. FİİLİ KASA (F4:H9)
  // ════════════════════════════════════════════════════════════════
  sheet.getRange("F4:H4").merge()
    .setValue("🛡️ KART 2: RESMİ MATRAH VS. FİİLİ KASA")
    .setBackground("#1e3a8a")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(10.5)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  var offSales = Number(data.officialSales || 0);
  var invExpenses = Number(data.expensesTotal || data.invoicedPurchases || 0);
  var taxBase = Number(data.taxBase || data.officialTaxBase || 0);
  var incTax = Number(data.estimatedIncomeTax || 0);
  var netCashProfit = Number(data.netCashProfit || 0);

  var card2Rows = [
    ["💳 Resmi Satışlar (Ciro)", offSales, "Banka POS ve faturalı resmi satışlar"],
    ["🧾 Faturalı Gider & Alış", invExpenses, "Vergi kalkanı sağlayan faturalı harcamalar"],
    ["🏛️ Resmi Vergi Matrahı", taxBase, taxBase > 0 ? "Vergiye tabi net yasal ticari kâr" : "Mali zarar (Vergi çıkmaz)"],
    ["💸 %20 Gelir Vergisi Yükü", incTax, "Yasal matrah üzerinden hesaplanan %20 vergi"],
    ["💰 Fiili Net Kasa Kârı", netCashProfit, "Gerçek cebe giren brüt kâr (Ciro − Maliyet)"]
  ];

  sheet.getRange("F5:H9").setValues(card2Rows)
    .setFontSize(9.5)
    .setVerticalAlignment("middle");

  sheet.getRange("G5:G9").setNumberFormat("₺#,##0.00").setFontWeight("bold").setHorizontalAlignment("right");
  sheet.getRange("G9").setFontColor("#059669").setFontSize(11);

  // ════════════════════════════════════════════════════════════════
  // KART 3: 🚨 VERGİ RİSKİ VE GİB UYARISI (J4:L8)
  // ════════════════════════════════════════════════════════════════
  sheet.getRange("J4:L4").merge()
    .setValue("🚨 KART 3: VERGİ RİSKİ VE GİB UYARISI")
    .setBackground("#7f1d1d")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(10.5)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  var cardSalesAmt = Number(data.cardSales || data.officialSales || 0);
  var invoicedPurchasesAmt = Number(data.invoicedPurchases || data.invoicedExpenses || 0);
  var riskAmt = Number(data.riskAmount || 0);
  var isHighRisk = (riskAmt > 0 || (cardSalesAmt > invoicedPurchasesAmt && invoicedPurchasesAmt > 0));

  var card3Rows = [
    ["📊 Kartlı Satış Hacmi", cardSalesAmt, "GİB banka POS kayıtlarına düşen resmi ciro"],
    ["📦 Faturalı Giriş Hacmi", invoicedPurchasesAmt, "GİB sisteminde kayıtlı faturalı mal alımları"],
    ["⚠️ Riskli Satış Hacmi", riskAmt, riskAmt > 0 ? "⚠️ Kartlı satış faturalı stoğu aşıyor!" : "✅ Kartlı satışlar faturalı alımla güvende"],
    ["🛡️ GİB Denetim Riski", isHighRisk ? "YÜKSEK RİSK" : "GÜVENLİ", isHighRisk ? "Faturasız alınıp kartla satılan hacim tespit edildi" : "Stok faturalı alımlarla tam uyumlu"]
  ];

  sheet.getRange("J5:L8").setValues(card3Rows)
    .setFontSize(9.5)
    .setVerticalAlignment("middle");

  sheet.getRange("K5:K7").setNumberFormat("₺#,##0.00").setFontWeight("bold").setHorizontalAlignment("right");
  sheet.getRange("K8").setHorizontalAlignment("center").setFontWeight("bold");

  if (isHighRisk) {
    sheet.getRange("K7").setFontColor("#dc2626");
    sheet.getRange("K8").setBackground("#fee2e2").setFontColor("#991b1b");
  } else {
    sheet.getRange("K7").setFontColor("#059669");
    sheet.getRange("K8").setBackground("#dcfce7").setFontColor("#166534");
  }

  // Kenarlıklar ve sütun genişlikleri
  sheet.getRange("B4:D8").setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange("F4:H9").setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange("J4:L8").setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);

  sheet.setColumnWidth(1, 20);  // Boşluk
  sheet.setColumnWidth(2, 190); // Kart 1 Gösterge
  sheet.setColumnWidth(3, 125); // Kart 1 Değer
  sheet.setColumnWidth(4, 210); // Kart 1 Açıklama
  sheet.setColumnWidth(5, 20);  // Boşluk
  sheet.setColumnWidth(6, 190); // Kart 2 Gösterge
  sheet.setColumnWidth(7, 125); // Kart 2 Değer
  sheet.setColumnWidth(8, 210); // Kart 2 Açıklama
  sheet.setColumnWidth(9, 20);  // Boşluk
  sheet.setColumnWidth(10, 190);// Kart 3 Gösterge
  sheet.setColumnWidth(11, 125);// Kart 3 Değer
  sheet.setColumnWidth(12, 210);// Kart 3 Açıklama

  // Alt kısımdaki eski gereksiz satırları temizle (Panelin her zaman sabit kalması için)
  if (sheet.getLastRow() > 10) {
    try {
      sheet.getRange(11, 1, sheet.getLastRow() - 10, sheet.getLastColumn()).clearContent().clearFormat();
    } catch (cleanErr) {}
  }
}

// ===================================================================
// 6. GÜN SONU KASA MUTABAKATI (BEKLENEN KASA HESABI)
// ===================================================================

function handleDailyClose(ss, data) {
  var sheetName = "Gün Sonu Kasa";
  var sheet = ss.getSheetByName(sheetName);
  var headers = [
    "Tarih", "Kapanış Saati", "Günün Nakit Satışları (TL)",
    "Günün Nakit Giderleri (TL)", "Beklenen Kasa (TL)", "Sayılan Nakit (TL)",
    "Kasa Farkı (TL)", "Mutabakat Durumu", "Açıklama / Not"
  ];

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.setTabColor("#6366f1");
    sheet.appendRow(headers);
    formatHeaderRow(sheet, headers.length);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    formatHeaderRow(sheet, headers.length);
  }

  var cashSales = Number(data.cashSales || 0);
  var cashExpenses = Number(data.cashExpenses || 0);
  var expectedCash = Number(data.expectedCash !== undefined ? data.expectedCash : (cashSales - cashExpenses));
  var actualCash = Number(data.actualCash || 0);
  var diff = Number(data.difference !== undefined ? data.difference : (actualCash - expectedCash));

  var statusText = "";
  var noteText = "";
  if (Math.abs(diff) < 0.01) {
    statusText = "✅ Tam Mutabakat";
    noteText = "Kasa kuruşu kuruşuna tutuyor.";
  } else if (diff > 0) {
    statusText = "📈 Kasa Fazlası";
    noteText = "Kasada +" + diff.toFixed(2) + " TL fazlalık tespit edildi.";
  } else {
    statusText = "⚠️ Kasa Açığı";
    noteText = "Kasada " + diff.toFixed(2) + " TL açık tespit edildi!";
  }

  var targetRow = Math.max(sheet.getLastRow() + 1, 2);

  // Formül destekli satır:
  // Kolon C: Nakit Satış
  // Kolon D: Nakit Gider
  // Kolon E: Beklenen Kasa = C[row] - D[row]
  // Kolon F: Sayılan Nakit
  // Kolon G: Kasa Farkı = F[row] - E[row]
  // Kolon H: Durum = IF(ROUND(G[row],2)=0,"✅ Tam Mutabakat",IF(G[row]>0,"📈 Kasa Fazlası","⚠️ Kasa Açığı"))
  var row = [
    data.date || getTodayFormatted(),
    data.time || getTimeFormatted(),
    cashSales,
    cashExpenses,
    "=C" + targetRow + "-D" + targetRow,
    actualCash,
    "=F" + targetRow + "-E" + targetRow,
    '=IF(ROUND(G' + targetRow + ',2)=0,"✅ Tam Mutabakat",IF(G' + targetRow + '>0,"📈 Kasa Fazlası","⚠️ Kasa Açığı"))',
    noteText
  ];

  sheet.getRange(targetRow, 1, 1, row.length).setValues([row])
    .setFontSize(9.5)
    .setVerticalAlignment("middle");

  sheet.getRange(targetRow, 1, 1, 2).setHorizontalAlignment("center");
  sheet.getRange(targetRow, 3, 1, 5).setNumberFormat("₺#,##0.00").setFontWeight("bold").setHorizontalAlignment("right");
  sheet.getRange(targetRow, 8).setHorizontalAlignment("center").setFontWeight("bold");

  if (Math.abs(diff) < 0.01) {
    sheet.getRange(targetRow, 8).setBackground("#dcfce7").setFontColor("#166534");
  } else if (diff > 0) {
    sheet.getRange(targetRow, 8).setBackground("#dbeafe").setFontColor("#1e40af");
  } else {
    sheet.getRange(targetRow, 8).setBackground("#fee2e2").setFontColor("#991b1b");
  }

  sheet.setRowHeight(targetRow, 26);
}

// ===================================================================
// 7. STOK VE ENVANTER ENJEKSİYONU
// ===================================================================

function handleInventorySync(ss, data) {
  var sheetName = "STOK ENJEKSİYON";
  var sheet = ss.getSheetByName(sheetName);
  var headers = [
    "Barkod", "Ürün Adı", "Kategori", "Mevcut Stok",
    "Kritik Eşik", "Alış Fiyatı (TL)", "Satış Fiyatı (TL)", "Parti / Lot Sayısı", "Son Güncelleme"
  ];

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.setTabColor("#2563eb");
    sheet.appendRow(headers);
    formatHeaderRow(sheet, headers.length);
  }

  var items = Array.isArray(data.data) ? data.data : (Array.isArray(data.items) ? data.items : []);
  if (items.length === 0) return;

  var rows = items.map(function(p) {
    return [
      p.barcode || "",
      p.name || "",
      p.category || "",
      Number(p.stock || 0),
      Number(p.criticalThreshold || 5),
      Number(p.buyPrice || 0),
      Number(p.price || 0),
      (p.batches && Array.isArray(p.batches)) ? p.batches.length : 0,
      getTodayFormatted() + " " + getTimeFormatted()
    ];
  });

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).clearContent();
  }

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows)
    .setFontSize(9)
    .setVerticalAlignment("middle");

  sheet.getRange(2, 6, rows.length, 2).setNumberFormat("₺#,##0.00");
}

// ===================================================================
// 8. GENEL BİÇİMLENDİRME YARDIMCILARI
// ===================================================================

function formatHeaderRow(sheet, numCols) {
  var range = sheet.getRange(1, 1, 1, numCols);
  range.setBackground("#1e293b")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(9.5)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 30);
  sheet.setFrozenRows(1);
}

function getColumnLetter(columnNumber) {
  var temp = 0;
  var letter = "";
  while (columnNumber > 0) {
    temp = (columnNumber - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    columnNumber = (columnNumber - temp - 1) / 26;
  }
  return letter;
}
