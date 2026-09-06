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

  updateCustomerDropdown();
}

// ── Complete Sale ──
function completeSale(payType, splitDetails = null) {
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

  // Stock deduction
  cart.forEach(item => {
    if (item.isBundle && item.bundleItems) {
      item.bundleItems.forEach(bItem => {
        const realProd = products.find(p => p.id === bItem.productId);
        if (realProd) realProd.stock -= (bItem.qty * item.qty);
      });
    } else {
      const p = products.find(prod => prod.id === item.id);
      if (p) p.stock -= item.qty;
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

  const saleRecord = {
    id: Date.now(), date: nowDate(), time: nowTime(),
    customerName: custName, itemsSummary, soldItems: [...cart],
    total, vatTotal: Number(vatTotal.toFixed(2)),
    paymentType: splitDetails ? `Parçalı (${splitDetails})` : payType,
    isOfficial: Boolean(isOfficial)
  };
  salesHistory.unshift(saleRecord);

  if (cust) {
    if (!cust.purchaseHistory) cust.purchaseHistory = [];
    cust.purchaseHistory.unshift({ date: saleRecord.date, time: saleRecord.time, items: itemsSummary, total, payment: saleRecord.paymentType });
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
    isOfficial: saleRecord.isOfficial
  });

  cart = [];
  if (document.getElementById("cartCustomerSelect")) document.getElementById("cartCustomerSelect").value = "";
  renderCart(); renderCatalog(); renderPosSalesHistory(); saveData(); updateAllBadges();
  toast(`✅ ${total.toFixed(2)} ₺ satış tamamlandı! ${isOfficial ? '(🧾 Resmi)' : '(📝 Fişsiz)'}`);
}

// ── Recent Sales & Refund ──
function renderPosSalesHistory() {
  const container = document.getElementById("posRecentSalesList");
  if (!container) return;
  container.innerHTML = "";

  const todaySales = salesHistory.filter(s => s.date === nowDate());
  if (todaySales.length === 0) {
    container.innerHTML = `<span class="text-sm text-muted">Bugün henüz satış yok.</span>`;
    return;
  }

  todaySales.forEach(s => {
    const isOff = s.isOfficial !== undefined ? s.isOfficial : (!s.paymentType.includes("Veresiye"));
    const officialBadge = isOff
      ? `<span class="badge" style="font-size:10px; background:#f0fdf4; color:#166534; border:1px solid #bbf7d0;">🧾 Fişli</span>`
      : `<span class="badge" style="font-size:10px; background:#fef2f2; color:#b91c1c; border:1px solid #fecaca;">📝 Fişsiz</span>`;

    container.innerHTML += `
      <div class="flex items-center justify-between" style="background:var(--bg); padding:6px 10px; border-radius:var(--radius-sm); border:1px solid var(--border); font-size:12px;">
        <span><b>${s.time}</b> — ${s.customerName}: ${s.itemsSummary} (<b>${s.total.toFixed(2)} ₺</b> · ${s.paymentType}${s.vatTotal ? ` · KDV: ${s.vatTotal.toFixed(2)} ₺` : ''}) ${officialBadge}</span>
        <button class="btn btn-danger btn-xs" onclick="refundSale(${s.id})">↩️ İade</button>
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
  completeSale("Parçalı", `${cash.toFixed(2)} ₺ Nakit + ${card.toFixed(2)} ₺ Kart`);
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
