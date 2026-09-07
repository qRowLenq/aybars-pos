/* ===================================================================
   APP INIT & CORE FUNCTIONALITY — Backup, Daily Close, Startup
   =================================================================== */

// ── Daily Close (Gün Sonu Kapanış) ──
function openDailyCloseModal() {
  document.querySelectorAll(".banknote-grid .fc").forEach(inp => inp.value = "");
  document.getElementById("dcTotalCash").innerText = "0.00 ₺";
  calculateDailyClose();
  renderDailyCloseSalesTable();
  openModal("dailyCloseModal");
}

function calculateDailyClose() {
  const getVal = id => Number(document.getElementById(id)?.value) || 0;
  
  const b200 = getVal("b200") * 200;
  const b100 = getVal("b100") * 100;
  const b50 = getVal("b50") * 50;
  const b20 = getVal("b20") * 20;
  const b10 = getVal("b10") * 10;
  const b5 = getVal("b5") * 5;
  const coin = getVal("bCoin");

  const actualTotal = b200 + b100 + b50 + b20 + b10 + b5 + coin;
  const totalCashEl = document.getElementById("dcTotalCash");
  if (totalCashEl) totalCashEl.innerText = actualTotal.toFixed(2) + " ₺";

  const today = nowDate();
  const todaySales = salesHistory.filter(s => s.date === today);

  let cashSales = 0;
  let cardSales = 0;
  let totalSales = 0;

  todaySales.forEach(s => {
    const { cash, card } = getSaleCashAndCard(s);
    cashSales += cash;
    cardSales += card;
    totalSales += (Number(s.total) || 0);
  });

  const cardSalesEl = document.getElementById("dcCardSales");
  if (cardSalesEl) cardSalesEl.innerText = cardSales.toFixed(2) + " ₺";

  const cashSalesEl = document.getElementById("dcCashSalesDisplay");
  if (cashSalesEl) cashSalesEl.innerText = cashSales.toFixed(2) + " ₺";

  const totalSalesEl = document.getElementById("dcTotalSalesDisplay");
  if (totalSalesEl) totalSalesEl.innerText = totalSales.toFixed(2) + " ₺";

  const countDisplayEl = document.getElementById("dcSaleCountDisplay");
  if (countDisplayEl) countDisplayEl.innerText = `${todaySales.length} işlem`;

  // Kasada olması beklenen nakit
  const expectedCash = cashSales;
  const expCashEl = document.getElementById("dcExpectedCash");
  if (expCashEl) expCashEl.innerText = expectedCash.toFixed(2) + " ₺";
  
  const diff = actualTotal - expectedCash;
  const diffEl = document.getElementById("dcDifference");
  if (diffEl) {
    diffEl.innerText = (diff > 0 ? "+" : "") + diff.toFixed(2) + " ₺";
    diffEl.className = diff >= 0 ? (diff === 0 ? "text-success font-bold" : "text-primary font-bold") : "text-danger font-bold";
  }
}

function renderDailyCloseSalesTable() {
  const tbody = document.getElementById("dcSalesTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const today = nowDate();
  const todaySales = salesHistory.filter(s => s.date === today);

  if (todaySales.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:16px;">Bugün henüz satış yapılmadı.</td></tr>`;
    return;
  }

  todaySales.forEach(s => {
    let badgeStyle = "background:#f1f5f9; color:#334155; border:1px solid #cbd5e1;";
    let badgeIcon = "💳";
    const pType = (s.paymentType || "").toLowerCase();
    if (pType.includes("nakit") && !pType.includes("parçalı")) {
      badgeStyle = "background:#f0fdf4; color:#166534; border:1px solid #bbf7d0;";
      badgeIcon = "💵";
    } else if (pType.includes("kart") && !pType.includes("parçalı")) {
      badgeStyle = "background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;";
      badgeIcon = "💳";
    } else if (pType.includes("parçalı")) {
      badgeStyle = "background:#faf5ff; color:#7e22ce; border:1px solid #e9d5ff;";
      badgeIcon = "✂️";
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-weight:600; color:#64748b;">${s.time || "-"}</td>
      <td><span class="badge" style="font-size:11px; font-weight:600; ${badgeStyle}">${badgeIcon} ${s.paymentType}</span></td>
      <td style="max-width:280px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${s.itemsSummary || ''}">${s.itemsSummary || '-'}</td>
      <td style="text-align:right; font-weight:700; color:#0f172a;">${Number(s.total).toFixed(2)} ₺</td>
    `;
    tbody.appendChild(tr);
  });
}

function completeDailyClose() {
  const actualStr = document.getElementById("dcTotalCash")?.innerText.replace("₺", "").trim() || "0";
  const actualNum = parseFloat(actualStr.replace(/\./g, "").replace(",", ".")) || 0;
  const expStr = document.getElementById("dcExpectedCash")?.innerText.replace("₺", "").trim() || "0";
  const expNum = parseFloat(expStr.replace(/\./g, "").replace(",", ".")) || 0;
  const diffNum = actualNum - expNum;

  const today = nowDate();
  const todaySales = salesHistory.filter(s => s.date === today);
  let cashSales = 0;
  let cardSales = 0;
  let totalSales = 0;

  todaySales.forEach(s => {
    const { cash, card } = getSaleCashAndCard(s);
    cashSales += cash;
    cardSales += card;
    totalSales += (Number(s.total) || 0);
  });
  
  sendToGoogleSheets({ 
    action: "daily_close", 
    date: nowDate(),
    time: nowTime(),
    actualCash: actualNum,
    expectedCash: expNum,
    cashSales: cashSales,
    cardSales: cardSales,
    totalSales: totalSales,
    difference: diffNum 
  });

  closeModal("dailyCloseModal");
  toast("🏁 Gün sonu sayımı ve ciro özeti başarıyla kaydedildi!");
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
