/* ===================================================================
   PROCUREMENT MODULE — Suppliers, Intake, Purchases, Deficits
   =================================================================== */

// ── Suppliers ──
function openAddSupplierModal() {
  document.getElementById("supName").value = "";
  document.getElementById("supPhone").value = "";
  document.getElementById("supNotes").value = "";
  openModal("addSupplierModal");
}

function saveSupplier() {
  const name = document.getElementById("supName").value.trim();
  if (!name) return toast("Toptancı firma adını girin!", "error");
  suppliers.push({ id: Date.now(), name, phone: document.getElementById("supPhone").value.trim() || "-", notes: document.getElementById("supNotes").value.trim() || "-", balance: 0, transactions: [] });
  closeModal("addSupplierModal"); saveData(); renderSuppliersTable(); populateSupplierDropdowns();
  toast(`✅ "${name}" eklendi!`);
}

function deleteSupplier(id) {
  if (confirm("Bu toptancıyı silmek istediğinize emin misiniz?")) {
    suppliers = suppliers.filter(s => s.id !== id);
    saveData(); renderSuppliersTable(); populateSupplierDropdowns();
  }
}

function renderSuppliersTable() {
  const tbody = document.getElementById("suppliersTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (suppliers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Henüz toptancı eklenmedi.</td></tr>`;
    return;
  }
  suppliers.forEach(s => {
    tbody.innerHTML += `
      <tr>
        <td><b>${s.name}</b></td>
        <td>${s.phone || '-'}</td>
        <td class="text-sm">${s.notes || '-'}</td>
        <td><b style="color:${s.balance > 0 ? 'var(--danger)' : 'var(--success)'}; font-size:14px;">${Number(s.balance || 0).toFixed(2)} ₺</b></td>
        <td class="flex gap-1" style="flex-wrap:wrap;">
          <button class="btn btn-success btn-xs" style="background:linear-gradient(135deg,#047857,#065f46);" onclick="openAddProductModal('${s.name}')">+ Ürün Ekle</button>
          <button class="btn btn-ghost btn-xs" onclick="openSupplierHistoryModal(${s.id})">📜 Geçmiş</button>
          <button class="btn btn-success btn-xs" onclick="openQuickPaySupplier(${s.id})">💸 Ödeme</button>
          <button class="btn btn-danger btn-xs" onclick="deleteSupplier(${s.id})">Sil</button>
        </td>
      </tr>`;
  });
  updateAllBadges();
}

// ── Supplier Intake ──
function toggleIntakeInvoice() {
  const chk = document.getElementById("intakeHasInvoice");
  const alertEl = document.getElementById("intakeNoInvoiceAlert");
  const hasInv = chk ? chk.checked : true;
  if (alertEl) alertEl.style.display = hasInv ? "none" : "block";
  calculateIntakeLive();
}

function openSupplierIntakeModal() {
  if (suppliers.length === 0) return toast("Önce toptancı ekleyin!", "warning");
  populateSupplierDropdowns(); populateAllProductDatalists();
  document.getElementById("intakeProdName").value = "";
  document.getElementById("intakeQty").value = "1";
  document.getElementById("intakeTotalCost").value = "";
  document.getElementById("intakeCost").value = "";
  document.getElementById("intakePrice").value = "";
  document.getElementById("intakeVatRate").value = "20";
  document.getElementById("intakeVatType").value = "included";
  document.getElementById("intakeInvoiceImg").value = "";
  const lotEl = document.getElementById("intakeLotNumber");
  if (lotEl) lotEl.value = "";
  const expEl = document.getElementById("intakeBatchExpiry");
  if (expEl) expEl.value = "";
  document.getElementById("invoiceImgPreviewContainer").style.display = "none";
  currentInvoiceBase64 = null;

  const invChk = document.getElementById("intakeHasInvoice");
  if (invChk) invChk.checked = true;
  const alertEl = document.getElementById("intakeNoInvoiceAlert");
  if (alertEl) alertEl.style.display = "none";

  calculateIntakeLive();
  openModal("supplierIntakeModal");
}

function handleSelectExistingProductForIntake(val) {
  if (!val) return;
  const p = products.find(prod => prod.name.toLowerCase() === val.trim().toLowerCase());
  if (p) {
    document.getElementById("intakeProdName").value = p.name;
    if (p.supplier && p.supplier !== "-") {
      const supSelect = document.getElementById("intakeSupSelect");
      if (supSelect && [...supSelect.options].some(o => o.value === p.supplier)) {
        supSelect.value = p.supplier;
      }
    }
    if (p.cost && Number(p.cost) > 0) {
      document.getElementById("intakeCost").value = Number(p.cost).toFixed(2);
      calculateIntakeLive("unit");
    }
    if (p.price && Number(p.price) > 0) {
      document.getElementById("intakePrice").value = Number(p.price).toFixed(2);
    }
  }
}

function calculateIntakeLive(source) {
  const qtyEl = document.getElementById("intakeQty");
  const unitCostEl = document.getElementById("intakeCost");
  const totalCostEl = document.getElementById("intakeTotalCost");
  const vatRateEl = document.getElementById("intakeVatRate");
  const vatTypeEl = document.getElementById("intakeVatType");
  const priceEl = document.getElementById("intakePrice");
  const hasInv = document.getElementById("intakeHasInvoice") ? document.getElementById("intakeHasInvoice").checked : true;

  const qty = Math.max(1, Number(qtyEl?.value) || 1);
  const vatRate = hasInv ? (Number(vatRateEl?.value) || 0) : 0;
  const isVatIncluded = vatTypeEl?.value !== "excluded";

  let inputUnit = Number(unitCostEl?.value) || 0;
  let inputTotal = Number(totalCostEl?.value) || 0;

  if (source === "total") {
    if (inputTotal > 0) {
      inputUnit = Number((inputTotal / qty).toFixed(2));
      if (unitCostEl) unitCostEl.value = inputUnit;
    }
  } else if (source === "unit" || source === "qty") {
    if (inputUnit > 0) {
      inputTotal = Number((inputUnit * qty).toFixed(2));
      if (totalCostEl) totalCostEl.value = inputTotal;
    } else if (inputTotal > 0) {
      inputUnit = Number((inputTotal / qty).toFixed(2));
      if (unitCostEl) unitCostEl.value = inputUnit;
    }
  }

  let grossTotal = 0;
  let netTotal = 0;
  let vatTotal = 0;
  let unitCostWithVat = 0;

  const baseAmount = inputTotal > 0 ? inputTotal : (inputUnit * qty);

  if (!hasInv) {
    // Faturasız alımlarda KDV indirimi yoktur
    grossTotal = baseAmount;
    netTotal = baseAmount;
    vatTotal = 0;
    unitCostWithVat = qty > 0 ? (grossTotal / qty) : 0;
  } else if (isVatIncluded) {
    grossTotal = baseAmount;
    netTotal = vatRate > 0 ? grossTotal / (1 + vatRate / 100) : grossTotal;
    vatTotal = grossTotal - netTotal;
    unitCostWithVat = qty > 0 ? (grossTotal / qty) : 0;
  } else {
    netTotal = baseAmount;
    vatTotal = netTotal * (vatRate / 100);
    grossTotal = netTotal + vatTotal;
    unitCostWithVat = qty > 0 ? (grossTotal / qty) : 0;
  }

  const netEl = document.getElementById("intakeNetTotalDisplay");
  const vatEl = document.getElementById("intakeVatTotalDisplay");
  const grossEl = document.getElementById("intakeGrossTotalDisplay");
  const unitBadge = document.getElementById("intakeUnitCostBadge");
  const vatPctLabel = document.getElementById("intakeVatPctLabel");

  if (netEl) netEl.innerText = (netTotal || 0).toFixed(2) + " ₺";
  if (vatEl) vatEl.innerText = hasInv ? ((vatTotal || 0).toFixed(2) + " ₺") : "0.00 ₺ (Faturasız)";
  if (grossEl) grossEl.innerText = (grossTotal || 0).toFixed(2) + " ₺";
  if (unitBadge) unitBadge.innerText = (unitCostWithVat || 0).toFixed(2) + " ₺";
  if (vatPctLabel) vatPctLabel.innerText = hasInv ? ("%" + vatRate) : "%0 (Faturasız)";

  if (priceEl && !priceEl.value) {
    if (unitCostWithVat > 0) {
      const suggested = (unitCostWithVat * 1.4).toFixed(2);
      priceEl.placeholder = `Tavsiye: ${suggested} ₺ (%40 kâr)`;
    } else {
      priceEl.placeholder = "Boş = %40 kâr ile oto";
    }
  }
}

function applySuggestedMargin(pct = 40) {
  const qty = Math.max(1, Number(document.getElementById("intakeQty")?.value) || 1);
  const vatRate = Number(document.getElementById("intakeVatRate")?.value) || 0;
  const isVatIncluded = document.getElementById("intakeVatType")?.value !== "excluded";

  const totalVal = Number(document.getElementById("intakeTotalCost")?.value) || 0;
  const unitVal = Number(document.getElementById("intakeCost")?.value) || 0;

  const baseAmount = totalVal > 0 ? totalVal : (unitVal * qty);
  let grossTotal = baseAmount;
  if (!isVatIncluded) {
    grossTotal = baseAmount * (1 + vatRate / 100);
  }

  const unitCostWithVat = qty > 0 ? (grossTotal / qty) : 0;
  if (unitCostWithVat <= 0) return toast("Önce alış fiyatı veya toplam fatura tutarı girin!", "warning");

  const finalPrice = Math.round(unitCostWithVat * (1 + pct / 100));
  const priceEl = document.getElementById("intakePrice");
  if (priceEl) priceEl.value = finalPrice;
  toast(`💡 Rafta satış fiyatı %${pct} kâr ile ${finalPrice} ₺ olarak ayarlandı!`);
}

function previewInvoiceFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    currentInvoiceBase64 = e.target.result;
    document.getElementById("invoicePreviewImg").src = currentInvoiceBase64;
    document.getElementById("invoiceImgPreviewContainer").style.display = "block";
  };
  reader.readAsDataURL(file);
}

function saveSupplierIntake() {
  const supName = document.getElementById("intakeSupSelect").value;
  const prodName = document.getElementById("intakeProdName").value.trim();
  const qty = Number(document.getElementById("intakeQty").value);
  const costInput = Number(document.getElementById("intakeCost").value);
  const totalCostInput = Number(document.getElementById("intakeTotalCost").value);
  const hasInvoice = document.getElementById("intakeHasInvoice") ? document.getElementById("intakeHasInvoice").checked : true;
  const vatRate = hasInvoice ? (Number(document.getElementById("intakeVatRate").value) || 0) : 0;
  const isVatIncluded = document.getElementById("intakeVatType").value !== "excluded";
  const priceInput = Number(document.getElementById("intakePrice").value);
  const payStatus = document.getElementById("intakePaymentStatus").value;

  if (!prodName || isNaN(qty) || qty <= 0) return toast("Lütfen ürün adı ve geçerli adet girin!", "error");
  if ((isNaN(costInput) || costInput <= 0) && (isNaN(totalCostInput) || totalCostInput <= 0)) {
    return toast("Lütfen birim geliş fiyatı veya toplam fatura tutarı girin!", "error");
  }

  let grossTotal = 0;
  let netTotal = 0;
  let vatTotal = 0;
  const baseAmount = totalCostInput > 0 ? totalCostInput : (costInput * qty);

  if (!hasInvoice) {
    grossTotal = baseAmount;
    netTotal = baseAmount;
    vatTotal = 0;
  } else if (isVatIncluded) {
    grossTotal = baseAmount;
    netTotal = vatRate > 0 ? grossTotal / (1 + vatRate / 100) : grossTotal;
    vatTotal = Math.max(0, grossTotal - netTotal);
  } else {
    netTotal = baseAmount;
    vatTotal = netTotal * (vatRate / 100);
    grossTotal = netTotal + vatTotal;
  }

  const unitCostWithVat = Number((grossTotal / qty).toFixed(2));
  const totalInvoice = Number(grossTotal.toFixed(2));
  const finalPrice = (priceInput > 0) ? priceInput : Number((unitCostWithVat * 1.4).toFixed(2));

  const lotNumber = (document.getElementById("intakeLotNumber")?.value || "").trim();
  const batchExpiry = (document.getElementById("intakeBatchExpiry")?.value || "").trim();
  const lotNo = lotNumber || `LOT-${Date.now().toString().slice(-4)}`;

  const sup = suppliers.find(s => s.name === supName);

  let p = products.find(prod => prod.name.toLowerCase() === prodName.toLowerCase());
  if (p) {
    const oldStock = Math.max(0, Number(p.stock) || 0);
    const oldCost = Number(p.cost) || unitCostWithVat;
    p.cost = Number(((oldStock * oldCost + qty * unitCostWithVat) / (oldStock + qty)).toFixed(2));
    p.stock = oldStock + qty;
    if (priceInput > 0) p.price = priceInput;
    p.supplier = supName;
    if (p.vatRate === undefined || p.vatRate === null) p.vatRate = vatRate;

    if (!Array.isArray(p.batches)) p.batches = [];
    p.batches.push({
      lotNumber: lotNo,
      expiry: batchExpiry,
      qty: qty,
      initialQty: qty,
      cost: unitCostWithVat,
      date: nowDate()
    });
  } else {
    p = {
      id: Date.now(),
      name: prodName,
      category: categories[0] || "Genel",
      price: finalPrice,
      cost: unitCostWithVat,
      vatRate: vatRate,
      stock: qty,
      supplier: supName,
      batches: [{
        lotNumber: lotNo,
        expiry: batchExpiry,
        qty: qty,
        initialQty: qty,
        cost: unitCostWithVat,
        date: nowDate()
      }]
    };
    products.push(p);
  }

  const isPaid = payStatus === "paid";
  const statusLabel = isPaid ? "Peşin Ödendi" : "Açık Hesap (Borç)";
  const lotTag = (lotNumber || batchExpiry) ? ` [Lot: ${lotNo}${batchExpiry ? ` · SKT: ${batchExpiry}` : ''}]` : '';
  const invoiceDesc = `${qty}x ${prodName}${lotTag} (Birim: ${unitCostWithVat.toFixed(2)} ₺${hasInvoice ? ` · KDV %${vatRate}: ${vatTotal.toFixed(2)} ₺` : ' · Faturasız'} · Toplam: ${totalInvoice.toFixed(2)} ₺)`;

  if (sup) {
    if (!sup.transactions) sup.transactions = [];
    if (!isPaid) sup.balance = (sup.balance || 0) + totalInvoice;
    sup.transactions.unshift({
      id: Date.now(),
      date: nowDate(),
      time: nowTime(),
      type: "Alım",
      item: invoiceDesc,
      amount: totalInvoice,
      hasInvoice: hasInvoice,
      isInvoice: hasInvoice,
      vatRate: vatRate,
      vatAmount: Number(vatTotal.toFixed(2)),
      status: statusLabel,
      lotNumber: lotNo,
      batchExpiry: batchExpiry,
      invoiceImg: currentInvoiceBase64
    });
  }

  if (isPaid) {
    expenses.unshift({
      id: Date.now(),
      date: nowDate(),
      time: nowTime(),
      mainCategory: "Toptancı Alımı",
      subType: "Mal Alımı",
      category: "Toptancı Alımı",
      supplierName: supName,
      status: statusLabel,
      amount: totalInvoice,
      hasInvoice: hasInvoice,
      isInvoice: hasInvoice,
      vatRate: vatRate,
      vatAmount: Number(vatTotal.toFixed(2)),
      deductibleVat: hasInvoice ? Number(vatTotal.toFixed(2)) : 0,
      taxDeduction: hasInvoice ? Number(netTotal.toFixed(2)) : 0,
      paymentMethod: "Kasa (Nakit)",
      source: "Kasa (Nakit)",
      desc: invoiceDesc,
      invoiceStatus: hasInvoice ? "🧾 Faturalı" : "⚠️ Faturasız",
      expenseType: "procurement"
    });

    sendToGoogleSheets({
      action: "save_expense",
      date: nowDate(),
      time: nowTime(),
      mainCategory: "Toptancı Alımı",
      subType: "Mal Alımı",
      category: supName,
      paymentMethod: "Kasa (Nakit)",
      description: invoiceDesc,
      amount: totalInvoice,
      hasInvoice: hasInvoice,
      isInvoice: hasInvoice,
      vatRate: vatRate,
      vatAmount: Number(vatTotal.toFixed(2)),
      taxDeduction: hasInvoice ? Number(netTotal.toFixed(2)) : 0,
      invoiceStatus: hasInvoice ? "🧾 Faturalı" : "⚠️ Faturasız",
      status: statusLabel
    });

    if (typeof syncTaxReportToSheets === "function") {
      setTimeout(syncTaxReportToSheets, 600);
    }
  }

  closeModal("supplierIntakeModal");
  saveData();
  renderCatalog();
  renderInventoryTable();
  if (typeof renderSktRadarWidget === "function") renderSktRadarWidget();
  renderSuppliersTable();
  renderExpensesTable();
  renderAllPurchasesTable();
  populateAllProductDatalists();
  toast(`📥 Mal girişi yapıldı (${totalInvoice.toFixed(2)} ₺ — ${statusLabel} ${hasInvoice ? '· 🧾 Faturalı' : '· ⚠️ Faturasız'})!`);
}

// ── Supplier History ──
function openSupplierHistoryModal(supId) {
  const s = suppliers.find(sup => sup.id === supId);
  if (!s) return;
  activeHistorySupplierId = supId;
  document.getElementById("shSupName").innerText = s.name;
  document.getElementById("shTotalDebt").innerText = (s.balance || 0).toFixed(2) + " ₺";

  const container = document.getElementById("supplierHistoryList");
  container.innerHTML = "";
  const trans = s.transactions || [];
  if (trans.length === 0) {
    container.innerHTML = `<div class="empty-state">Bu toptancıya ait işlem kaydı yok.</div>`;
  } else {
    trans.forEach(t => {
      container.innerHTML += `
        <div class="flex items-center justify-between" style="background:var(--bg); border:1px solid var(--border); padding:10px 14px; border-radius:var(--radius-sm);">
          <div>
            <div class="font-bold text-sm">${t.date} ${t.time || ''} — ${t.item}</div>
            <div class="text-xs text-muted">Durum: <b style="color:${t.status.includes('Borç') ? 'var(--danger)' : 'var(--success)'};">${t.status}</b></div>
          </div>
          <div class="flex items-center gap-2">
            <b style="color:${t.type === 'Ödeme' ? 'var(--success)' : 'var(--text)'};">${t.type === 'Ödeme' ? '-' : '+'}${Number(t.amount).toFixed(2)} ₺</b>
            ${t.invoiceImg ? `<button class="btn btn-ghost btn-xs" onclick="viewInvoiceImage('${t.invoiceImg}')">📸</button>` : ''}
          </div>
        </div>`;
    });
  }
  openModal("supplierHistoryModal");
}

function viewInvoiceImage(src) {
  document.getElementById("fullImageView").src = src;
  openModal("viewImageModal");
}

// ── Supplier Payment ──
function openPaySupplierModal() { if (activeHistorySupplierId) openQuickPaySupplier(activeHistorySupplierId); }

function openQuickPaySupplier(supId) {
  const s = suppliers.find(sup => sup.id === supId);
  if (!s) return;
  activeHistorySupplierId = supId;
  document.getElementById("psSupName").innerText = s.name;
  document.getElementById("psTotalDebt").innerText = (s.balance || 0).toFixed(2) + " ₺";
  document.getElementById("psAmount").value = s.balance > 0 ? s.balance : "";
  openModal("paySupplierModal");
}

function confirmSupplierPayment() {
  const s = suppliers.find(sup => sup.id === activeHistorySupplierId);
  if (!s) return;
  const amt = Number(document.getElementById("psAmount").value);
  const src = document.getElementById("psSource").value;
  if (!amt || amt <= 0) return toast("Geçerli ödeme tutarı girin!", "error");

  s.balance = Math.max(0, (s.balance || 0) - amt);
  if (!s.transactions) s.transactions = [];

  const unpaidTrans = s.transactions.find(t => t.type === "Alım" && t.status.includes("Borç"));
  if (unpaidTrans) unpaidTrans.status = `Ödendi (${src} — ${nowDate()})`;
  else s.transactions.unshift({ id: Date.now(), date: nowDate(), time: nowTime(), type: "Ödeme", item: `Toptancı Ödemesi (${src})`, amount: amt, status: "Ödendi", invoiceImg: null });

  expenses.unshift({
    id: Date.now(), date: nowDate(), time: nowTime(),
    expenseType: "procurement", category: "Toptancı Borç Ödemesi",
    supplierName: s.name, status: `Ödendi (${src})`,
    amount: amt, desc: "Geçmiş Borç Ödemesi",
    hasInvoice: false, isInvoice: false, vatRate: 0, vatAmount: 0
  });

  sendToGoogleSheets({
    action: "save_expense",
    date: nowDate(),
    time: nowTime(),
    expenseType: "Borç Ödemesi",
    category: s.name,
    paymentSource: src,
    description: "Toptancı Geçmiş Borç Ödemesi",
    amount: amt,
    hasInvoice: false,
    isInvoice: false,
    vatRate: 0,
    vatAmount: 0,
    status: "Ödendi"
  });

  if (typeof syncTaxReportToSheets === "function") {
    setTimeout(syncTaxReportToSheets, 600);
  }

  closeModal("paySupplierModal"); saveData(); renderSuppliersTable(); renderExpensesTable(); renderAllPurchasesTable();
  if (document.getElementById("supplierHistoryModal").classList.contains("show")) openSupplierHistoryModal(s.id);
  toast(`💸 ${amt.toFixed(2)} ₺ ödendi — E-Tablo güncellendi!`);
}

// ── All Purchases Table ──
function renderAllPurchasesTable() {
  const tbody = document.getElementById("allPurchasesTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  const q = (document.getElementById("purchasesSearchInput")?.value || "").toLowerCase();

  let all = [];
  suppliers.forEach(s => {
    (s.transactions || []).filter(t => t.type === "Alım").forEach(t => { all.push({ ...t, supplierName: s.name }); });
  });
  all.sort((a, b) => b.id - a.id);
  const filtered = all.filter(p => p.supplierName.toLowerCase().includes(q) || p.item.toLowerCase().includes(q) || p.date.includes(q));

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Kayıtlı alım yok.</td></tr>`;
    return;
  }
  filtered.forEach(p => {
    const isInv = p.hasInvoice !== undefined ? p.hasInvoice : (p.isInvoice !== undefined ? p.isInvoice : (p.vatAmount > 0));
    const invBadge = isInv
      ? `<span class="badge" style="font-size:10px; background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; margin-left:4px;">🧾 Faturalı</span>`
      : `<span class="badge" style="font-size:10px; background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; margin-left:4px;">⚠️ Faturasız</span>`;

    tbody.innerHTML += `<tr>
      <td><b>${p.date}</b> ${p.time || ''}</td>
      <td><b class="text-primary">${p.supplierName}</b></td>
      <td>${p.item} ${invBadge}</td>
      <td><b style="color:${(p.status||'').includes('Borç') ? 'var(--danger)' : 'var(--success)'};">${p.status}</b></td>
      <td><b style="color:var(--success-dark);">${Number(p.amount).toFixed(2)} ₺</b></td>
      <td>${p.invoiceImg ? `<button class="btn btn-ghost btn-xs" onclick="viewInvoiceImage('${p.invoiceImg}')">📸 Fatura</button>` : '<span class="text-xs text-muted">—</span>'}</td>
    </tr>`;
  });
}

// ── Deficits / Smart Order ──
function renderDeficitsTable() {
  const tbody = document.getElementById("deficitsTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (manualDeficits.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Eksik listesinde ürün yok.</td></tr>`;
  } else {
    manualDeficits.forEach((d, idx) => {
      tbody.innerHTML += `<tr>
        <td><b>${d.name}</b></td><td>${d.supplier || '-'}</td>
        <td><span class="chip ${d.ordered ? 'chip-ok' : 'chip-warn'}">${d.ordered ? '✅ Sipariş Verildi' : '⏳ Bekliyor'}</span></td>
        <td class="flex gap-1">
          <button class="btn btn-success btn-xs" onclick="toggleDeficitOrdered(${idx})">${d.ordered ? 'Geri Al' : '✅ Verildi'}</button>
          <button class="btn btn-danger btn-xs" onclick="removeDeficit(${idx})">Sil</button>
        </td></tr>`;
    });
  }

  const sugTbody = document.getElementById("suggestionsTableBody");
  if (!sugTbody) return;
  sugTbody.innerHTML = "";
  const criticals = products.filter(p => !p.isBundle && p.stock <= 2);
  if (criticals.length === 0) {
    sugTbody.innerHTML = `<tr><td colspan="3" class="empty-state">Kritik stok yok. 👍</td></tr>`;
  } else {
    criticals.forEach(p => {
      const added = manualDeficits.some(d => d.name.toLowerCase() === p.name.toLowerCase());
      sugTbody.innerHTML += `<tr>
        <td><b>${p.name}</b></td>
        <td><b class="text-danger">${p.stock} adet</b></td>
        <td>${added ? '<span class="chip chip-ok">Listede</span>' : `<button class="btn btn-success btn-xs" onclick="addProductToDeficits(${p.id})">+ Ekle</button>`}</td>
      </tr>`;
    });
  }
}

function handleSelectExistingProductForDeficit(val) {
  if (!val) return;
  const p = products.find(prod => prod.name.toLowerCase() === val.trim().toLowerCase());
  if (p) { addProductToDeficits(p.id); document.getElementById("searchProductForDeficit").value = ""; }
}

function addProductToDeficits(prodId) {
  const p = products.find(prod => prod.id === prodId);
  if (!p) return;
  if (manualDeficits.some(d => d.name.toLowerCase() === p.name.toLowerCase())) return toast("Zaten listede!", "warning");
  manualDeficits.push({ id: Date.now(), name: p.name, supplier: p.supplier || "-", ordered: false });
  saveData(); renderDeficitsTable();
}

function addManualDeficit() {
  const input = document.getElementById("manualDeficitInput");
  const val = input.value.trim();
  if (!val) return toast("Eksik kalem adı yazın!", "warning");
  manualDeficits.push({ id: Date.now(), name: val, supplier: "-", ordered: false });
  input.value = "";
  saveData(); renderDeficitsTable();
}

function toggleDeficitOrdered(idx) { manualDeficits[idx].ordered = !manualDeficits[idx].ordered; saveData(); renderDeficitsTable(); }
function removeDeficit(idx) { manualDeficits.splice(idx, 1); saveData(); renderDeficitsTable(); }

function copyDeficits(mode) {
  const items = manualDeficits.filter(d => !d.ordered);
  if (items.length === 0) return toast("Kopyalanacak kalem yok!", "warning");
  const grouped = {};
  items.forEach(d => { const sup = d.supplier || "?"; if (!grouped[sup]) grouped[sup] = []; grouped[sup].push(d.name); });
  let text = "📋 EKSİK LİSTESİ\n═══════════════\n";
  Object.keys(grouped).forEach(sup => { text += `\n🏢 ${sup}:\n`; grouped[sup].forEach((n, i) => { text += `  ${i + 1}. ${n}\n`; }); });
  navigator.clipboard.writeText(text).then(() => toast("📋 Panoya kopyalandı!")).catch(() => prompt("Kopyalayın:", text));
}
