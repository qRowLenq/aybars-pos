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
  const idEl = document.getElementById("dispCustomerId");
  if (idEl) idEl.value = "";
  document.getElementById("dispCustomerSearchInput").value = "";
  document.getElementById("dispCustomerName").value = "";
  document.getElementById("dispPhone").value = "";
  document.getElementById("dispAddress").value = "";
  document.getElementById("dispNote").value = "";

  const selId = document.getElementById("cartCustomerSelect")?.value;
  if (selId) {
    const c = customers.find(cust => cust.id == selId);
    if (c) {
      if (idEl) idEl.value = c.id;
      document.getElementById("dispCustomerName").value = c.name;
      document.getElementById("dispPhone").value = c.phone || "";
      document.getElementById("dispAddress").value = c.address || "";
      document.getElementById("dispNote").value = c.pet || "";
    }
  }
  openModal("dispatchModal");
}

function handleSelectDispatchCustomer(val) {
  if (!val) {
    const idEl = document.getElementById("dispCustomerId");
    if (idEl) idEl.value = "";
    return;
  }
  const cleanVal = val.split(" - ")[0].trim();
  const c = customers.find(cust => cust.name.toLowerCase() === cleanVal.toLowerCase() || cust.phone === cleanVal || String(cust.id) === cleanVal);
  if (c) {
    const idEl = document.getElementById("dispCustomerId");
    if (idEl) idEl.value = c.id;
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
  const phone = (document.getElementById("dispPhone").value || "").trim();
  const address = (document.getElementById("dispAddress").value || "-").trim();
  const note = (document.getElementById("dispNote").value || "").trim();
  const custIdVal = document.getElementById("dispCustomerId")?.value;

  let matchedCust = null;
  if (custIdVal) {
    matchedCust = customers.find(c => String(c.id) === String(custIdVal));
  }
  if (!matchedCust && cName && cName !== "İsimsiz") {
    matchedCust = customers.find(c => c.name.toLowerCase() === cName.toLowerCase() || (phone && c.phone === phone));
  }

  // Veresiye kontrolü: Kayıtlı müşteri olmalı veya otomatik kaydedilmeli
  if (paymentPref === "Veresiye") {
    if (!matchedCust) {
      if (!confirm(`"${cName}" kayıtlı müşteriler arasında bulunamadı.\n\nVeresiye paket sipariş oluşturabilmek için müşteri borç hesabının açılması gerekir.\n\nBu müşteriyi şimdi otomatik kaydetmek istiyor musunuz?`)) {
        return;
      }
      matchedCust = {
        id: Date.now(),
        name: cName,
        phone: phone || "-",
        address: address || "-",
        pet: note || "",
        balance: 0,
        purchaseHistory: []
      };
      customers.push(matchedCust);
      if (typeof renderCrmCustomerList === "function") renderCrmCustomerList();
    }
  }

  const order = {
    id: Date.now(),
    date: nowDate(),
    time: nowTime(),
    channel,
    customerId: matchedCust ? matchedCust.id : null,
    customerName: matchedCust ? matchedCust.name : cName,
    phone: phone || "-",
    address: address || "-",
    note: note,
    paymentMethod: paymentPref,
    itemsSummary: cart.map(i => `${i.qty}x ${i.name} (${i.customPrice.toFixed(2)} ₺)`).join(", "),
    items: [...cart],
    total
  };

  // Deduct stock (FIFO Lot/Batch deduction)
  cart.forEach(item => {
    if (item.isBundle && item.bundleItems) {
      item.bundleItems.forEach(bItem => {
        const rp = products.find(p => p.id === bItem.productId);
        if (rp) {
          if (typeof deductProductStockFIFO === "function") deductProductStockFIFO(rp, (bItem.qty * item.qty));
          else rp.stock -= (bItem.qty * item.qty);
        }
      });
    } else {
      const p = products.find(prod => prod.id === item.id);
      if (p) {
        if (typeof deductProductStockFIFO === "function") deductProductStockFIFO(p, item.qty);
        else p.stock -= item.qty;
      }
    }
  });

  orders.unshift(order);
  cart = [];
  renderCart(); renderCatalog(); closeModal("dispatchModal"); saveData(); updateAllBadges();
  if (typeof renderSktRadarWidget === "function") renderSktRadarWidget();
  toast(paymentPref === "Veresiye" ? "🛵 Veresiye sipariş yola çıktı!" : "🛵 Sipariş yola çıktı!");
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
  const isVeresiye = (order.paymentMethod === "Veresiye");

  const vatTotal = (order.items || []).reduce((sum, item) => {
    const lineTotal = (item.qty || 1) * (item.customPrice || item.price || 0);
    const rate = Number(item.vatRate !== undefined ? item.vatRate : 20);
    return sum + (rate > 0 ? (lineTotal - (lineTotal / (1 + rate / 100))) : 0);
  }, 0);

  // Veresiye ise kayıtlı müşterinin borcuna ekle
  if (isVeresiye) {
    let cust = null;
    if (order.customerId) {
      cust = customers.find(c => String(c.id) === String(order.customerId));
    }
    if (!cust && order.customerName && order.customerName !== "İsimsiz") {
      cust = customers.find(c => c.name.toLowerCase() === order.customerName.toLowerCase());
    }
    if (cust) {
      cust.balance = (cust.balance || 0) + Number(order.total || 0);
      if (!cust.purchaseHistory) cust.purchaseHistory = [];
      cust.purchaseHistory.unshift({
        date: order.date || nowDate(),
        time: order.time || nowTime(),
        items: order.itemsSummary,
        total: Number(order.total || 0),
        payment: "Veresiye (Paket Sipariş)"
      });
      if (typeof renderCrmCustomerList === "function") renderCrmCustomerList();
    }
  }

  const isOrderOfficial = isVeresiye ? false : ((order.paymentMethod || "").includes("Kart") || (order.paymentMethod || "").includes("Platform") || (order.paymentMethod || "").includes("Banka") || (order.isOfficial !== undefined ? order.isOfficial : true));

  salesHistory.unshift({
    id: Date.now(),
    date: order.date || nowDate(),
    time: order.time || nowTime(),
    customerName: order.customerName,
    itemsSummary: order.itemsSummary,
    soldItems: order.items || [],
    total: order.total,
    vatTotal: Number(vatTotal.toFixed(2)),
    paymentType: isVeresiye ? "Veresiye" : (order.paymentMethod || "Nakit"),
    splitCash: (!isVeresiye && order.paymentMethod === "Nakit") ? order.total : 0,
    splitCard: (!isVeresiye && order.paymentMethod === "Kredi Kartı") ? order.total : 0,
    splitTransfer: (!isVeresiye && (order.paymentMethod === "Banka" || order.paymentMethod === "Havale / IBAN")) ? order.total : 0,
    splitCredit: isVeresiye ? order.total : 0,
    isOfficial: isOrderOfficial
  });

  let dualData = null;
  if (typeof calculateDualFinancialOverview === "function") {
    dualData = calculateDualFinancialOverview();
  }

  // ÖNEMLİ: Yemeksepeti ve Getir siparişleri E-Tablo'ya otomatik gelir olarak AKTARILMAZ!
  // Komisyon oranları dinamik değiştiğinden ablası bankaya yatan net tutarı E-Tablo'ya manuel ekleyecek.
  if (!isPlatform) {
    sendToGoogleSheets({
      action: "save_sale",
      date: order.date || nowDate(),
      time: order.time || nowTime(),
      customerName: order.customerName,
      channel: isVeresiye ? "Paket Veresiye" : (order.channel || "Telefon"),
      itemsSummary: order.itemsSummary,
      paymentType: isVeresiye ? "Veresiye" : (order.paymentMethod || "Nakit"),
      total: order.total,
      vatTotal: Number(vatTotal.toFixed(2)),
      isOfficial: isOrderOfficial,
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

    if (typeof syncTaxReportToSheets === "function") {
      setTimeout(syncTaxReportToSheets, 600);
    }
  }

  if (isPlatform) {
    platformPendingOrders.unshift({ ...order, deliveredAt: nowTime() });
  }

  deliveredOrders.unshift(order);
  orders.splice(idx, 1);
  saveData();
  renderOrdersTab();
  renderPosSalesHistory();
  
  if (isVeresiye) {
    toast(`✅ Sipariş teslim edildi ve "${order.customerName}" hesabına veresiye işlendi!`);
  } else if (isPlatform) {
    toast(`✅ ${order.channel} siparişi teslim edildi (Stok düşüldü, net gelir manuel girilecek).`);
  } else {
    toast("✅ Sipariş teslim edildi!");
  }
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
    container.innerHTML = `<div class="empty-state">Bekleyen platform siparişi yok.</div>`;
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
          <button class="btn btn-outline btn-sm" onclick="settlePlatformDay('${key}')" title="Bu siparişleri listeden kaldırır. Net tutarı E-Tabloya manuel gelir olarak ekleyin.">✓ Listeden Kapat</button>
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
  // Kullanıcı talebi: Getir/Yemeksepeti komisyonları dinamik değiştiğinden E-Tablo'ya otomatik aktarım yapılmaz.
  // Net gelir E-Tablo'ya manuel girileceği için buradan sadece listeden temizlenir.
  platformPendingOrders = platformPendingOrders.filter(o => `${o.channel} — ${o.date}` !== key);
  saveData();
  renderPlatformOrdersGrouped();
  updateAllBadges();
  toast(`✓ ${key} siparişleri (${dayTotal.toFixed(2)} ₺) listeden kapatıldı.`);
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
