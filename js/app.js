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
  const todaySales = (salesHistory || []).filter(s => s.date === today);

  let cashSales = 0;
  let cardSales = 0;
  let transferSales = 0;
  let totalRevenue = 0;

  let cardCount = 0;
  let cashCount = 0;
  let transferCount = 0;

  todaySales.forEach(s => {
    const bk = (typeof getSalePaymentBreakdown === "function") 
      ? getSalePaymentBreakdown(s) 
      : { cash: Number(s.splitCash) || 0, card: Number(s.splitCard) || 0, transfer: Number(s.splitTransfer) || 0 };
    
    cashSales += bk.cash;
    cardSales += bk.card;
    transferSales += bk.transfer;
    totalRevenue += (Number(s.total) || 0);

    if (bk.card > 0) cardCount++;
    if (bk.cash > 0) cashCount++;
    if (bk.transfer > 0) transferCount++;
  });

  // + Müşteri veresiye tahsilatları
  if (Array.isArray(window.customers || customers)) {
    (window.customers || customers).forEach(c => {
      (c.purchaseHistory || []).filter(h => h.date === today && (h.payment || "").includes("Tahsilat")).forEach(h => {
        const p = (h.payment || "").toLowerCase();
        const amt = Number(h.total) || 0;
        if (p.includes("nakit")) {
          cashSales += amt;
          cashCount++;
        } else if (p.includes("kart")) {
          cardSales += amt;
          cardCount++;
        } else if (p.includes("havale") || p.includes("iban")) {
          transferSales += amt;
          transferCount++;
        }
      });
    });
  }

  // EN ALTTA TOPLAT: Günlük Toplam Gelir (Ciro) = Kredi Kartı + Nakit + Havale
  const totalRevenue = cashSales + cardSales + transferSales;

  // - Nakit Çıkan Giderler
  let cashExpenses = 0;
  if (Array.isArray(window.expenses || expenses)) {
    (window.expenses || expenses).filter(e => e.date === today && (
      (e.paymentMethod && (e.paymentMethod.includes("Nakit") || e.paymentMethod.includes("Kasa"))) ||
      (e.source && (e.source.includes("Nakit") || e.source.includes("Kasa"))) ||
      e.status === "Peşin Ödendi"
    )).forEach(e => {
      cashExpenses += (Number(e.amount) || 0);
    });
  }

  // - Nakit Toptancı Ödemeleri
  if (Array.isArray(window.suppliers || suppliers)) {
    (window.suppliers || suppliers).forEach(s => {
      (s.transactions || []).filter(t => t.date === today && t.type === "Ödeme" && (t.item || "").includes("Kasa (Nakit)")).forEach(t => {
        cashExpenses += (Number(t.amount) || 0);
      });
    });
  }

  // UI Güncelleme: Kredi Kartı
  const cardEl = document.getElementById("dcCardSales");
  if (cardEl) cardEl.innerText = cardSales.toFixed(2) + " ₺";
  const cardCountEl = document.getElementById("dcCardCount");
  if (cardCountEl) cardCountEl.innerText = `${cardCount} işlem`;

  // UI Güncelleme: Nakit
  const cashEl = document.getElementById("dcCashSalesDisplay");
  if (cashEl) cashEl.innerText = cashSales.toFixed(2) + " ₺";
  const cashCountEl = document.getElementById("dcCashCount");
  if (cashCountEl) cashCountEl.innerText = `${cashCount} işlem`;

  // UI Güncelleme: Havale / IBAN
  const transferEl = document.getElementById("dcTransferSales");
  if (transferEl) transferEl.innerText = transferSales.toFixed(2) + " ₺";
  const transferCountEl = document.getElementById("dcTransferCount");
  if (transferCountEl) transferCountEl.innerText = `${transferCount} işlem`;

  // EN ALTTA TOPLAT: Günlük Toplam Gelir (Ciro)
  const totalRevEl = document.getElementById("dcTotalSalesDisplay");
  if (totalRevEl) totalRevEl.innerText = totalRevenue.toFixed(2) + " ₺";
  const totalCountEl = document.getElementById("dcTotalCountDisplay");
  if (totalCountEl) totalCountEl.innerText = `Toplam ${cardCount + cashCount + transferCount} işlem`;

  // Kasada olması beklenen nakit
  const expectedCash = Math.max(0, cashSales - cashExpenses);
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
  const todaySales = (salesHistory || []).filter(s => s.date === today);

  if (todaySales.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:16px;">Bugün henüz satış yapılmadı.</td></tr>`;
    return;
  }

  todaySales.forEach(s => {
    let badgeStyle = "background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;";
    let badgeIcon = "💳";
    const pType = (s.paymentType || "").toLowerCase();
    if (pType.includes("nakit") && !pType.includes("parçalı")) {
      badgeStyle = "background:#f0fdf4; color:#166534; border:1px solid #bbf7d0;";
      badgeIcon = "💵";
    } else if (pType.includes("havale") || pType.includes("iban") || pType.includes("eft")) {
      badgeStyle = "background:#f0f9ff; color:#0369a1; border:1px solid #bae6fd;";
      badgeIcon = "📲";
    } else if (pType.includes("parçalı")) {
      badgeStyle = "background:#faf5ff; color:#7e22ce; border:1px solid #e9d5ff;";
      badgeIcon = "✂️";
    } else if (pType.includes("veresiye")) {
      badgeStyle = "background:#fef2f2; color:#b91c1c; border:1px solid #fecaca;";
      badgeIcon = "📝";
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
  const todaySales = (salesHistory || []).filter(s => s.date === today);
  let cashSales = 0;
  let cardSales = 0;
  let transferSales = 0;

  todaySales.forEach(s => {
    const bk = (typeof getSalePaymentBreakdown === "function") 
      ? getSalePaymentBreakdown(s) 
      : { cash: Number(s.splitCash) || 0, card: Number(s.splitCard) || 0, transfer: Number(s.splitTransfer) || 0 };
    cashSales += bk.cash;
    cardSales += bk.card;
    transferSales += bk.transfer;
  });

  // + Müşteri veresiye tahsilatları
  if (Array.isArray(window.customers || customers)) {
    (window.customers || customers).forEach(c => {
      (c.purchaseHistory || []).filter(h => h.date === today && (h.payment || "").includes("Tahsilat")).forEach(h => {
        const p = (h.payment || "").toLowerCase();
        const amt = Number(h.total) || 0;
        if (p.includes("nakit")) {
          cashSales += amt;
        } else if (p.includes("kart")) {
          cardSales += amt;
        } else if (p.includes("havale") || p.includes("iban")) {
          transferSales += amt;
        }
      });
    });
  }

  const totalRevenue = cashSales + cardSales + transferSales;

  let cashExpenses = 0;
  if (Array.isArray(window.expenses || expenses)) {
    (window.expenses || expenses).filter(e => e.date === today && (
      (e.paymentMethod && (e.paymentMethod.includes("Nakit") || e.paymentMethod.includes("Kasa"))) ||
      (e.source && (e.source.includes("Nakit") || e.source.includes("Kasa"))) ||
      e.status === "Peşin Ödendi"
    )).forEach(e => cashExpenses += (Number(e.amount) || 0));
  }

  if (Array.isArray(window.suppliers || suppliers)) {
    (window.suppliers || suppliers).forEach(s => {
      (s.transactions || []).filter(t => t.date === today && t.type === "Ödeme" && (t.item || "").includes("Kasa (Nakit)")).forEach(t => cashExpenses += (Number(t.amount) || 0));
    });
  }
  
  sendToGoogleSheets({ 
    action: "daily_close", 
    date: nowDate(),
    time: nowTime(),
    actualCash: actualNum,
    expectedCash: expNum,
    cashSales: cashSales,
    cardSales: cardSales,
    transferSales: transferSales,
    totalSales: totalRevenue,
    cashExpenses: cashExpenses,
    difference: diffNum 
  });

  closeModal("dailyCloseModal");
  toast("🏁 Gün sonu sayımı ve gelir özeti başarıyla kaydedildi!");
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
  try { loadState(); } catch(e) { console.error("loadState error:", e); }
  try { initCategoryBar(); } catch(e) { console.error("initCategoryBar error:", e); }
  try { populateCategoryDropdowns(); } catch(e) { console.error("populateCategoryDropdowns error:", e); }
  try { populateSupplierDropdowns(); } catch(e) { console.error("populateSupplierDropdowns error:", e); }
  try { renderCatalog(); } catch(e) { console.error("renderCatalog error:", e); }
  try { renderCart(); } catch(e) { console.error("renderCart error:", e); }
  try { renderPosSalesHistory(); } catch(e) { console.error("renderPosSalesHistory error:", e); }
  try { renderInventoryTable(); } catch(e) { console.error("renderInventoryTable error:", e); }
  try {
    if (typeof renderQuickPricingTable === "function") renderQuickPricingTable();
    else if (typeof window.renderQuickPricingTable === "function") window.renderQuickPricingTable();
  } catch(e) { console.error("renderQuickPricingTable error:", e); }
  try { renderBundlesTable(); } catch(e) { console.error("renderBundlesTable error:", e); }
  try { renderWasteTable(); } catch(e) { console.error("renderWasteTable error:", e); }
  try { renderSuppliersTable(); } catch(e) { console.error("renderSuppliersTable error:", e); }
  try { renderAllPurchasesTable(); } catch(e) { console.error("renderAllPurchasesTable error:", e); }
  try { renderExpensesTable(); } catch(e) { console.error("renderExpensesTable error:", e); }
  try { populateAllProductDatalists(); } catch(e) { console.error("populateAllProductDatalists error:", e); }
  try { updateAllBadges(); } catch(e) { console.error("updateAllBadges error:", e); }
  
  // Set version in footer
  const vEl = document.getElementById("appVersion");
  if(vEl) vEl.innerText = "v3.0.0 (Enterprise Financial & Tax Architecture)";
}

// Start app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
