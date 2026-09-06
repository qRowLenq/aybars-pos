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
    phone: document.getElementById("custPhoneInput").value,
    address: document.getElementById("custAddressInput").value,
    pet: document.getElementById("custPetInput").value,
    balance: 0, purchaseHistory: []
  });
  closeModal("addCustomerModal"); saveData(); renderCRM(); updateCustomerDropdown();
  toast(`✅ "${name}" müşteri listesine eklendi!`);
}

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

  filtered.forEach(c => {
    tbody.innerHTML += `
      <tr>
        <td><b>${c.name}</b></td>
        <td>${c.phone || '-'} / ${c.address || '-'}</td>
        <td>${c.pet || '-'}</td>
        <td><b style="color:${c.balance > 0 ? 'var(--danger)' : 'var(--text)'};">${(c.balance || 0).toFixed(2)} ₺</b></td>
        <td class="flex gap-1">
          <button class="btn btn-ghost btn-xs" onclick="openCustomerHistoryModal(${c.id})">📜 Geçmiş</button>
          <button class="btn btn-danger btn-xs" onclick="deleteCustomer(${c.id})">Sil</button>
        </td>
      </tr>`;
  });
  updateAllBadges();
}

function openCustomerHistoryModal(custId) {
  const c = customers.find(item => item.id === custId);
  if (!c) return;
  document.getElementById("chCustName").innerText = c.name;
  document.getElementById("chCustContact").innerText = `Tel: ${c.phone || '-'} | Adres: ${c.address || '-'} | Not: ${c.pet || '-'}`;

  const container = document.getElementById("customerHistoryList");
  container.innerHTML = "";
  const history = c.purchaseHistory || [];
  if (history.length === 0) {
    container.innerHTML = `<div class="empty-state">Alışveriş kaydı yok.</div>`;
  } else {
    history.forEach(h => {
      container.innerHTML += `
        <div class="flex items-center justify-between" style="background:var(--bg); border:1px solid var(--border); padding:10px 14px; border-radius:var(--radius-sm);">
          <div>
            <div class="font-bold text-sm">${h.date} ${h.time || ''} — ${h.items}</div>
            <div class="text-xs text-muted">Ödeme: <b>${h.payment}</b></div>
          </div>
          <b class="text-primary">${Number(h.total).toFixed(2)} ₺</b>
        </div>`;
    });
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
  debtors.forEach(c => {
    const unpaidItems = (c.purchaseHistory || []).slice(0, 2).map(h => h.items).join(" + ");
    tbody.innerHTML += `
      <tr>
        <td><b>${c.name}</b><br><small class="text-danger">${unpaidItems || 'Açık Borç'}</small></td>
        <td>${c.phone || '-'}</td>
        <td><b class="text-danger">${Number(c.balance || 0).toFixed(2)} ₺</b></td>
        <td>${c.lastPurchaseDate || '-'}</td>
        <td><button class="btn btn-success btn-sm" onclick="openDebtCollectModal(${c.id})">Tahsil Et</button></td>
      </tr>`;
  });
  updateAllBadges();
}

function openDebtCollectModal(custId) {
  const c = customers.find(cust => cust.id === custId);
  if (!c) return;
  activeCollectCustId = custId;
  document.getElementById("cdCustName").innerText = c.name;
  document.getElementById("cdTotalDebt").innerText = (c.balance || 0).toFixed(2) + " ₺";
  document.getElementById("cdAmount").value = c.balance;
  openModal("collectDebtModal");
}

function confirmDebtCollection() {
  const c = customers.find(cust => cust.id === activeCollectCustId);
  if (!c) return;
  const amt = Number(document.getElementById("cdAmount").value);
  const method = document.getElementById("cdMethod").value;
  if (!amt || amt <= 0) return toast("Geçerli bir tutar girin!", "error");

  c.balance = Math.max(0, c.balance - amt);
  if (!c.purchaseHistory) c.purchaseHistory = [];
  c.purchaseHistory.unshift({ date: nowDate(), time: nowTime(), items: "Veresiye Borç Kapatma Tahsilatı", total: amt, payment: `${method} Tahsil Edildi` });

  sendToGoogleSheets({
    action: "save_sale",
    date: nowDate(),
    time: nowTime(),
    customerName: c.name,
    channel: "Veresiye Tahsilatı",
    itemsSummary: "Borç Kapatma",
    paymentType: method,
    total: amt,
    vatTotal: 0,
    isOfficial: method.includes("Kart") || method.includes("Havale") || method.includes("Banka")
  });

  closeModal("collectDebtModal"); renderCRM(); renderCreditBook(); saveData();
  toast(`💰 ${amt.toFixed(2)} ₺ tahsil edildi!`);
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
