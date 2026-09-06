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
  
  // Calculate expected cash
  let expectedCash = 0;
  
  // + Cash Sales
  const todaySales = salesHistory.filter(s => s.date === today && s.paymentType.includes("Nakit"));
  expectedCash += todaySales.reduce((s, x) => s + x.total, 0);
  
  // + Debt Collections (Cash)
  customers.forEach(c => {
    (c.purchaseHistory || []).filter(h => h.date === today && h.payment.includes("Nakit Tahsil Edildi")).forEach(h => {
      expectedCash += h.total;
    });
  });

  // - Expenses (Cash)
  const todayExpenses = expenses.filter(e => e.date === today && (e.status === "Peşin Ödendi" || e.source === "Kasa (Nakit)"));
  expectedCash -= todayExpenses.reduce((s, x) => s + x.amount, 0);

  // - Supplier Payments (Cash)
  suppliers.forEach(s => {
    (s.transactions || []).filter(t => t.date === today && t.type === "Ödeme" && t.item.includes("Kasa (Nakit)")).forEach(t => {
      expectedCash -= t.amount;
    });
  });

  document.getElementById("dcExpectedCash").innerText = expectedCash.toFixed(2) + " ₺";
  
  const diff = actualTotal - expectedCash;
  const diffEl = document.getElementById("dcDifference");
  diffEl.innerText = (diff > 0 ? "+" : "") + diff.toFixed(2) + " ₺";
  diffEl.className = diff >= 0 ? (diff === 0 ? "text-success font-bold" : "text-primary font-bold") : "text-danger font-bold";
}

function completeDailyClose() {
  const diff = document.getElementById("dcDifference").innerText;
  const actual = document.getElementById("dcTotalCash").innerText;
  
  sendToGoogleSheets({ 
    action: "daily_close", 
    date: nowDate(),
    time: nowTime(),
    actualCash: actual,
    difference: diff 
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

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.categories) categories = data.categories;
      if (data.products) products = data.products;
      if (data.customers) customers = data.customers;
      if (data.orders) orders = data.orders;
      if (data.platformPendingOrders) platformPendingOrders = data.platformPendingOrders;
      if (data.deliveredOrders) deliveredOrders = data.deliveredOrders;
      if (data.salesHistory) salesHistory = data.salesHistory;
      if (data.expenses) expenses = data.expenses;
      if (data.manualDeficits) manualDeficits = data.manualDeficits;
      if (data.suppliers) suppliers = data.suppliers;
      if (data.heldCarts) heldCarts = data.heldCarts;
      if (data.bundles) bundles = data.bundles;
      if (data.wasteRecords) wasteRecords = data.wasteRecords;
      
      saveData();
      initializeApp();
      toast("📥 Yedek başarıyla yüklendi!");
    } catch(err) {
      toast("Hatalı yedek dosyası!", "error");
      console.error(err);
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
  renderBundlesTable();
  renderWasteTable();
  renderSuppliersTable();
  renderAllPurchasesTable();
  renderExpensesTable();
  populateAllProductDatalists();
  updateAllBadges();
  
  // Set version in footer
  const vEl = document.getElementById("appVersion");
  if(vEl) vEl.innerText = "v2.1.0 (Smart VAT & Inventory Pro)";
}

// Start app when DOM is ready
document.addEventListener("DOMContentLoaded", initializeApp);
