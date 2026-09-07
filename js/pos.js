/* ===================================================================
   POS MODULE — Catalog, Cart, Sales, Refund
   =================================================================== */

// ── Category Bar ──
function initCategoryBar() {
  const bar = document.getElementById("categoryFilterBar");
  if (!bar) return;
  let html = `<button class="cat-chip ${selectedCategory === 'TÜMÜ' ? 'active' : ''}" onclick="filterCategory('TÜMÜ')">TÜMÜ</button>`;
  categories.forEach(cat => {
    html += `<button class="cat-chip ${selectedCategory === cat ? 'active' : ''}" onclick="filterCategory('${cat}')">${cat}</button>`;
  });
  html += `<button class="btn btn-ghost btn-xs" style="border-radius:var(--radius-full); margin-left:4px;" onclick="promptNewCategory()">+ Kategori</button>`;
  bar.innerHTML = html;
  populateCategoryDropdowns();
}

function promptNewCategory() {
  const newCat = prompt("Yeni kategori adı:");
  if (newCat && newCat.trim() && !categories.includes(newCat.trim())) {
    categories.push(newCat.trim());
    saveData();
    initCategoryBar();
  }
}

function filterCategory(cat) {
  selectedCategory = cat;
  initCategoryBar();
  renderCatalog();
}

// ── Catalog Grid ──
function renderCatalog() {
  const search = (document.getElementById("catalogSearch")?.value || "").toLowerCase();
  const grid = document.getElementById("productGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const filtered = products.filter(p =>
    (selectedCategory === "TÜMÜ" || p.category === selectedCategory) &&
    p.name.toLowerCase().includes(search)
  );

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Ürün bulunamadı. "+ Ürün Ekle" ile ürün ekleyebilirsiniz.</div>`;
    return;
  }

  filtered.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="p-name">${p.name}</div>
      <div class="p-footer">
        <span class="p-stock ${p.stock <= 2 ? 'critical' : ''}">Stok: ${p.stock}</span>
        <span class="p-price">${Number(p.price).toFixed(2)} ₺</span>
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
    if (cart.length > 0) {
      fab.style.display = "inline-flex";
      const fabTotal = document.getElementById("mobileFabTotal");
      if (fabTotal) fabTotal.innerText = total.toFixed(2) + " ₺";
    } else {
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

  let isOfficial = true;
  const payUpper = (payType || "").toUpperCase();
  const isCardOrBank = payUpper.includes("KREDİ KARTI") || payUpper.includes("KART") || payUpper.includes("BANKA") || payUpper.includes("HAVALE") || payUpper.includes("PLATFORM");

  if (isCardOrBank) {
    isOfficial = true; // Kredi Kartı / Banka zorunlu resmi
  } else if (payUpper.includes("NAKİT")) {
    const cashOfficialToggle = document.getElementById("posCashIsOfficial");
    isOfficial = cashOfficialToggle ? cashOfficialToggle.checked : true;
  } else if (payType === "Parçalı") {
    // Parçalı ödemede kart çekimi varsa veya nakit toggle açıksa resmi sayılır
    isOfficial = true;
  } else {
    isOfficial = true;
  }

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
    if (payUpper.includes("NAKİT")) {
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
  toast(`✅ ${total.toFixed(2)} ₺ satış tamamlandı! ${isOfficial ? '(🧾 Resmi)' : '(📝 Fişsiz)'}`);
}

// ── Recent Sales & Refund ──
function renderPosSalesHistory() {
  const container = document.getElementById("posRecentSalesList");
  const todaySales = salesHistory.filter(s => s.date === nowDate());

  let totalCard = 0;
  let totalCash = 0;
  let totalTransfer = 0;
  let totalAll = 0;
  let cardCount = 0;
  let cashCount = 0;
  let transferCount = 0;

  todaySales.forEach(s => {
    const bk = getSalePaymentBreakdown(s);
    totalCash += bk.cash;
    totalCard += bk.card;
    totalTransfer += bk.transfer;
    totalAll += (Number(s.total) || 0);

    if (bk.card > 0) cardCount++;
    if (bk.cash > 0) cashCount++;
    if (bk.transfer > 0) transferCount++;
  });

  const cardEl = document.getElementById("posSummaryCardSales");
  if (cardEl) cardEl.innerText = totalCard.toFixed(2) + " ₺";

  const cashEl = document.getElementById("posSummaryCashSales");
  if (cashEl) cashEl.innerText = totalCash.toFixed(2) + " ₺";

  const transferEl = document.getElementById("posSummaryTransferSales");
  if (transferEl) transferEl.innerText = totalTransfer.toFixed(2) + " ₺";

  const totalEl = document.getElementById("posSummaryTotalSales");
  if (totalEl) totalEl.innerText = totalAll.toFixed(2) + " ₺";

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

  sendToGoogleSheets({
    action: "save_sale",
    date: nowDate(),
    time: nowTime(),
    customerName: sale.customerName,
    channel: "Satış İptali / İade",
    itemsSummary: `İADE: ${sale.itemsSummary}`,
    paymentType: sale.paymentType,
    total: -Math.abs(sale.total),
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
