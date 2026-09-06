/* ===================================================================
   STATE MANAGEMENT — localStorage + Sample Data
   =================================================================== */

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxnbRqagTU9C9C1UTK6jIyJnTUw_kUddnBBmHgM7grmhQVGr-vXLo0oThKAgvPvR4gv/exec";

const defaultCategories = ["Kedi", "Köpek", "Kuş / Kemirgen", "Açık Mama", "Kum / Kozmetik", "Kampanyalar"];

// ── Sample Data ──
const sampleProducts = [
  { id: 101, name: "Reflex Plus Somonlu Yetişkin Kedi Maması 15kg", category: "Kedi", price: 1150, cost: 780, vatRate: 20, stock: 12, supplier: "Marmara Pet Toptan" },
  { id: 102, name: "Pro Plan Somonlu Kısırlaştırılmış Kedi 3kg", category: "Kedi", price: 820, cost: 580, vatRate: 20, stock: 8, supplier: "Marmara Pet Toptan" },
  { id: 103, name: "Royal Canin Fit 32 Yetişkin Kedi Maması 4kg", category: "Kedi", price: 950, cost: 690, vatRate: 20, stock: 5, supplier: "Anadolu Mama Dağıtım" },
  { id: 104, name: "Reflex Aktif Karbonlu Topaklanan Kedi Kumu 10L", category: "Kum / Kozmetik", price: 190, cost: 120, vatRate: 20, stock: 24, supplier: "Ege Pet Depo" },
  { id: 105, name: "Sanicat Marsilya Sabunlu İnce Kedi Kumu 10L", category: "Kum / Kozmetik", price: 240, cost: 155, vatRate: 20, stock: 15, supplier: "Ege Pet Depo" },
  { id: 106, name: "Royal Canin Mini Adult Yetişkin Köpek Maması 8kg", category: "Köpek", price: 1450, cost: 1050, vatRate: 20, stock: 6, supplier: "Anadolu Mama Dağıtım" },
  { id: 107, name: "Reflex Kuzu Etli & Pirinçli Yetişkin Köpek 15kg", category: "Köpek", price: 1080, cost: 720, vatRate: 20, stock: 9, supplier: "Marmara Pet Toptan" },
  { id: 108, name: "Gold Wings Premium Muhabbet Kuşu Yemi 1kg", category: "Kuş / Kemirgen", price: 95, cost: 60, vatRate: 20, stock: 30, supplier: "Kuzey Kuş & Pet" },
  { id: 109, name: "Quik Kemirgen & Tavşan Yemi 750gr", category: "Kuş / Kemirgen", price: 85, cost: 52, vatRate: 20, stock: 16, supplier: "Kuzey Kuş & Pet" },
  { id: 110, name: "Tavuklu Açık Kedi Maması (1 Kilo)", category: "Açık Mama", price: 85, cost: 50, vatRate: 20, stock: 45, supplier: "Marmara Pet Toptan" }
];

const sampleBundles = [
  { id: 401, name: "🎁 [KAMPANYA] Eko Kedi Paketi (15kg Reflex + 10L Kum)", category: "Kampanyalar", price: 1250, cost: 900, vatRate: 20, stock: 99, isBundle: true, bundleItems: [{ productId: 101, name: "Reflex Plus Somonlu Yetişkin Kedi Maması 15kg", qty: 1 }, { productId: 104, name: "Reflex Aktif Karbonlu Topaklanan Kedi Kumu 10L", qty: 1 }] }
];

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

// ── Load from localStorage or use samples ──
function loadState() {
  const raw = k => JSON.parse(localStorage.getItem(k));

  let cats = raw("ps_categories");
  window.categories = (Array.isArray(cats) && cats.length > 0) ? cats : [...defaultCategories];

  let prods = raw("ps_products");
  window.products = (prods && prods.length > 0) ? prods : [...sampleProducts, ...sampleBundles];
  // Ensure every product has a valid vatRate
  window.products.forEach(p => {
    if (p.vatRate === undefined || p.vatRate === null) p.vatRate = 20;
    else p.vatRate = Number(p.vatRate);
  });

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
  window.expenses = raw("ps_expenses") || [];
  window.manualDeficits = raw("ps_deficits") || [];
  window.heldCarts = raw("ps_held_carts") || [];

  // Runtime state
  window.cart = [];
  window.selectedCategory = "TÜMÜ";
  window.activeCollectCustId = null;
  window.activeHistorySupplierId = null;
  window.currentInvoiceBase64 = null;
  window.tempBundleItems = [];
}

function saveData() {
  localStorage.setItem("ps_categories", JSON.stringify(categories));
  localStorage.setItem("ps_products", JSON.stringify(products));
  localStorage.setItem("ps_customers", JSON.stringify(customers));
  localStorage.setItem("ps_orders", JSON.stringify(orders));
  localStorage.setItem("ps_platform_pending", JSON.stringify(platformPendingOrders));
  localStorage.setItem("ps_delivered_orders", JSON.stringify(deliveredOrders));
  localStorage.setItem("ps_sales_history", JSON.stringify(salesHistory));
  localStorage.setItem("ps_expenses", JSON.stringify(expenses));
  localStorage.setItem("ps_deficits", JSON.stringify(manualDeficits));
  localStorage.setItem("ps_suppliers", JSON.stringify(suppliers));
  localStorage.setItem("ps_held_carts", JSON.stringify(heldCarts));
  localStorage.setItem("ps_bundles", JSON.stringify(bundles));
  localStorage.setItem("ps_waste_records", JSON.stringify(wasteRecords));
}

function sendToGoogleSheets(payload) {
  fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(err => console.warn("Sheets sync error:", err));
}
