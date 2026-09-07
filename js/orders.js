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
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1; padding:24px; text-align:center;">
      <div style="font-size:30px; margin-bottom:6px;">📱</div>
      <div class="text-muted font-bold" style="font-size:13.5px;">Bekleyen platform siparişi bulunmuyor.</div>
      <div class="text-xs text-muted mt-1">Yemeksepeti veya Getir'den gelen hakediş ödemelerini manuel eklemek için butona tıklayabilirsiniz.</div>
      <div class="mt-3">
        <button class="btn btn-success btn-sm" onclick="openManualPlatformIncomeModal()">💰 + Manuel Platform Geliri Ekle</button>
      </div>
    </div>`;
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
    const channelName = items[0]?.channel || "Getir";
    const orderDate = items[0]?.date || "";
    let html = `<div style="background:white; border:1px solid var(--border); border-radius:var(--radius); padding:14px; box-shadow:var(--shadow-sm);">
      <div class="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div>
          <b style="font-size:14.5px;">${key}</b>
          <div class="text-xs text-muted mt-0.5">Sipariş Brüt Toplamı: <b class="text-primary">${dayTotal.toFixed(2)} ₺</b> (${items.length} sipariş)</div>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn-success btn-sm" onclick="openManualPlatformIncomeModal('${channelName}', ${dayTotal}, '${key}', '${orderDate}')" title="Bankaya yatan net hakediş tutarını girip E-Tabloya ve sisteme gelir olarak kaydedin">💰 Net Gelir Girişi Yap</button>
          <button class="btn btn-ghost btn-sm" onclick="settlePlatformDay('${key}')" title="Gelir girmeden sadece listeden temizler">Listeden Kapat</button>
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
  platformPendingOrders = platformPendingOrders.filter(o => `${o.channel} — ${o.date}` !== key);
  saveData();
  renderPlatformOrdersGrouped();
  updateAllBadges();
  toast(`✓ ${key} siparişleri (${dayTotal.toFixed(2)} ₺) listeden kapatıldı.`);
}

// ── Manuel Platform Gelir Girişi (Yemeksepeti / Getir) ──
function openManualPlatformIncomeModal(platform, gross, key, orderDate) {
  const pSelect = document.getElementById("mpiPlatform");
  if (pSelect) {
    if (platform && (platform.includes("Yemeksepeti") || platform.toLowerCase().includes("yemek"))) {
      pSelect.value = "Yemeksepeti";
    } else if (platform && (platform.includes("Getir") || platform.toLowerCase().includes("getir"))) {
      pSelect.value = "Getir";
    } else if (platform) {
      pSelect.value = platform;
    } else {
      pSelect.value = "Getir";
    }
  }

  const dInput = document.getElementById("mpiDate");
  if (dInput) {
    if (orderDate && orderDate.includes(".")) {
      const parts = orderDate.split(".");
      dInput.value = `${parts[2]}-${parts[1]}-${parts[0]}`;
    } else {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      dInput.value = `${y}-${m}-${d}`;
    }
  }

  const gInput = document.getElementById("mpiGrossAmount");
  if (gInput) gInput.value = (gross !== undefined && gross > 0) ? Number(gross).toFixed(2) : "";

  const nInput = document.getElementById("mpiNetAmount");
  if (nInput) {
    nInput.value = "";
    setTimeout(() => nInput.focus(), 150);
  }

  const noteInput = document.getElementById("mpiNote");
  if (noteInput) {
    const curP = pSelect ? pSelect.value : "Getir";
    noteInput.value = `${curP} Haftalık Net Hakediş Tahsilatı`;
  }

  const keyInput = document.getElementById("mpiGroupKey");
  if (keyInput) keyInput.value = key || "";

  openModal("manualPlatformIncomeModal");
}

function handleMpiPlatformChange() {
  const pSelect = document.getElementById("mpiPlatform");
  const noteInput = document.getElementById("mpiNote");
  if (pSelect && noteInput) {
    noteInput.value = `${pSelect.value} Haftalık Net Hakediş Tahsilatı`;
  }
}

function saveManualPlatformIncome() {
  const platform = document.getElementById("mpiPlatform")?.value || "Getir";
  const dateVal = document.getElementById("mpiDate")?.value;
  let dateStr = nowDate();
  if (dateVal && dateVal.includes("-")) {
    const parts = dateVal.split("-");
    dateStr = `${parts[2]}.${parts[1]}.${parts[0]}`;
  }

  const grossVal = parseFloat(document.getElementById("mpiGrossAmount")?.value) || 0;
  const netVal = parseFloat(document.getElementById("mpiNetAmount")?.value);

  if (isNaN(netVal) || netVal <= 0) {
    return toast("Lütfen bankaya yatan geçerli bir net gelir tutarı girin!", "warning");
  }

  const payType = document.getElementById("mpiPaymentType")?.value || "Havale / IBAN";
  const note = (document.getElementById("mpiNote")?.value || "").trim();
  const groupKey = document.getElementById("mpiGroupKey")?.value;

  const desc = note || `${platform} Net Gelir Tahsilatı${grossVal > 0 ? ' (Brüt: ' + grossVal.toFixed(2) + ' ₺)' : ''}`;

  // Satış / Gelir Geçmişine ekle
  const saleItem = {
    id: Date.now(),
    date: dateStr,
    time: nowTime(),
    customerName: platform + " (Platform Geliri)",
    itemsSummary: desc,
    soldItems: [],
    total: netVal,
    vatTotal: Number((netVal - (netVal / 1.20)).toFixed(2)),
    paymentType: payType,
    splitCash: payType.includes("Nakit") ? netVal : 0,
    splitCard: payType.includes("Kart") ? netVal : 0,
    splitTransfer: (!payType.includes("Nakit") && !payType.includes("Kart")) ? netVal : 0,
    isOfficial: true
  };
  salesHistory.unshift(saleItem);

  // Belirli bir grup üzerinden kapatılıyorsa o grubu listeden kaldır
  if (groupKey) {
    platformPendingOrders = platformPendingOrders.filter(o => `${o.channel} — ${o.date}` !== groupKey);
  }

  // Google Sheets'e gönder
  sendToGoogleSheets({
    action: "save_platform_income",
    platform: platform,
    date: dateStr,
    time: nowTime(),
    grossAmount: grossVal,
    netAmount: netVal,
    total: netVal,
    paymentType: payType,
    note: desc,
    isOfficial: true
  });

  saveData();
  closeModal("manualPlatformIncomeModal");
  renderOrdersTab();
  renderPosSalesHistory();
  updateAllBadges();

  toast(`✅ ${platform} net geliri (${netVal.toFixed(2)} ₺) başarıyla kaydedildi ve E-Tablo'ya aktarıldı!`, "success");
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

// Window global exports
if (typeof window !== "undefined") {
  window.renderOrdersTab = renderOrdersTab;
  window.openDispatchModal = openDispatchModal;
  window.saveDispatchOrder = saveDispatchOrder;
  window.openManualPlatformIncomeModal = openManualPlatformIncomeModal;
  window.handleMpiPlatformChange = handleMpiPlatformChange;
  window.saveManualPlatformIncome = saveManualPlatformIncome;
  window.settlePlatformDay = settlePlatformDay;
}
