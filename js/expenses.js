/* ===================================================================
   EXPENSES MODULE — Daily & Major Expenses & VAT Reconciliation
   =================================================================== */

function toggleExpenseVatInputs() {
  const chk = document.getElementById("expHasVat");
  const container = document.getElementById("expVatInputsContainer");
  if (!chk || !container) return;
  container.style.display = chk.checked ? "block" : "none";
  if (chk.checked) {
    calculateExpenseVatLive();
  } else {
    const vatAmtEl = document.getElementById("expVatAmount");
    if (vatAmtEl) vatAmtEl.value = "";
  }
}

function calculateExpenseVatLive() {
  const chk = document.getElementById("expHasVat");
  if (!chk || !chk.checked) return;
  const amt = Number(document.getElementById("expAmount")?.value) || 0;
  const rate = Number(document.getElementById("expVatRate")?.value) || 0;
  const vatAmt = rate > 0 ? amt - (amt / (1 + rate / 100)) : 0;
  const vatAmtEl = document.getElementById("expVatAmount");
  if (vatAmtEl) vatAmtEl.value = vatAmt > 0 ? vatAmt.toFixed(2) : "0.00";
}

function openAddExpenseModal(isMajor) {
  document.getElementById("expIsMajor").value = isMajor ? "true" : "false";
  document.getElementById("expModalTitle").innerText = isMajor ? "🏢 Sabit & Majör Gider (Kira, Fatura, Maaş)" : "☕ Günlük Küçük Gider (Kasa Masrafları)";
  const catSel = document.getElementById("expCategory");
  if (isMajor) {
    catSel.innerHTML = `
      <option value="Dükkân Kirası">🏢 Dükkân Kirası</option>
      <option value="Elektrik Faturası">⚡ Elektrik Faturası</option>
      <option value="Su / İnternet / Aidat">💧 Su / İnternet / Aidat</option>
      <option value="Personel Maaşı">👥 Personel Maaşı</option>
      <option value="Vergi / Muhasebe / Harç">🏛️ Vergi / Muhasebe / Harç</option>
      <option value="Banka / POS Komisyonu">💳 Banka / POS Komisyonu</option>
      <option value="Diğer Sabit & Majör Gider">📌 Diğer Sabit & Majör Gider</option>
    `;
  } else {
    catSel.innerHTML = `
      <option value="Yemek / Su / Çay">🍽️ Yemek / Su / Çay</option>
      <option value="Dükkân Sarf (Poşet/Fiş)">🛍️ Dükkân Sarf (Poşet / Temizlik)</option>
      <option value="Ulaşım / Kurye Yakıtı">🛵 Ulaşım / Kurye Yakıtı</option>
      <option value="Ufak Tamirat / Hırdavat">🔧 Ufak Tamirat / Hırdavat</option>
      <option value="Kırtasiye / Sarf">📎 Kırtasiye / Sarf</option>
      <option value="Diğer Günlük Masraf">☕ Diğer Günlük Masraf</option>
    `;
  }
  document.getElementById("expAmount").value = "";
  document.getElementById("expDesc").value = "";

  const chk = document.getElementById("expHasVat");
  if (chk) {
    chk.checked = false;
    toggleExpenseVatInputs();
  }
  const vatRateEl = document.getElementById("expVatRate");
  if (vatRateEl) vatRateEl.value = "20";
  const vatAmtEl = document.getElementById("expVatAmount");
  if (vatAmtEl) vatAmtEl.value = "";

  openModal("addExpenseModal");
}

function saveExpense() {
  const isMajor = document.getElementById("expIsMajor").value === "true";
  const cat = document.getElementById("expCategory").value;
  const src = document.getElementById("expSource").value;
  const amt = Number(document.getElementById("expAmount").value);
  const desc = (document.getElementById("expDesc").value || "").trim();
  const hasVat = document.getElementById("expHasVat")?.checked || false;
  const vatRate = hasVat ? (Number(document.getElementById("expVatRate")?.value) || 0) : 0;
  const vatAmount = hasVat && vatRate > 0 ? Number((amt - (amt / (1 + vatRate / 100))).toFixed(2)) : 0;

  if (!amt || amt <= 0) return toast("Geçerli bir tutar girin!", "error");

  const expRecord = {
    id: Date.now(),
    date: nowDate(),
    time: nowTime(),
    expenseType: isMajor ? "major" : "daily",
    category: cat,
    source: src,
    amount: amt,
    desc: desc || (isMajor ? "Sabit & Majör Gider" : "Günlük Küçük Masraf"),
    hasInvoice: hasVat,
    isInvoice: hasVat,
    vatRate: vatRate,
    vatAmount: vatAmount
  };

  expenses.unshift(expRecord);

  // Canlı Mali Veriler
  let dualData = null;
  if (typeof calculateDualFinancialOverview === "function") {
    dualData = calculateDualFinancialOverview();
  }

  // Google E-Tabloya Gönder
  sendToGoogleSheets({
    action: "save_expense",
    date: expRecord.date,
    time: expRecord.time,
    expenseType: isMajor ? "major" : "daily",
    category: cat,
    paymentSource: src,
    description: expRecord.desc,
    amount: amt,
    hasInvoice: hasVat,
    isInvoice: hasVat,
    vatRate: vatRate,
    vatAmount: vatAmount,
    status: "Ödendi",
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

  closeModal("addExpenseModal");
  saveData();
  renderExpensesTable();
  updateVatReconciliationWidget();
  renderDualFinancialOverviewCard();
  updateAllBadges();

  // Otomatik E-Tablo Mali Rapor senkronizasyonu
  if (typeof syncTaxReportToSheets === "function") {
    setTimeout(() => syncTaxReportToSheets(false), 600);
  }

  toast(`💸 ${amt.toFixed(2)} ₺ ${isMajor ? 'sabit/majör gider' : 'küçük masraf'} kaydedildi!`);
}

// ── Dual Financial Overview: Fiili Kâr vs. Vergi Dengesi ──
function calculateDualFinancialOverview() {
  // 1. Fiili Gerçek Kasa Kârı (Cebe Giren Brüt Kâr)
  // Toplam Satış (Ciro) - Toplam Alış Maliyeti (COGS)
  const totalSales = (salesHistory || []).reduce((sum, s) => sum + (Number(s.total) || 0), 0);

  const totalCost = (salesHistory || []).reduce((sum, s) => {
    if (Array.isArray(s.soldItems) && s.soldItems.length > 0) {
      const saleCost = s.soldItems.reduce((csum, item) => {
        let unitCost = item.cost;
        if (unitCost === undefined || unitCost === null) {
          const matched = (products || []).find(p => p.id === item.id);
          unitCost = matched ? matched.cost : 0;
        }
        return csum + (Number(unitCost) || 0) * (Number(item.qty) || 1);
      }, 0);
      return sum + saleCost;
    }
    return sum;
  }, 0);

  const realProfit = totalSales - totalCost;

  // 2. Resmi Vergi Matrahı
  // Resmi Satışlar - (Faturalı Alışlar + Faturalı Giderler)
  const officialSales = (salesHistory || []).filter(s => {
    if (s.isOfficial !== undefined) return Boolean(s.isOfficial);
    const p = (s.paymentType || "").toUpperCase();
    return p.includes("KART") || p.includes("KREDİ") || p.includes("BANKA") || p.includes("HAVALE") || p.includes("PLATFORM");
  }).reduce((sum, s) => sum + (Number(s.total) || 0), 0);

  // Faturalı Toptancı Mal Alımları
  let invoicedPurchases = 0;
  let uninvoicedPurchases = 0;
  (suppliers || []).forEach(s => {
    (s.transactions || []).filter(t => t.type === "Alım").forEach(t => {
      const isInv = t.hasInvoice !== undefined ? Boolean(t.hasInvoice) : (t.isInvoice !== undefined ? Boolean(t.isInvoice) : (t.vatAmount > 0));
      const amt = Number(t.amount) || 0;
      if (isInv) invoicedPurchases += amt;
      else uninvoicedPurchases += amt;
    });
  });

  // Faturalı İşletme Giderleri (Kira, Fatura vb.)
  const invoicedExpenses = (expenses || []).filter(e => {
    if (e.expenseType === "procurement") return false; // Zaten toptancı alımlarında sayıldı
    return e.hasInvoice !== undefined ? Boolean(e.hasInvoice) : Boolean(e.isInvoice);
  }).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const totalInvoicedDeductions = invoicedPurchases + invoicedExpenses;
  const officialTaxBase = officialSales - totalInvoicedDeductions;

  // 3. Tahmini Vergi Yükü (KDV Farkı + %20 Gelir Vergisi)
  // Hesaplanan KDV (Sadece Resmi Satışlardan Alınan)
  const officialCollectedVat = (salesHistory || []).filter(s => {
    if (s.isOfficial !== undefined) return Boolean(s.isOfficial);
    const p = (s.paymentType || "").toUpperCase();
    return p.includes("KART") || p.includes("KREDİ") || p.includes("BANKA") || p.includes("HAVALE") || p.includes("PLATFORM");
  }).reduce((sum, s) => {
    if (s.vatTotal !== undefined) return sum + Number(s.vatTotal || 0);
    if (Array.isArray(s.soldItems) && s.soldItems.length > 0) {
      return sum + s.soldItems.reduce((isum, item) => {
        const line = (item.qty || 1) * (item.customPrice || item.price || 0);
        const r = Number(item.vatRate !== undefined ? item.vatRate : 20);
        return isum + (r > 0 ? (line - (line / (1 + r / 100))) : 0);
      }, 0);
    }
    return sum + (s.total > 0 ? (s.total - (s.total / 1.20)) : 0);
  }, 0);

  // İndirilecek KDV (Sadece Faturalı Alımlar ve Faturalı Giderler)
  let deductibleSupplierVat = 0;
  (suppliers || []).forEach(s => {
    (s.transactions || []).filter(t => t.type === "Alım").forEach(t => {
      const isInv = t.hasInvoice !== undefined ? Boolean(t.hasInvoice) : (t.isInvoice !== undefined ? Boolean(t.isInvoice) : (t.vatAmount > 0));
      if (isInv) {
        if (t.vatAmount !== undefined) deductibleSupplierVat += Number(t.vatAmount || 0);
        else if (t.amount > 0) {
          const rate = t.vatRate !== undefined ? t.vatRate : 20;
          deductibleSupplierVat += (t.amount - (t.amount / (1 + rate / 100)));
        }
      }
    });
  });

  let deductibleExpenseVat = 0;
  (expenses || []).filter(e => e.expenseType !== "procurement").forEach(e => {
    const isInv = e.hasInvoice !== undefined ? Boolean(e.hasInvoice) : Boolean(e.isInvoice);
    if (isInv && e.vatAmount) {
      deductibleExpenseVat += Number(e.vatAmount || 0);
    }
  });

  const totalDeductibleVat = deductibleSupplierVat + deductibleExpenseVat;
  const payableVat = Math.max(0, officialCollectedVat - totalDeductibleVat);
  const estimatedIncomeTax = Math.max(0, officialTaxBase * 0.20);
  const totalTaxBurden = payableVat + estimatedIncomeTax;

  // 4. Vergi Riski / Uyarısı (Kartsız/faturasız giriş yapılıp kartla satılan tutar hacmi)
  const cardSales = (salesHistory || []).filter(s => {
    const p = (s.paymentType || "").toUpperCase();
    return p.includes("KART") || p.includes("KREDİ") || p.includes("BANKA") || p.includes("HAVALE") || p.includes("PLATFORM");
  }).reduce((sum, s) => sum + (Number(s.total) || 0), 0);

  const riskAmount = Math.max(0, cardSales - invoicedPurchases);
  const isHighRisk = riskAmount > 0;

  return {
    totalSales,
    totalCost,
    realProfit,
    officialSales,
    invoicedPurchases,
    uninvoicedPurchases,
    invoicedExpenses,
    totalInvoicedDeductions,
    officialTaxBase,
    officialCollectedVat,
    totalDeductibleVat,
    payableVat,
    estimatedIncomeTax,
    totalTaxBurden,
    cardSales,
    riskAmount,
    isHighRisk
  };
}

function renderDualFinancialOverviewCard() {
  const data = calculateDualFinancialOverview();

  // 1. Fiili Kasa Kârı
  const realProfitEl = document.getElementById("dualRealProfit");
  if (realProfitEl) {
    realProfitEl.innerText = data.realProfit.toFixed(2) + " ₺";
    realProfitEl.className = "df-value " + (data.realProfit >= 0 ? "text-success" : "text-danger");
  }
  const totalSalesEl = document.getElementById("dualTotalSales");
  if (totalSalesEl) totalSalesEl.innerText = data.totalSales.toFixed(2) + " ₺";
  const totalCostEl = document.getElementById("dualTotalCost");
  if (totalCostEl) totalCostEl.innerText = data.totalCost.toFixed(2) + " ₺";

  // 2. Resmi Vergi Matrahı
  const taxBaseEl = document.getElementById("dualTaxBase");
  if (taxBaseEl) {
    taxBaseEl.innerText = data.officialTaxBase.toFixed(2) + " ₺";
    taxBaseEl.style.color = data.officialTaxBase > 0 ? "#60a5fa" : "#94a3b8";
  }
  const offSalesEl = document.getElementById("dualOfficialSales");
  if (offSalesEl) offSalesEl.innerText = data.officialSales.toFixed(2) + " ₺";
  const invDeductEl = document.getElementById("dualInvoicedDeductions");
  if (invDeductEl) invDeductEl.innerText = data.totalInvoicedDeductions.toFixed(2) + " ₺";

  // 3. Tahmini Vergi Yükü
  const taxBurdenEl = document.getElementById("dualTaxBurden");
  if (taxBurdenEl) taxBurdenEl.innerText = data.totalTaxBurden.toFixed(2) + " ₺";
  const payableVatEl = document.getElementById("dualPayableVat");
  if (payableVatEl) payableVatEl.innerText = data.payableVat.toFixed(2) + " ₺";
  const incomeTaxEl = document.getElementById("dualIncomeTax");
  if (incomeTaxEl) incomeTaxEl.innerText = data.estimatedIncomeTax.toFixed(2) + " ₺";

  // 4. Vergi Riski / Uyarısı
  const riskAmountEl = document.getElementById("dualRiskAmount");
  if (riskAmountEl) riskAmountEl.innerText = data.riskAmount.toFixed(2) + " ₺";
  const cardSalesEl = document.getElementById("dualCardSales");
  if (cardSalesEl) cardSalesEl.innerText = data.cardSales.toFixed(2) + " ₺";
  const invPurchasesEl = document.getElementById("dualInvoicedPurchases");
  if (invPurchasesEl) invPurchasesEl.innerText = data.invoicedPurchases.toFixed(2) + " ₺";

  const riskCard = document.getElementById("dualRiskCard");
  const riskTag = document.getElementById("dualRiskTag");
  const riskBanner = document.getElementById("dualRiskAlertBanner");

  if (riskCard) {
    riskCard.classList.remove("risk-danger", "risk-safe");
    if (data.isHighRisk) {
      riskCard.classList.add("risk-danger");
      if (riskTag) { riskTag.innerText = "🚨 Yüksek Risk"; }
    } else {
      riskCard.classList.add("risk-safe");
      if (riskTag) { riskTag.innerText = "✅ Güvenli"; }
    }
  }

  if (riskBanner) {
    if (data.isHighRisk) {
      riskBanner.style.display = "flex";
      riskBanner.style.background = "rgba(239, 68, 68, 0.15)";
      riskBanner.style.borderColor = "rgba(239, 68, 68, 0.35)";
      riskBanner.style.color = "#fca5a5";
      riskBanner.innerHTML = `<span>🚨 <b>VERGİ DENETİM RİSKİ:</b> Kartlı POS satış hacmi (<b>${data.cardSales.toFixed(2)} ₺</b>), faturalı mal alımlarını (<b>${data.invoicedPurchases.toFixed(2)} ₺</b>) <b>${data.riskAmount.toFixed(2)} ₺</b> aşıyor! Faturasız alınıp kartla satılan mallar vergi denetiminde doğrudan matrah farkı sayılabilir.</span>`;
    } else if (data.uninvoicedPurchases > 0) {
      riskBanner.style.display = "flex";
      riskBanner.style.background = "rgba(245, 158, 11, 0.12)";
      riskBanner.style.borderColor = "rgba(245, 158, 11, 0.3)";
      riskBanner.style.color = "#fde68a";
      riskBanner.innerHTML = `<span>⚠️ <b>UYARI:</b> Toplam <b>${data.uninvoicedPurchases.toFixed(2)} ₺</b> tutarında faturasız mal alımı kaydedilmiş. Bu alımlar kartlı (POS) satışların vergi matrahından düşülemez.</span>`;
    } else {
      riskBanner.style.display = "none";
    }
  }

  // Update KDV summary bar
  const collectedEl = document.getElementById("kdvCollectedTotal");
  if (collectedEl) collectedEl.innerText = data.officialCollectedVat.toFixed(2) + " ₺";

  const deductibleEl = document.getElementById("kdvDeductibleTotal");
  if (deductibleEl) deductibleEl.innerText = data.totalDeductibleVat.toFixed(2) + " ₺";

  const netBalEl = document.getElementById("kdvNetBalance");
  const netVat = data.officialCollectedVat - data.totalDeductibleVat;
  const statusBadge = document.getElementById("vatStatusBadge");

  if (netVat > 0) {
    if (netBalEl) {
      netBalEl.innerText = netVat.toFixed(2) + " ₺";
      netBalEl.style.color = "#f87171";
    }
    if (statusBadge) {
      statusBadge.className = "chip chip-warn";
      statusBadge.innerText = `⚠️ Ödenecek KDV: ${netVat.toFixed(2)} ₺`;
    }
  } else {
    const carryOver = Math.abs(netVat);
    if (netBalEl) {
      netBalEl.innerText = carryOver.toFixed(2) + " ₺";
      netBalEl.style.color = "#4ade80";
    }
    if (statusBadge) {
      statusBadge.className = "chip chip-ok";
      statusBadge.innerText = `✅ Devreden KDV: ${carryOver.toFixed(2)} ₺`;
    }
  }
}

// ── Google Sheets Tax Report Sync ──
function syncTaxReportToSheets(isManual = false) {
  const data = calculateDualFinancialOverview();
  const btn = document.getElementById("btnSyncTaxReport");
  if (btn && isManual) btn.disabled = true;

  sendToGoogleSheets({
    action: "sync_tax_report",
    date: nowDate(),
    time: nowTime(),
    officialSales: Number(data.officialSales.toFixed(2)),
    invoicedPurchases: Number(data.invoicedPurchases.toFixed(2)),
    expensesTotal: Number(data.totalInvoicedDeductions.toFixed(2)),
    taxBase: Number(data.officialTaxBase.toFixed(2)),
    payableVat: Number(data.payableVat.toFixed(2)),
    estimatedIncomeTax: Number(data.estimatedIncomeTax.toFixed(2)),
    totalTaxBurden: Number(data.totalTaxBurden.toFixed(2)),
    netCashProfit: Number(data.realProfit.toFixed(2)),
    riskAmount: Number(data.riskAmount.toFixed(2)),
    riskStatus: data.isHighRisk ? "Yüksek Risk" : "Güvenli",
    collectedVat: Number(data.officialCollectedVat.toFixed(2)),
    deductibleVat: Number(data.totalDeductibleVat.toFixed(2)),
    cardSales: Number(data.cardSales.toFixed(2)),
    invoicedExpenses: Number(data.invoicedExpenses.toFixed(2))
  });

  if (isManual) {
    setTimeout(() => {
      if (btn) btn.disabled = false;
    }, 1200);
    toast("☁️ Mali Rapor ve Vergi Analizi Google E-Tablo'ya gönderildi!");
  }
}

// ── KDV Mutabakat Hesabı (Legacy Wrapper) ──
function calculateVatReconciliation() {
  const data = calculateDualFinancialOverview();
  return {
    collectedVat: data.officialCollectedVat,
    deductibleSupplierVat: data.totalDeductibleVat,
    deductibleExpenseVat: 0,
    totalDeductible: data.totalDeductibleVat,
    netVat: data.officialCollectedVat - data.totalDeductibleVat
  };
}

function updateVatReconciliationWidget() {
  renderDualFinancialOverviewCard();
}

function deleteExpense(expId) {
  const exp = expenses.find(e => e.id === expId);
  if (!exp) return;
  if (!confirm(`"${exp.desc || exp.category}" kaydını silmek istiyor musunuz?`)) return;

  expenses = expenses.filter(e => e.id !== expId);
  saveData();
  renderExpensesTable();
  updateVatReconciliationWidget();
  renderDualFinancialOverviewCard();
  updateAllBadges();
  syncTaxReportToSheets(false);
  toast("🗑️ Gider kaydı silindi ve E-Tablo güncellendi!");
}

function renderExpensesTable() {
  const procTbody = document.getElementById("procurementExpenseTableBody");
  const majorTbody = document.getElementById("majorExpenseTableBody");
  const dailyTbody = document.getElementById("dailyExpenseTableBody");
  if (!procTbody || !majorTbody || !dailyTbody) return;

  procTbody.innerHTML = ""; majorTbody.innerHTML = ""; dailyTbody.innerHTML = "";

  const procExpenses = expenses.filter(e => e.expenseType === "procurement");
  const majorExpenses = expenses.filter(e => e.expenseType === "major");
  const dailyExpenses = expenses.filter(e => e.expenseType === "daily" || !e.expenseType);

  // 1. Ürün & Mal Alımları
  let procTotal = 0;
  if (procExpenses.length === 0) {
    procTbody.innerHTML = `<tr><td colspan="6" class="empty-state">Henüz mal alımı kaydedilmedi.</td></tr>`;
  } else {
    procExpenses.forEach(e => {
      procTotal += Number(e.amount) || 0;
      const isInv = e.hasInvoice !== undefined ? e.hasInvoice : (e.isInvoice !== undefined ? e.isInvoice : (e.vatAmount > 0));
      const vatBadge = isInv && e.vatAmount > 0
        ? `<br><span class="badge" style="font-size:10px; background:#f0fdf4; color:#166534;">🧾 Faturalı (KDV %${e.vatRate || 20}: ${Number(e.vatAmount).toFixed(2)} ₺)</span>`
        : `<br><span class="badge" style="font-size:10px; background:#fef2f2; color:#b91c1c;">⚠️ Faturasız Alım</span>`;
      procTbody.innerHTML += `<tr>
        <td><b>${e.date}</b></td>
        <td><b>${e.supplierName || '-'}</b></td>
        <td>${e.desc || '-'}${vatBadge}</td>
        <td><b style="color:${(e.status||'').includes('Borç') ? 'var(--danger)' : 'var(--success)'};">${e.status || 'Ödendi'}</b></td>
        <td style="color:var(--success-dark); font-weight:800;">${Number(e.amount).toFixed(2)} ₺</td>
        <td><button class="btn btn-danger btn-xs" onclick="deleteExpense(${e.id})" title="Sil">🗑️</button></td>
      </tr>`;
    });
  }
  const procTotalEl = document.getElementById("procurementTotalBadge");
  if (procTotalEl) procTotalEl.innerText = `Toplam: ${procTotal.toFixed(2)} ₺`;

  // 2. Sabit & Majör Giderler
  let majorTotal = 0;
  if (majorExpenses.length === 0) {
    majorTbody.innerHTML = `<tr><td colspan="6" class="empty-state">Sabit & Majör gider kaydı yok.</td></tr>`;
  } else {
    majorExpenses.forEach(e => {
      majorTotal += Number(e.amount) || 0;
      const isInv = e.hasInvoice !== undefined ? e.hasInvoice : e.isInvoice;
      const vatBadge = isInv && e.vatAmount > 0
        ? ` <span class="badge" style="font-size:10px; background:#eff6ff; color:#1d4ed8; font-weight:600;">🧾 Faturalı (KDV %${e.vatRate}: ${Number(e.vatAmount).toFixed(2)} ₺)</span>`
        : ` <span class="badge" style="font-size:10px; background:#f8fafc; color:#64748b;">Fişsiz/Faturasız</span>`;
      majorTbody.innerHTML += `<tr>
        <td><b>${e.date}</b></td>
        <td><b>${e.category}</b>${vatBadge}</td>
        <td>${e.source || '-'}</td>
        <td>${e.desc || '-'}</td>
        <td class="text-danger font-bold">${Number(e.amount).toFixed(2)} ₺</td>
        <td><button class="btn btn-danger btn-xs" onclick="deleteExpense(${e.id})" title="Sil">🗑️</button></td>
      </tr>`;
    });
  }
  const majorTotalEl = document.getElementById("majorTotalBadge");
  if (majorTotalEl) majorTotalEl.innerText = `Toplam: ${majorTotal.toFixed(2)} ₺`;

  // 3. Günlük Küçük Giderler
  let dailyTotal = 0;
  if (dailyExpenses.length === 0) {
    dailyTbody.innerHTML = `<tr><td colspan="7" class="empty-state">Günlük küçük masraf yok.</td></tr>`;
  } else {
    dailyExpenses.forEach(e => {
      dailyTotal += Number(e.amount) || 0;
      const isInv = e.hasInvoice !== undefined ? e.hasInvoice : e.isInvoice;
      const vatBadge = isInv && e.vatAmount > 0
        ? ` <span class="badge" style="font-size:10px; background:#eff6ff; color:#1d4ed8; font-weight:600;">🧾 Faturalı</span>`
        : '';
      dailyTbody.innerHTML += `<tr>
        <td><b>${e.date}</b></td>
        <td>${e.time || '-'}</td>
        <td><b>${e.category}</b>${vatBadge}</td>
        <td>${e.source || '-'}</td>
        <td>${e.desc || '-'}</td>
        <td class="text-danger font-bold">${Number(e.amount).toFixed(2)} ₺</td>
        <td><button class="btn btn-danger btn-xs" onclick="deleteExpense(${e.id})" title="Sil">🗑️</button></td>
      </tr>`;
    });
  }
  const dailyTotalEl = document.getElementById("dailyTotalBadge");
  if (dailyTotalEl) dailyTotalEl.innerText = `Toplam: ${dailyTotal.toFixed(2)} ₺`;

  renderDualFinancialOverviewCard();
}
