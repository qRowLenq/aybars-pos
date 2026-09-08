/**
 * ===================================================================
 * AYBARS PETSHOP YÖNETİM SİSTEMİ — GOOGLE APPS SCRIPT BACKEND
 * Enterprise Financial Architecture (v5.1.0)
 * ===================================================================
 * 
 * BU SÜRÜMDEKİ GELİŞTİRMELER:
 * 1. GİDER - [AY YIL] SAYFASINDA #ERROR! FORMÜLLERİ GİDERİLDİ:
 *    - Yerel ayar (nokta/virgül, Türkçe/İngilizce) uyuşmazlığına yol açan karmaşık
 *      SUMIFS/TEXT formülleri kaldırıldı.
 *    - KPI toplamları doğrudan backend tarafından canlı hesaplanıp damgalanır (zero-error).
 * 
 * 2. İKİ AYRI BÖLÜMLÜ DÜZEN (MAJOR GİDERLER VS. GÜNLÜK & TOPTANCI):
 *    - BÖLÜM A (A:F Kolonları): 🏢 MAJOR / SABİT GİDERLER (Kira, Stopaj, Elektrik, Su, Aidat, Personel)
 *    - G Kolonu: Görsel Boşluk
 *    - BÖLÜM B (H:M Kolonları): 📦 GÜNLÜK İŞLETME & TOPTANCI AKIŞI (Mal Alımları, Sarf, Yemek, Kargo)
 *    - sync_expense gelen kaydın tipine göre ilgili bölüme bağımsız olarak akar.
 * 
 * 3. DEVREDEN BORÇ MOTORU (ROLLOVER SLOT):
 *    - Satır 6'da "Önceki Aydan Devreden Toptancı Borçları" kalıcı slotu korunur.
 * 
 * 4. GELİR TAKVİMİ & YÖNETİCİ MALİ RAPOR DASHBOARD'U:
 *    - Haftalık bloklu satış takvimi korunur.
 *    - Fişli Nakit, Fişsiz Nakit, Kredi Kartı, Fişli Havale, Fişsiz Havale, Platform Geliri ayrımı.
 *    - Gün sonu kapanış saati doğrudan GELİR tablosundaki gün sütununun altına damgalanır.
 */

var TURKISH_MONTHS = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];

// ===================================================================
// 1. WEB APP ENDPOINT'LERİ (doGet & doPost)
// ===================================================================

function doGet(e) {
  return HtmlService.createHtmlOutput(
    '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;padding:36px;line-height:1.6;color:#0f172a;max-width:760px;margin:auto;">' +
    '<h2 style="color:#059669;margin-bottom:8px;">🚀 Aybars Petshop Backend API v5.1.0 Aktif</h2>' +
    '<p style="color:#64748b;font-size:14px;margin-top:0;">Dual-Section Expense & Weekly Calendar Architecture</p>' +
    '<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>' +
    '<div style="background:#f8fafc;border-left:4px solid #10b981;padding:14px 18px;border-radius:6px;margin-bottom:16px;">' +
      '<b>📅 Dinamik Aylık Satış Takvimi:</b> <code>GELİR - [AY YIL]</code> sayfalarında 8 satırlı detaylı (Fişli/Fişsiz Nakit & Havale, Kart, Platform) döküm.' +
    '</div>' +
    '<div style="background:#f8fafc;border-left:4px solid #ef4444;padding:14px 18px;border-radius:6px;margin-bottom:16px;">' +
      '<b>🏢 İki Bölümlü Gider Defteri:</b> <code>GİDER - [AY YIL]</code> sayfasında Bölüm A (Major/Sabit) ve Bölüm B (Günlük & Toptancı).' +
    '</div>' +
    '<div style="background:#f8fafc;border-left:4px solid #3b82f6;padding:14px 18px;border-radius:6px;">' +
      '<b>🏛️ Mali Rapor Dashboard\'u:</b> <code>Mali Rapor & Vergi</code> sayfasında yerinde güncellenen tekil yönetici paneli.' +
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
      case "refund":
      case "refund_sale":
      case "sale_refund":
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

      case "reopen_daily_close":
      case "reopen_day":
        handleReopenDailyClose(ss, data);
        break;

      case "save_platform_income":
      case "platform_income":
        handleSavePlatformIncome(ss, data);
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
// 2. YARDIMCI VE TARİH METOTLARI
// ===================================================================

// ===================================================================
// 2. YARDIMCI VE TARİH METOTLARI
// ===================================================================

function safeParseMoney(val) {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (!val) return 0;
  var s = String(val).replace(/[^0-9.,-]/g, "").trim();
  if (!s) return 0;
  if (s.indexOf(".") !== -1 && s.indexOf(",") !== -1) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.indexOf(",") !== -1) {
    s = s.replace(",", ".");
  }
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseDateHelper(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  
  var str = String(dateStr).trim();
  
  // 1. DD.MM.YYYY veya D.M.YYYY (Örn: 08.09.2026 veya 8.9.2026)
  if (str.indexOf(".") !== -1) {
    var pDot = str.split(".");
    if (pDot.length === 3) {
      var d = parseInt(pDot[0], 10);
      var m = parseInt(pDot[1], 10) - 1;
      var y = parseInt(pDot[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        return new Date(y, m, d);
      }
    }
  }

  // 2. YYYY-MM-DD (Örn: 2026-09-08)
  if (str.indexOf("-") !== -1) {
    var pDash = str.split("T")[0].split("-");
    if (pDash.length === 3 && pDash[0].length === 4) {
      var y2 = parseInt(pDash[0], 10);
      var m2 = parseInt(pDash[1], 10) - 1;
      var d2 = parseInt(pDash[2], 10);
      if (!isNaN(d2) && !isNaN(m2) && !isNaN(y2)) {
        return new Date(y2, m2, d2);
      }
    }
  }

  // 3. DD/MM/YYYY veya D/M/YYYY
  if (str.indexOf("/") !== -1) {
    var pSlash = str.split("/");
    if (pSlash.length === 3) {
      var d3 = parseInt(pSlash[0], 10);
      var m3 = parseInt(pSlash[1], 10) - 1;
      var y3 = parseInt(pSlash[2], 10);
      if (!isNaN(d3) && !isNaN(m3) && !isNaN(y3)) {
        return new Date(y3, m3, d3);
      }
    }
  }

  var dObj = new Date(str);
  return isNaN(dObj.getTime()) ? new Date() : dObj;
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

function getOrCreateMonthlySalesSheet(ss, monthYearStr) {
  var sheets = ss.getSheets();
  var parts = String(monthYearStr || "").split(" ");
  var mName = (parts[0] || "EYLÜL").toUpperCase();
  var yName = parts[1] || String(new Date().getFullYear());

  var sheet = null;
  // 1. Önce hem GELİR hem Ay/Yıl içeren sekmeyi ara
  for (var i = 0; i < sheets.length; i++) {
    var sNameUpper = sheets[i].getName().toUpperCase();
    if ((sNameUpper.indexOf("GELİR") !== -1 || sNameUpper.indexOf("GELIR") !== -1) &&
        (sNameUpper.indexOf(mName) !== -1 || sNameUpper.indexOf("EYLÜL") !== -1 || sNameUpper.indexOf("EYLUL") !== -1) &&
        sNameUpper.indexOf(yName) !== -1) {
      sheet = sheets[i];
      break;
    }
  }

  // 2. Bulunamazsa sadece Ay içeren GELİR sekmesini ara
  if (!sheet) {
    for (var i = 0; i < sheets.length; i++) {
      var sNameUpper = sheets[i].getName().toUpperCase();
      if ((sNameUpper.indexOf("GELİR") !== -1 || sNameUpper.indexOf("GELIR") !== -1) &&
          (sNameUpper.indexOf(mName) !== -1 || sNameUpper.indexOf("EYLÜL") !== -1 || sNameUpper.indexOf("EYLUL") !== -1)) {
        sheet = sheets[i];
        break;
      }
    }
  }

  // 3. Bulunamazsa ismi doğrudan "GELİR" veya "GELIR" olan veya içinde geçen ilk sekmeyi al
  if (!sheet) {
    for (var i = 0; i < sheets.length; i++) {
      var sNameUpper = sheets[i].getName().toUpperCase().trim();
      if (sNameUpper === "GELİR" || sNameUpper === "GELIR" || sNameUpper.indexOf("GELİR") !== -1 || sNameUpper.indexOf("GELIR") !== -1) {
        sheet = sheets[i];
        break;
      }
    }
  }

  var sheetName = "GELİR - " + monthYearStr;
  if (!sheet) {
    sheet = ss.getSheetByName(sheetName);
  }
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.setTabColor("#10b981");
    buildMonthlySalesSheetTemplate(sheet, monthYearStr);
  }

  ensureSalesSheetStructure(sheet);
  return sheet;
}

function buildMonthlySalesSheetTemplate(sheet, monthYearStr) {
  sheet.getRange("A1:AQ1").merge()
    .setValue("AYBARS PETSHOP — " + monthYearStr + " GELİR TAKVİMİ (HAFTALIK / GÜNLÜK BLOK DÜZENİ)")
    .setBackground("#064e3b")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(12)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 35);

  sheet.getRange("B2:H2").merge().setValue("📅 1. HAFTA (GÜN 01 - 07)").setBackground("#047857").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
  sheet.getRange("J2:P2").merge().setValue("📅 2. HAFTA (GÜN 08 - 14)").setBackground("#047857").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
  sheet.getRange("R2:X2").merge().setValue("📅 3. HAFTA (GÜN 15 - 21)").setBackground("#047857").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
  sheet.getRange("Z2:AF2").merge().setValue("📅 4. HAFTA (GÜN 22 - 28)").setBackground("#047857").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
  sheet.getRange("AH2:AN2").merge().setValue("📅 5. HAFTA (GÜN 29 - 31)").setBackground("#047857").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
  sheet.getRange("AP2:AQ2").merge().setValue("🏆 AYLIK GELİR TOPLAMI").setBackground("#0f172a").setFontColor("#38bdf8").setFontWeight("bold").setHorizontalAlignment("center");
  sheet.setRowHeight(2, 24);

  sheet.getRange("B3:H3").merge().setFormula("=SUM(B5:H5)").setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#34d399").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.getRange("J3:P3").merge().setFormula("=SUM(J5:P5)").setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#34d399").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.getRange("R3:X3").merge().setFormula("=SUM(R5:X5)").setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#34d399").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.getRange("Z3:AF3").merge().setFormula("=SUM(Z5:AF5)").setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#34d399").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.getRange("AH3:AN3").merge().setFormula("=SUM(AH5:AN5)").setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#34d399").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.getRange("AP3:AQ3").merge().setFormula("=B3+J3+R3+Z3+AH3").setNumberFormat("₺#,##0.00").setBackground("#064e3b").setFontColor("#fef08a").setFontWeight("bold").setFontSize(13).setHorizontalAlignment("center");
  sheet.setRowHeight(3, 28);

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

  sheet.getRange("A2").setValue("Haftalar").setFontSize(8).setHorizontalAlignment("center").setFontColor("#94a3b8");
  sheet.getRange("A3").setValue("HAFTA TOPLAMI").setFontSize(8).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#0f172a").setFontColor("#94a3b8");
  sheet.getRange("A4").setValue("Günler").setFontSize(8).setHorizontalAlignment("center").setBackground("#1e293b").setFontColor("#94a3b8");
  sheet.setColumnWidth(1, 125);

  for (var i = 2; i <= 40; i++) {
    if (i === 9 || i === 17 || i === 25 || i === 33) {
      sheet.setColumnWidth(i, 15);
      sheet.getRange(1, i, 10, 1).setBackground("#f1f5f9");
    } else {
      sheet.setColumnWidth(i, 105);
    }
  }
  sheet.setColumnWidth(41, 15);
  sheet.setColumnWidth(42, 110);
  sheet.setColumnWidth(43, 110);

  sheet.setFrozenRows(5);
  sheet.setFrozenColumns(1);
}

function getSalesRowMap(sheet) {
  var rowMap = {
    total: 5,
    officialCash: 6,
    unoffCash: 7,
    card: 8,
    officialTransfer: 9,
    unoffTransfer: 10,
    platform: 11,
    closeTime: 12
  };
  if (!sheet) return rowMap;

  try {
    var aVals = sheet.getRange("A5:A16").getValues();
    var foundOffCash = false;
    var foundUnoffCash = false;
    var foundOffTrans = false;
    var foundUnoffTrans = false;

    for (var r = 0; r < aVals.length; r++) {
      var rowNum = 5 + r;
      var label = String(aVals[r][0] || "").toUpperCase().replace(/\s+/g, " ");

      if (label.indexOf("TOPLAM") !== -1 && (label.indexOf("GÜN") !== -1 || label.indexOf("GUN") !== -1)) {
        rowMap.total = rowNum;
      } else if (label.indexOf("FİŞLİ NAKİT") !== -1 || label.indexOf("FISLI NAKIT") !== -1) {
        rowMap.officialCash = rowNum;
        foundOffCash = true;
      } else if (label.indexOf("FİŞSİZ NAKİT") !== -1 || label.indexOf("FISSIZ NAKIT") !== -1) {
        rowMap.unoffCash = rowNum;
        foundUnoffCash = true;
      } else if (label.indexOf("KART") !== -1 || label.indexOf("KREDİ") !== -1 || label.indexOf("KREDI") !== -1) {
        rowMap.card = rowNum;
      } else if (label.indexOf("FİŞLİ HAVALE") !== -1 || label.indexOf("FISLI HAVALE") !== -1) {
        rowMap.officialTransfer = rowNum;
        foundOffTrans = true;
      } else if (label.indexOf("FİŞSİZ HAVALE") !== -1 || label.indexOf("FISSIZ HAVALE") !== -1) {
        rowMap.unoffTransfer = rowNum;
        foundUnoffTrans = true;
      } else if (label.indexOf("PLATFORM") !== -1) {
        rowMap.platform = rowNum;
      } else if (label.indexOf("KAPANIŞ") !== -1 || label.indexOf("KAPANIS") !== -1 || label.indexOf("SAAT") !== -1) {
        rowMap.closeTime = rowNum;
      } else if ((label.indexOf("NAKİT") !== -1 || label.indexOf("NAKIT") !== -1) && !foundOffCash && !foundUnoffCash) {
        rowMap.officialCash = rowNum;
        rowMap.unoffCash = rowNum;
      } else if ((label.indexOf("HAVALE") !== -1 || label.indexOf("IBAN") !== -1 || label.indexOf("EFT") !== -1) && !foundOffTrans && !foundUnoffTrans) {
        rowMap.officialTransfer = rowNum;
        rowMap.unoffTransfer = rowNum;
      }
    }
  } catch (e) {
    Logger.log("getSalesRowMap hatası: " + e);
  }

  return rowMap;
}

function ensureSalesSheetStructure(sheet) {
  var rowMap = getSalesRowMap(sheet);

  // A Sütunu Başlıkları (Fişli / Fişsiz Ayrımlı Standart Mimari)
  sheet.getRange(rowMap.total, 1).setValue("💰 GÜN TOPLAMI").setFontSize(8.5).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#065f46").setFontColor("#a7f3d0");
  sheet.getRange(rowMap.officialCash, 1).setValue("🧾 Fişli Nakit").setFontSize(8.5).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#f0fdf4").setFontColor("#15803d");
  sheet.getRange(rowMap.unoffCash, 1).setValue("💵 Fişsiz Nakit").setFontSize(8.5).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#fefce8").setFontColor("#a16207");
  sheet.getRange(rowMap.card, 1).setValue("💳 Kredi Kartı").setFontSize(8.5).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#eff6ff").setFontColor("#1d4ed8");
  sheet.getRange(rowMap.officialTransfer, 1).setValue("📲 Fişli Havale").setFontSize(8.5).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#f0f9ff").setFontColor("#0369a1");
  sheet.getRange(rowMap.unoffTransfer, 1).setValue("🏦 Fişsiz Havale").setFontSize(8.5).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#f8fafc").setFontColor("#475569");
  sheet.getRange(rowMap.platform, 1).setValue("📦 Platform Geliri").setFontSize(8.5).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#faf5ff").setFontColor("#7e22ce");
  sheet.getRange(rowMap.closeTime, 1).setValue("🏁 Kapanış Saati").setFontSize(8.5).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#f8fafc").setFontColor("#64748b");

  sheet.setRowHeight(rowMap.total, 24);
  sheet.setRowHeight(rowMap.officialCash, 22);
  sheet.setRowHeight(rowMap.unoffCash, 22);
  sheet.setRowHeight(rowMap.card, 22);
  sheet.setRowHeight(rowMap.officialTransfer, 22);
  sheet.setRowHeight(rowMap.unoffTransfer, 22);
  sheet.setRowHeight(rowMap.platform, 22);
  sheet.setRowHeight(rowMap.closeTime, 20);

  // Hafta toplamları ve Aylık Gelir Toplamını hatasız formülle bağla
  sheet.getRange("B3:H3").merge().setFormula("=SUM(B5:H5)").setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#34d399").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.getRange("J3:P3").merge().setFormula("=SUM(J5:P5)").setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#34d399").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.getRange("R3:X3").merge().setFormula("=SUM(R5:X5)").setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#34d399").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.getRange("Z3:AF3").merge().setFormula("=SUM(Z5:AF5)").setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#34d399").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.getRange("AH3:AN3").merge().setFormula("=SUM(AH5:AN5)").setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#34d399").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.getRange("AP3:AQ3").merge().setFormula("=B3+J3+R3+Z3+AH3").setNumberFormat("₺#,##0.00").setBackground("#064e3b").setFontColor("#fef08a").setFontWeight("bold").setFontSize(13).setHorizontalAlignment("center");

  function applyDayFormulas(startCol, count) {
    var minRow = Math.min(rowMap.officialCash, rowMap.unoffCash, rowMap.card, rowMap.officialTransfer, rowMap.unoffTransfer, rowMap.platform);
    var maxRow = Math.max(rowMap.officialCash, rowMap.unoffCash, rowMap.card, rowMap.officialTransfer, rowMap.unoffTransfer, rowMap.platform);
    for (var c = 0; c < count; c++) {
      var colIdx = startCol + c;
      var colLetter = getColumnLetter(colIdx);
      var sumCell = sheet.getRange(rowMap.total, colIdx);
      sumCell.setFormula("=SUM(" + colLetter + minRow + ":" + colLetter + maxRow + ")")
        .setNumberFormat("₺#,##0.00")
        .setBackground("#065f46")
        .setFontColor("#a7f3d0")
        .setFontWeight("bold")
        .setFontSize(9.5)
        .setHorizontalAlignment("center");

      sheet.getRange(minRow, colIdx, (maxRow - minRow + 1), 1)
        .setNumberFormat("₺#,##0.00")
        .setFontWeight("bold")
        .setHorizontalAlignment("right")
        .setFontSize(9);
    }
  }

  applyDayFormulas(2, 7);
  applyDayFormulas(10, 7);
  applyDayFormulas(18, 7);
  applyDayFormulas(26, 7);
  applyDayFormulas(34, 7);

  // Varsa #ERROR! veya bozuk hücreleri sıfırla
  try {
    var minRow = Math.min(rowMap.officialCash, rowMap.unoffCash, rowMap.card, rowMap.officialTransfer, rowMap.unoffTransfer, rowMap.platform);
    var maxRow = Math.max(rowMap.officialCash, rowMap.unoffCash, rowMap.card, rowMap.officialTransfer, rowMap.unoffTransfer, rowMap.platform);
    for (var col = 2; col <= 40; col++) {
      if (col === 9 || col === 17 || col === 25 || col === 33) continue;
      var vals = sheet.getRange(minRow, col, (maxRow - minRow + 1), 1).getValues();
      for (var r = 0; r < vals.length; r++) {
        var vStr = String(vals[r][0] || "");
        if (vStr.indexOf("#ERROR") !== -1 || vStr.indexOf("#VALUE") !== -1 || vStr.indexOf("#N/A") !== -1 || vStr.indexOf("#REF") !== -1) {
          sheet.getRange(minRow + r, col).setValue(0);
        }
      }
    }
  } catch (cleanErr) {}
}

function getSalesColumnForDay(dayNum) {
  var d = Math.max(1, Math.min(31, parseInt(dayNum, 10) || 1));
  if (d <= 7) return 2 + (d - 1);
  if (d <= 14) return 10 + (d - 8);
  if (d <= 21) return 18 + (d - 15);
  if (d <= 28) return 26 + (d - 22);
  return 34 + (d - 29);
}

function handleSaveSale(ss, data) {
  var dateObj = parseDateHelper(data.date);
  var monthYearStr = getMonthYearTitle(dateObj);
  var sheet = getOrCreateMonthlySalesSheet(ss, monthYearStr);

  var dayNum = dateObj.getDate();
  var targetCol = getSalesColumnForDay(dayNum);

  var totalAmt = Number(data.total || 0);
  var cardAmt = Number(data.cardSales || 0);
  var cashAmt = Number(data.cashSales || 0);
  var transferAmt = Number(data.transferSales || 0);
  var platformAmt = Number(data.platformSales || 0);
  var isOfficial = (data.isOfficial === true || data.isOfficial === "true");

  var officialCash = Number(data.officialCash !== undefined ? data.officialCash : (isOfficial ? cashAmt : 0));
  var unoffCash = Number(data.unoffCash !== undefined ? data.unoffCash : (!isOfficial ? cashAmt : 0));
  var officialTransfer = Number(data.officialTransfer !== undefined ? data.officialTransfer : (isOfficial ? transferAmt : 0));
  var unoffTransfer = Number(data.unoffTransfer !== undefined ? data.unoffTransfer : (!isOfficial ? transferAmt : 0));

  if (cardAmt === 0 && cashAmt === 0 && transferAmt === 0 && platformAmt === 0) {
    var pType = (data.paymentType || "").toLowerCase();
    if (pType.includes("nakit") && !pType.includes("parçalı")) {
      if (isOfficial) officialCash = totalAmt; else unoffCash = totalAmt;
    } else if (pType.includes("havale") || pType.includes("iban") || pType.includes("eft") || pType.includes("banka")) {
      if (isOfficial) officialTransfer = totalAmt; else unoffTransfer = totalAmt;
    } else if (pType.includes("platform") || pType.includes("getir") || pType.includes("yemeksepeti")) {
      platformAmt = totalAmt;
    } else {
      cardAmt = totalAmt;
    }
  }

  var rowMap = getSalesRowMap(sheet);

  // 🧾 Fişli Nakit Ekleme (Doğrudan hücre toplamına eklenir, not veya satır spam'i yapılmaz)
  if (officialCash !== 0) {
    var curOffCash = safeParseMoney(sheet.getRange(rowMap.officialCash, targetCol).getValue());
    sheet.getRange(rowMap.officialCash, targetCol).setValue(Math.max(0, curOffCash + officialCash));
  }

  // 💵 Fişsiz Nakit Ekleme
  if (unoffCash !== 0) {
    var curUnoffCash = safeParseMoney(sheet.getRange(rowMap.unoffCash, targetCol).getValue());
    sheet.getRange(rowMap.unoffCash, targetCol).setValue(Math.max(0, curUnoffCash + unoffCash));
  }

  // 💳 Kredi Kartı Ekleme
  if (cardAmt !== 0) {
    var curCard = safeParseMoney(sheet.getRange(rowMap.card, targetCol).getValue());
    sheet.getRange(rowMap.card, targetCol).setValue(Math.max(0, curCard + cardAmt));
  }

  // 📲 Fişli Havale Ekleme
  if (officialTransfer !== 0) {
    var curOffTrans = safeParseMoney(sheet.getRange(rowMap.officialTransfer, targetCol).getValue());
    sheet.getRange(rowMap.officialTransfer, targetCol).setValue(Math.max(0, curOffTrans + officialTransfer));
  }

  // 🏦 Fişsiz Havale Ekleme
  if (unoffTransfer !== 0) {
    var curUnoffTrans = safeParseMoney(sheet.getRange(rowMap.unoffTransfer, targetCol).getValue());
    sheet.getRange(rowMap.unoffTransfer, targetCol).setValue(Math.max(0, curUnoffTrans + unoffTransfer));
  }

  // 📦 Platform Geliri Ekleme
  if (platformAmt !== 0) {
    var curPlat = safeParseMoney(sheet.getRange(rowMap.platform, targetCol).getValue());
    sheet.getRange(rowMap.platform, targetCol).setValue(Math.max(0, curPlat + platformAmt));
  }

  // 5. Satırdaki Gün Toplamı Formülü
  var colLetter = getColumnLetter(targetCol);
  var minRow = Math.min(rowMap.officialCash, rowMap.unoffCash, rowMap.card, rowMap.officialTransfer, rowMap.unoffTransfer, rowMap.platform);
  var maxRow = Math.max(rowMap.officialCash, rowMap.unoffCash, rowMap.card, rowMap.officialTransfer, rowMap.unoffTransfer, rowMap.platform);
  sheet.getRange(rowMap.total, targetCol).setFormula("=SUM(" + colLetter + minRow + ":" + colLetter + maxRow + ")");
  SpreadsheetApp.flush();

  if (data.officialSales !== undefined || data.taxBase !== undefined) {
    handleSyncTaxReport(ss, data);
  }
}

function handleSavePlatformIncome(ss, data) {
  var dateObj = parseDateHelper(data.date);
  var monthYearStr = getMonthYearTitle(dateObj);
  var sheet = getOrCreateMonthlySalesSheet(ss, monthYearStr);

  var dayNum = dateObj.getDate();
  var targetCol = getSalesColumnForDay(dayNum);
  var netAmt = Number(data.netAmount || data.amount || data.total || 0);

  var rowMap = getSalesRowMap(sheet);
  var curPlat = safeParseMoney(sheet.getRange(rowMap.platform, targetCol).getValue());
  sheet.getRange(rowMap.platform, targetCol).setValue(curPlat + netAmt);

  var colLetter = getColumnLetter(targetCol);
  var minRow = Math.min(rowMap.officialCash, rowMap.unoffCash, rowMap.card, rowMap.officialTransfer, rowMap.unoffTransfer, rowMap.platform);
  var maxRow = Math.max(rowMap.officialCash, rowMap.unoffCash, rowMap.card, rowMap.officialTransfer, rowMap.unoffTransfer, rowMap.platform);
  sheet.getRange(rowMap.total, targetCol).setFormula("=SUM(" + colLetter + minRow + ":" + colLetter + maxRow + ")");
}

// ===================================================================
// 4. İKİ BÖLÜMLÜ GİDER DEFTERİ (GİDER - AY YIL)
// ===================================================================

/**
 * Dinamik GİDER - AY YIL sayfasını Bölüm A (Major) ve Bölüm B (Günlük) sütunlarıyla kurar
 */
function getOrCreateMonthlyExpenseSheet(ss, monthYearStr, supplierDebts) {
  var sheetName = "GİDER - " + monthYearStr;
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.setTabColor("#ef4444");

    // 1. Satır: Ana Başlık
    sheet.getRange("A1:M1").merge()
      .setValue("AYBARS PETSHOP — " + monthYearStr + " KONSOLİDE GİDER DEFTERİ (MAJOR & GÜNLÜK AKIŞ)")
      .setBackground("#0f172a")
      .setFontColor("#ffffff")
      .setFontWeight("bold")
      .setFontSize(12)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");
    sheet.setRowHeight(1, 35);

    // 2. Satır: 4 Temel KPI Kart Başlıkları
    sheet.getRange("A2:C2").merge().setValue("📅 BU AYKİ TOPLAM GİDER").setBackground("#1e293b").setFontColor("#cbd5e1").setFontWeight("bold").setFontSize(8.5).setHorizontalAlignment("center");
    sheet.getRange("D2:F2").merge().setValue("🏢 SABİT / MAJOR GİDERLER").setBackground("#1e293b").setFontColor("#cbd5e1").setFontWeight("bold").setFontSize(8.5).setHorizontalAlignment("center");
    sheet.getRange("H2:J2").merge().setValue("📦 GÜNLÜK & TOPTANCI AKIŞI").setBackground("#1e293b").setFontColor("#cbd5e1").setFontWeight("bold").setFontSize(8.5).setHorizontalAlignment("center");
    sheet.getRange("K2:L2").merge().setValue("💰 TAHMİNİ VERGİ TASARRUFU (%20)").setBackground("#1e293b").setFontColor("#cbd5e1").setFontWeight("bold").setFontSize(8.5).setHorizontalAlignment("center");
    sheet.getRange("M2").setValue("🔄 DEVREDEN BORÇ").setBackground("#1e293b").setFontColor("#cbd5e1").setFontWeight("bold").setFontSize(8.5).setHorizontalAlignment("center");
    sheet.setRowHeight(2, 22);

    // 3. Satır: KPI Değerleri (Backend tarafından doğrudan sıfır hata ile damgalanır)
    sheet.getRange("A3:C3").merge().setValue(0).setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#f87171").setFontWeight("bold").setFontSize(12).setHorizontalAlignment("center");
    sheet.getRange("D3:F3").merge().setValue(0).setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#60a5fa").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
    sheet.getRange("H3:J3").merge().setValue(0).setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#34d399").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
    sheet.getRange("K3:L3").merge().setValue(0).setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#4ade80").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
    sheet.getRange("M3").setValue(0).setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#fbbf24").setFontWeight("bold").setFontSize(10).setHorizontalAlignment("center");
    sheet.setRowHeight(3, 28);

    // 4. Satır: Alt Açıklama Bilgi Çubuğu
    sheet.getRange("A4:F4").merge()
      .setValue("🏢 Bölüm A: Kira, Stopaj, Elektrik, Su, Doğalgaz, Aidat ve Personel giderleri")
      .setBackground("#f8fafc")
      .setFontColor("#64748b")
      .setFontStyle("italic")
      .setFontSize(8.5);
    sheet.getRange("G4").setBackground("#f1f5f9");
    sheet.getRange("H4:M4").merge()
      .setValue("📦 Bölüm B: Toptancı mal alımları, mutfak, sarf, mazot, kargo ve işletme giderleri")
      .setBackground("#f8fafc")
      .setFontColor("#64748b")
      .setFontStyle("italic")
      .setFontSize(8.5);
    sheet.setRowHeight(4, 20);

    // 5. Satır: Ayrım Çizgisi
    sheet.getRange("A5:M5").setBackground("#ffffff");
    sheet.setRowHeight(5, 6);

    // 6. Satır: DEVREDEN BORÇ MOTORU (ROLLOVER SLOT)
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

    sheet.getRange("A6:K6").merge()
      .setValue("🔄 " + rolloverText)
      .setBackground("#fef3c7")
      .setFontColor("#92400e")
      .setFontWeight("bold")
      .setFontSize(9.5)
      .setHorizontalAlignment("left")
      .setVerticalAlignment("middle");

    sheet.getRange("L6:M6").merge()
      .setValue(totalRollover)
      .setNumberFormat("₺#,##0.00")
      .setBackground("#fef3c7")
      .setFontColor("#b45309")
      .setFontWeight("bold")
      .setHorizontalAlignment("right")
      .setVerticalAlignment("middle");
    sheet.setRowHeight(6, 26);

    // 7. Satır: İki Bölümlü Bölüm Başlıkları
    sheet.getRange("A7:F7").merge()
      .setValue("🏢 BÖLÜM A — MAJOR / SABİT GİDERLER (Kira, Stopaj, Elektrik, Su, Aidat, Personel)")
      .setBackground("#1e3a8a")
      .setFontColor("#ffffff")
      .setFontWeight("bold")
      .setFontSize(10)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");

    sheet.getRange("G7").setBackground("#f1f5f9");

    sheet.getRange("H7:M7").merge()
      .setValue("📦 BÖLÜM B — GÜNLÜK İŞLETME & TOPTANCI AKIŞI (Mal Alımları, Sarf, Yemek, Kargo)")
      .setBackground("#065f46")
      .setFontColor("#ffffff")
      .setFontWeight("bold")
      .setFontSize(10)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");
    sheet.setRowHeight(7, 26);

    // 8. Satır: Tablo Sütun Başlıkları
    var headersA = ["Tarih", "Kategori / Alt Tür", "Açıklama", "Tutar (TL)", "Ödeme Kaynağı", "Fatura Durumu"];
    var headersB = ["Tarih", "Tür / Tedarikçi", "Açıklama", "Tutar (TL)", "Ödeme Kaynağı", "Fatura Durumu"];

    sheet.getRange(8, 1, 1, 6).setValues([headersA])
      .setBackground("#334155")
      .setFontColor("#ffffff")
      .setFontWeight("bold")
      .setFontSize(9)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");

    sheet.getRange(8, 7).setBackground("#f1f5f9");

    sheet.getRange(8, 8, 1, 6).setValues([headersB])
      .setBackground("#334155")
      .setFontColor("#ffffff")
      .setFontWeight("bold")
      .setFontSize(9)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");
    sheet.setRowHeight(8, 26);

    // Sütun Genişlikleri
    sheet.setColumnWidth(1, 95);  // Tarih A
    sheet.setColumnWidth(2, 160); // Kategori A
    sheet.setColumnWidth(3, 210); // Açıklama A
    sheet.setColumnWidth(4, 115); // Tutar A
    sheet.setColumnWidth(5, 120); // Ödeme A
    sheet.setColumnWidth(6, 110); // Fatura A

    sheet.setColumnWidth(7, 24);  // Boşluk G
    sheet.getRange(1, 7, sheet.getMaxRows(), 1).setBackground("#f1f5f9");

    sheet.setColumnWidth(8, 95);  // Tarih B
    sheet.setColumnWidth(9, 160); // Tedarikçi B
    sheet.setColumnWidth(10, 210);// Açıklama B
    sheet.setColumnWidth(11, 115);// Tutar B
    sheet.setColumnWidth(12, 120);// Ödeme B
    sheet.setColumnWidth(13, 110);// Fatura B

    sheet.setFrozenRows(8);
  }

  return sheet;
}

/**
 * Gideri sınıflandırır: Major/Sabit ise Bölüm A'ya, Günlük/Toptancı ise Bölüm B'ye yönlendirir.
 */
function handleSaveExpense(ss, data) {
  var dateObj = parseDateHelper(data.date);
  var monthYearStr = getMonthYearTitle(dateObj);
  var sheet = getOrCreateMonthlyExpenseSheet(ss, monthYearStr, data.supplierDebts);

  var rawAmount = Number(data.amount || 0);
  var cat = String(data.category || data.mainCategory || "").toLowerCase();
  var sub = String(data.subType || "").toLowerCase();
  var desc = String(data.description || data.desc || "").toLowerCase();
  var expType = String(data.expenseType || "").toLowerCase();

  var isMajor = (
    data.isMajor === true ||
    data.isMajor === "true" ||
    expType === "major" ||
    cat.includes("sabit") ||
    cat.includes("kira") ||
    cat.includes("personel") ||
    cat.includes("demirbaş") ||
    sub.includes("kira") ||
    sub.includes("stopaj") ||
    sub.includes("elektrik") ||
    sub.includes("su") ||
    sub.includes("doğalgaz") ||
    sub.includes("internet") ||
    sub.includes("aidat") ||
    sub.includes("muhasebe") ||
    sub.includes("maaş") ||
    desc.includes("kira") ||
    desc.includes("elektrik") ||
    desc.includes("fatura")
  );

  var paymentSrc = data.paymentMethod || data.paymentSource || data.source || "Kasa (Nakit)";
  var invStatus = data.invoiceStatus || (data.hasInvoice ? "Faturalı" : "Faturasız");
  var maxScan = Math.min(sheet.getMaxRows(), 500);

  if (isMajor) {
    // 🏢 BÖLÜM A (Sütun A..F)
    var targetRowA = 9;
    var colARange = sheet.getRange(9, 1, maxScan - 8, 1).getValues();
    for (var i = 0; i < colARange.length; i++) {
      if (colARange[i][0] === "" || colARange[i][0] === null || colARange[i][0] === undefined) {
        targetRowA = 9 + i;
        break;
      }
      if (i === colARange.length - 1) {
        targetRowA = 9 + colARange.length;
        sheet.insertRowAfter(targetRowA - 1);
      }
    }

    var rowAData = [
      data.date || getTodayFormatted(),
      data.subType || data.category || "Sabit Masraf",
      data.description || data.desc || "-",
      rawAmount,
      paymentSrc,
      invStatus
    ];

    sheet.getRange(targetRowA, 1, 1, 6).setValues([rowAData])
      .setFontSize(9)
      .setVerticalAlignment("middle");
    sheet.getRange(targetRowA, 1).setHorizontalAlignment("center");
    sheet.getRange(targetRowA, 4).setNumberFormat("₺#,##0.00").setFontWeight("bold").setHorizontalAlignment("right");
    sheet.getRange(targetRowA, 6).setHorizontalAlignment("center");
    if (invStatus.indexOf("Faturalı") !== -1 || invStatus.indexOf("Stopaj") !== -1) {
      sheet.getRange(targetRowA, 6).setFontColor("#047857").setFontWeight("bold");
    } else {
      sheet.getRange(targetRowA, 6).setFontColor("#dc2626");
    }
    sheet.setRowHeight(targetRowA, 24);

  } else {
    // 📦 BÖLÜM B (Sütun H..M)
    var targetRowB = 9;
    var colHRange = sheet.getRange(9, 8, maxScan - 8, 1).getValues();
    for (var j = 0; j < colHRange.length; j++) {
      if (colHRange[j][0] === "" || colHRange[j][0] === null || colHRange[j][0] === undefined) {
        targetRowB = 9 + j;
        break;
      }
      if (j === colHRange.length - 1) {
        targetRowB = 9 + colHRange.length;
        sheet.insertRowAfter(targetRowB - 1);
      }
    }

    var rowBData = [
      data.date || getTodayFormatted(),
      data.supplierName || data.subType || data.category || "Günlük Sarf",
      data.description || data.desc || "-",
      rawAmount,
      paymentSrc,
      invStatus
    ];

    sheet.getRange(targetRowB, 8, 1, 6).setValues([rowBData])
      .setFontSize(9)
      .setVerticalAlignment("middle");
    sheet.getRange(targetRowB, 8).setHorizontalAlignment("center");
    sheet.getRange(targetRowB, 11).setNumberFormat("₺#,##0.00").setFontWeight("bold").setHorizontalAlignment("right");
    sheet.getRange(targetRowB, 13).setHorizontalAlignment("center");
    if (invStatus.indexOf("Faturalı") !== -1) {
      sheet.getRange(targetRowB, 13).setFontColor("#047857").setFontWeight("bold");
    } else {
      sheet.getRange(targetRowB, 13).setFontColor("#dc2626");
    }
    sheet.setRowHeight(targetRowB, 24);
  }

  // 4 Temel Üst KPI Kartını backend tarafında canlı hesaplayıp damgala (Zero-Error)
  recalculateExpenseSheetKPIs(sheet);

  if (data.officialSales !== undefined || data.taxBase !== undefined) {
    handleSyncTaxReport(ss, data);
  }
}

/**
 * Gider sayfasındaki tüm kayıtları tarayıp Row 3 KPI kartlarını hatasız günceller.
 */
function recalculateExpenseSheetKPIs(sheet) {
  var lastRow = Math.max(sheet.getLastRow(), 9);
  var sumMajor = 0;
  var sumDaily = 0;
  var invoicedTotal = 0;

  // Bölüm A: Kolon D (4) ve Kolon F (6)
  var valsA = sheet.getRange(9, 4, lastRow - 8, 3).getValues();
  for (var r = 0; r < valsA.length; r++) {
    var amtA = Number(valsA[r][0] || 0);
    var statusA = String(valsA[r][2] || "");
    sumMajor += amtA;
    if (statusA.indexOf("Faturalı") !== -1 || statusA.indexOf("Stopaj") !== -1) {
      invoicedTotal += amtA;
    }
  }

  // Bölüm B: Kolon K (11) ve Kolon M (13)
  var valsB = sheet.getRange(9, 11, lastRow - 8, 3).getValues();
  for (var k = 0; k < valsB.length; k++) {
    var amtB = Number(valsB[k][0] || 0);
    var statusB = String(valsB[k][2] || "");
    sumDaily += amtB;
    if (statusB.indexOf("Faturalı") !== -1) {
      invoicedTotal += amtB;
    }
  }

  var totalExpense = sumMajor + sumDaily;
  var taxShield = invoicedTotal * 0.20;

  sheet.getRange("A3:C3").setValue(totalExpense);
  sheet.getRange("D3:F3").setValue(sumMajor);
  sheet.getRange("H3:J3").setValue(sumDaily);
  sheet.getRange("K3:L3").setValue(taxShield);
}

// ===================================================================
// 5. YÖNETİCİ MALİ RAPOR & VERGİ DASHBOARD'U (TEKİL YERİNDE GÜNCELLEME)
// ===================================================================

function handleSyncTaxReport(ss, data) {
  var sheetName = "Mali Rapor & Vergi";
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.setTabColor("#1e3a8a");
  }

  sheet.getRange("B1:L1").merge()
    .setValue("🐾 AYBARS PETSHOP — YÖNETİCİ MALİ RAPOR & VERGİ YÜKÜ DASHBOARD'U")
    .setBackground("#0f172a")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(12)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 35);

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

  sheet.getRange("B4:D8").setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange("F4:H9").setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange("J4:L8").setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);

  sheet.setColumnWidth(1, 20);
  sheet.setColumnWidth(2, 190);
  sheet.setColumnWidth(3, 125);
  sheet.setColumnWidth(4, 210);
  sheet.setColumnWidth(5, 20);
  sheet.setColumnWidth(6, 190);
  sheet.setColumnWidth(7, 125);
  sheet.setColumnWidth(8, 210);
  sheet.setColumnWidth(9, 20);
  sheet.setColumnWidth(10, 190);
  sheet.setColumnWidth(11, 125);
  sheet.setColumnWidth(12, 210);

  if (sheet.getLastRow() > 10) {
    try {
      sheet.getRange(11, 1, sheet.getLastRow() - 10, sheet.getLastColumn()).clearContent().clearFormat();
    } catch (cleanErr) {}
  }
}

// ===================================================================
// 6. GÜN SONU MUTABAKATI & GELİR DÖKÜMÜ
// ===================================================================

function handleDailyClose(ss, data) {
  // Kullanıcı talebi: 'Gün Sonu Kasa' sekmesi kaldırıldı, varsa e-tablodan sil
  try {
    var dcSheet = ss.getSheetByName("Gün Sonu Kasa");
    if (dcSheet) {
      ss.deleteSheet(dcSheet);
      Logger.log("Eski 'Gün Sonu Kasa' sekmesi e-tablodan kaldırıldı.");
    }
  } catch (delErr) {
    Logger.log("'Gün Sonu Kasa' sekmesi silinirken uyarı: " + delErr);
  }

  // GELİR - [AY YIL] sayfasına gün sütununun altına kapanış saatini damgala
  try {
    var dateObj = parseDateHelper(data.date);
    var monthYearStr = getMonthYearTitle(dateObj);
    var salesSheet = getOrCreateMonthlySalesSheet(ss, monthYearStr);
    var dayNum = dateObj.getDate();
    var targetCol = getSalesColumnForDay(dayNum);
    var rowMap = getSalesRowMap(salesSheet);

    var diff = Number(data.difference !== undefined ? data.difference : 0);
    var cleanStatus = (Math.abs(diff) < 0.01) ? "Tam Mutabakat" : (diff > 0 ? "Kasa Fazlası" : "Kasa Açığı");
    var timeStamp = (data.time || getTimeFormatted()) + " (" + cleanStatus + ")";

    salesSheet.getRange(rowMap.closeTime, targetCol)
      .setValue(timeStamp)
      .setFontSize(8.5)
      .setHorizontalAlignment("center")
      .setFontColor("#15803d")
      .setBackground("#f8fafc");

    // Gün toplamı formülünü garantiye al
    var colLetter = getColumnLetter(targetCol);
    var minRow = Math.min(rowMap.officialCash, rowMap.unoffCash, rowMap.card, rowMap.officialTransfer, rowMap.unoffTransfer, rowMap.platform);
    var maxRow = Math.max(rowMap.officialCash, rowMap.unoffCash, rowMap.card, rowMap.officialTransfer, rowMap.unoffTransfer, rowMap.platform);
    salesSheet.getRange(rowMap.total, targetCol)
      .setFormula("=SUM(" + colLetter + minRow + ":" + colLetter + maxRow + ")")
      .setNumberFormat("₺#,##0.00")
      .setHorizontalAlignment("center")
      .setFontWeight("bold")
      .setBackground("#065f46")
      .setFontColor("#a7f3d0");

    SpreadsheetApp.flush();
    return { success: true, message: "Kapanış saati GELİR tablosuna işlendi." };
  } catch (syncErr) {
    Logger.log("GELİR sayfasına gün sonu yazılırken hata: " + syncErr);
    return { success: false, error: String(syncErr) };
  }
}

function handleReopenDailyClose(ss, data) {
  // 'Gün Sonu Kasa' sekmesi varsa temizle
  try {
    var dcSheet = ss.getSheetByName("Gün Sonu Kasa");
    if (dcSheet) {
      ss.deleteSheet(dcSheet);
    }
  } catch (delErr) {}

  var targetDate = data.date || getTodayFormatted();

  // GELİR sayfasındaki gün sonu kapanış saatini temizle
  try {
    var dateObj = parseDateHelper(targetDate);
    var monthYearStr = getMonthYearTitle(dateObj);
    var salesSheet = getOrCreateMonthlySalesSheet(ss, monthYearStr);
    if (salesSheet) {
      var dayNum = dateObj.getDate();
      var targetCol = getSalesColumnForDay(dayNum);
      var rowMap = getSalesRowMap(salesSheet);
      salesSheet.getRange(rowMap.closeTime, targetCol).clearContent().setBackground(null);
    }
    SpreadsheetApp.flush();
    return { success: true, message: "Günü geri açma başarılı." };
  } catch (syncErr) {
    Logger.log("GELİR sayfasından gün sonu saati temizlenirken hata: " + syncErr);
    return { success: false, error: String(syncErr) };
  }
}

function fixAllErrorCells(sheet) {
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow > 1 && lastCol > 0) {
    var range = sheet.getRange(2, 1, lastRow - 1, lastCol);
    var values = range.getValues();
    var formulas = range.getFormulas();
    for (var r = 0; r < values.length; r++) {
      for (var c = 0; c < values[r].length; c++) {
        var str = String(values[r][c]);
        var fStr = String(formulas[r][c] || "");
        if (str.indexOf("#ERROR") !== -1 || str.indexOf("#N/A") !== -1 || str.indexOf("#REF") !== -1 || str.indexOf("#VALUE") !== -1 || fStr.indexOf("IF(") !== -1) {
          sheet.getRange(r + 2, c + 1).setValue("✅ Tam Mutabakat")
            .setBackground("#dcfce7")
            .setFontColor("#166534")
            .setFontWeight("bold")
            .setHorizontalAlignment("center");
        }
      }
    }
  }
}

/**
 * Tek tıkla Apps Script editöründen çalıştırılabilir onarım fonksiyonu.
 * Gün Sonu Kasa sayfasındaki #ERROR! hücrelerini anında temizler ve GELİR sayfasını hazırlar.
 */
function repairEverything() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Gün Sonu Kasa sekmesi kaldırıldı, varsa temizle
  try {
    var dcSheet = ss.getSheetByName("Gün Sonu Kasa");
    if (dcSheet) {
      ss.deleteSheet(dcSheet);
      Logger.log("'Gün Sonu Kasa' sekmesi kaldırıldı.");
    }
  } catch (e) {}
  
  var allSheets = ss.getSheets();
  for (var i = 0; i < allSheets.length; i++) {
    var sName = allSheets[i].getName().toUpperCase();
    if (sName.indexOf("GELİR") !== -1 || sName.indexOf("GELIR") !== -1) {
      ensureSalesSheetStructure(allSheets[i]);
    }
  }
  
  var d = new Date();
  var monthYearStr = getMonthYearTitle(d);
  var salesSheet = getOrCreateMonthlySalesSheet(ss, monthYearStr);
  ensureSalesSheetStructure(salesSheet);
  
  Logger.log("✅ Tüm GELİR sayfaları 8 satırlı yeni formata geçirildi ve #ERROR! formülleri düzeltildi!");
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

/**
 * Kullanıcı talebiyle 'Gün Sonu Kasa' sayfası kaldırıldı. Varsa siler.
 */
function fixGunSonuTablosu() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    var sheet = ss.getSheetByName("Gün Sonu Kasa");
    if (sheet) {
      ss.deleteSheet(sheet);
      Logger.log("'Gün Sonu Kasa' sayfası kullanıcı talebiyle kaldırıldı.");
    }
  } catch (e) {}
}

/**
 * Ürün ve stoklara dokunmadan, tüm finansal tabloları (GELİR, GİDER) sıfırlar.
 * Apps Script editöründe bu fonksiyonu seçip "Çalıştır" diyerek sayfaları tek tıkla sıfırlayabilirsiniz.
 */
function resetSpreadsheetFinancials() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Gün Sonu Kasa sekmesi varsa kaldır
  try {
    var dcSheet = ss.getSheetByName("Gün Sonu Kasa");
    if (dcSheet) {
      ss.deleteSheet(dcSheet);
      Logger.log("Gün Sonu Kasa sekmesi kaldırıldı.");
    }
  } catch (e) {}

  // 2. Tüm GELİR sayfalarındaki gün sütunlarını sıfırla
  var allSheets = ss.getSheets();
  for (var i = 0; i < allSheets.length; i++) {
    var s = allSheets[i];
    var sName = s.getName().toUpperCase();
    if (sName.indexOf("GELİR") !== -1 || sName.indexOf("GELIR") !== -1) {
      var rowMap = getSalesRowMap(s);
      for (var col = 2; col <= 40; col++) {
        if (col === 9 || col === 17 || col === 25 || col === 33) continue;
        s.getRange(rowMap.officialCash, col, 7, 1).clearContent();
      }
      ensureSalesSheetStructure(s);
      Logger.log(s.getName() + " gelir takvimi sıfırlandı.");
    }
    
    // 3. Tüm GİDER sayfalarındaki harcama satırlarını temizle (Bölüm A ve B)
    if (sName.indexOf("GİDER") !== -1 || sName.indexOf("GIDER") !== -1) {
      if (s.getLastRow() > 6) {
        s.getRange(7, 1, s.getLastRow() - 6, s.getLastColumn()).clearContent();
        Logger.log(s.getName() + " gider satırları temizlendi.");
      }
    }
  }

  // 4. Mali Rapor & Vergi panelini sıfırla
  handleSyncTaxReport(ss, {
    officialSales: 0,
    expensesTotal: 0,
    taxBase: 0,
    estimatedIncomeTax: 0,
    netCashProfit: 0,
    collectedVat: 0,
    deductibleVat: 0,
    payableVat: 0,
    cardSales: 0,
    invoicedPurchases: 0,
    riskAmount: 0
  });

  Logger.log("✅ Finansal tablolar (Gelir, Gider) sıfırlandı. Ürünler ve stoklar korundu!");
}

