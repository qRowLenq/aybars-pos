/* ===================================================================
   APP INIT & CORE FUNCTIONALITY — Backup, Daily Close, Startup
   =================================================================== */

// ── Daily Close (Gün Sonu Kapanış) ──
function openDailyCloseModal() {
  document.querySelectorAll(".banknote-grid .fc").forEach(inp => inp.value = "");
  document.getElementById("dcTotalCash").innerText = "0.00 ₺";
  document.getElementById("dcExpectedCash").innerText = "Hesaplanıyor...";
  document.getElementById("dcDifference").innerText = "-";
  openModal("dailyCloseModal");
}

function calculateDailyClose() {
  const getVal = id => Number(document.getElementById(id).value) || 0;
  
  const b200 = getVal("b200") * 200;
  const b100 = getVal("b100") * 100;
  const b50 = getVal("b50") * 50;
  const b20 = getVal("b20") * 20;
  const b10 = getVal("b10") * 10;
  const b5 = getVal("b5") * 5;
  const coin = getVal("bCoin");

  const actualTotal = b200 + b100 + b50 + b20 + b10 + b5 + coin;
  document.getElementById("dcTotalCash").innerText = actualTotal.toFixed(2) + " ₺";

  const today = nowDate();
  
  // Calculate expected cash: Günün Toplam Nakit Satışları - Günün Kasadan Çıkan Nakit Giderleri
  let cashSales = 0;
  const todaySales = salesHistory.filter(s => s.date === today && (s.paymentType || "").includes("Nakit"));
  cashSales += todaySales.reduce((s, x) => s + (Number(x.total) || 0), 0);
  
  // + Debt Collections (Cash)
  customers.forEach(c => {
    (c.purchaseHistory || []).filter(h => h.date === today && (h.payment || "").includes("Nakit")).forEach(h => {
      cashSales += (Number(h.total) || 0);
    });
  });

  let cashExpenses = 0;
  // - Expenses (Cash)
  const todayExpenses = expenses.filter(e => e.date === today && (
    (e.paymentMethod && (e.paymentMethod.includes("Nakit") || e.paymentMethod.includes("Kasa"))) ||
    (e.source && (e.source.includes("Nakit") || e.source.includes("Kasa"))) ||
    e.status === "Peşin Ödendi"
  ));
  cashExpenses += todayExpenses.reduce((s, x) => s + (Number(x.amount) || 0), 0);

  // - Supplier Payments (Cash)
  suppliers.forEach(s => {
    (s.transactions || []).filter(t => t.date === today && t.type === "Ödeme" && (t.item || "").includes("Kasa (Nakit)")).forEach(t => {
      cashExpenses += (Number(t.amount) || 0);
    });
  });

  const expectedCash = cashSales - cashExpenses;
  document.getElementById("dcExpectedCash").innerText = expectedCash.toFixed(2) + " ₺";
  
  const diff = actualTotal - expectedCash;
  const diffEl = document.getElementById("dcDifference");
  diffEl.innerText = (diff > 0 ? "+" : "") + diff.toFixed(2) + " ₺";
  diffEl.className = diff >= 0 ? (diff === 0 ? "text-success font-bold" : "text-primary font-bold") : "text-danger font-bold";
}

function completeDailyClose() {
  const actualStr = document.getElementById("dcTotalCash").innerText.replace("₺", "").trim();
  const actualNum = parseFloat(actualStr.replace(/\./g, "").replace(",", ".")) || 0;
  const expStr = document.getElementById("dcExpectedCash").innerText.replace("₺", "").trim();
  const expNum = parseFloat(expStr.replace(/\./g, "").replace(",", ".")) || 0;
  const diffNum = actualNum - expNum;

  const today = nowDate();
  let cashSales = 0;
  salesHistory.filter(s => s.date === today && (s.paymentType || "").includes("Nakit")).forEach(s => cashSales += (Number(s.total) || 0));
  customers.forEach(c => {
    (c.purchaseHistory || []).filter(h => h.date === today && (h.payment || "").includes("Nakit")).forEach(h => cashSales += (Number(h.total) || 0));
  });

  let cashExpenses = 0;
  expenses.filter(e => e.date === today && (
    (e.paymentMethod && (e.paymentMethod.includes("Nakit") || e.paymentMethod.includes("Kasa"))) ||
    (e.source && (e.source.includes("Nakit") || e.source.includes("Kasa"))) ||
    e.status === "Peşin Ödendi"
  )).forEach(e => cashExpenses += (Number(e.amount) || 0));
  suppliers.forEach(s => {
    (s.transactions || []).filter(t => t.date === today && t.type === "Ödeme" && (t.item || "").includes("Kasa (Nakit)")).forEach(t => cashExpenses += (Number(t.amount) || 0));
  });
  
  sendToGoogleSheets({ 
    action: "daily_close", 
    date: nowDate(),
    time: nowTime(),
    actualCash: actualNum,
    expectedCash: expNum,
    cashSales: cashSales,
    cashExpenses: cashExpenses,
    difference: diffNum 
  });

  closeModal("dailyCloseModal");
  toast("🏁 Gün sonu sayımı başarıyla E-Tablo'ya gönderildi!");
}

// ── Backup System ──
function exportData() {
  saveData();
  const data = {
    categories, products, customers, suppliers,
    orders, platformPendingOrders, deliveredOrders,
    salesHistory, expenses, manualDeficits, heldCarts,
    bundles, wasteRecords, exportDate: new Date().toISOString()
  };
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = `Petshop_Yedek_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  
  toast("💾 Yedek başarıyla indirildi!");
}

function downloadAybars222Backup() {
  try {
    const rawCatalog = (typeof window !== "undefined" && window.catalogProducts && window.catalogProducts.length > 0)
      ? window.catalogProducts
      : ((typeof catalogProducts !== "undefined" && Array.isArray(catalogProducts)) ? catalogProducts : []);

    const prods = rawCatalog.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category || "Genel",
      price: Number(p.price) || 0,
      cost: Number(p.cost) || 0,
      vatRate: Number(p.vatRate) || 20,
      stock: 0,
      supplier: p.supplier || "-",
      batches: []
    }));

    const backupData = {
      version: "2026_09_v9_stock0_ready",
      exportDate: new Date().toISOString(),
      categories: window.categories || categories || defaultCategories,
      products: prods,
      suppliers: window.suppliers || suppliers || sampleSuppliers,
      customers: [],
      orders: [],
      platformPendingOrders: [],
      deliveredOrders: [],
      salesHistory: [],
      expenses: [],
      manualDeficits: [],
      heldCarts: [],
      bundles: [],
      wasteRecords: []
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aybars_yedek_222_urun.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("📥 222 Ürünlük yedek dosyası başarıyla hazırlandı ve indirildi!", "success");
  } catch (err) {
    console.error("downloadAybars222Backup error:", err);
    toast("İndirme sırasında hata: " + err.message, "error");
  }
}
window.downloadAybars222Backup = downloadAybars222Backup;

function importData(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    let data;
    try {
      data = JSON.parse(e.target.result);
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr);
      toast("Seçilen dosya geçerli bir JSON dosyası değil!", "error");
      event.target.value = "";
      return;
    }

    try {
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        categories = data.categories;
        window.categories = data.categories;
      }
      if (Array.isArray(data.products) && data.products.length > 0) {
        data.products.forEach(p => {
          p.stock = (p.stock !== undefined && p.stock !== null && !isNaN(Number(p.stock))) ? Number(p.stock) : 0;
          p.cost = Number(p.cost) || 0;
          p.price = Number(p.price) || 0;
          p.vatRate = Number(p.vatRate) || 20;
          if (!Array.isArray(p.batches)) p.batches = [];
        });
        products = data.products;
        window.products = data.products;
      }
      if (data.customers) { customers = data.customers; window.customers = data.customers; }
      if (data.orders) { orders = data.orders; window.orders = data.orders; }
      if (data.platformPendingOrders) { platformPendingOrders = data.platformPendingOrders; window.platformPendingOrders = data.platformPendingOrders; }
      if (data.deliveredOrders) { deliveredOrders = data.deliveredOrders; window.deliveredOrders = data.deliveredOrders; }
      if (data.salesHistory) { salesHistory = data.salesHistory; window.salesHistory = data.salesHistory; }
      if (data.expenses) { expenses = data.expenses; window.expenses = data.expenses; }
      if (data.manualDeficits) { manualDeficits = data.manualDeficits; window.manualDeficits = data.manualDeficits; }
      if (data.suppliers) { suppliers = data.suppliers; window.suppliers = data.suppliers; }
      if (data.heldCarts) { heldCarts = data.heldCarts; window.heldCarts = data.heldCarts; }
      if (data.bundles) { bundles = data.bundles; window.bundles = data.bundles; }
      if (data.wasteRecords) { wasteRecords = data.wasteRecords; window.wasteRecords = data.wasteRecords; }
      
      saveData();
      initializeApp();
      toast(`📥 Yedek başarıyla yüklendi! (${(window.products || []).length} ürün)`, "success");
      event.target.value = "";
    } catch(err) {
      toast("Yedek verisi işlenirken hata: " + err.message, "error");
      console.error("importData application error:", err);
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

// ── App Initialization ──
function initializeApp() {
  loadState();
  initCategoryBar();
  populateCategoryDropdowns();
  populateSupplierDropdowns();
  renderCatalog();
  renderCart();
  renderPosSalesHistory();
  renderInventoryTable();
  if (typeof renderQuickPricingTable === "function") renderQuickPricingTable();
  renderBundlesTable();
  renderWasteTable();
  renderSuppliersTable();
  renderAllPurchasesTable();
  renderExpensesTable();
  populateAllProductDatalists();
  updateAllBadges();
  
  // Set version in footer
  const vEl = document.getElementById("appVersion");
  if(vEl) vEl.innerText = "v3.0.0 (Enterprise Financial & Tax Architecture)";
}

// Start app when DOM is ready
document.addEventListener("DOMContentLoaded", initializeApp);
