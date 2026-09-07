/* ===================================================================
   UI UTILITIES — Tabs, Modals, Toast, Helpers
   =================================================================== */

// ── Tab Switching ──
function switchTab(tabId) {
  document.querySelectorAll(".tab-pane").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach(el => el.classList.remove("active"));

  const target = document.getElementById("tab-" + tabId);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-tab").forEach(t => {
    if (t.dataset.tab === tabId) {
      t.classList.add("active");
      try { t.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }); } catch(e) {}
    }
  });

  const fab = document.getElementById("mobileCartFab");
  if (fab) {
    fab.style.display = (tabId === "pos" && window.cart && window.cart.length > 0) ? "inline-flex" : "none";
  }

  if (tabId === "pos") { renderCatalog(); renderPosSalesHistory(); }
  if (tabId === "orders") renderOrdersTab();
  if (tabId === "inventory") {
    const activeSub = document.querySelector("#tab-inventory .subtab-view.active");
    if (!activeSub) {
      switchInvSubtab("stock");
    } else {
      if (typeof renderInventoryTable === "function") renderInventoryTable();
      if (typeof renderQuickPricingTable === "function") renderQuickPricingTable();
      else if (typeof window.renderQuickPricingTable === "function") window.renderQuickPricingTable();
      if (typeof renderBundlesTable === "function") renderBundlesTable();
      if (typeof renderWasteTable === "function") renderWasteTable();
    }
  }
  if (tabId === "crm") renderCRM();
  if (tabId === "procurement") renderSuppliersTable();
  if (tabId === "expenses") renderExpensesTable();
}

function switchSubtab(container, prefix, subId, renderFn) {
  document.querySelectorAll(`#${container} .subtab-view`).forEach(el => el.classList.remove("active"));
  document.querySelectorAll(`#${container} .subtab-btn`).forEach(el => el.classList.remove("active"));

  const target = document.getElementById(prefix + subId);
  if (target) target.classList.add("active");

  document.querySelectorAll(`#${container} .subtab-btn`).forEach(b => {
    if (b.dataset.sub === subId) b.classList.add("active");
  });

  if (typeof renderFn === "function") {
    try { renderFn(); } catch(e) { console.error("renderFn error:", e); }
  }
}

// Convenience wrappers for each section's subtabs
function switchInvSubtab(subId) {
  let fn = null;
  if (subId === "stock") {
    fn = typeof renderInventoryTable === "function" ? renderInventoryTable : window.renderInventoryTable;
  } else if (subId === "quick-pricing") {
    fn = typeof renderQuickPricingTable === "function" ? renderQuickPricingTable : window.renderQuickPricingTable;
  } else if (subId === "bundles") {
    fn = typeof renderBundlesTable === "function" ? renderBundlesTable : window.renderBundlesTable;
  } else if (subId === "waste") {
    fn = typeof renderWasteTable === "function" ? renderWasteTable : window.renderWasteTable;
  }
  
  switchSubtab("tab-inventory", "subtab-inv-", subId, fn);

  if (subId === "quick-pricing") {
    if (typeof window.renderQuickPricingTable === "function") {
      try { window.renderQuickPricingTable(); } catch(e) { console.error(e); }
    }
  }
}
function switchOrdersSubtab(subId) {
  const fns = { pending: renderSingleOrdersList, platform: renderPlatformOrdersGrouped, delivered: renderDeliveredOrdersList };
  switchSubtab("tab-orders", "subtab-orders-", subId, fns[subId]);
}
function switchCrmSubtab(subId) {
  const fns = { customers: renderCRM, credit: renderCreditBook };
  switchSubtab("tab-crm", "subtab-", subId, fns[subId]);
}
function switchProcSubtab(subId) {
  const fns = { suppliers: renderSuppliersTable, "all-purchases": renderAllPurchasesTable, deficits: renderDeficitsTable };
  switchSubtab("tab-procurement", "subtab-", subId, fns[subId]);
}

// ── Modals ──
function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add("show");
  }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove("show");
  }
}

window.openModal = openModal;
window.closeModal = closeModal;

// ── Toast Notifications ──
function toast(msg, type = "success", duration = 3000) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.style.animationDuration = `0.3s, 0.3s`;
  t.style.animationDelay = `0s, ${(duration - 300) / 1000}s`;
  t.innerHTML = `<span>${msg}</span>`;
  container.appendChild(t);

  setTimeout(() => t.remove(), duration);
}

// ── Badge Updates ──
function updateAllBadges() {
  const el = (id, val) => { const e = document.getElementById(id); if (e) e.innerText = val; };

  el("pendingOrdersCount", (window.orders || orders || []).length);
  el("ordersPendingBadge", (window.orders || orders || []).length);
  el("platformPendingBadge", (window.platformPendingOrders || platformPendingOrders || []).length);
  el("holdCountBadge", (window.heldCarts || heldCarts || []).length);

  const custs = window.customers || customers || [];
  const creditTotal = custs.reduce((s, c) => s + (c.balance || 0), 0);
  el("creditTotalBadge", creditTotal.toFixed(2) + " TL");

  const sups = window.suppliers || suppliers || [];
  const supplierDebt = sups.reduce((s, sup) => s + (sup.balance || 0), 0);
  el("supplierDebtBadge", supplierDebt.toFixed(2) + " TL");

  if (typeof renderDualFinancialOverviewCard === "function") {
    renderDualFinancialOverviewCard();
  } else if (typeof updateVatReconciliationWidget === "function") {
    updateVatReconciliationWidget();
  }
}

// ── Populate Datalists ──
function populateAllProductDatalists() {
  try {
    const rawProds = (window.products || products || []).filter(p => p && !p.isBundle);
    const escapeAttr = s => String(s || "").replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    const opts = rawProds.map(p => {
      const safeName = escapeAttr(p.name);
      const details = [p.barcode ? `Barkod: ${p.barcode}` : '', p.category ? `[${p.category}]` : '', `Stok: ${p.stock || 0}`].filter(Boolean).join(" · ");
      return `<option value="${safeName}">${escapeAttr(details)}</option>`;
    }).join("");

    ["existingProductsSearchList", "bundleProductsSearchList", "wasteProductsSearchList", "existingProductsForDeficitList", "existingProductsList"]
      .forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = opts; });
  } catch (e) {
    console.error("populateAllProductDatalists error:", e);
  }
}

function populateCategoryDropdowns() {
  try {
    let catList = Array.isArray(window.categories) ? window.categories : (typeof categories !== "undefined" && Array.isArray(categories) ? categories : []);
    if (!catList || catList.length === 0) {
      catList = ["Kedi", "Köpek", "Kuş / Kemirgen", "Açık Mama", "Kum / Kozmetik", "Kampanyalar"];
    }

    const invSel = document.getElementById("invCatFilter");
    if (invSel) {
      const prev = invSel.value || "TÜMÜ";
      invSel.innerHTML = `<option value="TÜMÜ">Tüm Kategoriler</option>` + catList.map(c => `<option value="${c}">${c}</option>`).join("");
      if ([...invSel.options].some(o => o.value === prev)) {
        invSel.value = prev;
      }
    }

    const npSel = document.getElementById("npCategory");
    if (npSel) {
      const prevNp = npSel.value;
      npSel.innerHTML = catList.map(c => `<option value="${c}">${c}</option>`).join("");
      if (prevNp && [...npSel.options].some(o => o.value === prevNp)) {
        npSel.value = prevNp;
      }
    }
  } catch (e) {
    console.error("populateCategoryDropdowns error:", e);
  }
}

function populateSupplierDropdowns() {
  try {
    const sups = Array.isArray(window.suppliers) ? window.suppliers : (typeof suppliers !== "undefined" && Array.isArray(suppliers) ? suppliers : []);
    const opts = `<option value="-">Seçilmedi</option>` + sups.filter(s => s && s.name).map(s => `<option value="${s.name}">${s.name}</option>`).join("");
    const pSel = document.getElementById("npSupplierSelect");
    if (pSel) pSel.innerHTML = opts;

    const iSel = document.getElementById("intakeSupSelect");
    if (iSel) iSel.innerHTML = sups.filter(s => s && s.name).map(s => `<option value="${s.name}">${s.name}</option>`).join("");
  } catch (e) {
    console.error("populateSupplierDropdowns error:", e);
  }
}

function updateCustomerDropdown() {
  const sel = document.getElementById("cartCustomerSelect");
  if (sel) sel.innerHTML = '<option value="">👤 Tezgâh Satışı (Anonim)</option>' + customers.map(c => `<option value="${c.id}">${c.name}</option>`).join("");

  const dl = document.getElementById("dispatchCustomerList");
  if (dl) dl.innerHTML = customers.map(c => `<option value="${c.name} - ${c.phone || ''}">`).join("");
}

// ── Date/Time Helpers ──
function nowDate() { return new Date().toLocaleDateString("tr-TR"); }
function nowTime() { return new Date().toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' }); }
