/* ===================================================================
   ORDERS MODULE — Dispatch, Delivery, Platform Orders
   =================================================================== */

function renderOrdersTab() {
  renderSingleOrdersList();
  renderPlatformOrdersGrouped();
  renderDeliveredOrdersList();
  updateAllBadges();
}

// ── Dispatch Modal ──
function openDispatchModal() {
  if (cart.length === 0) return toast("Sepet boş!", "warning");
  updateCustomerDropdown();
  document.getElementById("dispCustomerSearchInput").value = "";
  document.getElementById("dispCustomerName").value = "";
  document.getElementById("dispPhone").value = "";
  document.getElementById("dispAddress").value = "";
  document.getElementById("dispNote").value = "";

  const selId = document.getElementById("cartCustomerSelect")?.value;
  if (selId) {
    const c = customers.find(cust => cust.id == selId);
    if (c) {
      document.getElementById("dispCustomerName").value = c.name;
      document.getElementById("dispPhone").value = c.phone || "";
      document.getElementById("dispAddress").value = c.address || "";
      document.getElementById("dispNote").value = c.pet || "";
    }
  }
  openModal("dispatchModal");
}

function handleSelectDispatchCustomer(val) {
  if (!val) return;
  const cleanVal = val.split(" - ")[0].trim();
  const c = customers.find(cust => cust.name.toLowerCase() === cleanVal.toLowerCase() || cust.phone === cleanVal);
  if (c) {
    document.getElementById("dispCustomerName").value = c.name;
    document.getElementById("dispPhone").value = c.phone || "";
    document.getElementById("dispAddress").value = c.address || "";
    document.getElementById("dispNote").value = c.pet || "";
  }
}

function saveDispatchOrder() {
  const total = cart.reduce((sum, i) => sum + (i.qty * i.customPrice), 0);
  const channel = document.getElementById("dispChannel").value;
  const paymentPref = document.getElementById("dispPaymentType").value;
  const cName = document.getElementById("dispCustomerName").value.trim() || "İsimsiz";

  const order = {
    id: Date.now(), date: nowDate(), time: nowTime(), channel,
    customerName: cName,
    phone: document.getElementById("dispPhone").value || "-",
    address: document.getElementById("dispAddress").value || "-",
    note: document.getElementById("dispNote").value || "",
    paymentMethod: paymentPref,
    itemsSummary: cart.map(i => `${i.qty}x ${i.name} (${i.customPrice.toFixed(2)} ₺)`).join(", "),
    items: [...cart], total
  };

  // Deduct stock
  cart.forEach(item => {
    if (item.isBundle && item.bundleItems) {
      item.bundleItems.forEach(bItem => { const rp = products.find(p => p.id === bItem.productId); if (rp) rp.stock -= (bItem.qty * item.qty); });
    } else { const p = products.find(prod => prod.id === item.id); if (p) p.stock -= item.qty; }
  });

  orders.unshift(order);
  cart = [];
  renderCart(); renderCatalog(); closeModal("dispatchModal"); saveData(); updateAllBadges();
  toast("🛵 Sipariş yola çıktı!");
}

// ── Pending Orders List ──
function renderSingleOrdersList() {
  const container = document.getElementById("singleOrdersList");
  if (!container) return;
  container.innerHTML = "";

  if (orders.length === 0) {
    container.innerHTML = `<div class="empty-state">🛵 Şu anda yoldaki sipariş bulunmuyor.</div>`;
    return;
  }

  orders.forEach((o, idx) => {
    container.innerHTML += `
      <div class="order-card">
        <div class="oc-header">
          <div class="flex items-center gap-2">
            <b style="font-size:14px;">📦 ${o.customerName}</b>
            <span class="chip chip-warn">${o.channel || 'Telefon'}</span>
            <span class="chip chip-ok">${o.paymentMethod || 'Nakit'}</span>
          </div>
          <b class="text-primary" style="font-size:15px;">${Number(o.total).toFixed(2)} ₺</b>
        </div>
        <div class="text-sm text-muted">📞 ${o.phone || '-'} · 📍 ${o.address || '-'}</div>
        <div class="text-sm">${o.itemsSummary}</div>
        ${o.note ? `<div class="chip chip-err" style="padding:6px 10px; border-radius:var(--radius-sm);">📝 ${o.note}</div>` : ''}
        <div class="oc-footer">
          <span class="text-xs text-muted">🕐 ${o.time || ''} — ${o.date || ''}</span>
          <div class="flex gap-1">
            <button class="btn btn-success btn-sm" onclick="markOrderDelivered(${idx})">✅ Teslim Edildi</button>
            <button class="btn btn-danger btn-sm" onclick="cancelOrder(${idx})">❌ İptal</button>
          </div>
        </div>
      </div>`;
  });
}

function markOrderDelivered(idx) {
  const order = orders[idx];
  if (!order) return;
  const isPlatform = (order.channel === "Getir" || order.channel === "Yemeksepeti");

  const vatTotal = (order.items || []).reduce((sum, item) => {
    const lineTotal = (item.qty || 1) * (item.customPrice || item.price || 0);
    const rate = Number(item.vatRate !== undefined ? item.vatRate : 20);
    return sum + (rate > 0 ? (lineTotal - (lineTotal / (1 + rate / 100))) : 0);
  }, 0);

  const isOrderOfficial = (order.paymentMethod || "").includes("Kart") || (order.paymentMethod || "").includes("Platform") || (order.paymentMethod || "").includes("Banka") || (order.isOfficial !== undefined ? order.isOfficial : true);

  salesHistory.unshift({
    id: Date.now(), date: order.date, time: order.time,
    customerName: order.customerName, itemsSummary: order.itemsSummary,
    soldItems: order.items || [], total: order.total,
    vatTotal: Number(vatTotal.toFixed(2)),
    paymentType: order.paymentMethod || "Nakit",
    isOfficial: isOrderOfficial
  });

  sendToGoogleSheets({
    action: "save_sale",
    date: order.date || nowDate(),
    time: order.time || nowTime(),
    customerName: order.customerName,
    channel: order.channel || "Telefon",
    itemsSummary: order.itemsSummary,
    paymentType: order.paymentMethod || "Nakit",
    total: order.total,
    vatTotal: Number(vatTotal.toFixed(2)),
    isOfficial: isOrderOfficial
  });

  if (isPlatform && order.paymentMethod === "Online / Platform") {
    platformPendingOrders.unshift({ ...order, deliveredAt: nowTime() });
  }

  deliveredOrders.unshift(order);
  orders.splice(idx, 1);
  saveData(); renderOrdersTab(); renderPosSalesHistory();
  toast("✅ Sipariş teslim edildi!");
}

function cancelOrder(idx) {
  const order = orders[idx];
  if (!order) return;
  if (!confirm(`"${order.customerName}" siparişini iptal edip stokları geri yüklemek istiyor musunuz?`)) return;

  if (order.items) {
    order.items.forEach(item => {
      if (item.isBundle && item.bundleItems) {
        item.bundleItems.forEach(bItem => { const rp = products.find(p => p.id === bItem.productId); if (rp) rp.stock += (bItem.qty * item.qty); });
      } else { const p = products.find(prod => prod.id === item.id); if (p) p.stock += item.qty; }
    });
  }

  orders.splice(idx, 1);
  saveData(); renderOrdersTab(); renderCatalog();
  toast("❌ Sipariş iptal edildi, stoklar geri yüklendi.");
}

// ── Platform Orders ──
function renderPlatformOrdersGrouped() {
  const container = document.getElementById("platformOrdersGroupedList");
  if (!container) return;
  container.innerHTML = "";

  if (platformPendingOrders.length === 0) {
    container.innerHTML = `<div class="empty-state">Bekleyen platform tahsilatı yok.</div>`;
    return;
  }

  const grouped = {};
  platformPendingOrders.forEach(o => {
    const key = `${o.channel} — ${o.date}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(o);
  });

  Object.keys(grouped).forEach(key => {
    const items = grouped[key];
    const dayTotal = items.reduce((s, o) => s + o.total, 0);
    let html = `<div style="background:white; border:1px solid var(--border); border-radius:var(--radius); padding:14px; box-shadow:var(--shadow-sm);">
      <div class="flex items-center justify-between mb-2">
        <b>${key}</b>
        <div class="flex items-center gap-2">
          <b class="text-primary">${dayTotal.toFixed(2)} ₺</b>
          <button class="btn btn-success btn-sm" onclick="settlePlatformDay('${key}')">💰 Parası Yattı</button>
        </div>
      </div>`;
    items.forEach(o => { html += `<div class="text-sm" style="padding:4px 0; border-top:1px solid var(--border-light);">${o.time} — ${o.customerName}: ${o.itemsSummary} (<b>${Number(o.total).toFixed(2)} ₺</b>)</div>`; });
    html += `</div>`;
    container.innerHTML += html;
  });
}

function settlePlatformDay(key) {
  const items = platformPendingOrders.filter(o => `${o.channel} — ${o.date}` === key);
  const dayTotal = items.reduce((s, o) => s + o.total, 0);
  sendToGoogleSheets({
    action: "save_sale",
    date: nowDate(),
    time: nowTime(),
    customerName: key,
    channel: "Platform Tahsilatı",
    itemsSummary: `${items.length} sipariş tahsilatı`,
    paymentType: "Banka / Havale",
    total: dayTotal,
    vatTotal: 0,
    isOfficial: true
  });
  platformPendingOrders = platformPendingOrders.filter(o => `${o.channel} — ${o.date}` !== key);
  saveData(); renderPlatformOrdersGrouped(); updateAllBadges();
  toast(`💰 ${key} tahsilatı (${dayTotal.toFixed(2)} ₺) işlendi!`);
}

// ── Delivered History ──
function renderDeliveredOrdersList() {
  const container = document.getElementById("deliveredOrdersList");
  if (!container) return;
  container.innerHTML = "";

  if (deliveredOrders.length === 0) {
    container.innerHTML = `<div class="empty-state">Geçmiş teslim kaydı yok.</div>`;
    return;
  }
  deliveredOrders.forEach(o => {
    container.innerHTML += `
      <div class="flex items-center justify-between" style="background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-sm); padding:10px 14px; font-size:12px;">
        <div><b>${o.date} ${o.time || ''}</b> — ${o.customerName} (${o.channel || 'Telefon'})<br><span class="text-muted">${o.itemsSummary}</span></div>
        <b class="text-primary">${Number(o.total).toFixed(2)} ₺</b>
      </div>`;
  });
}

function clearDeliveredOrders() {
  if (confirm("Tüm teslim geçmişini temizlemek istediğinize emin misiniz?")) {
    deliveredOrders = [];
    saveData(); renderDeliveredOrdersList();
  }
}
