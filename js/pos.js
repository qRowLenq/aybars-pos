/* ===================================================================
   POS MODULE — Catalog, Cart, Sales, Refund
   =================================================================== */

var selectedCategory = (typeof window !== "undefined" && window.selectedCategory) ? window.selectedCategory : "TÜMÜ";
if (typeof window !== "undefined") window.selectedCategory = selectedCategory;

function getActiveCategories() {
  const def = ["Kedi", "Köpek", "Kuş / Kemirgen", "Açık Mama", "Kum / Kozmetik", "Kampanyalar"];
  let list = (typeof window !== "undefined" && Array.isArray(window.categories) && window.categories.length > 0)
    ? window.categories
    : ((typeof categories !== "undefined" && Array.isArray(categories) && categories.length > 0) ? categories : def);
  const clean = Array.from(new Set(list.filter(c => c && typeof c === "string" && c.trim())));
  return clean.length > 0 ? clean : def;
}

// ── Category Helper ──
function getCatBadgeClass(cat) {
  if (!cat) return "cat-badge-default";
  const c = cat.toLowerCase();
  if (c.includes("kedi")) return "cat-badge-cat";
  if (c.includes("köpek") || c.includes("kopek")) return "cat-badge-dog";
  if (c.includes("kuş") || c.includes("kus") || c.includes("kemirgen")) return "cat-badge-bird";
  if (c.includes("açık") || c.includes("acik") || c.includes("mama")) return "cat-badge-food";
  if (c.includes("kum") || c.includes("kozmetik")) return "cat-badge-care";
  return "cat-badge-default";
}

// ── Category Bar ──
function initCategoryBar() {
  const bar = document.getElementById("categoryFilterBar");
  if (!window.selectedCategory) window.selectedCategory = "TÜMÜ";
  selectedCategory = window.selectedCategory;

  const catList = getActiveCategories();
  if (typeof window !== "undefined") window.categories = catList;
  if (typeof categories !== "undefined") categories = catList;

  if (bar) {
    let html = `<button class="cat-chip ${selectedCategory === 'TÜMÜ' ? 'active' : ''}" onclick="filterCategory('TÜMÜ')">TÜMÜ</button>`;
    catList.forEach(cat => {
      html += `<button class="cat-chip ${selectedCategory === cat ? 'active' : ''}" onclick="filterCategory('${cat}')">${cat}</button>`;
    });
    html += `<button class="btn btn-ghost btn-xs" style="border-radius:var(--radius-full); margin-left:4px;" onclick="promptNewCategory()">+ Kategori</button>`;
    bar.innerHTML = html;
  }

  const posSel = document.getElementById("posCatFilter");
  if (posSel && posSel.value !== selectedCategory) {
    posSel.value = selectedCategory;
  }

  populateCategoryDropdowns();
}

function promptNewCategory() {
  const newCat = prompt("Yeni kategori adı:");
  if (newCat && newCat.trim()) {
    const trimmed = newCat.trim();
    const catList = getActiveCategories();
    if (!catList.includes(trimmed)) {
      catList.push(trimmed);
      if (typeof window !== "undefined") window.categories = catList;
      if (typeof categories !== "undefined") categories = catList;
      saveData();
      initCategoryBar();
      populateCategoryDropdowns();
    }
  }
}

function filterCategory(cat) {
  selectedCategory = cat || "TÜMÜ";
  if (typeof window !== "undefined") window.selectedCategory = selectedCategory;

  const posSel = document.getElementById("posCatFilter");
  if (posSel && posSel.value !== selectedCategory) {
    posSel.value = selectedCategory;
  }

  initCategoryBar();
  renderCatalog();
}

// ── Catalog Grid ──
function renderCatalog() {
  const search = (document.getElementById("catalogSearch")?.value || "").trim().toLowerCase();
  const grid = document.getElementById("productGrid");
  if (!grid) return;
  grid.innerHTML = "";

  if (!window.selectedCategory) window.selectedCategory = "TÜMÜ";
  selectedCategory = window.selectedCategory;

  // Ürün havuzunu tüm güvenli kaynaklardan garantiye al
  let prodList = (typeof window !== "undefined" && Array.isArray(window.products) && window.products.length > 0)
    ? window.products
    : ((typeof products !== "undefined" && Array.isArray(products) && products.length > 0)
      ? products
      : ((typeof window !== "undefined" && Array.isArray(window.catalogProducts) && window.catalogProducts.length > 0)
        ? window.catalogProducts
        : ((typeof catalogProducts !== "undefined" && Array.isArray(catalogProducts)) ? catalogProducts : [])));

  if (!prodList) prodList = [];

  const filtered = prodList.filter(p => {
    if (!p) return false;
    const catMatch = (selectedCategory === "TÜMÜ" || !selectedCategory || (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase()));
    const nameMatch = !search || (p.name && p.name.toLowerCase().includes(search)) || (p.barcode && String(p.barcode).includes(search));
    return catMatch && nameMatch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1; padding:32px 16px; text-align:center;">
      <div style="font-size:32px; margin-bottom:8px;">📦</div>
      <div style="font-weight:600; color:var(--text-muted); font-size:13.5px;">${selectedCategory === 'TÜMÜ' ? 'Sistemde henüz ürün bulunmuyor.' : `"${selectedCategory}" kategorisinde ürün bulunamadı.`}</div>
      <div class="flex gap-2 justify-center mt-3">
        <button class="btn btn-outline btn-sm" onclick="filterCategory('TÜMÜ')">Tüm Ürünleri Göster</button>
        <button class="btn btn-primary btn-sm" onclick="openAddProductModal()">+ Yeni Ürün Ekle</button>
      </div>
    </div>`;
    return;
  }

  filtered.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    const curStock = (p.stock !== undefined && p.stock !== null) ? Number(p.stock) : 0;
    const curPrice = (p.price !== undefined && p.price !== null) ? Number(p.price) : 0;
    const catName = p.category || 'Genel';
    const badgeClass = getCatBadgeClass(catName);

    card.innerHTML = `
      <div class="p-top-row">
        <span class="p-cat-badge ${badgeClass}" title="Kategori: ${catName}">${catName}</span>
      </div>
      <div class="p-name" title="${p.name}">${p.name}</div>
      <div class="p-footer">
        <span class="p-stock ${curStock <= 2 ? 'critical' : ''}">Stok: ${curStock}</span>
        <span class="p-price">${curPrice.toFixed(2)} ₺</span>
      </div>`;
    card.onclick = () => addToCart(p);
    grid.appendChild(card);
  });
}

// ── Cart ──
function addToCart(p) {
  const item = cart.find(i => i.id === p.id);
  const vatRate = p.vatRate !== undefined ? p.vatRate : 20;
  if (item) item.qty++;
  else cart.push({ ...p, vatRate, qty: 1, customPrice: p.price });
  renderCart();
}

function changeCartQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
  renderCart();
}

function editCartItemPrice(id) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  const val = prompt(`"${item.name}" için özel fiyat (TL):`, item.customPrice);
  if (val !== null) {
    const p = parseFloat(val);
    if (!isNaN(p) && p >= 0) { item.customPrice = p; renderCart(); }
    else toast("Geçersiz fiyat!", "error");
  }
}

function renderCart() {
  const container = document.getElementById("cartItems");
  if (!container) return;
  container.innerHTML = "";
  let total = 0;
  let vatTotal = 0;

  cart.forEach(item => {
    const lineTotal = item.qty * item.customPrice;
    const rate = Number(item.vatRate !== undefined ? item.vatRate : 20);
    const itemVat = rate > 0 ? (lineTotal - (lineTotal / (1 + rate / 100))) : 0;
    total += lineTotal;
    vatTotal += itemVat;

    container.innerHTML += `
      <div class="cart-item">
        <div class="ci-info">
          <b>${item.name}</b>
          <span class="text-sm text-muted">${item.customPrice.toFixed(2)} ₺ <span class="badge" style="font-size:10px; padding:1px 5px; background:#f1f5f9; color:#475569;">%${rate} KDV</span></span>
          <span class="price-edit-link" onclick="editCartItemPrice(${item.id})">✏️ Fiyat</span>
        </div>
        <div class="ci-qty">
          <button class="qty-btn" onclick="changeCartQty(${item.id}, -1)">−</button>
          <span class="font-bold">${item.qty}</span>
          <button class="qty-btn" onclick="changeCartQty(${item.id}, 1)">+</button>
        </div>
        <div class="font-bold">${lineTotal.toFixed(2)} ₺</div>
      </div>`;
  });

  const totalEl = document.getElementById("cartTotalDisplay");
  if (totalEl) totalEl.innerText = total.toFixed(2) + " ₺";

  const vatEl = document.getElementById("cartVatDisplay");
  if (vatEl) vatEl.innerText = vatTotal.toFixed(2) + " ₺";

  const fab = document.getElementById("mobileCartFab");
  if (fab) {
    if (cart.length > 0 && window.innerWidth <= 992) {
      fab.classList.add("is-mobile-active");
      fab.style.display = "inline-flex";
      const fabTotal = document.getElementById("mobileFabTotal");
      if (fabTotal) fabTotal.innerText = total.toFixed(2) + " ₺";
    } else {
      fab.classList.remove("is-mobile-active");
      fab.style.display = "none";
    }
  }

  updateCustomerDropdown();
}

function scrollToCart() {
  const cartEl = document.querySelector(".cart-area");
  if (cartEl) cartEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── Complete Sale ──
function completeSale(payType, splitDetails = null, splitData = null) {
  if (cart.length === 0) return toast("Sepet boş!", "warning");
  const total = cart.reduce((sum, i) => sum + (i.qty * i.customPrice), 0);
  const vatTotal = cart.reduce((sum, item) => {
    const lineTotal = item.qty * item.customPrice;
    const rate = Number(item.vatRate !== undefined ? item.vatRate : 20);
    return sum + (rate > 0 ? (lineTotal - (lineTotal / (1 + rate / 100))) : 0);
  }, 0);

  const custId = document.getElementById("cartCustomerSelect")?.value;
  const cust = customers.find(c => c.id == custId);
  const custName = cust ? cust.name : "Tezgâh";
  const itemsSummary = cart.map(i => `${i.qty}x ${i.name} (${i.customPrice.toFixed(2)} ₺)`).join(", ");

// ── FIFO Batch Stock Deduction Engine ──
function deductProductStockFIFO(prod, qtyNeeded) {
  if (!prod) return;
  prod.stock = Math.max(0, (Number(prod.stock) || 0) - qtyNeeded);

  if (Array.isArray(prod.batches) && prod.batches.length > 0) {
    // Sort batches ascending by expiry (FIFO): earliest expiring first
    prod.batches.sort((a, b) => {
      const expA = a.expiry || "9999-99";
      const expB = b.expiry || "9999-99";
      return expA.localeCompare(expB);
    });

    let remainingNeeded = qtyNeeded;
    for (let i = 0; i < prod.batches.length; i++) {
      const b = prod.batches[i];
      if (b.qty <= 0) continue;

      if (b.qty >= remainingNeeded) {
        b.qty -= remainingNeeded;
        remainingNeeded = 0;
        break;
      } else {
        remainingNeeded -= b.qty;
        b.qty = 0;
      }
    }
  }
}

  // Stock deduction (FIFO Lot / Batch-based)
  cart.forEach(item => {
    if (item.isBundle && item.bundleItems) {
      item.bundleItems.forEach(bItem => {
        const realProd = products.find(p => p.id === bItem.productId);
        if (realProd) deductProductStockFIFO(realProd, (bItem.qty * item.qty));
      });
    } else {
      const p = products.find(prod => prod.id === item.id);
      if (p) deductProductStockFIFO(p, item.qty);
    }
  });

  const isReceiptOfficial = document.getElementById("posReceiptOfficial") 
    ? document.getElementById("posReceiptOfficial").checked 
    : (document.getElementById("posCashIsOfficial") ? document.getElementById("posCashIsOfficial").checked : true);

  const payUpper = (payType || "").toUpperCase();
  const isCard = payUpper.includes("KREDİ KARTI") || payUpper.includes("KART");
  const isOfficial = isCard ? true : Boolean(isReceiptOfficial);

  let splitCash = 0;
  let splitCard = 0;
  let splitTransfer = 0;
  let splitCredit = 0;

  if (splitData) {
    splitCash = Number(splitData.splitCash) || 0;
    splitCard = Number(splitData.splitCard) || 0;
    splitTransfer = Number(splitData.splitTransfer) || 0;
    splitCredit = Number(splitData.splitCredit) || 0;
  } else {
    if (payUpper.includes("NAKİT") || payUpper.includes("NAKIT")) {
      splitCash = total;
    } else if (payUpper.includes("HAVALE") || payUpper.includes("IBAN") || payUpper.includes("EFT") || payUpper.includes("BANKA")) {
      splitTransfer = total;
    } else if (payUpper.includes("VERESİYE")) {
      splitCredit = total;
    } else {
      splitCard = total;
    }
  }

  const saleRecord = {
    id: Date.now(), date: nowDate(), time: nowTime(),
    customerName: custName, itemsSummary, soldItems: [...cart],
    total, vatTotal: Number(vatTotal.toFixed(2)),
    paymentType: splitDetails ? `Parçalı (${splitDetails})` : payType,
    splitCash: Number(splitCash.toFixed(2)),
    splitCard: Number(splitCard.toFixed(2)),
    splitTransfer: Number(splitTransfer.toFixed(2)),
    splitCredit: Number(splitCredit.toFixed(2)),
    isOfficial: Boolean(isOfficial)
  };
  salesHistory.unshift(saleRecord);

  if (cust) {
    if (!cust.purchaseHistory) cust.purchaseHistory = [];
    cust.purchaseHistory.unshift({ date: saleRecord.date, time: saleRecord.time, items: itemsSummary, total, payment: saleRecord.paymentType });
  }

  // Canlı Mali Rapor & Vergi Verilerini Hesapla
  let dualData = null;
  if (typeof calculateDualFinancialOverview === "function") {
    dualData = calculateDualFinancialOverview();
  }

  sendToGoogleSheets({
    action: "save_sale",
    date: saleRecord.date,
    time: saleRecord.time,
    customerName: custName,
    channel: "Tezgâh",
    itemsSummary,
    paymentType: saleRecord.paymentType,
    total,
    cardSales: splitCard,
    cashSales: splitCash,
    transferSales: splitTransfer,
    officialCash: isOfficial ? splitCash : 0,
    unoffCash: !isOfficial ? splitCash : 0,
    officialTransfer: isOfficial ? splitTransfer : 0,
    unoffTransfer: !isOfficial ? splitTransfer : 0,
    vatTotal: Number(vatTotal.toFixed(2)),
    isOfficial: saleRecord.isOfficial,
    // Google E-Tablo Mali Rapor gün satırını anında güncellemek için dual data
    officialSales: dualData ? Number(dualData.officialSales.toFixed(2)) : undefined,
    invoicedPurchases: dualData ? Number(dualData.invoicedPurchases.toFixed(2)) : undefined,
    expensesTotal: dualData ? Number(dualData.totalInvoicedDeductions.toFixed(2)) : undefined,
    taxBase: dualData ? Number(dualData.officialTaxBase.toFixed(2)) : undefined,
    payableVat: dualData ? Number(dualData.payableVat.toFixed(2)) : undefined,
    estimatedIncomeTax: dualData ? Number(dualData.estimatedIncomeTax.toFixed(2)) : undefined,
    netCashProfit: dualData ? Number(dualData.realProfit.toFixed(2)) : undefined,
    riskAmount: dualData ? Number(dualData.riskAmount.toFixed(2)) : undefined,
    riskStatus: dualData ? (dualData.isHighRisk ? "Yüksek Risk" : "Güvenli") : "Güvenli"
  });

  // Otomatik E-Tablo Mali Rapor Senkronizasyonu
  if (typeof syncTaxReportToSheets === "function") {
    setTimeout(syncTaxReportToSheets, 600);
  }

  cart = [];
  if (document.getElementById("cartCustomerSelect")) document.getElementById("cartCustomerSelect").value = "";
  renderCart(); renderCatalog(); renderPosSalesHistory(); saveData(); updateAllBadges();
  if (typeof renderSktRadarWidget === "function") renderSktRadarWidget();
  toast(`✅ ${total.toFixed(2)} ₺ satış tamamlandı! ${isOfficial ? '(🧾 Fişli)' : '(📝 Fişsiz)'}`);
}

function toggleRecentSalesBox() {
  const body = document.getElementById("posRecentSalesBody");
  const icon = document.getElementById("posRecentSalesToggleIcon");
  const btn = document.getElementById("btnToggleRecentSales");
  if (!body) return;
  const isHidden = body.style.display === "none";
  body.style.display = isHidden ? "block" : "none";
  if (icon) icon.innerText = isHidden ? "▼" : "▲";
  if (btn) btn.innerText = isHidden ? "▲ Daralt" : "▼ Göster";
}

function syncPosReceiptToggle() {
  const isOfficial = document.getElementById("posReceiptOfficial")?.checked;
  const legacyCheckbox = document.getElementById("posCashIsOfficial");
  if (legacyCheckbox) legacyCheckbox.checked = Boolean(isOfficial);
}

// ── Recent Sales & Refund ──
function renderPosSalesHistory() {
  const container = document.getElementById("posRecentSalesList");
  const currentWorkingDay = nowDate();
  const todaySales = salesHistory.filter(s => s.date === currentWorkingDay);

  let totalCard = 0;
  let totalCash = 0;
  let totalTransfer = 0;
  let totalAll = 0;

  todaySales.forEach(s => {
    const bk = getSalePaymentBreakdown(s);
    totalCash += (Number(bk.cash) || 0);
    totalCard += (Number(bk.card) || 0);
    totalTransfer += (Number(bk.transfer) || 0);
    totalAll += (Number(s.total) || 0);
  });

  // + Müşteri veresiye tahsilatları (Nakit / Kart / Havale)
  if (Array.isArray(window.customers || customers)) {
    (window.customers || customers).forEach(c => {
      (c.purchaseHistory || []).filter(h => h.date === currentWorkingDay && (h.payment || "").includes("Tahsilat")).forEach(h => {
        const p = (h.payment || "").toLowerCase();
        const amt = Number(h.total) || 0;
        if (p.includes("nakit")) {
          totalCash += amt;
          totalAll += amt;
        } else if (p.includes("kart")) {
          totalCard += amt;
          totalAll += amt;
        } else if (p.includes("havale") || p.includes("iban") || p.includes("eft") || p.includes("banka")) {
          totalTransfer += amt;
          totalAll += amt;
        }
      });
    });
  }

  const cardEl = document.getElementById("posSummaryCardSales");
  if (cardEl) cardEl.innerText = totalCard.toFixed(2) + " ₺";

  const cashEl = document.getElementById("posSummaryCashSales");
  if (cashEl) cashEl.innerText = totalCash.toFixed(2) + " ₺";

  const transferEl = document.getElementById("posSummaryTransferSales");
  if (transferEl) transferEl.innerText = totalTransfer.toFixed(2) + " ₺";

  const totalEl = document.getElementById("posSummaryTotalSales");
  if (totalEl) totalEl.innerText = totalAll.toFixed(2) + " ₺";

  // Gün Sonu Durum Rozeti ve Kapatıldı/Geri Aç Bildirim Kutusu
  const statusBadge = document.getElementById("posDayStatusBadge");
  const closedNoticeBox = document.getElementById("posClosedNoticeBox");
  const currentWorkingDay = nowDate();
  
  const closeRecordForCurrent = (typeof getTodayDailyCloseRecord === "function") 
    ? getTodayDailyCloseRecord(currentWorkingDay) 
    : (Array.isArray(window.dailyCloseRecords) ? window.dailyCloseRecords.find(r => r.date === currentWorkingDay) : null);

  const lastClosedRecord = (Array.isArray(window.dailyCloseRecords) && window.dailyCloseRecords.length > 0)
    ? window.dailyCloseRecords[0]
    : null;

  if (closeRecordForCurrent) {
    if (statusBadge) {
      statusBadge.innerHTML = `🔒 ${currentWorkingDay} Kapatıldı (${closeRecordForCurrent.time || ""})`;
      statusBadge.style.background = "#fee2e2";
      statusBadge.style.color = "#991b1b";
      statusBadge.style.border = "1px solid #fecaca";
    }
    if (closedNoticeBox) {
      const diffNum = Number(closeRecordForCurrent.difference) || 0;
      const diffStr = diffNum >= 0 ? `+${diffNum.toFixed(2)}` : `${diffNum.toFixed(2)}`;
      closedNoticeBox.style.display = "block";
      closedNoticeBox.innerHTML = `
        <div style="background:#fffbeb; border:1px solid #fde68a; border-left:4px solid #f59e0b; border-radius:var(--radius-sm); padding:10px 12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div style="font-size:12px; color:#92400e;">
            <b>🔒 ${currentWorkingDay} Tarihli Gün Sonu Kapatıldı (${closeRecordForCurrent.time || ""}).</b>
            <div style="font-size:11px; opacity:0.9; margin-top:2px;">
              Ciro: <b>${(Number(closeRecordForCurrent.totalRevenue) || 0).toFixed(2)} ₺</b> | Sayılan Kasa: <b>${(Number(closeRecordForCurrent.actualCash) || 0).toFixed(2)} ₺</b> | Kasa Farkı: <b>${diffStr} ₺</b>
            </div>
          </div>
          <button class="btn btn-outline btn-xs" style="border-color:#f59e0b; color:#b45309; font-weight:700; white-space:nowrap;" onclick="reopenTodayDailyClose()">
            ↩️ Yanlış Bastım - Günü Geri Aç (Eski Güne Dön)
          </button>
        </div>
      `;
    }
  } else if (lastClosedRecord && lastClosedRecord.date !== currentWorkingDay) {
    // Önceki gün kapatılmış ve yeni güne (örneğin 9 Eylül'e) geçilmiş
    if (statusBadge) {
      statusBadge.innerHTML = `🟢 ${currentWorkingDay} Açık (Yeni Gün)`;
      statusBadge.style.background = "#dcfce7";
      statusBadge.style.color = "#166534";
      statusBadge.style.border = "1px solid #bbf7d0";
    }
    if (closedNoticeBox) {
      closedNoticeBox.style.display = "block";
      closedNoticeBox.innerHTML = `
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #10b981; border-radius:var(--radius-sm); padding:9px 12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div style="font-size:12px; color:#166534;">
            <b>🏁 ${lastClosedRecord.date} Gün Sonu Kapatıldı.</b>
            <div style="font-size:11px; color:#15803d; margin-top:2px;">
              Kasa yeni çalışma gününe (<b>${currentWorkingDay}</b>) geçti. Yeni satışlar E-Tablo'daki <b>${currentWorkingDay}</b> sütununa yazılacaktır.
            </div>
          </div>
          <div class="flex gap-1 items-center">
            <button class="btn btn-outline btn-xs" style="border-color:#f59e0b; color:#b45309; font-weight:700; white-space:nowrap;" onclick="reopenTodayDailyClose()">
              ↩️ Düne Dön (${lastClosedRecord.date} Gününü Geri Aç)
            </button>
            <button class="btn btn-ghost btn-xs" style="font-size:11px;" onclick="promptChangeBusinessDate()" title="Tarihi Değiştir">
              📅 Tarih Ayarla
            </button>
          </div>
        </div>
      `;
    }
  } else {
    if (statusBadge) {
      statusBadge.innerHTML = `🟢 ${currentWorkingDay} Açık`;
      statusBadge.style.background = "#dcfce7";
      statusBadge.style.color = "#166534";
      statusBadge.style.border = "1px solid #bbf7d0";
    }
    if (closedNoticeBox) {
      closedNoticeBox.style.display = "none";
      closedNoticeBox.innerHTML = "";
    }
  }

  if (!container) return;
  container.innerHTML = "";

  if (todaySales.length === 0) {
    container.innerHTML = `<span class="text-sm text-muted">Bugün henüz satış yok.</span>`;
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

    container.innerHTML += `
      <div class="flex items-center justify-between" style="background:var(--bg); padding:7px 10px; border-radius:var(--radius-sm); border:1px solid var(--border); font-size:12px;">
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-right:8px;">
          <b>${s.time}</b> — <span class="badge" style="font-size:10.5px; padding:2px 6px; ${badgeStyle}">${badgeIcon} ${s.paymentType}</span> <b>${s.customerName || 'Tezgâh'}</b>: ${s.itemsSummary} (<b>${Number(s.total).toFixed(2)} ₺</b>)
        </span>
        <button class="btn btn-danger btn-xs" style="flex-shrink:0;" onclick="refundSale(${s.id})">↩️ İade</button>
      </div>`;
  });
}

function refundSale(saleId) {
  const sale = salesHistory.find(s => s.id === saleId);
  if (!sale) return;
  if (!confirm(`"${sale.itemsSummary}" satışını iade almak istiyor musunuz?`)) return;

  if (sale.soldItems) {
    sale.soldItems.forEach(item => {
      if (item.isBundle && item.bundleItems) {
        item.bundleItems.forEach(bItem => {
          const realProd = products.find(p => p.id === bItem.productId);
          if (realProd) realProd.stock += (bItem.qty * item.qty);
        });
      } else {
        const p = products.find(prod => prod.id === item.id);
        if (p) p.stock += item.qty;
      }
    });
  }

  const refundVat = sale.vatTotal ? -Math.abs(sale.vatTotal) : 0;
  const refundTotal = -Math.abs(sale.total);
  
  let refundCard = 0;
  let refundCash = 0;
  let refundTransfer = 0;

  if (sale.splitCard || sale.splitCash || sale.splitTransfer) {
    refundCard = sale.splitCard ? -Math.abs(sale.splitCard) : 0;
    refundCash = sale.splitCash ? -Math.abs(sale.splitCash) : 0;
    refundTransfer = sale.splitTransfer ? -Math.abs(sale.splitTransfer) : 0;
  } else {
    const pType = (sale.paymentType || "").toLowerCase();
    if (pType.includes("nakit") && !pType.includes("parçalı")) {
      refundCash = refundTotal;
    } else if (pType.includes("havale") || pType.includes("iban") || pType.includes("eft")) {
      refundTransfer = refundTotal;
    } else {
      refundCard = refundTotal;
    }
  }

  sendToGoogleSheets({
    action: "save_sale",
    date: sale.date || nowDate(),
    time: nowTime(),
    customerName: sale.customerName,
    channel: "Satış İptali / İade",
    itemsSummary: `İADE: ${sale.itemsSummary}`,
    paymentType: sale.paymentType,
    total: refundTotal,
    cardSales: refundCard,
    cashSales: refundCash,
    transferSales: refundTransfer,
    vatTotal: refundVat,
    isOfficial: sale.isOfficial !== undefined ? sale.isOfficial : true
  });

  salesHistory = salesHistory.filter(s => s.id !== saleId);
  saveData(); renderCatalog(); renderInventoryTable(); renderPosSalesHistory();

  // İade sonrası E-Tablo Mali Raporu anında güncelle
  if (typeof syncTaxReportToSheets === "function") {
    setTimeout(syncTaxReportToSheets, 600);
  }

  toast("↩️ Satış iade alındı, stok geri yüklendi!");
}

// ── Split Payment ──
function openSplitPaymentModal() {
  if (cart.length === 0) return toast("Sepet boş!", "warning");
  const total = cart.reduce((sum, i) => sum + (i.qty * i.customPrice), 0);
  document.getElementById("splitCartTotal").innerText = total.toFixed(2) + " ₺";
  document.getElementById("splitCashInput").value = "";
  document.getElementById("splitCardInput").value = total.toFixed(2);
  openModal("splitModal");
}

function calculateSplitRemaining() {
  const total = cart.reduce((sum, i) => sum + (i.qty * i.customPrice), 0);
  const cash = Number(document.getElementById("splitCashInput").value) || 0;
  document.getElementById("splitCardInput").value = Math.max(0, total - cash).toFixed(2);
}

function completeSplitSale() {
  const cash = Number(document.getElementById("splitCashInput").value) || 0;
  const card = Number(document.getElementById("splitCardInput").value) || 0;
  closeModal("splitModal");
  completeSale("Parçalı", `${cash.toFixed(2)} ₺ Nakit + ${card.toFixed(2)} ₺ Kart`, { splitCash: cash, splitCard: card, splitTransfer: 0, splitCredit: 0 });
}

// ── Veresiye (Charge to Credit) ──
function chargeToCredit() {
  const custId = document.getElementById("cartCustomerSelect")?.value;
  if (!custId) return toast("Lütfen veresiye yazılacak müşteriyi seçin!", "warning");
  const cust = customers.find(c => c.id == custId);
  const total = cart.reduce((sum, i) => sum + (i.qty * i.customPrice), 0);
  const vatTotal = cart.reduce((sum, item) => {
    const lineTotal = item.qty * item.customPrice;
    const rate = Number(item.vatRate !== undefined ? item.vatRate : 20);
    return sum + (rate > 0 ? (lineTotal - (lineTotal / (1 + rate / 100))) : 0);
  }, 0);
  const itemsSummary = cart.map(i => `${i.qty}x ${i.name}`).join(", ");

  cart.forEach(item => {
    if (item.isBundle && item.bundleItems) {
      item.bundleItems.forEach(bItem => { const rp = products.find(p => p.id === bItem.productId); if (rp) rp.stock -= (bItem.qty * item.qty); });
    } else { const p = products.find(prod => prod.id === item.id); if (p) p.stock -= item.qty; }
  });

  cust.balance = (cust.balance || 0) + total;
  if (!cust.purchaseHistory) cust.purchaseHistory = [];
  cust.purchaseHistory.unshift({ date: nowDate(), time: nowTime(), items: itemsSummary, total, payment: "Veresiye" });

  const saleRecord = {
    id: Date.now(), date: nowDate(), time: nowTime(),
    customerName: cust.name, itemsSummary, soldItems: [...cart],
    total, vatTotal: Number(vatTotal.toFixed(2)),
    paymentType: "Veresiye",
    isOfficial: false
  };
  salesHistory.unshift(saleRecord);

  sendToGoogleSheets({
    action: "save_sale",
    date: saleRecord.date,
    time: saleRecord.time,
    customerName: cust.name,
    channel: "Veresiye Satış",
    itemsSummary,
    paymentType: "Veresiye",
    total,
    vatTotal: Number(vatTotal.toFixed(2)),
    isOfficial: false
  });

  cart = [];
  document.getElementById("cartCustomerSelect").value = "";
  renderCart(); renderCatalog(); renderPosSalesHistory(); saveData(); updateAllBadges();
  toast(`📝 ${total.toFixed(2)} ₺ veresiye defterine işlendi!`);
}

// ── Hold Cart ──
function holdCurrentCart() {
  if (cart.length === 0) return toast("Sepet boş!", "warning");
  const label = prompt("Sepet ismi:", `Sepet #${heldCarts.length + 1}`);
  heldCarts.push({ id: Date.now(), label: label || "Askı", time: nowTime(), items: [...cart] });
  cart = [];
  saveData(); renderCart(); updateAllBadges();
  toast("⏸️ Sepet askıya alındı!");
}

function openHoldCartModal() {
  const list = document.getElementById("holdCartsList");
  if (!list) return;
  list.innerHTML = "";
  if (heldCarts.length === 0) {
    list.innerHTML = `<div class="empty-state">Askıda sepet yok.</div>`;
  } else {
    heldCarts.forEach((hc, idx) => {
      const total = hc.items.reduce((s, i) => s + (i.qty * i.customPrice), 0);
      list.innerHTML += `
        <div class="flex items-center justify-between" style="background:var(--bg); border:1px solid var(--border); padding:10px; border-radius:var(--radius-sm);">
          <div><b>${hc.label}</b> (${hc.time})<br><b>${total.toFixed(2)} ₺</b></div>
          <button class="btn btn-success btn-sm" onclick="restoreHeldCart(${idx})">Geri Yükle</button>
        </div>`;
    });
  }
  openModal("holdCartsModal");
}

function restoreHeldCart(idx) {
  cart = [...heldCarts[idx].items];
  heldCarts.splice(idx, 1);
  saveData(); renderCart(); closeModal("holdCartsModal"); updateAllBadges();
}

// Window global exports
if (typeof window !== "undefined") {
  window.initCategoryBar = initCategoryBar;
  window.filterCategory = filterCategory;
  window.renderCatalog = renderCatalog;
  window.addToCart = addToCart;
  window.getCatBadgeClass = getCatBadgeClass;
}
