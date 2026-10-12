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
