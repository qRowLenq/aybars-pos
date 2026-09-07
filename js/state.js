/* ===================================================================
   STATE MANAGEMENT — localStorage + Sample Data
   =================================================================== */

// Global variables for universal compatibility
var defaultCategories = ["Kedi", "Köpek", "Kuş / Kemirgen", "Açık Mama", "Kum / Kozmetik", "Kampanyalar"];
var categories = [...defaultCategories];
var selectedCategory = "TÜMÜ";
window.defaultCategories = defaultCategories;
window.categories = categories;
window.selectedCategory = selectedCategory;

var products = [];
var suppliers = [];
var customers = [];
var bundles = [];
var wasteRecords = [];
var orders = [];
var platformPendingOrders = [];
var deliveredOrders = [];
var salesHistory = [];
var expenses = [];
var manualDeficits = [];
var heldCarts = [];
var cart = [];
var dailyCloseRecords = [];
window.dailyCloseRecords = dailyCloseRecords;

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx_l1PLYUVmHL6dqnholoKke2JsTx56FScjd4qa6veqcoK49ztzLqggwp9M7uze10sU/exec";

var catalogProducts = (typeof window !== "undefined" && window.catalogProducts && window.catalogProducts.length > 0)
  ? window.catalogProducts
  : ((typeof catalogProducts !== "undefined" && Array.isArray(catalogProducts)) ? catalogProducts : []);

const sampleProducts = catalogProducts;

const sampleBundles = [];

const sampleSuppliers = [
  { id: 201, name: "Marmara Pet Toptan", phone: "0532 100 2030", notes: "30 Gün vadeli çalışılır. Salı ve Perşembe sevkiyat.", balance: 5400, transactions: [{ id: 1001, date: "02.09.2026", time: "11:30", type: "Alım", item: "5 Koli Reflex Mama + 2 Çuval Açık Mama", amount: 5400, vatRate: 20, vatAmount: 900, status: "Açık Hesap (Borç)", invoiceImg: null }] },
  { id: 202, name: "Anadolu Mama Dağıtım", phone: "0544 200 4050", notes: "Royal Canin ve Pro Plan yetkili bayisi. 15 gün vade.", balance: 3200, transactions: [{ id: 1002, date: "01.09.2026", time: "14:15", type: "Alım", item: "Royal Canin Mini Adult + Fit 32 Paketleri", amount: 3200, vatRate: 20, vatAmount: 533.33, status: "Açık Hesap (Borç)", invoiceImg: null }] },
  { id: 203, name: "Ege Pet Depo", phone: "0533 300 5060", notes: "Kum ve kozmetik toptancısı. Peşinde %5 indirim.", balance: 0, transactions: [{ id: 1003, date: "28.08.2026", time: "16:00", type: "Alım", item: "30 Adet Reflex & Sanicat Kedi Kumu", amount: 4100, vatRate: 20, vatAmount: 683.33, status: "Peşin Ödendi", invoiceImg: null }] },
  { id: 204, name: "Kuzey Kuş & Pet", phone: "0536 400 6070", notes: "Kuş yemleri ve kemirgen ürünleri.", balance: 850, transactions: [{ id: 1004, date: "03.09.2026", time: "09:45", type: "Alım", item: "Kuş Yemleri ve Kemirgen Talaşları", amount: 850, vatRate: 20, vatAmount: 141.67, status: "Açık Hesap (Borç)", invoiceImg: null }] },
  { id: 205, name: "Balkan Akvaryum & Yem", phone: "0538 500 7080", notes: "Balık yemleri, akvaryum motorları.", balance: 0, transactions: [] },
  { id: 206, name: "Boğaziçi Tasma & Aksesuar", phone: "0530 600 8090", notes: "Deri tasmalar, kedi oyuncakları.", balance: 0, transactions: [] },
  { id: 207, name: "Lider Pet Dağıtım", phone: "0542 700 9010", notes: "Yaş mama ve konserve toptancısı.", balance: 0, transactions: [] },
  { id: 208, name: "İstanbul Vitamin & Sağlık", phone: "0546 800 1020", notes: "Malt macunları, eklem takviyeleri.", balance: 0, transactions: [] },
  { id: 209, name: "Trakya Çuval & Poşet", phone: "0552 900 2030", notes: "Dükkân sarf malzemeleri.", balance: 0, transactions: [] },
  { id: 210, name: "Güven Kedi & Köpek Yatakları", phone: "0535 010 3040", notes: "Peluş yataklar ve taşıma çantaları.", balance: 0, transactions: [] }
];

const sampleCustomers = [
  { id: 301, name: "Mehmet Demir", phone: "0535 999 8877", address: "İnönü Mah. Çiçek Sok. No:12 D:4", pet: "Tekir Kedi (Mişa)", balance: 380, purchaseHistory: [{ date: "03.09.2026", time: "15:20", items: "1x Reflex Kum + 2kg Açık Mama", total: 380, payment: "Veresiye" }] },
  { id: 302, name: "Ayşe Kaya", phone: "0555 444 3322", address: "Atatürk Cad. Lale Apt. No:5", pet: "Golden Retriever (Max)", balance: 0, purchaseHistory: [{ date: "04.09.2026", time: "18:00", items: "1x Royal Canin Mini Adult 8kg", total: 1450, payment: "Kredi Kartı" }] },
  { id: 303, name: "Ahmet Yıldız", phone: "0542 111 2233", address: "Cumhuriyet Mah. Menekşe Sok. No:8", pet: "British Shorthair (Pamuk)", balance: 250, purchaseHistory: [] },
  { id: 304, name: "Fatma Şahin", phone: "0536 222 3344", address: "Göztepe Cad. Palmiye Sitesi B Blok", pet: "Muhabbet Kuşu (Maviş)", balance: 0, purchaseHistory: [] },
  { id: 305, name: "Emre Can", phone: "0530 333 4455", address: "Bağdat Cad. No:45 D:2", pet: "Pomeranian (Gofret)", balance: 420, purchaseHistory: [] },
  { id: 306, name: "Selin Öztürk", phone: "0553 444 5566", address: "Fahrettin Kerim Gökay Cad. No:12", pet: "Van Kedisi (Duman)", balance: 0, purchaseHistory: [] },
  { id: 307, name: "Burak Yılmaz", phone: "0545 555 6677", address: "Moda Cad. No:78 D:6", pet: "Scottish Fold (Zeytin)", balance: 0, purchaseHistory: [] },
  { id: 308, name: "Zeynep Aydın", phone: "0537 666 7788", address: "Zühtüpaşa Mah. Koru Sok. No:3", pet: "Terrier (Baron)", balance: 180, purchaseHistory: [] },
  { id: 309, name: "Mustafa Çelik", phone: "0543 777 8899", address: "Acıbadem Mah. Ihlamur Sok. No:9", pet: "Sultan Papağanı (Çiko)", balance: 0, purchaseHistory: [] },
  { id: 310, name: "Derya Korkmaz", phone: "0539 888 9900", address: "Koşuyolu Mah. Asma Sok. No:14", pet: "Chihuahua (Bella)", balance: 0, purchaseHistory: [] }
];

const sampleWaste = [
  { id: 501, date: "04.09.2026", time: "10:15", productName: "Reflex Aktif Karbonlu Topaklanan Kedi Kumu 10L", qty: 1, unitCost: 120, totalLoss: 120, reason: "Ambalaj Yırtıldı / Patladı", note: "İçeri taşırken palet köşesine takıldı" }
];

// ── Unified Sample Expenses (11-Column Schema) ──
const sampleExpenses = [
  {
    id: 601,
    date: "01.09.2026",
    time: "09:30",
    mainCategory: "Sabit Kira / Stopaj",
    subType: "Dükkân Kirası",
    desc: "Eylül Ayı Dükkân Kirası (Net Ödeme)",
    amount: 12000,
    vatRate: 0,
    vatAmount: 0,
    paymentMethod: "Banka Hesabı",
    invoiceStatus: "🧾 Stopajlı (%20 Stopaj)",
    hasInvoice: true,
    taxDeduction: 15000, // Brütleştirilmiş kira matrah indirimi (12.000 / 0.80)
    kkeg: 0,
    withholdingTax: 3000,
    expenseType: "major"
  },
  {
    id: 602,
    date: "02.09.2026",
    time: "11:30",
    mainCategory: "Toptancı Alımı",
    subType: "Mal Alımı",
    desc: "5 Koli Reflex Mama + 2 Çuval Açık Mama (Marmara Pet)",
    amount: 5400,
    vatRate: 20,
    vatAmount: 900,
    paymentMethod: "Açık Hesap (Borç)",
    invoiceStatus: "🧾 Faturalı",
    hasInvoice: true,
    taxDeduction: 4500, // KDV hariç matrah
    kkeg: 0,
    supplierName: "Marmara Pet Toptan",
    expenseType: "procurement",
    status: "Açık Hesap (Borç)"
  },
  {
    id: 603,
    date: "03.09.2026",
    time: "14:20",
    mainCategory: "Binek Taşıt & Akaryakıt",
    subType: "Servis Aracı Mazot",
    desc: "Kurye / Servis Aracı Mazot Alımı",
    amount: 1200,
    vatRate: 20,
    vatAmount: 200,
    paymentMethod: "Kasa (Nakit)",
    invoiceStatus: "🧾 Faturalı (%70 Mahsup)",
    hasInvoice: true,
    taxDeduction: 700, // %70 matrah indirimi (KDV hariç 1000 TL * 0.70)
    kkeg: 300, // %30 KKEG
    expenseType: "major"
  },
  {
    id: 604,
    date: "04.09.2026",
    time: "16:10",
    mainCategory: "Banka & POS Komisyon Kesintisi",
    subType: "POS Komisyonu",
    desc: "Haftalık POS Slipleri Komisyon Kesintisi",
    amount: 420,
    vatRate: 0,
    vatAmount: 0,
    paymentMethod: "Banka Hesabı",
    invoiceStatus: "🧾 Banka Dekontu",
    hasInvoice: true,
    taxDeduction: 420, // %100 Finansman gideri matrah indirimi
    kkeg: 0,
    expenseType: "major"
  },
  {
    id: 605,
    date: "05.09.2026",
    time: "12:45",
    mainCategory: "Genel Dükkân / Sarf",
    subType: "Poşet / Temizlik",
    desc: "Baskılı Poşet ve Dükkân Temizlik Sarfı",
    amount: 350,
    vatRate: 20,
    vatAmount: 58.33,
    paymentMethod: "Kasa (Nakit)",
    invoiceStatus: "🧾 Faturalı",
    hasInvoice: true,
    taxDeduction: 291.67,
    kkeg: 0,
    expenseType: "daily"
  },
  {
    id: 606,
    date: "06.09.2026",
    time: "10:15",
    mainCategory: "Genel Dükkân / Sarf",
    subType: "Yemek / Çay",
    desc: "Personel Öğle Yemeği & Kasa İkramı",
    amount: 180,
    vatRate: 10,
    vatAmount: 16.36,
    paymentMethod: "Kasa (Nakit)",
    invoiceStatus: "🧾 Fişli",
    hasInvoice: true,
    taxDeduction: 163.64,
    kkeg: 0,
    expenseType: "daily"
  }
];

const TURKISH_MONTHS = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];

function getMonthYearHeader(dateStr) {
  if (dateStr && typeof dateStr === "string" && dateStr.includes(".")) {
    const parts = dateStr.split(".");
    const m = parseInt(parts[1], 10) - 1;
    const y = parts[2];
    if (m >= 0 && m < 12) return `${TURKISH_MONTHS[m]} ${y}`;
  }
  const d = new Date();
  return `${TURKISH_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Load from localStorage or use samples ──
function loadState() {
  const raw = k => {
    try {
      const v = localStorage.getItem(k);
      return (v && v !== "undefined" && v !== "null") ? JSON.parse(v) : null;
    } catch (e) {
      console.warn("Storage parse error:", k, e);
      return null;
    }
  };

  let cats = raw("ps_categories");
  if (!Array.isArray(cats) || cats.length === 0) {
    cats = [...defaultCategories];
  }
  window.categories = cats;
  categories = window.categories;

  const CURRENT_CATALOG_VERSION = "2026_09_v10_stock0_ready";
  const savedVer = localStorage.getItem("ps_catalog_version");
  let prods = raw("ps_products");

  const catalogSource = (window.catalogProducts && Array.isArray(window.catalogProducts) && window.catalogProducts.length > 0)
    ? window.catalogProducts
    : ((typeof catalogProducts !== "undefined" && Array.isArray(catalogProducts) && catalogProducts.length > 0)
      ? catalogProducts
      : (typeof sampleProducts !== "undefined" && Array.isArray(sampleProducts) ? sampleProducts : []));

  if (savedVer !== CURRENT_CATALOG_VERSION || !Array.isArray(prods) || prods.length < 50) {
    // 222 ürünü 0 stok ile yükle
    window.products = JSON.parse(JSON.stringify(catalogSource));
    window.products.forEach(p => {
      p.stock = (p.stock !== undefined && !isNaN(Number(p.stock))) ? Number(p.stock) : 0;
      p.vatRate = 20;
      p.cost = Number(p.cost) || 0;
      p.price = Number(p.price) || 0;
      if (!Array.isArray(p.batches)) p.batches = [];
    });
    localStorage.setItem("ps_products", JSON.stringify(window.products));
    localStorage.setItem("ps_catalog_version", CURRENT_CATALOG_VERSION);
  } else {
    window.products = (prods && prods.length > 0) ? prods : JSON.parse(JSON.stringify(catalogSource));
  }
  
  // Ensure product integrity & default values
  window.products.forEach(p => {
    if (p.vatRate === undefined || p.vatRate === null) p.vatRate = 20;
    else p.vatRate = Number(p.vatRate);
    if (!Array.isArray(p.batches)) p.batches = [];
    if (p.cost === undefined || p.cost === null) p.cost = 0;
    else p.cost = Number(p.cost);
    if (p.price === undefined || p.price === null) p.price = 0;
    else p.price = Number(p.price);
    if (p.stock === undefined || p.stock === null || isNaN(Number(p.stock))) p.stock = 0;
    else p.stock = Number(p.stock);
  });
  products = window.products;

  let sups = raw("ps_suppliers");
  window.suppliers = (sups && sups.length > 0) ? sups : [...sampleSuppliers];

  let custs = raw("ps_customers");
  window.customers = (custs && custs.length > 0) ? custs : [...sampleCustomers];

  let bnds = raw("ps_bundles");
  window.bundles = (bnds && bnds.length > 0) ? bnds : [...sampleBundles];

  let waste = raw("ps_waste_records");
  window.wasteRecords = (waste && waste.length > 0) ? waste : [...sampleWaste];

  window.orders = raw("ps_orders") || [];
  window.platformPendingOrders = raw("ps_platform_pending") || [];
  window.deliveredOrders = raw("ps_delivered_orders") || [];
  window.salesHistory = raw("ps_sales_history") || [];
  
  let exp = raw("ps_expenses");
  window.expenses = (exp && exp.length > 0) ? exp : [...sampleExpenses];
  
  window.manualDeficits = raw("ps_deficits") || [];
  window.heldCarts = raw("ps_held_carts") || [];
  window.dailyCloseRecords = raw("ps_daily_closes") || [];

  // Runtime state
  window.cart = [];
  window.selectedCategory = "TÜMÜ";
  window.activeCollectCustId = null;
  window.activeHistorySupplierId = null;
  window.currentInvoiceBase64 = null;
  window.tempBundleItems = [];

  // Synchronize global variables
  categories = window.categories;
  products = window.products;
  suppliers = window.suppliers;
  customers = window.customers;
  bundles = window.bundles;
  wasteRecords = window.wasteRecords;
  orders = window.orders;
  platformPendingOrders = window.platformPendingOrders;
  deliveredOrders = window.deliveredOrders;
  salesHistory = window.salesHistory;
  expenses = window.expenses;
  manualDeficits = window.manualDeficits;
  heldCarts = window.heldCarts;
  dailyCloseRecords = window.dailyCloseRecords;
  cart = window.cart;
}

function saveData() {
  const pList = window.products || products || [];
  const cList = window.categories || categories || defaultCategories;
  const supList = window.suppliers || suppliers || [];
  const custList = window.customers || customers || [];
  const bndList = window.bundles || bundles || [];
  const wstList = window.wasteRecords || wasteRecords || [];
  const ordList = window.orders || orders || [];
  const pltList = window.platformPendingOrders || platformPendingOrders || [];
  const dlvList = window.deliveredOrders || deliveredOrders || [];
  const slsList = window.salesHistory || salesHistory || [];
  const expList = window.expenses || expenses || [];
  const defList = window.manualDeficits || manualDeficits || [];
  const hldList = window.heldCarts || heldCarts || [];
  const dclList = window.dailyCloseRecords || dailyCloseRecords || [];

  // Keep global sync
  products = pList;
  categories = cList;
  suppliers = supList;
  customers = custList;
  bundles = bndList;
  wasteRecords = wstList;
  orders = ordList;
  platformPendingOrders = pltList;
  deliveredOrders = dlvList;
  salesHistory = slsList;
  expenses = expList;
  manualDeficits = defList;
  heldCarts = hldList;
  dailyCloseRecords = dclList;

  localStorage.setItem("ps_categories", JSON.stringify(cList));
  localStorage.setItem("ps_products", JSON.stringify(pList));
  localStorage.setItem("ps_customers", JSON.stringify(custList));
  localStorage.setItem("ps_orders", JSON.stringify(ordList));
  localStorage.setItem("ps_platform_pending", JSON.stringify(pltList));
  localStorage.setItem("ps_delivered_orders", JSON.stringify(dlvList));
  localStorage.setItem("ps_sales_history", JSON.stringify(slsList));
  localStorage.setItem("ps_expenses", JSON.stringify(expList));
  localStorage.setItem("ps_deficits", JSON.stringify(defList));
  localStorage.setItem("ps_suppliers", JSON.stringify(supList));
  localStorage.setItem("ps_held_carts", JSON.stringify(hldList));
  localStorage.setItem("ps_bundles", JSON.stringify(bndList));
  localStorage.setItem("ps_waste_records", JSON.stringify(wstList));
  localStorage.setItem("ps_daily_closes", JSON.stringify(dclList));
}

function isDayClosed(dateStr) {
  const d = dateStr || nowDate();
  const list = window.dailyCloseRecords || dailyCloseRecords || [];
  return list.some(r => r.date === d);
}

function getTodayDailyCloseRecord(dateStr) {
  const d = dateStr || nowDate();
  const list = window.dailyCloseRecords || dailyCloseRecords || [];
  return list.find(r => r.date === d) || null;
}

if (typeof window !== "undefined") {
  window.isDayClosed = isDayClosed;
  window.getTodayDailyCloseRecord = getTodayDailyCloseRecord;
}

function sendToGoogleSheets(payload) {
  if (payload && !payload.supplierDebts && Array.isArray(window.suppliers)) {
    payload.supplierDebts = window.suppliers
      .filter(s => (s.balance || 0) > 0)
      .map(s => ({ name: s.name, balance: Number(s.balance || 0) }));
  }
  fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(err => console.warn("Sheets sync error:", err));
}

// ── Global Resilient Product Finder (Supports Turkish casing, Barcodes, IDs, Substrings) ──
function findMatchingProduct(query) {
  if (!query || !Array.isArray(window.products)) return null;
  const q = String(query).trim();
  if (!q) return null;
  const qTr = q.toLocaleLowerCase('tr-TR');
  const qStd = q.toLowerCase();

  // 1. Exact match by name (Turkish locale)
  let found = window.products.find(p => p.name && p.name.trim().toLocaleLowerCase('tr-TR') === qTr);
  if (found) return found;

  // 2. Exact match by name (Standard locale fallback)
  found = window.products.find(p => p.name && p.name.trim().toLowerCase() === qStd);
  if (found) return found;

  // 3. Exact match by barcode
  found = window.products.find(p => p.barcode && String(p.barcode).trim() === q);
  if (found) return found;

  // 4. Exact match by ID
  found = window.products.find(p => p.id && String(p.id).trim() === q);
  if (found) return found;

  // 5. Query contains product name or product name contains query
  found = window.products.find(p => {
    if (!p.name) return false;
    const pTr = p.name.trim().toLocaleLowerCase('tr-TR');
    return (pTr.length >= 3 && qTr.length >= 3) && (qTr === pTr || qTr.startsWith(pTr) || pTr.startsWith(qTr));
  });
  if (found) return found;

  // 6. Barcode substring
  found = window.products.find(p => p.barcode && q.includes(String(p.barcode).trim()));
  if (found) return found;

  return null;
}

// ── Reset catalog to default 222 items helper ──
function forceReload222Products() {
  localStorage.removeItem("ps_products");
  localStorage.removeItem("ps_catalog_version");
  window.products = JSON.parse(JSON.stringify(catalogProducts));
  saveData();
  location.reload();
}

function resetToDefaultCatalog() {
  if (confirm("Tüm ürün listesini 222 ürünlük varsayılan orijinal listeye sıfırlamak istiyor musunuz?\n\n(DİKKAT: Sonradan girdiğiniz özel fiyat ve stoklar sıfırlanacaktır)")) {
    window.products = JSON.parse(JSON.stringify(sampleProducts));
    saveData();
    if (typeof renderCatalog === "function") renderCatalog();
    if (typeof renderInventoryTable === "function") renderInventoryTable();
    if (typeof renderQuickPricingTable === "function") renderQuickPricingTable();
    if (typeof toast === "function") toast("✅ Ürün kataloğu 222 ürünlük varsayılan listeye sıfırlandı!");
  }
}

// ── Helper to calculate Cash, Card, Transfer (Havale/IBAN) and Credit portions ──
function getSalePaymentBreakdown(sale) {
  if (!sale) return { cash: 0, card: 0, transfer: 0, credit: 0 };
  const total = Number(sale.total) || 0;

  if (typeof sale.splitCash === "number" || typeof sale.splitCard === "number" || typeof sale.splitTransfer === "number" || typeof sale.splitCredit === "number") {
    return {
      cash: Number(sale.splitCash) || 0,
      card: Number(sale.splitCard) || 0,
      transfer: Number(sale.splitTransfer) || 0,
      credit: Number(sale.splitCredit) || 0
    };
  }

  const pType = (sale.paymentType || "").toLowerCase();
  
  if (pType.includes("parçalı")) {
    let cash = 0, card = 0, transfer = 0;
    const cashMatch = pType.match(/([\d.,]+)\s*₺?\s*nakit/i);
    const cardMatch = pType.match(/([\d.,]+)\s*₺?\s*kart/i);
    const transferMatch = pType.match(/([\d.,]+)\s*₺?\s*(?:havale|eft|iban)/i);

    if (cashMatch) cash = parseFloat(cashMatch[1].replace(",", ".")) || 0;
    if (cardMatch) card = parseFloat(cardMatch[1].replace(",", ".")) || 0;
    if (transferMatch) transfer = parseFloat(transferMatch[1].replace(",", ".")) || 0;

    if (cash === 0 && card === 0 && transfer === 0) {
      card = total;
    }
    return { cash, card, transfer, credit: 0 };
  }

  if (pType.includes("nakit")) {
    return { cash: total, card: 0, transfer: 0, credit: 0 };
  }
  if (pType.includes("havale") || pType.includes("eft") || pType.includes("iban") || pType.includes("banka")) {
    return { cash: 0, card: 0, transfer: total, credit: 0 };
  }
  if (pType.includes("veresiye")) {
    return { cash: 0, card: 0, transfer: 0, credit: total };
  }
  if (pType.includes("platform") || pType.includes("online") || pType.includes("getir") || pType.includes("yemeksepeti")) {
    return { cash: 0, card: 0, transfer: 0, credit: 0, platform: total };
  }
  return { cash: 0, card: total, transfer: 0, credit: 0 };
}


