/* ===================================================================
   CRM MODULE — Customers, Credit Book
   =================================================================== */

function openAddCustomerModal() {
  document.getElementById("custNameInput").value = "";
  document.getElementById("custPhoneInput").value = "";
  document.getElementById("custAddressInput").value = "";
  document.getElementById("custPetInput").value = "";
  openModal("addCustomerModal");
}

function saveNewCustomer() {
  const name = document.getElementById("custNameInput").value.trim();
  if (!name) return toast("Müşteri adını girin!", "error");
  customers.push({
    id: Date.now(), name,
    phone: document.getElementById("custPhoneInput").value.trim(),
    address: document.getElementById("custAddressInput").value.trim(),
    pet: document.getElementById("custPetInput").value.trim(),
    balance: 0, purchaseHistory: []
  });
  closeModal("addCustomerModal"); saveData(); renderCRM(); updateCustomerDropdown();
  toast(`✅ "${name}" müşteri listesine eklendi!`);
}

function openEditCustomerModal(id) {
  const c = customers.find(item => item.id === id);
  if (!c) return toast("Müşteri bulunamadı!", "error");
  document.getElementById("editCustId").value = c.id;
  document.getElementById("editCustNameInput").value = c.name || "";
  document.getElementById("editCustPhoneInput").value = c.phone || "";
  document.getElementById("editCustAddressInput").value = c.address || "";
  document.getElementById("editCustPetInput").value = c.pet || "";
  openModal("editCustomerModal");
}
window.openEditCustomerModal = openEditCustomerModal;

function saveEditedCustomer() {
  const id = Number(document.getElementById("editCustId").value);
  const c = customers.find(item => item.id === id);
  if (!c) return toast("Müşteri bulunamadı!", "error");
  const name = document.getElementById("editCustNameInput").value.trim();
  if (!name) return toast("Müşteri adını girin!", "error");

  const oldName = c.name;
  c.name = name;
  c.phone = document.getElementById("editCustPhoneInput").value.trim();
  c.address = document.getElementById("editCustAddressInput").value.trim();
  c.pet = document.getElementById("editCustPetInput").value.trim();

  if (oldName !== name && Array.isArray(window.heldCarts)) {
    window.heldCarts.forEach(hc => {
      if (hc.customerName === oldName) hc.customerName = name;
    });
  }

  closeModal("editCustomerModal");
  saveData();
  renderCRM();
  if (typeof renderCreditBook === "function") renderCreditBook();
  updateCustomerDropdown();
  toast(`✅ Müşteri "${name}" bilgileri güncellendi!`);
}
window.saveEditedCustomer = saveEditedCustomer;

var activeHistoryCustId = null;
function editCustomerFromHistory() {
  if (!activeHistoryCustId) return;
  closeModal("customerHistoryModal");
  openEditCustomerModal(activeHistoryCustId);
}
window.editCustomerFromHistory = editCustomerFromHistory;

function deleteCustomer(id) {
  if (confirm("Müşteriyi silmek istiyor musunuz?")) {
    customers = customers.filter(c => c.id !== id);
    saveData(); renderCRM(); updateCustomerDropdown();
  }
}

function renderCRM() {
  const tbody = document.getElementById("crmTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  const q = (document.getElementById("crmSearchInput")?.value || "").toLowerCase();

  const filtered = customers.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)));
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Müşteri bulunamadı.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(c => `
    <tr>
      <td><b>${c.name}</b></td>
      <td>${c.phone || '-'} / ${c.address || '-'}</td>
      <td>${c.pet || '-'}</td>
      <td><b style="color:${c.balance > 0 ? 'var(--danger)' : 'var(--text)'};">${(c.balance || 0).toFixed(2)} ₺</b></td>
      <td class="flex gap-1">
        <button class="btn btn-ghost btn-xs" onclick="openEditCustomerModal(${c.id})" title="Bilgileri Düzenle / Tel Ekle">✏️ Düzenle</button>
        <button class="btn btn-ghost btn-xs" onclick="openCustomerHistoryModal(${c.id})">📜 Geçmiş</button>
        <button class="btn btn-danger btn-xs" onclick="deleteCustomer(${c.id})">Sil</button>
      </td>
    </tr>`).join('');
  updateAllBadges();
}

function openCustomerHistoryModal(custId) {
  const c = customers.find(item => item.id === custId);
  if (!c) return;
  activeHistoryCustId = custId;
  document.getElementById("chCustName").innerText = c.name;
  document.getElementById("chCustContact").innerText = `Tel: ${c.phone || '-'} | Adres: ${c.address || '-'} | Not: ${c.pet || '-'}`;

  const container = document.getElementById("customerHistoryList");
  container.innerHTML = "";
  const history = c.purchaseHistory || [];
  if (history.length === 0) {
    container.innerHTML = `<div class="empty-state">Alışveriş kaydı yok.</div>`;
  } else {
    container.innerHTML = history.map(h => `
      <div class="flex items-center justify-between" style="background:var(--bg); border:1px solid var(--border); padding:10px 14px; border-radius:var(--radius-sm);">
        <div>
          <div class="font-bold text-sm">${h.date} ${h.time || ''} — ${h.items}</div>
          <div class="text-xs text-muted">Ödeme: <b>${h.payment}</b></div>
        </div>
        <b class="text-primary">${Number(h.total).toFixed(2)} ₺</b>
      </div>`).join('');
  }
  openModal("customerHistoryModal");
}

// ── Credit Book ──
function renderCreditBook() {
  const tbody = document.getElementById("creditTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  const debtors = customers.filter(c => c.balance > 0);

  if (debtors.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Açık borcu olan müşteri yok. 👍</td></tr>`;
    return;
  }
  tbody.innerHTML = debtors.map(c => {
    const unpaidItems = (c.purchaseHistory || []).slice(0, 2).map(h => h.items).join(" + ");
    return `
      <tr>
        <td><b>${c.name}</b><br><small class="text-danger">${unpaidItems || 'Açık Borç'}</small></td>
        <td>${c.phone || '-'}</td>
        <td><b class="text-danger">${Number(c.balance || 0).toFixed(2)} ₺</b></td>
        <td>${c.lastPurchaseDate || '-'}</td>
        <td class="flex gap-1" style="align-items:center;">
          <button class="btn btn-ghost btn-xs" onclick="openEditCustomerModal(${c.id})" title="Müşteri Bilgilerini / Telefonu Düzenle">✏️ Düzenle</button>
          <button class="btn btn-success btn-sm" onclick="openDebtCollectModal(${c.id})">Tahsil Et</button>
        </td>
      </tr>`;
  }).join('');
  updateAllBadges();
}

function openDebtCollectModal(custId) {
  const c = customers.find(cust => cust.id === custId);
  if (!c) return;
  activeCollectCustId = custId;
  document.getElementById("cdCustName").innerText = c.name;
  document.getElementById("cdTotalDebt").innerText = (c.balance || 0).toFixed(2) + " ₺";
  document.getElementById("cdAmount").value = c.balance;
  if (document.getElementById("cdMethod")) document.getElementById("cdMethod").value = "Nakit";
  if (document.getElementById("cdReceiptOfficial")) document.getElementById("cdReceiptOfficial").checked = true;
  toggleCdReceiptBox();
  openModal("collectDebtModal");
}

function toggleCdReceiptBox() {
  const method = document.getElementById("cdMethod")?.value || "";
  const hint = document.getElementById("cdReceiptHint");
  const officialRadio = document.getElementById("cdReceiptOfficial");
  const unofficialRadio = document.getElementById("cdReceiptUnofficial");
  if (method.includes("Kart")) {
    if (officialRadio) officialRadio.checked = true;
    if (unofficialRadio) unofficialRadio.disabled = true;
    if (hint) hint.innerText = "(Kart her zaman resmi fişlidir)";
  } else {
    if (unofficialRadio) unofficialRadio.disabled = false;
    if (hint) hint.innerText = "(Fiş/fatura kesildi mi?)";
  }
}

function confirmDebtCollection() {
  const c = customers.find(cust => cust.id === activeCollectCustId);
  if (!c) return;
  const amt = Number(document.getElementById("cdAmount").value);
  const method = document.getElementById("cdMethod").value;
  if (!amt || amt <= 0) return toast("Geçerli bir tutar girin!", "error");

  const isOfficialRadio = document.getElementById("cdReceiptOfficial");
  const isOfficial = method.includes("Kart") ? true : (isOfficialRadio ? isOfficialRadio.checked : true);
  const receiptLabel = isOfficial ? "Fişli" : "Fişsiz";

  c.balance = Math.max(0, c.balance - amt);
  if (!c.purchaseHistory) c.purchaseHistory = [];
  c.purchaseHistory.unshift({ 
    date: nowDate(), 
    time: nowTime(), 
    items: `Veresiye Borç Kapatma Tahsilatı (${receiptLabel})`, 
    total: amt, 
    payment: `${method} (${receiptLabel}) Tahsil Edildi` 
  });

  let dualData = null;
  if (typeof calculateDualFinancialOverview === "function") {
    dualData = calculateDualFinancialOverview();
  }

  const isCard = method.includes("Kart") && !method.includes("Havale");
  const isCash = method.includes("Nakit");
  const isTransfer = method.includes("Havale") || method.includes("IBAN") || method.includes("Banka") || method.includes("EFT");

  const offCash = (isCash && isOfficial) ? amt : 0;
  const unoffCash = (isCash && !isOfficial) ? amt : 0;
  const offTransfer = (isTransfer && isOfficial) ? amt : 0;
  const unoffTransfer = (isTransfer && !isOfficial) ? amt : 0;

  sendToGoogleSheets({
    action: "save_sale",
    date: nowDate(),
    time: nowTime(),
    customerName: c.name,
    channel: "Veresiye Tahsilatı",
    itemsSummary: `Borç Kapatma (${receiptLabel} ${method})`,
    paymentType: `${method} (${receiptLabel})`,
    total: amt,
    cardSales: isCard ? amt : 0,
    cashSales: isCash ? amt : 0,
    transferSales: isTransfer ? amt : 0,
    officialCash: offCash,
    unoffCash: unoffCash,
    officialTransfer: offTransfer,
    unoffTransfer: unoffTransfer,
    vatTotal: isOfficial ? Number((amt * 0.20).toFixed(2)) : 0,
    isOfficial: isOfficial,
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

  closeModal("collectDebtModal"); renderCRM(); renderCreditBook(); saveData();
  toast(`💰 ${amt.toFixed(2)} ₺ (${receiptLabel}) tahsil edildi!`);
}

// ── Manual Debt ──
function openManualDebtModal() {
  const sel = document.getElementById("mdCustSelect");
  if (sel) sel.innerHTML = customers.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  openModal("manualDebtModal");
}

function saveManualDebt() {
  const custId = document.getElementById("mdCustSelect").value;
  const amt = Number(document.getElementById("mdAmount").value);
  const desc = document.getElementById("mdDesc").value;
  if (!amt) return;
  const c = customers.find(cust => cust.id == custId);
  if (c) {
    c.balance = (c.balance || 0) + amt;
    if (!c.purchaseHistory) c.purchaseHistory = [];
    c.purchaseHistory.unshift({ date: nowDate(), items: desc, total: amt, payment: "Veresiye" });
    closeModal("manualDebtModal"); saveData(); renderCreditBook(); renderCRM();
    toast(`📝 ${amt.toFixed(2)} ₺ borç eklendi!`);
  }
}
