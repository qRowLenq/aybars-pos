/**
 * ===================================================================
 * PETSHOP KASA & ENVANTER YÖNETİMİ — GOOGLE APPS SCRIPT BACKEND
 * Dual-Layer "Real Profit vs. Tax Exposure" Engine & Sheets Sync
 * Sürüm: 3.0.0 (Gün Gün Ayrılmış Tablolar & Küçük/Majör Gider Panelleri)
 * ===================================================================
 * 
 * BU GÜNCELLEME İLE YAPILANLAR:
 * 1. MALİ RAPOR & VERGİ ANALİZİ TABLOSU GÜN GÜN (DAY-BY-DAY) YAPILDI:
 *    - Kullanıcı arayüzündeki tablo formatı (11 Kolon) birebir korundu.
 *    - Her gün için ayrı bir satır tutulur (06.09.2026, 07.09.2026 vb.).
 *    - POS'tan yapılan her satış ve girilen her gider anında o günün satırına
 *      canlı olarak işlenir ve rakamlar anında güncellenir.
 * 
 * 2. GİDERLER TABLOSU ESKİ SÜRÜMDEKİ GİBİ 3 AYRI PANELE BÖLÜNDÜ:
 *    - Panel 1 (A:G Kolonları): ☕ GÜNLÜK KÜÇÜK GİDERLER (Kasa Masrafları - Yemek, Poşet, Sarf)
 *    - Panel 2 (I:O Kolonları): 🏢 SABİT & MAJÖR GİDERLER (Kira, Fatura, Maaş, Vergi)
 *    - Panel 3 (Q:W Kolonları): 📦 ÜRÜN & MAL ALIMLARI (Toptancı Faturaları & Alımları)
 *    - H ve P kolonları estetik boşluk bırakır, paneller birbirini kaydırmaz.
 * 
 * 3. SATIŞLAR VE GÜN SONU KASA TABLOLARI:
 *    - Satışlar sekmesinde her işlem gün ve saat damgasıyla net bir şekilde tutulur.
 *    - Gün Sonu Kasa mutabakatı gün gün listelenir.
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
  return ContentService.createTextOutput("Petshop Kasa & Vergi Motoru v3.0.0 Aktif")
    .setMimeType(ContentService.MimeType.TEXT);
}

// ══════════════════════════════════════════════════════════════════
// 1. SATIŞLAR TABLOSU
// ══════════════════════════════════════════════════════════════════
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
  sheet.getRange(lastRow, 1, 1, 2).setHorizontalAlignment("center");
  sheet.getRange(lastRow, 6).setHorizontalAlignment("center");
  sheet.getRange(lastRow, 9).setHorizontalAlignment("center");

  // Satış yapıldığı anda günün Mali Rapor & Vergi satırını güncelle
  updateDailyTaxRowFromSheets(ss, data.date || getTodayFormatted(), data);
}

// ══════════════════════════════════════════════════════════════════
// 2. GİDERLER TABLOSU (ESKİSİ GİBİ 3 AYRI PANEL)
//    Panel 1: A-G (☕ Küçük Giderler / Günlük Masraflar)
//    Panel 2: I-O (🏢 Sabit & Majör Giderler - Kira, Fatura, Maaş)
//    Panel 3: Q-W (📦 Ürün & Mal Alımları - Toptancı Faturaları)
// ══════════════════════════════════════════════════════════════════
function handleSaveExpense(ss, data) {
  var sheetName = "Giderler";
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  // Panel Başlıklarını Kur
  setupExpensesPanels(sheet);

  var expType = String(data.expenseType || "").toLowerCase();
  var isProc = (expType.indexOf("procurement") !== -1 || expType.indexOf("mal") !== -1 || expType.indexOf("toptancı") !== -1 || expType.indexOf("borç") !== -1);
  var isMajor = (expType.indexOf("major") !== -1 || expType.indexOf("sabit") !== -1 || expType.indexOf("kira") !== -1 || expType.indexOf("maaş") !== -1 || expType.indexOf("fatura") !== -1);

  var hasInv = (data.hasInvoice === true || data.hasInvoice === "true" || data.isInvoice === true || data.isInvoice === "true" || String(data.invoiceStatus || "").indexOf("Faturalı") !== -1);
  var invText = hasInv ? "🧾 Faturalı" : "⚠️ Faturasız";
  var amt = Number(data.amount || 0);
  var dateStr = data.date || getTodayFormatted();
  var timeStr = data.time || getTimeFormatted();

  if (isProc) {
    // 📦 Panel 3: Q-W (Mal Alımları / Toptancı)
    insertExpenseIntoPanel(sheet, 17, 7, [
      dateStr,
      timeStr,
      data.category || data.supplierName || "Toptancı",
      data.description || data.desc || "Mal Alımı",
      data.status || "Ödendi",
      amt,
      invText
    ], hasInv);
  } else if (isMajor) {
    // 🏢 Panel 2: I-O (Sabit & Majör Giderler)
    insertExpenseIntoPanel(sheet, 9, 7, [
      dateStr,
      timeStr,
      data.category || "İşletme Gideri",
      data.paymentSource || data.source || "Banka / Kasa",
      data.description || data.desc || "-",
      amt,
      invText
    ], hasInv);
  } else {
    // ☕ Panel 1: A-G (Günlük Küçük Giderler)
    insertExpenseIntoPanel(sheet, 1, 7, [
      dateStr,
      timeStr,
      data.category || "Günlük Masraf",
      data.paymentSource || data.source || "Kasa (Nakit)",
      data.description || data.desc || "-",
      amt,
      invText
    ], hasInv);
  }

  // Gider eklendiğinde günün Mali Rapor & Vergi satırını güncelle
  updateDailyTaxRowFromSheets(ss, dateStr, data);
}

// Giderler sayfasındaki 3 paneli hazırlar
function setupExpensesPanels(sheet) {
  var a1Val = sheet.getRange(1, 1).getValue();
  if (a1Val && String(a1Val).indexOf("KÜÇÜK GİDERLER") !== -1) {
    return; // Zaten kurulmuş
  }

  // 1. Üst Başlık Bannerları (Row 1)
  // Panel 1 (A1:G1)
  sheet.getRange("A1:G1").merge()
    .setValue("☕ GÜNLÜK KÜÇÜK GİDERLER (KASA MASRAFLARI)")
    .setBackground("#1e293b")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(10.5)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  // Panel 2 (I1:O1)
  sheet.getRange("I1:O1").merge()
    .setValue("🏢 SABİT & MAJÖR İŞLETME GİDERLERİ (KİRA, FATURA, MAAŞ)")
    .setBackground("#1e1b4b")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(10.5)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  // Panel 3 (Q1:W1)
  sheet.getRange("Q1:W1").merge()
    .setValue("📦 ÜRÜN & MAL ALIMLARI (TOPTANCI FATURALARI)")
    .setBackground("#064e3b")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(10.5)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  sheet.setRowHeight(1, 30);

  // 2. Alt Kolon Başlıkları (Row 2)
  var headersPanel1 = ["Tarih", "Saat", "Kategori", "Ödeme Kaynağı", "Açıklama", "Tutar (TL)", "Fatura Durumu"];
  var headersPanel2 = ["Tarih", "Saat", "Gider Türü", "Ödeme Kaynağı", "Açıklama", "Tutar (TL)", "Fatura Durumu"];
  var headersPanel3 = ["Tarih", "Saat", "Toptancı Firma", "Alınan Kalemler", "Ödeme Durumu", "Tutar (TL)", "Fatura Durumu"];

  sheet.getRange("A2:G2").setValues([headersPanel1])
    .setBackground("#334155").setFontColor("#f8fafc").setFontWeight("bold").setFontSize(9.5).setHorizontalAlignment("center");

  sheet.getRange("I2:O2").setValues([headersPanel2])
    .setBackground("#312e81").setFontColor("#f8fafc").setFontWeight("bold").setFontSize(9.5).setHorizontalAlignment("center");

  sheet.getRange("Q2:W2").setValues([headersPanel3])
    .setBackground("#065f46").setFontColor("#f8fafc").setFontWeight("bold").setFontSize(9.5).setHorizontalAlignment("center");

  sheet.setRowHeight(2, 26);
  sheet.setFrozenRows(2);

  // Ayırıcı boş kolonlar (H ve P)
  sheet.setColumnWidth(8, 20);  // H (Boşluk)
  sheet.setColumnWidth(16, 20); // P (Boşluk)

  // Panel 1 Kolon Genişlikleri
  sheet.setColumnWidth(1, 95);  // Tarih
  sheet.setColumnWidth(2, 65);  // Saat
  sheet.setColumnWidth(3, 130); // Kategori
  sheet.setColumnWidth(4, 120); // Kaynak
  sheet.setColumnWidth(5, 180); // Açıklama
  sheet.setColumnWidth(6, 110); // Tutar
  sheet.setColumnWidth(7, 105); // Fatura

  // Panel 2 Kolon Genişlikleri
  sheet.setColumnWidth(9, 95);  // Tarih
  sheet.setColumnWidth(10, 65); // Saat
  sheet.setColumnWidth(11, 140); // Gider Türü
  sheet.setColumnWidth(12, 120); // Kaynak
  sheet.setColumnWidth(13, 180); // Açıklama
  sheet.setColumnWidth(14, 110); // Tutar
  sheet.setColumnWidth(15, 105); // Fatura

  // Panel 3 Kolon Genişlikleri
  sheet.setColumnWidth(17, 95); // Tarih
  sheet.setColumnWidth(18, 65); // Saat
  sheet.setColumnWidth(19, 140); // Toptancı
  sheet.setColumnWidth(20, 180); // Açıklama
  sheet.setColumnWidth(21, 110); // Durum
  sheet.setColumnWidth(22, 110); // Tutar
  sheet.setColumnWidth(23, 105); // Fatura
}

// İlgili panele satır ekler
function insertExpenseIntoPanel(sheet, startCol, numCols, rowData, hasInvoice) {
  var maxScan = Math.min(sheet.getMaxRows(), 300);
  var colData = sheet.getRange(3, startCol, maxScan - 2, 1).getValues();
  var targetRow = 3;

  for (var i = 0; i < colData.length; i++) {
    var val = String(colData[i][0] || "").trim();
    if (val === "" || val.indexOf("TOPLAM") !== -1) {
      targetRow = 3 + i;
      break;
    }
    if (i === colData.length - 1) {
      targetRow = 3 + colData.length;
    }
  }

  // Veriyi yaz
  var rowRange = sheet.getRange(targetRow, startCol, 1, numCols);
  rowRange.setValues([rowData])
    .setFontSize(9.5)
    .setVerticalAlignment("middle")
    .setBackground("#ffffff");

  sheet.setRowHeight(targetRow, 24);

  // Tarih ve saat ortala
  sheet.getRange(targetRow, startCol, 1, 2).setHorizontalAlignment("center");
  // Tutar sütunu
  var amtCol = startCol + numCols - 2;
  sheet.getRange(targetRow, amtCol).setNumberFormat("₺#,##0.00").setFontWeight("bold").setHorizontalAlignment("right");
  // Fatura durumu
  var invCol = startCol + numCols - 1;
  var invCell = sheet.getRange(targetRow, invCol);
  invCell.setHorizontalAlignment("center");
  if (hasInvoice) {
    invCell.setBackground("#dcfce7").setFontColor("#166534").setFontWeight("bold");
  } else {
    invCell.setBackground("#fee2e2").setFontColor("#991b1b").setFontWeight("bold");
  }
}

// ══════════════════════════════════════════════════════════════════
// 3. MALİ RAPOR & VERGİ YÜKÜ ANALİZİ (GÜN GÜN DAY-BY-DAY TABLOSU)
// ══════════════════════════════════════════════════════════════════
function handleSyncTaxReport(ss, data) {
  var dateStr = data.date || getTodayFormatted();
  updateDailyTaxRowDirect(ss, dateStr, data);
}

function updateDailyTaxRowDirect(ss, dateStr, data) {
  var sheetName = "Mali Rapor & Vergi";
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  setupTaxReportSheetHeaders(sheet);

  // Ekrandaki 11 Kolon:
  // 1: Rapor Tarihi (A)
  // 2: Saat (B)
  // 3: Resmi Satışlar (C)
  // 4: Faturalı Alışlar (D)
  // 5: Giderler (E)
  // 6: Resmi Vergi Matrahı (F)
  // 7: Ödenecek KDV (G)
  // 8: Tahmini Gelir Vergisi (H)
  // 9: Net Kasa Kârı (I)
  // 10: Vergi Riski Hacmi (J)
  // 11: Risk Durumu (K)

  var offSales = Number(data.officialSales || 0);
  var invPurchases = Number(data.invoicedPurchases || 0);
  var expensesTot = Number(data.expensesTotal !== undefined ? data.expensesTotal : (data.totalInvoicedDeductions || 0));
  var taxBase = Number(data.taxBase !== undefined ? data.taxBase : (offSales - expensesTot));
  var payVat = Number(data.payableVat || 0);
  var estIncTax = Number(data.estimatedIncomeTax !== undefined ? data.estimatedIncomeTax : Math.max(0, taxBase * 0.20));
  var netCashProfit = Number(data.netCashProfit !== undefined ? data.netCashProfit : (data.realProfit || 0));
  var riskAmt = Number(data.riskAmount || 0);
  var riskStatus = data.riskStatus || (riskAmt > 0 ? "Yüksek Risk" : "Güvenli");

  var rowData = [
    dateStr,
    data.time || getTimeFormatted(),
    offSales,
    invPurchases,
    expensesTot,
    taxBase,
    payVat,
    estIncTax,
    netCashProfit,
    riskAmt,
    riskStatus
  ];

  // Günün satırını bul (A kolonunda dateStr ara)
  var targetRow = findOrCreateDailyTaxRow(sheet, dateStr);

  var range = sheet.getRange(targetRow, 1, 1, 11);
  range.setValues([rowData])
    .setFontSize(9.5)
    .setVerticalAlignment("middle")
    .setBackground("#ffffff");

  sheet.setRowHeight(targetRow, 25);
  sheet.getRange(targetRow, 1, 1, 2).setHorizontalAlignment("center");
  sheet.getRange(targetRow, 3, 1, 8).setNumberFormat("₺#,##0.00").setHorizontalAlignment("right");
  sheet.getRange(targetRow, 9).setFontWeight("bold").setFontColor("#059669"); // Net Kasa Kârı yeşil

  var statusCell = sheet.getRange(targetRow, 11);
  statusCell.setHorizontalAlignment("center").setFontWeight("bold");
  if (riskStatus === "Güvenli" || riskAmt <= 0) {
    statusCell.setBackground("#dcfce7").setFontColor("#166534");
  } else {
    statusCell.setBackground("#fee2e2").setFontColor("#991b1b");
  }
}

// Mali Rapor sayfasında günün satırını bulur veya yeni gün satırı açar
function findOrCreateDailyTaxRow(sheet, dateStr) {
  var maxScan = Math.min(sheet.getMaxRows(), 300);
  var colA = sheet.getRange(4, 1, Math.max(1, maxScan - 3), 1).getValues();

  for (var i = 0; i < colA.length; i++) {
    var cellVal = String(colA[i][0] || "").trim();
    if (cellVal === dateStr) {
      return 4 + i; // Bugünün var olan satırını güncelle
    }
    if (cellVal === "" || cellVal.indexOf("TOPLAM") !== -1) {
      return 4 + i; // İlk boş satır
    }
  }
  return 4 + colA.length;
}

// Mali Rapor başlık bannerını kurar (Ekran görüntüsündeki tasarım)
function setupTaxReportSheetHeaders(sheet) {
  var a1Val = sheet.getRange(1, 1).getValue();
  if (a1Val && String(a1Val).indexOf("AYBARS PETSHOP") !== -1) {
    return; // Başlık zaten kurulu
  }

  // 1. Ana Başlık Banner
  sheet.getRange("A1:K1").merge()
    .setValue("🐾 AYBARS PETSHOP — MALİ RAPOR & VERGİ YÜKÜ ANALİZİ (DUAL-LAYER)")
    .setBackground("#0a192f")
    .setFontColor("#f8fafc")
    .setFontSize(13)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 36);

  // 2. Alt Başlık
  sheet.getRange("A2:K2").merge()
    .setValue("Gerçek Fiili Kasa Kârı (Cebe Giren) vs. Resmi Vergi Matrahı & GİB Denetim Riski Takip Tablosu")
    .setBackground("#1e293b")
    .setFontColor("#94a3b8")
    .setFontSize(9)
    .setFontStyle("italic")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(2, 22);

  // 3. Tablo Kolon Başlıkları (11 Kolon)
  var headers = [
    "Rapor Tarihi", "Saat", "Resmi Satışlar", "Faturalı Alışlar",
    "Giderler", "Resmi Vergi Matrahı", "Ödenecek KDV",
    "Tahmini Gelir Vergisi", "Net Kasa Kârı", "Vergi Riski Hacmi", "Risk Durumu"
  ];

  sheet.getRange("A3:K3").setValues([headers])
    .setBackground("#1e293b")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(9.5)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(3, 28);
  sheet.setFrozenRows(3);

  // Kolon Genişlikleri
  sheet.setColumnWidth(1, 100); // Rapor Tarihi
  sheet.setColumnWidth(2, 70);  // Saat
  sheet.setColumnWidth(3, 125); // Resmi Satışlar
  sheet.setColumnWidth(4, 125); // Faturalı Alışlar
  sheet.setColumnWidth(5, 115); // Giderler
  sheet.setColumnWidth(6, 135); // Resmi Vergi Matrahı
  sheet.setColumnWidth(7, 115); // Ödenecek KDV
  sheet.setColumnWidth(8, 140); // Tahmini Gelir Vergisi
  sheet.setColumnWidth(9, 125); // Net Kasa Kârı
  sheet.setColumnWidth(10, 130); // Vergi Riski Hacmi
  sheet.setColumnWidth(11, 105); // Risk Durumu
}

// Satış veya Gider geldiğinde Google Sheets üzerinden günün rakamlarını hesaplayıp günceller
function updateDailyTaxRowFromSheets(ss, targetDate, liveData) {
  try {
    // Eğer liveData içinde frontend'den tam hesaplanmış mali veriler gelmişse direkt kullan
    if (liveData && liveData.officialSales !== undefined) {
      updateDailyTaxRowDirect(ss, targetDate, liveData);
      return;
    }

    // Aksi halde Satışlar ve Giderler sayfalarından bugünün satırlarını topla
    var salesSheet = ss.getSheetByName("Satışlar");
    var offSales = 0;
    var vatTotal = 0;
    var totalSales = 0;

    if (salesSheet && salesSheet.getLastRow() > 1) {
      var salesData = salesSheet.getRange(2, 1, salesSheet.getLastRow() - 1, 9).getValues();
      for (var i = 0; i < salesData.length; i++) {
        var sDate = String(salesData[i][0] || "").trim();
        if (sDate === targetDate) {
          var tot = Number(salesData[i][6]) || 0;
          var vat = Number(salesData[i][7]) || 0;
          var status = String(salesData[i][8] || "");
          totalSales += tot;
          if (status.indexOf("Resmi") !== -1) {
            offSales += tot;
            vatTotal += vat;
          }
        }
      }
    }

    // Giderler sayfasından bugünün giderlerini topla
    var expSheet = ss.getSheetByName("Giderler");
    var totalExpenses = 0;
    var invPurchases = 0;
    var deductibleVat = 0;

    if (expSheet && expSheet.getLastRow() > 2) {
      var expRows = expSheet.getLastRow() - 2;
      // Panel 1: Küçük Giderler (A-G)
      var p1Data = expSheet.getRange(3, 1, expRows, 7).getValues();
      for (var j = 0; j < p1Data.length; j++) {
        if (String(p1Data[j][0] || "").trim() === targetDate) {
          var amt = Number(p1Data[j][5]) || 0;
          totalExpenses += amt;
          if (String(p1Data[j][6] || "").indexOf("Faturalı") !== -1) {
            deductibleVat += (amt - (amt / 1.20));
          }
        }
      }

      // Panel 2: Majör Giderler (I-O)
      var p2Data = expSheet.getRange(3, 9, expRows, 7).getValues();
      for (var k = 0; k < p2Data.length; k++) {
        if (String(p2Data[k][0] || "").trim() === targetDate) {
          var amt2 = Number(p2Data[k][5]) || 0;
          totalExpenses += amt2;
          if (String(p2Data[k][6] || "").indexOf("Faturalı") !== -1) {
            deductibleVat += (amt2 - (amt2 / 1.20));
          }
        }
      }

      // Panel 3: Mal Alımları (Q-W)
      var p3Data = expSheet.getRange(3, 17, expRows, 7).getValues();
      for (var m = 0; m < p3Data.length; m++) {
        if (String(p3Data[m][0] || "").trim() === targetDate) {
          var amt3 = Number(p3Data[m][5]) || 0;
          if (String(p3Data[m][6] || "").indexOf("Faturalı") !== -1) {
            invPurchases += amt3;
            deductibleVat += (amt3 - (amt3 / 1.20));
          }
        }
      }
    }

    var taxBase = offSales - (invPurchases + totalExpenses);
    var payableVat = Math.max(0, vatTotal - deductibleVat);
    var estIncomeTax = Math.max(0, taxBase * 0.20);
    var netCashProfit = totalSales - totalExpenses; // Fiili kâr
    var riskAmt = Math.max(0, offSales - invPurchases);
    var riskStatus = riskAmt > 0 ? "Yüksek Risk" : "Güvenli";

    updateDailyTaxRowDirect(ss, targetDate, {
      date: targetDate,
      time: getTimeFormatted(),
      officialSales: offSales,
      invoicedPurchases: invPurchases,
      expensesTotal: totalExpenses,
      taxBase: taxBase,
      payableVat: payableVat,
      estimatedIncomeTax: estIncomeTax,
      netCashProfit: netCashProfit,
      riskAmount: riskAmt,
      riskStatus: riskStatus
    });

  } catch (err) {
    // Silent fallback
  }
}

// ══════════════════════════════════════════════════════════════════
// 4. GÜN SONU KASA MUTABAKATI
// ══════════════════════════════════════════════════════════════════
function handleDailyClose(ss, data) {
  var sheetName = "Gün Sonu Kasa";
  var sheet = ss.getSheetByName(sheetName);
  var headers = [
    "Tarih", "Kapanış Saati", "Sayılan Nakit (TL)", "Beklenen Kasa (TL)", "Kasa Farkı (TL)", "Kasa Durumu"
  ];

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    formatHeaderRow(sheet, headers.length);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    formatHeaderRow(sheet, headers.length);
  }

  var diffStr = String(data.difference || "0.00 ₺").replace("₺", "").trim();
  var diffNum = parseFloat(diffStr.replace(/\./g, "").replace(",", ".")) || 0;
  var statusText = diffNum === 0 ? "✅ Tam Mutabakat" : (diffNum > 0 ? "📈 Kasa Fazlası" : "⚠️ Kasa Açığı");

  var row = [
    data.date || getTodayFormatted(),
    data.time || getTimeFormatted(),
    data.actualCash || "0.00 ₺",
    data.expectedCash || "-",
    data.difference || "0.00 ₺",
    statusText
  ];

  sheet.appendRow(row);
  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 1, 1, 2).setHorizontalAlignment("center");
  sheet.getRange(lastRow, 6).setHorizontalAlignment("center");
}

function formatHeaderRow(sheet, numCols) {
  var range = sheet.getRange(1, 1, 1, numCols);
  range.setBackground("#1e293b")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(10)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 28);
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
