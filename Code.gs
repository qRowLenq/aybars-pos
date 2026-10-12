// ===================================================================
// 🟢 TEK TIKLA ÇALIŞTIR & TÜM TAKVİMİ DÜZELT (BU EN BAŞTAKİ FONKSİYONDUR):
// Google Apps Script editöründe yukarıdaki "Çalıştır" (Run) butonuna doğrudan basın!
// E-Tablonuzdaki 19 Eylül (Cmt) ve 20 Eylül (Paz) başlıkları anında düzelecektir!
// ===================================================================

function TAKVIMI_VE_TARIHLERI_SIMDI_DUZELT() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var updatedCount = 0;
  for (var i = 0; i < sheets.length; i++) {
    var sName = sheets[i].getName().toUpperCase();
    if (sName.indexOf("GELİR") !== -1 || sName.indexOf("GELIR") !== -1) {
      ensureSalesSheetStructure(sheets[i]);
      updatedCount++;
    }
  }
  // Eğer isim bulunamadıysa şu an açık olan aktif sayfayı da zorunlu olarak düzelt
  if (updatedCount === 0 && ss.getActiveSheet()) {
    ensureSalesSheetStructure(ss.getActiveSheet());
    updatedCount = 1;
  }
  try {
    ss.toast("✅ Tüm GELİR takvim başlıkları (" + updatedCount + " sekme) başarıyla güncellendi!", "Aybars Petshop", 5);
  } catch(e) {}
  Logger.log("Takvim başlıkları güncellendi. Toplam güncellenen sekme: " + updatedCount);
}

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu("🐾 Aybars Yönetim")
      .addItem("📅 Takvim Başlıklarını & Tarihleri Düzelt", "TAKVIMI_VE_TARIHLERI_SIMDI_DUZELT")
      .addToUi();
  } catch (e) {}
}

// Read-only diagnostic: run in the existing bound Apps Script editor.
function AYBARS_BAGLI_TABLOYU_GOSTER() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Bu script bir E-Tabloya bağlı değil. Tablo üzerinden Uzantılar > Apps Script ile açın.');
  Logger.log('Tablo adı: ' + ss.getName());
  Logger.log('Tablo linki: ' + ss.getUrl());
  Logger.log('Sekmeler: ' + ss.getSheets().map(function(sheet) { return sheet.getName(); }).join(', '));
  return ss.getUrl();
}

function handleFullReportSnapshot(ss, snapshot) {
  if (!snapshot || !Array.isArray(snapshot.salesHistory) || !Array.isArray(snapshot.products)) throw new Error('Geçerli tam veri yedeği bulunamadı.');
  var reports=buildAybarsSnapshotTables(snapshot);
  Object.keys(reports).forEach(function(name) {
    var rows=reports[name], sheet=ss.getSheetByName(name) || ss.insertSheet(name);
    if (rows.length>sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(),rows.length-sheet.getMaxRows());
    if (rows[0].length>sheet.getMaxColumns()) sheet.insertColumnsAfter(sheet.getMaxColumns(),rows[0].length-sheet.getMaxColumns());
    var height=Math.max(1,sheet.getLastRow(),rows.length), width=rows[0].length;
    sheet.getRange(1,1,height,width).clearContent();
    var safeRows=rows.map(function(row){return row.map(function(v){return typeof v==='string' && /^=/.test(v) ? "'"+v : v;});});
    sheet.getRange(1,1,rows.length,width).setValues(safeRows).setFontSize(10).setVerticalAlignment('middle');
    sheet.getRange(1,1,1,width).setBackground('#edf1f5').setFontColor('#172b4d').setFontWeight('bold').setWrap(true);
    sheet.setFrozenRows(1);sheet.setRowHeight(1,44);
    sheet.setColumnWidths(1,width,160);
    if (name==='GÜNLÜK ÖZET' || name==='AYLIK ÖZET') {
      sheet.setColumnWidths(1,width,130);
      sheet.getRange(2,2,Math.max(1,rows.length-1),12).setNumberFormat('₺#,##0.00');
      sheet.getRange(2,11,Math.max(1,rows.length-1),1).setNumberFormat('0');
    }
    if (name==='RAPOR PANELİ') {
      sheet.setColumnWidth(1,260);sheet.setColumnWidth(2,480);
      sheet.getRange(3,2,11,1).setNumberFormat('₺#,##0.00');
    }
  });
  // Rebuild calendar totals in one bounded block per month; repeated snapshots do not add sales twice.
  var months={};
  (snapshot.salesHistory || []).forEach(function(sale){var dt=parseDateHelper(sale.date);var key=getMonthYearTitle(dt);(months[key] || (months[key]=[])).push(sale);});
  Object.keys(months).forEach(function(key){
    var sheet=getOrCreateMonthlySalesSheet(ss,key), matrix=Array.from({length:16},function(){return Array(39).fill('');});
    months[key].forEach(function(sale){
      var row=buildAybarsSnapshotTables({salesHistory:[sale]})['SATIŞ DETAYLARI'][1];
      var col=getSalesColumnForDay(parseDateHelper(sale.date).getDate())-2, off=row[14]==='Fişli';
      function add(r,v){matrix[r-5][col]=Number(matrix[r-5][col] || 0)+Number(v || 0);}
      add(off?10:11,row[8]);add(7,row[9]);add(off?12:13,row[10]);add(9,row[12]);add(18,row[11]);
      if (row[6]==='Tahsilat') add(19,row[7]); else if (row[7]<0) add(20,-row[7]);
    });
    for (var day=1;day<=31;day++) {
      var idx=getSalesColumnForDay(day)-2, letter=getColumnLetter(idx+2);
      matrix[0][idx]='=SUM('+letter+'6:'+letter+'9)+'+letter+'18-'+letter+'19';
      matrix[1][idx]='='+letter+'10+'+letter+'11';matrix[3][idx]='='+letter+'12+'+letter+'13';
    }
    // Close stamps are rebuilt from the same authoritative snapshot.
    sheet.getRange(5,2,9,39).setValues(matrix.slice(0,9));
    sheet.getRange(18,2,3,39).setValues(matrix.slice(13,16));
    sheet.getRange(14,2,4,39).clearContent();
  });
  var expenseMonths={};
  (snapshot.expenses || []).forEach(function(e){var key=getMonthYearTitle(parseDateHelper(e.date));(expenseMonths[key] || (expenseMonths[key]=[])).push(e);});
  Object.keys(expenseMonths).forEach(function(key){
    var sheet=getOrCreateMonthlyExpenseSheet(ss,key,[]), major=[], daily=[];
    expenseMonths[key].forEach(function(e){
      var row=[e.date,e.subType || e.category || e.mainCategory || '',e.desc || '',Number(e.amount || 0),e.source || e.paymentMethod || '',e.hasInvoice || e.isInvoice?'Faturalı':'Faturasız'];
      (e.expenseType==='major'?major:daily).push(row);
    });
    var height=Math.max(1,sheet.getLastRow()-8,major.length,daily.length);
    if (height+8>sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(),height+8-sheet.getMaxRows());
    sheet.getRange(9,1,height,6).clearContent();sheet.getRange(9,8,height,6).clearContent();
    if (major.length) sheet.getRange(9,1,major.length,6).setValues(major);
    if (daily.length) sheet.getRange(9,8,daily.length,6).setValues(daily);
    recalculateExpenseSheetKPIs(sheet);
  });
  (snapshot.dailyCloseRecords || []).forEach(function(close){handleDailyClose(ss,close);});
  if (snapshot.financialOverview) {
    var f=snapshot.financialOverview;
    handleSyncTaxReport(ss,{date:getTodayFormatted(),time:getTimeFormatted(),officialSales:f.officialSales,
      invoicedPurchases:f.invoicedPurchases,expensesTotal:f.totalInvoicedDeductions,taxBase:f.officialTaxBase,
      collectedVat:f.officialCollectedVat,deductibleVat:f.totalDeductibleVat,payableVat:f.payableVat,
      estimatedIncomeTax:f.estimatedIncomeTax,netCashProfit:f.realProfit,totalCardSales:reports['AYLIK ÖZET'].slice(1).reduce(function(n,r){return n+Number(r[5] || 0);},0),riskAmount:Math.max(0,reports['AYLIK ÖZET'].slice(1).reduce(function(n,r){return n+Number(r[5] || 0);},0)-Number(f.invoicedPurchases || 0)),riskStatus:f.isHighRisk?'Yüksek Risk':'Güvenli'});
  }
}

function AYBARS_JSON_YEDEKTEN_TUM_RAPORLARI_AKTAR() {
  var ui=SpreadsheetApp.getUi();
  var response=ui.prompt('Tam rapor aktarımı','Drive’a yüklediğiniz Petshop_Yedek JSON dosyasının kimliğini girin. Bu işlem rapor sekmelerini yedekteki verilerle yeniler.',ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton()!==ui.Button.OK) return;
  var snapshot=JSON.parse(DriveApp.getFileById(response.getResponseText().trim()).getBlob().getDataAsString('UTF-8'));
  handleFullReportSnapshot(SpreadsheetApp.getActiveSpreadsheet(),snapshot);
  SpreadsheetApp.flush();
}

var TURKISH_MONTHS = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];

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
  var receiptSheet = null;
  var receiptRow = 0;
  var desktopRequest = false;
  
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

    var action = data.action || data.type || "";
    desktopRequest = Boolean(data.eventId) || action === "pos_probe";
    if (action === 'full_report_snapshot' && !desktopRequest) return createJsonResponse({status:'error',code:'auth',message:'Tam rapor aktarımı doğrulanmış mağaza bağlantısı gerektirir.'});
    var props = PropertiesService.getScriptProperties();
    var expectedKey = props.getProperty("POS_API_KEY");
    var expectedStore = props.getProperty("POS_STORE_ID");
    if (desktopRequest || expectedKey || expectedStore) {
      if (!expectedKey || !expectedStore || data.apiKey !== expectedKey || data.storeId !== expectedStore) {
        return createJsonResponse({status:"error", code:"auth", message:"Mağaza bağlantısı doğrulanamadı."});
      }
    }
    if (action === "pos_probe") {
      return createJsonResponse({status:"success", protocol:"aybars-desktop-v1", storeId:expectedStore});
    }
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (desktopRequest) {
      if (!/^[a-f0-9-]{36}$/.test(String(data.eventId))) {
        return createJsonResponse({status:"error", code:"invalid", message:"İşlem kimliği geçersiz."});
      }
      var allowed = ["save_sale","sale","sync_sale","refund","refund_sale","sale_refund",
        "save_expense","expense","sync_expense","sync_tax_report","tax_report","daily_close","close","full_report_snapshot",
        "reopen_daily_close","reopen_day","save_platform_income","platform_income","inventory_sync",
        "fix_calendar","refresh_calendar","refresh_structure","sync_calendar"];
      if (allowed.indexOf(action) === -1) return createJsonResponse({status:"error",code:"invalid"});
      receiptSheet = ss.getSheetByName("_AYBARS_SYNC");
      if (!receiptSheet) {
        receiptSheet = ss.insertSheet("_AYBARS_SYNC");
        receiptSheet.appendRow(["eventId","storeId","status","action","date"]);
        // An empty new spreadsheet may contain only this sheet; hide after other sheets exist.
        if (ss.getSheets().length > 1) receiptSheet.hideSheet();
      }
      var rows = receiptSheet.getLastRow() > 1
        ? receiptSheet.getRange(2,1,receiptSheet.getLastRow()-1,3).getValues() : [];
      for (var ri=0;ri<rows.length;ri++) {
        if (rows[ri][0] === data.eventId && rows[ri][1] === expectedStore) {
          receiptRow = ri+2;
          if (rows[ri][2] === "done") return desktopAck(data);
          if (rows[ri][2] !== "retry") return createJsonResponse({status:"error",code:"uncertain",
            message:"Önceki aktarım kontrol edilmeli. İşlem otomatik tekrarlanmadı."});
          break;
        }
      }
      if (!receiptRow) {
        receiptSheet.appendRow([data.eventId,expectedStore,"processing",action,new Date().toISOString()]);
        receiptRow=receiptSheet.getLastRow();
      } else receiptSheet.getRange(receiptRow,3).setValue("processing");
      SpreadsheetApp.flush();
    }
    deleteGunSonuKasaIfExists(ss);

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
      case "full_report_snapshot":
        handleFullReportSnapshot(ss, data.snapshot);
        break;

      case "fix_calendar":
      case "refresh_calendar":
      case "refresh_structure":
      case "sync_calendar":
        var allSheets = ss.getSheets();
        for (var si = 0; si < allSheets.length; si++) {
          var sNameU = allSheets[si].getName().toUpperCase();
          if (sNameU.indexOf("GELİR") !== -1 || sNameU.indexOf("GELIR") !== -1) {
            ensureSalesSheetStructure(allSheets[si]);
          }
        }
        break;

      default:
        break;
    }

    if (desktopRequest) {
      SpreadsheetApp.flush();
      receiptSheet.getRange(receiptRow,3).setValue("done");
      SpreadsheetApp.flush();
      return desktopAck(data);
    }
    return createJsonResponse({ status: "success", action: action, timestamp: new Date().toISOString() });

  } catch (err) {
    return createJsonResponse({status:"error", code:desktopRequest && receiptRow ? "uncertain" : "error",
      message:desktopRequest ? "Aktarım tamamlanamadı; işlem kaydını kontrol edin." : err.toString()});
  } finally {
    if (lockAcquired) {
      lock.releaseLock();
    }
  }
}

function desktopAck(data) {
  return createJsonResponse({status:"success",protocol:"aybars-desktop-v1",eventId:data.eventId,storeId:data.storeId});
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

/**
 * Kullanıcı talebi: 'Gün Sonu Kasa' sayfası kaldırıldı, tüm veriler GELİR sayfasına taşındı.
 * E-tabloda böyle bir sekme varsa kalıcı olarak siler.
 */
function deleteGunSonuKasaIfExists(ss) {
  if (!ss) return;
  try {
    var dcSheet = ss.getSheetByName("Gün Sonu Kasa");
    if (dcSheet) {
      ss.deleteSheet(dcSheet);
      Logger.log("'Gün Sonu Kasa' sayfası kullanıcı talebiyle e-tablodan silindi.");
    }
  } catch (e) {
    Logger.log("'Gün Sonu Kasa' silinirken: " + e);
  }
}

// ===================================================================
// 3. GELİR SAYFASI & HAFTALIK TAKVİM DÜZENİ (GELİR - AY YIL)
// ===================================================================

var DAY_NAMES_TR = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

function getMonthAndYearFromSheet(sheet, optTitle) {
  var sName = "";
  try {
    sName = ((sheet ? sheet.getName() : "") + " " + (optTitle || "") + " " + (sheet ? sheet.getRange("A1").getValue() : "")).toUpperCase();
  } catch (e) {
    sName = String(optTitle || "").toUpperCase();
  }

  var yearMatch = sName.match(/\b(20\d\d)\b/);
  var year = yearMatch ? parseInt(yearMatch[1], 10) : (new Date()).getFullYear();

  var monthMap = {
    "OCAK": 0, "ŞUBAT": 1, "SUBAT": 1, "MART": 2, "NİSAN": 3, "NISAN": 3,
    "MAYIS": 4, "HAZİRAN": 5, "HAZIRAN": 5, "TEMMUZ": 6, "AĞUSTOS": 7, "AGUSTOS": 7,
    "EYLÜL": 8, "EYLUL": 8, "EKİM": 9, "EKIM": 9, "KASIM": 10, "ARALIK": 11
  };

  var month = (new Date()).getMonth();
  for (var mKey in monthMap) {
    if (sName.indexOf(mKey) !== -1) {
      month = monthMap[mKey];
      break;
    }
  }

  return { month: month, year: year };
}

function getDayHeadersForWeek(startDay, endDay, month, year, daysInMonth) {
  var headers = [];
  for (var d = startDay; d <= endDay; d++) {
    if (d > daysInMonth) {
      headers.push("-\n-");
    } else {
      var dObj = new Date(year, month, d);
      var dayName = DAY_NAMES_TR[dObj.getDay()];
      var dd = (d < 10 ? "0" : "") + d;
      var mm = (month + 1 < 10 ? "0" : "") + (month + 1);
      var fullDateStr = dd + "." + mm + "." + year;
      headers.push(dayName + "\n" + fullDateStr);
    }
  }
  return headers;
}

function getOrCreateMonthlySalesSheet(ss, monthYearStr) {
  var sheetName = "GELİR - " + monthYearStr;
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    var sheets = ss.getSheets();
    var parts = String(monthYearStr || "").split(" ");
    var mName = (parts[0] || "").toUpperCase();
    var yName = parts[1] || "";

    // Sadece hedef Ay ve Yıl'ı içeren sekmeyi ara (Örn: 'GELİR - EKİM 2026')
    if (mName && yName) {
      for (var i = 0; i < sheets.length; i++) {
        var sNameUpper = sheets[i].getName().toUpperCase();
        if ((sNameUpper.indexOf("GELİR") !== -1 || sNameUpper.indexOf("GELIR") !== -1) &&
            sNameUpper.indexOf(mName) !== -1 &&
            sNameUpper.indexOf(yName) !== -1) {
          sheet = sheets[i];
          break;
        }
      }
    }
  }

  // Hedef aya ait sekme henüz yoksa, otomatik olarak yeni sekme aç
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.setTabColor("#10b981");
    buildMonthlySalesSheetTemplate(sheet, monthYearStr);
  }

  ensureSalesSheetStructure(sheet);
  return sheet;
}

function buildMonthlySalesSheetTemplate(sheet, monthYearStr) {
  // Keep the title outside frozen column A so native Sheets accepts the merge.
  sheet.getRange("A1").setValue("AYBARS POS").setFontWeight("bold");
  sheet.getRange("B1:AQ1").merge()
    .setValue("AYBARS PETSHOP — " + monthYearStr + " GELİR TAKVİMİ (HAFTALIK / GÜNLÜK BLOK DÜZENİ)")
    .setBackground("#064e3b")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(12)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 35);

  var myInfo = getMonthAndYearFromSheet(sheet, monthYearStr);
  var month = myInfo.month;
  var year = myInfo.year;
  var daysInMonth = new Date(year, month + 1, 0).getDate();

  sheet.getRange("B2:H2").merge().setValue("📅 1. HAFTA (GÜN 01 - 07)").setBackground("#047857").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
  sheet.getRange("J2:P2").merge().setValue("📅 2. HAFTA (GÜN 08 - 14)").setBackground("#047857").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
  sheet.getRange("R2:X2").merge().setValue("📅 3. HAFTA (GÜN 15 - 21)").setBackground("#047857").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
  sheet.getRange("Z2:AF2").merge().setValue("📅 4. HAFTA (GÜN 22 - 28)").setBackground("#047857").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
  sheet.getRange("AH2:AN2").merge().setValue("📅 5. HAFTA (GÜN 29 - " + daysInMonth + ")").setBackground("#047857").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
  sheet.getRange("AP2:AQ2").merge().setValue("🏆 AYLIK GELİR TOPLAMI").setBackground("#0f172a").setFontColor("#38bdf8").setFontWeight("bold").setHorizontalAlignment("center");
  sheet.setRowHeight(2, 24);

  sheet.getRange("B3:H3").merge().setFormula("=SUM(B5:H5)").setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#34d399").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.getRange("J3:P3").merge().setFormula("=SUM(J5:P5)").setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#34d399").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.getRange("R3:X3").merge().setFormula("=SUM(R5:X5)").setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#34d399").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.getRange("Z3:AF3").merge().setFormula("=SUM(Z5:AF5)").setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#34d399").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.getRange("AH3:AN3").merge().setFormula("=SUM(AH5:AN5)").setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#34d399").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.getRange("AP3:AQ3").merge().setFormula("=B3+J3+R3+Z3+AH3").setNumberFormat("₺#,##0.00").setBackground("#064e3b").setFontColor("#fef08a").setFontWeight("bold").setFontSize(13).setHorizontalAlignment("center");
  sheet.setRowHeight(3, 28);

  // Gün Başlıkları (Gerçek Takvim Matematiği: Gün Adı ve Altında Tam Tarih: Örn: Cmt \n 19.09.2026, Paz \n 20.09.2026)
  var daysW1 = getDayHeadersForWeek(1, 7, month, year, daysInMonth);
  var daysW2 = getDayHeadersForWeek(8, 14, month, year, daysInMonth);
  var daysW3 = getDayHeadersForWeek(15, 21, month, year, daysInMonth);
  var daysW4 = getDayHeadersForWeek(22, 28, month, year, daysInMonth);
  var daysW5 = getDayHeadersForWeek(29, 35, month, year, daysInMonth);

  sheet.getRange(4, 2, 1, 7).setValues([daysW1]).setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold").setFontSize(8.5).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  sheet.getRange(4, 10, 1, 7).setValues([daysW2]).setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold").setFontSize(8.5).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  sheet.getRange(4, 18, 1, 7).setValues([daysW3]).setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold").setFontSize(8.5).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  sheet.getRange(4, 26, 1, 7).setValues([daysW4]).setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold").setFontSize(8.5).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  sheet.getRange(4, 34, 1, 7).setValues([daysW5]).setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold").setFontSize(8.5).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  sheet.setRowHeight(4, 34);

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
  return {
    total: 5,            // 💰 GÜN TOPLAMI (CİRO)
    totalCash: 6,        // 💵 TOPLAM NAKİT
    card: 7,             // 💳 TOPLAM KREDİ KARTI
    totalTransfer: 8,    // 📲 TOPLAM HAVALE
    platform: 9,         // 📦 TOPLAM ONLİNE
    officialCash: 10,    // 🧾 Toplam Fişli Nakit
    unoffCash: 11,       // 📝 Toplam Fişsiz Nakit
    officialTransfer: 12,// 🧾 Toplam Fişli Havale
    unoffTransfer: 13,   // 🏦 Toplam Fişsiz Havale
    closeTime: 14,       // 🏁 Kapanış Saati
    countedCash: 15,     // 💵 Sayılan Kasa Nakit
    cashDiff: 16,        // ⚖️ Kasa Farkı
    reconcileStatus: 17, // 🏷️ Mutabakat Durumu
    credit: 18,
    collections: 19,
    refunds: 20
  };
}

function ensureSalesSheetStructure(sheet) {
  var rowMap = getSalesRowMap(sheet);
  sheet.getRange(rowMap.credit, 1).setValue('Veresiye Satış (Net)');
  sheet.getRange(rowMap.collections, 1).setValue('Eski Borç Tahsilatı');
  sheet.getRange(rowMap.refunds, 1).setValue('İade Tutarı');
  sheet.getRange(18,1,3,40).setFontSize(10).setNumberFormat('₺#,##0.00');

  // A Sütunu Başlıkları (Kullanıcının talep ettiği satır başlıkları ve standart düzen)
  sheet.getRange(rowMap.total, 1).setValue("💰 GÜN TOPLAMI").setFontSize(9).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#065f46").setFontColor("#a7f3d0");
  sheet.getRange(rowMap.totalCash, 1).setValue("💵 TOPLAM NAKİT").setFontSize(9).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#dcfce7").setFontColor("#15803d");
  sheet.getRange(rowMap.card, 1).setValue("💳 TOPLAM KREDİ KARTI").setFontSize(9).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#eff6ff").setFontColor("#1d4ed8");
  sheet.getRange(rowMap.totalTransfer, 1).setValue("📲 TOPLAM HAVALE").setFontSize(9).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#f0f9ff").setFontColor("#0369a1");
  sheet.getRange(rowMap.platform, 1).setValue("📦 TOPLAM ONLİNE").setFontSize(9).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#faf5ff").setFontColor("#7e22ce");
  sheet.getRange(rowMap.officialCash, 1).setValue("🧾 Toplam Fişli Nakit").setFontSize(8.5).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#f0fdf4").setFontColor("#166534");
  sheet.getRange(rowMap.unoffCash, 1).setValue("📝 Toplam Fişsiz Nakit").setFontSize(8.5).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#fefce8").setFontColor("#854d0e");
  sheet.getRange(rowMap.officialTransfer, 1).setValue("🧾 Toplam Fişli Havale").setFontSize(8.5).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#f0f9ff").setFontColor("#075985");
  sheet.getRange(rowMap.unoffTransfer, 1).setValue("🏦 Toplam Fişsiz Havale").setFontSize(8.5).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#f8fafc").setFontColor("#475569");
  sheet.getRange(rowMap.closeTime, 1).setValue("🏁 Kapanış Saati").setFontSize(8.5).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#1e293b").setFontColor("#f8fafc");
  sheet.getRange(rowMap.countedCash, 1).setValue("💵 Sayılan Kasa Nakit").setFontSize(8.5).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#f1f5f9").setFontColor("#0f172a");
  sheet.getRange(rowMap.cashDiff, 1).setValue("⚖️ Kasa Farkı").setFontSize(8.5).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#f1f5f9").setFontColor("#0f172a");
  sheet.getRange(rowMap.reconcileStatus, 1).setValue("🏷️ Mutabakat Durumu").setFontSize(8.5).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#f8fafc").setFontColor("#334155");

  sheet.setRowHeight(rowMap.total, 24);
  sheet.setRowHeight(rowMap.totalCash, 22);
  sheet.setRowHeight(rowMap.card, 22);
  sheet.setRowHeight(rowMap.totalTransfer, 22);
  sheet.setRowHeight(rowMap.platform, 22);
  sheet.setRowHeight(rowMap.officialCash, 20);
  sheet.setRowHeight(rowMap.unoffCash, 20);
  sheet.setRowHeight(rowMap.officialTransfer, 20);
  sheet.setRowHeight(rowMap.unoffTransfer, 20);
  sheet.setRowHeight(rowMap.closeTime, 20);
  sheet.setRowHeight(rowMap.countedCash, 20);
  sheet.setRowHeight(rowMap.cashDiff, 20);
  sheet.setRowHeight(rowMap.reconcileStatus, 20);
  sheet.setColumnWidth(1, 160);

  // Gün başlıklarını (Row 4) ve tam tarihleri gerçek takvim matematiğiyle güncelle (Örn: Cmt \n 19.09.2026, Paz \n 20.09.2026)
  try {
    var myInfo = getMonthAndYearFromSheet(sheet);
    var month = myInfo.month;
    var year = myInfo.year;
    var daysInMonth = new Date(year, month + 1, 0).getDate();

    var daysW1 = getDayHeadersForWeek(1, 7, month, year, daysInMonth);
    var daysW2 = getDayHeadersForWeek(8, 14, month, year, daysInMonth);
    var daysW3 = getDayHeadersForWeek(15, 21, month, year, daysInMonth);
    var daysW4 = getDayHeadersForWeek(22, 28, month, year, daysInMonth);
    var daysW5 = getDayHeadersForWeek(29, 35, month, year, daysInMonth);

    sheet.getRange(4, 2, 1, 7).setValues([daysW1]).setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold").setFontSize(8.5).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
    sheet.getRange(4, 10, 1, 7).setValues([daysW2]).setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold").setFontSize(8.5).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
    sheet.getRange(4, 18, 1, 7).setValues([daysW3]).setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold").setFontSize(8.5).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
    sheet.getRange(4, 26, 1, 7).setValues([daysW4]).setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold").setFontSize(8.5).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
    sheet.getRange(4, 34, 1, 7).setValues([daysW5]).setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold").setFontSize(8.5).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
    sheet.setRowHeight(4, 34);

    // Ayın son gününü aşan kolonları pasife al
    for (var col = 34; col <= 40; col++) {
      var dNum = 29 + (col - 34);
      if (dNum > daysInMonth) {
        sheet.getRange(4, col).setValue("-\n-").setBackground("#334155").setFontColor("#94a3b8");
      }
    }
  } catch (hdrErr) {
    Logger.log("ensureSalesSheetStructure header update error: " + hdrErr);
  }

  // Hafta toplamları ve Aylık Gelir Toplamını hatasız formülle bağla
  sheet.getRange("B3:H3").merge().setFormula("=SUM(B5:H5)").setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#34d399").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.getRange("J3:P3").merge().setFormula("=SUM(J5:P5)").setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#34d399").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.getRange("R3:X3").merge().setFormula("=SUM(R5:X5)").setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#34d399").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.getRange("Z3:AF3").merge().setFormula("=SUM(Z5:AF5)").setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#34d399").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.getRange("AH3:AN3").merge().setFormula("=SUM(AH5:AN5)").setNumberFormat("₺#,##0.00").setBackground("#0f172a").setFontColor("#34d399").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.getRange("AP3:AQ3").merge().setFormula("=B3+J3+R3+Z3+AH3").setNumberFormat("₺#,##0.00").setBackground("#064e3b").setFontColor("#fef08a").setFontWeight("bold").setFontSize(13).setHorizontalAlignment("center");

  function applyDayFormulas(startCol, count) {
    for (var c = 0; c < count; c++) {
      var colIdx = startCol + c;
      var colLetter = getColumnLetter(colIdx);

      // Row 6: Toplam Nakit = Fişli Nakit (Row 10) + Fişsiz Nakit (Row 11)
      sheet.getRange(rowMap.totalCash, colIdx)
        .setFormula("=" + colLetter + rowMap.officialCash + "+" + colLetter + rowMap.unoffCash)
        .setNumberFormat("₺#,##0.00")
        .setFontWeight("bold")
        .setFontSize(9)
        .setHorizontalAlignment("right")
        .setBackground("#dcfce7")
        .setFontColor("#15803d");

      // Row 8: Toplam Havale = Fişli Havale (Row 12) + Fişsiz Havale (Row 13)
      sheet.getRange(rowMap.totalTransfer, colIdx)
        .setFormula("=" + colLetter + rowMap.officialTransfer + "+" + colLetter + rowMap.unoffTransfer)
        .setNumberFormat("₺#,##0.00")
        .setFontWeight("bold")
        .setFontSize(9)
        .setHorizontalAlignment("right")
        .setBackground("#f0f9ff")
        .setFontColor("#0369a1");

      // Row 5: Gün Toplamı = Toplam Nakit (6) + Toplam Kredi Kartı (7) + Toplam Havale (8) + Toplam Online (9)
      sheet.getRange(rowMap.total, colIdx)
        .setFormula("=SUM(" + colLetter + rowMap.totalCash + ":" + colLetter + rowMap.platform + ")+" + colLetter + rowMap.credit + "-" + colLetter + rowMap.collections)
        .setNumberFormat("₺#,##0.00")
        .setBackground("#065f46")
        .setFontColor("#a7f3d0")
        .setFontWeight("bold")
        .setFontSize(9.5)
        .setHorizontalAlignment("center");

      // Diğer veri hücreleri sayı formatları
      sheet.getRange(rowMap.card, colIdx).setNumberFormat("₺#,##0.00").setFontWeight("bold").setHorizontalAlignment("right");
      sheet.getRange(rowMap.platform, colIdx).setNumberFormat("₺#,##0.00").setFontWeight("bold").setHorizontalAlignment("right");
      sheet.getRange(rowMap.officialCash, colIdx).setNumberFormat("₺#,##0.00").setFontWeight("bold").setHorizontalAlignment("right");
      sheet.getRange(rowMap.unoffCash, colIdx).setNumberFormat("₺#,##0.00").setFontWeight("bold").setHorizontalAlignment("right");
      sheet.getRange(rowMap.officialTransfer, colIdx).setNumberFormat("₺#,##0.00").setFontWeight("bold").setHorizontalAlignment("right");
      sheet.getRange(rowMap.unoffTransfer, colIdx).setNumberFormat("₺#,##0.00").setFontWeight("bold").setHorizontalAlignment("right");

      // Gün sonu kasa alanları formatları
      sheet.getRange(rowMap.closeTime, colIdx).setNumberFormat("@").setHorizontalAlignment("center").setFontSize(8.5);
      sheet.getRange(rowMap.countedCash, colIdx).setNumberFormat("₺#,##0.00").setFontWeight("bold").setHorizontalAlignment("right");
      sheet.getRange(rowMap.cashDiff, colIdx).setNumberFormat("₺#,##0.00").setFontWeight("bold").setHorizontalAlignment("right");
      sheet.getRange(rowMap.reconcileStatus, colIdx).setNumberFormat("@").setHorizontalAlignment("center").setFontSize(8.5);
    }
  }

  applyDayFormulas(2, 7);
  applyDayFormulas(10, 7);
  applyDayFormulas(18, 7);
  applyDayFormulas(26, 7);
  applyDayFormulas(34, 7);

  // Varsa bozuk hata hücrelerini ve Kapanış Saati'ndeki eski test kalıntılarını temizle
  try {
    for (var col = 2; col <= 40; col++) {
      if (col === 9 || col === 17 || col === 25 || col === 33) continue;

      // Kapanış Saati satırında (Row 14) eski tablodan kalan para kalıntısı varsa temizle
      var cTimeVal = sheet.getRange(rowMap.closeTime, col).getValue();
      if (typeof cTimeVal === "number" || (typeof cTimeVal === "string" && (cTimeVal.indexOf("₺") !== -1 || cTimeVal.indexOf("TL") !== -1))) {
        sheet.getRange(rowMap.closeTime, col).clearContent();
        var recVal = sheet.getRange(rowMap.reconcileStatus, col).getValue();
        if (!recVal || String(recVal).trim() === "") {
          sheet.getRange(rowMap.countedCash, col).clearContent();
          sheet.getRange(rowMap.cashDiff, col).clearContent();
        }
      }

      var vals = sheet.getRange(5, col, 13, 1).getValues();
      for (var r = 0; r < vals.length; r++) {
        var vStr = String(vals[r][0] || "");
        if (vStr.indexOf("#ERROR") !== -1 || vStr.indexOf("#VALUE") !== -1 || vStr.indexOf("#N/A") !== -1 || vStr.indexOf("#REF") !== -1) {
          if (r + 5 === rowMap.totalCash) {
            var colLet = getColumnLetter(col);
            sheet.getRange(r + 5, col).setFormula("=" + colLet + rowMap.officialCash + "+" + colLet + rowMap.unoffCash);
          } else if (r + 5 === rowMap.totalTransfer) {
            var colLet = getColumnLetter(col);
            sheet.getRange(r + 5, col).setFormula("=" + colLet + rowMap.officialTransfer + "+" + colLet + rowMap.unoffTransfer);
          } else if (r + 5 === rowMap.total) {
            var colLet = getColumnLetter(col);
            sheet.getRange(r + 5, col).setFormula("=SUM(" + colLet + rowMap.totalCash + ":" + colLet + rowMap.platform + ")+" + colLet + rowMap.credit + "-" + colLet + rowMap.collections);
          } else {
            sheet.getRange(r + 5, col).setValue(0);
          }
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
  deleteGunSonuKasaIfExists(ss);

  var dateObj = parseDateHelper(data.date);
  var monthYearStr = getMonthYearTitle(dateObj);
  var sheet = getOrCreateMonthlySalesSheet(ss, monthYearStr);

  var dayNum = dateObj.getDate();
  var targetCol = getSalesColumnForDay(dayNum);

  var totalAmt = Number(data.total || 0);
  var creditAmt = Number(data.creditSales || 0);
  var isCollection = /tahsilat/i.test(data.channel || '') || data.isCollection === true;
  if (!creditAmt && /veresiye/i.test(data.paymentType || '') && !isCollection) creditAmt = totalAmt;
  var cardAmt = Number(data.cardSales || 0);
  var cashAmt = Number(data.cashSales || 0);
  var transferAmt = Number(data.transferSales || 0);
  var platformAmt = Number(data.platformSales || 0);
  var isOfficial = (data.isOfficial === true || data.isOfficial === "true");

  var officialCash = Number(data.officialCash !== undefined ? data.officialCash : (isOfficial ? cashAmt : 0));
  var unoffCash = Number(data.unoffCash !== undefined ? data.unoffCash : (!isOfficial ? cashAmt : 0));
  var officialTransfer = Number(data.officialTransfer !== undefined ? data.officialTransfer : (isOfficial ? transferAmt : 0));
  var unoffTransfer = Number(data.unoffTransfer !== undefined ? data.unoffTransfer : (!isOfficial ? transferAmt : 0));

  if (cardAmt === 0 && cashAmt === 0 && transferAmt === 0 && platformAmt === 0 && !/veresiye/i.test(data.paymentType || "")) {
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
  if (creditAmt) sheet.getRange(rowMap.credit,targetCol).setValue(safeParseMoney(sheet.getRange(rowMap.credit,targetCol).getValue())+creditAmt);
  if (isCollection) sheet.getRange(rowMap.collections,targetCol).setValue(safeParseMoney(sheet.getRange(rowMap.collections,targetCol).getValue())+totalAmt);
  if (totalAmt < 0 && !isCollection) sheet.getRange(rowMap.refunds,targetCol).setValue(safeParseMoney(sheet.getRange(rowMap.refunds,targetCol).getValue())-totalAmt);

  // 🧾 Fişli Nakit Ekleme (Doğrudan hücre toplamına eklenir, not veya satır spam'i yapılmaz)
  if (officialCash !== 0) {
    var curOffCash = safeParseMoney(sheet.getRange(rowMap.officialCash, targetCol).getValue());
    sheet.getRange(rowMap.officialCash, targetCol).setValue(curOffCash + officialCash);
  }

  // 📝 Fişsiz Nakit Ekleme
  if (unoffCash !== 0) {
    var curUnoffCash = safeParseMoney(sheet.getRange(rowMap.unoffCash, targetCol).getValue());
    sheet.getRange(rowMap.unoffCash, targetCol).setValue(curUnoffCash + unoffCash);
  }

  // 💳 Toplam Kredi Kartı Ekleme
  if (cardAmt !== 0) {
    var curCard = safeParseMoney(sheet.getRange(rowMap.card, targetCol).getValue());
    sheet.getRange(rowMap.card, targetCol).setValue(curCard + cardAmt);
  }

  // 🧾 Fişli Havale Ekleme
  if (officialTransfer !== 0) {
    var curOffTrans = safeParseMoney(sheet.getRange(rowMap.officialTransfer, targetCol).getValue());
    sheet.getRange(rowMap.officialTransfer, targetCol).setValue(curOffTrans + officialTransfer);
  }

  // 🏦 Fişsiz Havale Ekleme
  if (unoffTransfer !== 0) {
    var curUnoffTrans = safeParseMoney(sheet.getRange(rowMap.unoffTransfer, targetCol).getValue());
    sheet.getRange(rowMap.unoffTransfer, targetCol).setValue(curUnoffTrans + unoffTransfer);
  }

  // 📦 Toplam Online Ekleme
  if (platformAmt !== 0) {
    var curPlat = safeParseMoney(sheet.getRange(rowMap.platform, targetCol).getValue());
    sheet.getRange(rowMap.platform, targetCol).setValue(curPlat + platformAmt);
  }

  // Formülleri Garantiye Al
  var colLetter = getColumnLetter(targetCol);
  sheet.getRange(rowMap.totalCash, targetCol).setFormula("=" + colLetter + rowMap.officialCash + "+" + colLetter + rowMap.unoffCash);
  sheet.getRange(rowMap.totalTransfer, targetCol).setFormula("=" + colLetter + rowMap.officialTransfer + "+" + colLetter + rowMap.unoffTransfer);
  sheet.getRange(rowMap.total, targetCol).setFormula("=SUM(" + colLetter + rowMap.totalCash + ":" + colLetter + rowMap.platform + ")+" + colLetter + rowMap.credit + "-" + colLetter + rowMap.collections);
  SpreadsheetApp.flush();

  if (data.officialSales !== undefined || data.taxBase !== undefined) {
    handleSyncTaxReport(ss, data);
  }
}

function handleSavePlatformIncome(ss, data) {
  deleteGunSonuKasaIfExists(ss);

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
  sheet.getRange(rowMap.total, targetCol).setFormula("=SUM(" + colLetter + rowMap.totalCash + ":" + colLetter + rowMap.platform + ")+" + colLetter + rowMap.credit + "-" + colLetter + rowMap.collections);
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
    .setValue("Son Güncelleme: " + dateStr + " " + timeStr + " | Uygulama varsayımlarıyla tahmini rapor; resmi beyanname değildir")
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
    ["📊 Kartlı Satış Hacmi", cardSalesAmt, "Uygulamada kart olarak kaydedilen satışlar"],
    ["📦 Faturalı Giriş Hacmi", invoicedPurchasesAmt, "Uygulamada faturalı işaretlenen alımlar"],
    ["⚠️ Riskli Satış Hacmi", riskAmt, riskAmt > 0 ? "⚠️ Kartlı satış faturalı stoğu aşıyor!" : "✅ Kartlı satışlar faturalı alımla güvende"],
    ["Kayıt Karşılaştırması", isHighRisk ? "YÜKSEK RİSK" : "GÜVENLİ", isHighRisk ? "Kayıtlı tutarlar arasında fark var; kayıtlar kontrol edilmeli." : "Stok faturalı alımlarla tam uyumlu"]
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
  deleteGunSonuKasaIfExists(ss);

  // GELİR - [AY YIL] sayfasına gün sütununun altına kapanış detaylarını damgala (Zero-Error)
  try {
    var dateObj = parseDateHelper(data.date);
    var monthYearStr = getMonthYearTitle(dateObj);
    var salesSheet = getOrCreateMonthlySalesSheet(ss, monthYearStr);
    var dayNum = dateObj.getDate();
    var targetCol = getSalesColumnForDay(dayNum);
    var rowMap = getSalesRowMap(salesSheet);

    var actualCash = Number(data.actualCash !== undefined ? data.actualCash : 0);
    var diff = Number(data.difference !== undefined ? data.difference : 0);
    var closeTime = data.time || getTimeFormatted();

    var diffStatus = "✅ Tam Mutabakat";
    var diffBg = "#dcfce7";
    var diffColor = "#166534";
    if (diff > 0.01) {
      diffStatus = "📈 +" + diff.toFixed(2) + " TL Fazla";
      diffBg = "#dbeafe";
      diffColor = "#1e40af";
    } else if (diff < -0.01) {
      diffStatus = "⚠️ " + diff.toFixed(2) + " TL Açık";
      diffBg = "#fee2e2";
      diffColor = "#991b1b";
    }

    // Gün sonu verildiğinde günün nihai kategori toplamlarını doğrudan ilgili satırlara mühürle
    if (data.officialCash !== undefined) salesSheet.getRange(rowMap.officialCash, targetCol).setValue(Number(data.officialCash || 0));
    if (data.unoffCash !== undefined) salesSheet.getRange(rowMap.unoffCash, targetCol).setValue(Number(data.unoffCash || 0));
    if (data.cardSales !== undefined) salesSheet.getRange(rowMap.card, targetCol).setValue(Number(data.cardSales || 0));
    if (data.officialTransfer !== undefined) salesSheet.getRange(rowMap.officialTransfer, targetCol).setValue(Number(data.officialTransfer || 0));
    if (data.unoffTransfer !== undefined) salesSheet.getRange(rowMap.unoffTransfer, targetCol).setValue(Number(data.unoffTransfer || 0));
    if (data.platformSales !== undefined) salesSheet.getRange(rowMap.platform, targetCol).setValue(Number(data.platformSales || 0));

    // Row 14: Kapanış Saati
    salesSheet.getRange(rowMap.closeTime, targetCol)
      .setValue(closeTime)
      .setNumberFormat("@")
      .setFontSize(8.5)
      .setHorizontalAlignment("center")
      .setFontColor("#0f172a")
      .setBackground("#f8fafc");

    // Row 15: Sayılan Kasa Nakit
    salesSheet.getRange(rowMap.countedCash, targetCol)
      .setValue(actualCash)
      .setNumberFormat("₺#,##0.00")
      .setFontWeight("bold")
      .setHorizontalAlignment("right")
      .setFontColor("#15803d")
      .setBackground("#f0fdf4");

    // Row 16: Kasa Farkı
    salesSheet.getRange(rowMap.cashDiff, targetCol)
      .setValue(diff)
      .setNumberFormat("₺#,##0.00")
      .setFontWeight("bold")
      .setHorizontalAlignment("right")
      .setFontColor(diff < -0.01 ? "#dc2626" : (diff > 0.01 ? "#1e40af" : "#166534"))
      .setBackground("#f8fafc");

    // Row 17: Mutabakat Durumu
    salesSheet.getRange(rowMap.reconcileStatus, targetCol)
      .setValue(diffStatus)
      .setNumberFormat("@")
      .setFontSize(8.5)
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setFontColor(diffColor)
      .setBackground(diffBg);

    // Gün toplamı formüllerini garantiye al
    var colLetter = getColumnLetter(targetCol);
    salesSheet.getRange(rowMap.totalCash, targetCol).setFormula("=" + colLetter + rowMap.officialCash + "+" + colLetter + rowMap.unoffCash);
    salesSheet.getRange(rowMap.totalTransfer, targetCol).setFormula("=" + colLetter + rowMap.officialTransfer + "+" + colLetter + rowMap.unoffTransfer);
    salesSheet.getRange(rowMap.total, targetCol)
      .setFormula("=SUM(" + colLetter + rowMap.totalCash + ":" + colLetter + rowMap.platform + ")+" + colLetter + rowMap.credit + "-" + colLetter + rowMap.collections)
      .setNumberFormat("₺#,##0.00")
      .setHorizontalAlignment("center")
      .setFontWeight("bold")
      .setBackground("#065f46")
      .setFontColor("#a7f3d0");

    SpreadsheetApp.flush();
    return { success: true, message: "Gün sonu kapanışı GELİR sayfasına başarıyla işlendi." };
  } catch (syncErr) {
    Logger.log("GELİR sayfasına gün sonu yazılırken hata: " + syncErr);
    return { success: false, error: String(syncErr) };
  }
}

function handleReopenDailyClose(ss, data) {
  deleteGunSonuKasaIfExists(ss);

  var targetDate = data.date || getTodayFormatted();

  // GELİR sayfasındaki gün sonu kapanış detaylarını temizle
  try {
    var dateObj = parseDateHelper(targetDate);
    var monthYearStr = getMonthYearTitle(dateObj);
    var salesSheet = getOrCreateMonthlySalesSheet(ss, monthYearStr);
    if (salesSheet) {
      var dayNum = dateObj.getDate();
      var targetCol = getSalesColumnForDay(dayNum);
      var rowMap = getSalesRowMap(salesSheet);
      salesSheet.getRange(rowMap.closeTime, targetCol).clearContent().setBackground(null);
      salesSheet.getRange(rowMap.countedCash, targetCol).clearContent().setBackground(null);
      salesSheet.getRange(rowMap.cashDiff, targetCol).clearContent().setBackground(null);
      salesSheet.getRange(rowMap.reconcileStatus, targetCol).clearContent().setBackground(null);
    }
    SpreadsheetApp.flush();
    return { success: true, message: "Günü geri açma başarılı." };
  } catch (syncErr) {
    Logger.log("GELİR sayfasından gün sonu bilgileri temizlenirken hata: " + syncErr);
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
 * Gün Sonu Kasa sayfasını kaldırır ve tüm GELİR sayfalarını 13 satırlı yeni formata geçirir.
 */
function repairEverything() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  deleteGunSonuKasaIfExists(ss);
  
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
  
  Logger.log("✅ Tüm GELİR sayfaları 13 satırlı yeni formata geçirildi ve #ERROR! formülleri düzeltildi!");
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
      Number(p.buyPrice !== undefined ? p.buyPrice : (p.cost || 0)),
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
        s.getRange(6, col, 12, 1).clearContent();
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


// === FULL SNAPSHOT REPORT BUILDER (shared with js/report-tables.js) ===
/* Pure report builder shared with the bound Apps Script snapshot importer. */
function buildAybarsSnapshotTables(data) {
  function num(v) { return Number.isFinite(Number(v)) ? Number(v) : 0; }
  function money(v) { return Math.round((v + Number.EPSILON) * 100) / 100; }
  function date(v) {
    var s=String(v || '').split('T')[0], m=/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
    return m ? m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0') : s;
  }
  function clean(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return JSON.stringify(v, function(k,val) { return /invoiceImage|invoiceFile|imageBase64/i.test(k) ? '[Görsel yedek dosyasında]' : val; }).slice(0,45000);
    return v;
  }
  var groups={}, items={}, sales=[], issues=[];
  (data.salesHistory || []).forEach(function(s) {
    var day=date(s.date), total=num(s.total), refund=s.isRefund === true || total < 0;
    var collection=s.isCollection === true || /tahsilat/i.test((s.channel || '')+' '+(s.paymentType || ''));
    var cash=num(s.splitCash), card=num(s.splitCard), transfer=num(s.splitTransfer), credit=num(s.splitCredit), platform=num(s.platformSales);
    if (Math.abs(cash+card+transfer+credit+platform) < .001 && Math.abs(total) > .001) {
      var payment=String(s.paymentType || '').toLocaleLowerCase('tr-TR');
      if (payment.indexOf('parçalı')>=0) issues.push([s.id,day,'Parçalı ödeme dağılımı eksik']);
      else if (payment.indexOf('veresiye')>=0) credit=total;
      else if (payment.indexOf('nakit')>=0) cash=total;
      else if (/havale|iban|banka|eft/.test(payment)) transfer=total;
      else if (/platform|getir|yemeksepeti/.test(payment)) platform=total;
      else if (/kart/.test(payment)) card=total;
      else issues.push([s.id,day,'Ödeme yöntemi bilinmiyor']);
    }
    if (Math.abs(cash+card+transfer+credit+platform-total)>.02) issues.push([s.id,day,'Ödeme dağılımı satış toplamıyla uyuşmuyor']);
    var g=groups[day] || (groups[day]={gross:0,refunds:0,net:0,cash:0,card:0,transfer:0,credit:0,platform:0,vat:0,count:0,collections:0,expenses:0});
    if (collection) g.collections+=total;
    else {
      g.gross+=Math.max(0,total);g.refunds+=Math.max(0,-total);g.net+=total;
      g.cash+=cash;g.card+=card;g.transfer+=transfer;g.credit+=credit;g.platform+=platform;g.vat+=num(s.vatTotal);g.count+=refund?0:1;
      (s.soldItems || []).forEach(function(p) {
        var key=String(p.id), row=items[key] || (items[key]={id:p.id,name:p.name,qty:0,amount:0,cost:0,missingCost:false});
        row.qty+=num(p.qty);row.amount+=num(p.qty)*num(p.customPrice === undefined ? p.price : p.customPrice);
        row.cost+=num(p.qty)*num(p.cost); if (!num(p.cost)) row.missingCost=true;
      });
    }
    sales.push([s.id,day,s.time || '',s.customerName || '',s.channel || '',s.paymentType || '',collection?'Tahsilat':refund?'İade':'Satış',total,cash,card,transfer,credit,platform,num(s.vatTotal),s.isOfficial === true?'Fişli':s.isOfficial === false?'Fişsiz':'Belirsiz',s.originalSaleId || '',s.itemsSummary || '',clean(s.soldItems)]);
  });
  (data.expenses || []).forEach(function(e) {
    var day=date(e.date), g=groups[day] || (groups[day]={gross:0,refunds:0,net:0,cash:0,card:0,transfer:0,credit:0,platform:0,vat:0,count:0,collections:0,expenses:0});
    g.expenses+=num(e.amount);
  });
  var headers=['Tarih','Brüt Satış','İade Tutarı','Net Ciro','Nakit Satış (Net)','Kart Satışı (Net)','Havale (Net)','Veresiye Satış (Net)','Platform (Net)','Satış KDV (Net)','Satış İşlem Sayısı','Borç Tahsilatı','Kayıtlı Gider'];
  var months={}, daily=Object.keys(groups).sort().map(function(day) {
    var g=groups[day], month=day.slice(0,7), m=months[month] || (months[month]={gross:0,refunds:0,net:0,cash:0,card:0,transfer:0,credit:0,platform:0,vat:0,count:0,collections:0,expenses:0});
    Object.keys(g).forEach(function(k) {m[k]+=g[k];});
    return [day,g.gross,g.refunds,g.net,g.cash,g.card,g.transfer,g.credit,g.platform,g.vat,g.count,g.collections,g.expenses].map(function(v){return typeof v==='number'?money(v):v;});
  });
  var monthly=Object.keys(months).sort().map(function(month){var g=months[month];return [month,g.gross,g.refunds,g.net,g.cash,g.card,g.transfer,g.credit,g.platform,g.vat,g.count,g.collections,g.expenses].map(function(v){return typeof v==='number'?money(v):v;});});
  var reports={
    'GÜNLÜK ÖZET':[headers].concat(daily),
    'AYLIK ÖZET':[['Ay'].concat(headers.slice(1))].concat(monthly),
    'SATIŞ DETAYLARI':[['İşlem ID','Tarih','Saat','Müşteri','Kanal','Ödeme','İşlem Türü','Toplam','Nakit','Kart','Havale','Veresiye','Platform','KDV','Fiş Durumu','Eski Satış ID','Ürün Özeti','Ürün Satırları']].concat(sales),
    'ÜRÜN SATIŞ ÖZETİ':[['Ürün ID','Ürün Adı','Net Satılan Adet','Net Satış Tutarı','Kayıtlı Maliyet','Tahmini Brüt Kâr','Maliyet Kontrolü']].concat(Object.keys(items).map(function(k){var r=items[k];return [r.id,r.name,r.qty,money(r.amount),money(r.cost),money(r.amount-r.cost),r.missingCost?'Eksik maliyet var':'Kayıtlı maliyet kullanıldı'];})),
    'VERİ KONTROLÜ':[['İşlem ID','Tarih','Kontrol Notu']].concat(issues)
  };
  function table(title, records, fields) { reports[title]=[fields.map(function(f){return f[1];})].concat((records || []).map(function(r){return fields.map(function(f){return clean(r[f[0]]);});})); }
  table('GİDER DETAYLARI',data.expenses,[['id','ID'],['date','Tarih'],['time','Saat'],['mainCategory','Ana Kategori'],['subType','Gider Adı'],['desc','Açıklama'],['amount','Tutar'],['source','Ödeme Kaynağı'],['hasInvoice','Belge Var'],['vatRate','KDV Oranı'],['vatAmount','KDV Tutarı'],['deductibleVat','İndirilecek KDV'],['taxDeduction','Matrah İndirimi'],['kkeg','KKEG'],['withholdingTax','Stopaj'],['expenseType','Tür']]);
  table('STOK ENJEKSİYON',(data.products || []).map(function(p){return {barcode:p.barcode,name:p.name,category:p.category,stock:p.stock,threshold:p.criticalThreshold || 2,cost:p.cost,price:p.price,batches:(p.batches || []).length,updated:data.exportDate};}),[['barcode','Barkod'],['name','Ürün Adı'],['category','Kategori'],['stock','Mevcut Stok'],['threshold','Kritik Eşik'],['cost','Alış Fiyatı (TL)'],['price','Satış Fiyatı (TL)'],['batches','Parti / Lot Sayısı'],['updated','Son Güncelleme']]);
  table('İHTİYAÇ LİSTESİ',data.manualDeficits,[['name','Ürün / İhtiyaç'],['supplier','Tedarikçi'],['qty','İstenen Adet'],['ordered','Sipariş Verildi'],['note','Not'],['date','Eklenme Tarihi']]);
  table('MÜŞTERİLER',data.customers,[['id','ID'],['name','Müşteri'],['phone','Telefon'],['address','Adres'],['pet','Evcil Hayvan'],['balance','Açık Borç'],['purchaseHistory','İşlem Geçmişi']]);
  table('TEDARİKÇİLER',data.suppliers,[['id','ID'],['name','Tedarikçi'],['phone','Telefon'],['balance','Açık Borç'],['notes','Not'],['transactions','Alım / Ödeme Geçmişi']]);
  table('SİPARİŞLER',data.orders,[['id','ID'],['date','Tarih'],['customerName','Müşteri'],['channel','Kanal'],['paymentMethod','Ödeme'],['total','Toplam'],['itemsSummary','Ürün Özeti'],['items','Ürünler'],['address','Adres'],['phone','Telefon'],['note','Not']]);
  table('PLATFORM BEKLEYEN',data.platformPendingOrders,[['id','ID'],['date','Tarih'],['channel','Kanal'],['total','Toplam'],['itemsSummary','Ürün Özeti']]);
  table('TESLİM EDİLEN',data.deliveredOrders,[['id','ID'],['date','Tarih'],['customerName','Müşteri'],['channel','Kanal'],['total','Toplam'],['itemsSummary','Ürün Özeti']]);
  table('FİRE ZAYİ',data.wasteRecords,[['id','ID'],['date','Tarih'],['productName','Ürün'],['qty','Adet'],['unitCost','Birim Maliyet'],['totalLoss','Toplam Kayıp'],['reason','Neden'],['note','Not']]);
  table('GÜN SONU DETAY',data.dailyCloseRecords,[['id','ID'],['date','Tarih'],['time','Saat'],['totalRevenue','Toplam Ciro'],['cashSales','Nakit'],['cardSales','Kart'],['transferSales','Havale'],['platformSales','Platform'],['cashExpenses','Nakit Gider'],['expectedCash','Beklenen Kasa'],['actualCash','Sayılan Kasa'],['difference','Kasa Farkı'],['closedAt','Kapanış Zamanı']]);
  var archive=[];
  Object.keys(data).forEach(function(k){if(Array.isArray(data[k]))data[k].forEach(function(record,i){archive.push([k,i+1,clean(record)]);});});
  reports['VERİ ARŞİVİ']=[['Kaynak Alan','Kayıt Sırası','Kayıt JSON (fatura görselleri hariç)']].concat(archive);
  reports['AKTARIM BİLGİSİ']=[['Bilgi','Değer'],['Kaynak',data.reportSource || 'aybars-pos tarayıcı demo yedeği'],['Yedek zamanı',data.exportDate || ''],['Aktarım şekli','Tek seferlik veri kopyası; otomatik bağlantı değil'],['Net ciro','Brüt satış eksi iadeler. Eski borç tahsilatı yeniden satış sayılmaz.'],['Maliyet','Ürün satırlarına kaydedilmiş maliyetler. Eksik maliyetler gerçek kârı hesaplamaya yetmez.'],['Eksik alanlar','Eski kayıtlarda bulunmayan değerler boş bırakılır; tutarlar uydurulmaz.'],['Görseller','Fatura görselleri JSON yedeğinde korunur, hücrelere taşınmaz.']];
  var reportDay=date(data.reportDate || data.activeBusinessDate || data.exportDate), dayGroup=groups[reportDay] || {}, monthGroup=months[reportDay.slice(0,7)] || {};
  reports['RAPOR PANELİ']=[['Gösterge','Değer'],['Rapor günü',reportDay],['Günlük net ciro',money(dayGroup.net || 0)],['Aylık net ciro',money(monthGroup.net || 0)],['Ayın kart satışları',money(monthGroup.card || 0)],['Ayın nakit satışları',money(monthGroup.cash || 0)],['Ayın havale satışları',money(monthGroup.transfer || 0)],['Ayın veresiye satışları',money(monthGroup.credit || 0)],['Ayın iadeleri',money(monthGroup.refunds || 0)],['Ayın giderleri',money(monthGroup.expenses || 0)],['Tüm dönem kart satışları',money(monthly.reduce(function(n,r){return n+num(r[5]);},0))],['Müşteri açık borcu',money((data.customers || []).reduce(function(n,c){return n+num(c.balance);},0))],['Tedarikçi açık borcu',money((data.suppliers || []).reduce(function(n,s){return n+num(s.balance);},0))],['Ürün sayısı',(data.products || []).length],['Satış / iade kayıt sayısı',(data.salesHistory || []).length],['Veri kopyasının zamanı',data.exportDate || ''],['Veri kaynağı',(data.reportSource || 'aybars-pos demo yedeği')+'; tam veri kopyası']];
  return reports;
}
if (typeof module !== 'undefined' && module.exports) module.exports={buildAybarsSnapshotTables};
