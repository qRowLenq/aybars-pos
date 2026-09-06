/* ===================================================================
   EXPENSES MODULE — Unified Ledger Stream & Tax Shield Rules Engine
   =================================================================== */

// ── Tax Rules Calculation Engine ──
function calculateExpenseTaxRules(amt, vatRate, hasVat, mainCategory) {
  amt = Number(amt) || 0;
  vatRate = Number(vatRate) || 0;
  hasVat = Boolean(hasVat);

  let netAmount = amt;
  let vatAmount = 0;
  let taxDeduction = 0;
  let kkeg = 0;
  let withholdingTax = 0;
  let deductibleVat = 0;

  if (hasVat && vatRate > 0) {
    netAmount = Number((amt / (1 + vatRate / 100)).toFixed(2));
    vatAmount = Number((amt - netAmount).toFixed(2));
  } else {
    netAmount = amt;
    vatAmount = 0;
  }

  switch (mainCategory) {
    case "Genel Dükkân / Sarf":
      // %100 matrah indirimi + tam KDV mahsubu
      taxDeduction = hasVat ? netAmount : 0;
      deductibleVat = hasVat ? vatAmount : 0;
      kkeg = 0;
      withholdingTax = 0;
      break;

    case "Binek Taşıt & Akaryakıt":
      // %70 matrah indirimi - %30 KKEG kısıtlaması, KDV %70 oranında mahsup
      if (hasVat) {
        taxDeduction = Number((netAmount * 0.70).toFixed(2));
        kkeg = Number((netAmount * 0.30).toFixed(2));
        deductibleVat = Number((vatAmount * 0.70).toFixed(2));
      } else {
        taxDeduction = 0;
        kkeg = amt;
        deductibleVat = 0;
      }
      withholdingTax = 0;
      break;

    case "Banka & POS Komisyon Kesintisi":
      // %100 finansman gideri matrah indirimi (KDV genellikle 0 veya BSMV dahil)
      taxDeduction = amt;
      deductibleVat = 0;
      kkeg = 0;
      withholdingTax = 0;
      break;

    case "Sabit Kira / Stopaj":
      // %20 stopaj takibi ile: Brüt Kira = Net / 0.80, Stopaj = Brüt * 0.20
      if (amt > 0) {
        const grossRent = Number((amt / 0.80).toFixed(2));
        withholdingTax = Number((grossRent * 0.20).toFixed(2));
        taxDeduction = grossRent; // Brüt kira toplam giderdir
      }
      deductibleVat = 0;
      kkeg = 0;
      break;

    case "Demirbaş Alımı":
      // Eğer tutar > 12.000 TL ise amortismana tabidir (doğrudan tek seferde gider yazılamaz)
      if (amt > 12000) {
        // Amortismana tabi: ilk yıl için tahmini %20 amortisman payı veya 0
        taxDeduction = Number((netAmount * 0.20).toFixed(2)); // Yıllık amortisman payı
      } else {
        taxDeduction = hasVat ? netAmount : 0;
      }
      deductibleVat = hasVat ? vatAmount : 0;
      kkeg = 0;
      withholdingTax = 0;
      break;

    default:
      taxDeduction = hasVat ? netAmount : 0;
      deductibleVat = hasVat ? vatAmount : 0;
      kkeg = 0;
      withholdingTax = 0;
      break;
  }

  return {
    netAmount,
    vatAmount,
    taxDeduction,
    kkeg,
    withholdingTax,
    deductibleVat
  };
}

function handleExpenseCategoryChange() {
  const cat = document.getElementById("expMainCategory")?.value || "Genel Dükkân / Sarf";
  const vatRateEl = document.getElementById("expVatRate");
  const subTypeEl = document.getElementById("expSubType");

  if (cat === "Sabit Kira / Stopaj") {
    if (vatRateEl) vatRateEl.value = "0";
    if (subTypeEl && !subTypeEl.value) subTypeEl.value = "Dükkân Kirası";
  } else if (cat === "Banka & POS Komisyon Kesintisi") {
    if (vatRateEl) vatRateEl.value = "0";
    if (subTypeEl && !subTypeEl.value) subTypeEl.value = "POS Komisyon Kesintisi";
  } else if (cat === "Binek Taşıt & Akaryakıt") {
    if (vatRateEl) vatRateEl.value = "20";
    if (subTypeEl && !subTypeEl.value) subTypeEl.value = "Servis Aracı Mazot";
  } else if (cat === "Demirbaş Alımı") {
    if (vatRateEl) vatRateEl.value = "20";
    if (subTypeEl && !subTypeEl.value) subTypeEl.value = "Demirbaş / Ekipman";
  }

  calculateExpenseTaxShieldLive();
}

function toggleExpenseVatInputs() {
  const chk = document.getElementById("expHasVat");
  const container = document.getElementById("expVatInputsContainer");
  if (!chk || !container) return;
  container.style.display = chk.checked ? "block" : "none";
  calculateExpenseTaxShieldLive();
}

function calculateExpenseTaxShieldLive() {
  const amt = Number(document.getElementById("expAmount")?.value) || 0;
  const mainCat = document.getElementById("expMainCategory")?.value || "Genel Dükkân / Sarf";
  const hasVat = document.getElementById("expHasVat") ? document.getElementById("expHasVat").checked : true;
  const vatRate = hasVat ? (Number(document.getElementById("expVatRate")?.value) || 0) : 0;

  const rules = calculateExpenseTaxRules(amt, vatRate, hasVat, mainCat);

  // Vat amount field
  const vatAmtEl = document.getElementById("expVatAmount");
  if (vatAmtEl) vatAmtEl.value = rules.vatAmount > 0 ? rules.vatAmount.toFixed(2) : "0.00";

  // Modal Live Preview
  const netEl = document.getElementById("expNetAmtDisplay");
  const dedVatEl = document.getElementById("expDeductibleVatDisplay");
  const taxDedEl = document.getElementById("expTaxDeductionDisplay");
  const kkegEl = document.getElementById("expKkegDisplay");
  const kkegRow = document.getElementById("expKkegRow");
  const withEl = document.getElementById("expWithholdingDisplay");
  const withRow = document.getElementById("expWithholdingRow");
  const amortAlert = document.getElementById("expAmortizationAlert");

  if (netEl) netEl.innerText = rules.netAmount.toFixed(2) + " ₺";
  if (dedVatEl) dedVatEl.innerText = rules.deductibleVat.toFixed(2) + " ₺";
  if (taxDedEl) taxDedEl.innerText = rules.taxDeduction.toFixed(2) + " ₺";

  if (kkegRow && kkegEl) {
    if (rules.kkeg > 0) {
      kkegRow.style.display = "flex";
      kkegEl.innerText = rules.kkeg.toFixed(2) + " ₺";
    } else {
      kkegRow.style.display = "none";
    }
  }

  if (withRow && withEl) {
    if (rules.withholdingTax > 0) {
      withRow.style.display = "flex";
      withEl.innerText = rules.withholdingTax.toFixed(2) + " ₺";
    } else {
      withRow.style.display = "none";
    }
  }

  if (amortAlert) {
    amortAlert.style.display = (mainCat === "Demirbaş Alımı" && amt > 12000) ? "flex" : "none";
  }
}

// Backward compatibility alias
function calculateExpenseVatLive() {
  calculateExpenseTaxShieldLive();
}

function openAddExpenseModal(isMajor = false) {
  const isMajEl = document.getElementById("expIsMajor");
  if (isMajEl) isMajEl.value = isMajor ? "true" : "false";

  const mainCatSel = document.getElementById("expMainCategory");
  if (mainCatSel) {
    mainCatSel.value = isMajor ? "Sabit Kira / Stopaj" : "Genel Dükkân / Sarf";
  }

  const subTypeEl = document.getElementById("expSubType");
  if (subTypeEl) subTypeEl.value = isMajor ? "Dükkân Kirası" : "";

  document.getElementById("expAmount").value = "";
  document.getElementById("expDesc").value = "";

  const chk = document.getElementById("expHasVat");
  if (chk) chk.checked = true;
  toggleExpenseVatInputs();

  handleExpenseCategoryChange();
  openModal("addExpenseModal");
}

function saveExpense() {
  const mainCat = document.getElementById("expMainCategory")?.value || "Genel Dükkân / Sarf";
  const subType = (document.getElementById("expSubType")?.value || "").trim() || mainCat;
  const src = document.getElementById("expSource")?.value || "Kasa (Nakit)";
  const amt = Number(document.getElementById("expAmount")?.value);
  const desc = (document.getElementById("expDesc")?.value || "").trim() || subType;
  const hasVat = document.getElementById("expHasVat") ? document.getElementById("expHasVat").checked : true;
  const vatRate = hasVat ? (Number(document.getElementById("expVatRate")?.value) || 0) : 0;

  if (!amt || amt <= 0) return toast("Geçerli bir gider tutarı girin!", "error");

  const rules = calculateExpenseTaxRules(amt, vatRate, hasVat, mainCat);

  const isMajor = (
    mainCat.includes("Sabit") ||
    mainCat.includes("Kira") ||
    mainCat.includes("Taşıt") ||
    mainCat.includes("Demirbaş") ||
    mainCat.includes("Personel")
  );

  let invoiceStatus = "⚠️ Faturasız";
  if (hasVat) {
    if (rules.withholdingTax > 0) invoiceStatus = "🧾 Stopajlı (%20 Stopaj)";
    else if (rules.kkeg > 0) invoiceStatus = "🧾 Faturalı (%70 Mahsup)";
    else invoiceStatus = "🧾 Faturalı";
  }

  const expRecord = {
    id: Date.now(),
    date: nowDate(),
    time: nowTime(),
    mainCategory: mainCat,
    subType: subType,
    category: mainCat, // backward compatibility
    desc: desc,
    amount: amt,
    vatRate: vatRate,
    vatAmount: rules.vatAmount,
    deductibleVat: rules.deductibleVat,
    paymentMethod: src,
    source: src, // backward compatibility
    hasInvoice: hasVat,
    isInvoice: hasVat,
    invoiceStatus: invoiceStatus,
    taxDeduction: rules.taxDeduction,
    kkeg: rules.kkeg,
    withholdingTax: rules.withholdingTax,
    expenseType: isMajor ? "major" : "daily"
  };

  expenses.unshift(expRecord);

  // Canlı Mali Veriler
  let dualData = null;
  if (typeof calculateDualFinancialOverview === "function") {
    dualData = calculateDualFinancialOverview();
  }

  // Google E-Tabloya 11 Kolonluk Kurumsal Konsolide Şema ile Gönder
  sendToGoogleSheets({
    action: "save_expense",
    date: expRecord.date,
    time: expRecord.time,
    mainCategory: expRecord.mainCategory,
    subType: expRecord.subType,
    description: expRecord.desc,
    amount: expRecord.amount,
    vatRate: expRecord.vatRate,
    vatAmount: expRecord.vatAmount,
    paymentMethod: expRecord.paymentMethod,
    invoiceStatus: expRecord.invoiceStatus,
    taxDeduction: expRecord.taxDeduction,
    kkeg: expRecord.kkeg,
    withholdingTax: expRecord.withholdingTax,
    hasInvoice: expRecord.hasInvoice,
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

  if (typeof syncTaxReportToSheets === "function") {
    setTimeout(() => syncTaxReportToSheets(false), 600);
  }

  toast(`💸 ${amt.toFixed(2)} ₺ gider kaydedildi! (Matrah İndirimi: ${rules.taxDeduction.toFixed(2)} ₺)`);
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

// ── Dynamic Top-of-Page KPI Summary Cards ──
function renderUnifiedExpenseKPIs() {
  const today = nowDate();
  let curMonth = "";
  let curYear = "";

  if (today && today.includes(".")) {
    const p = today.split(".");
    curMonth = p[1];
    curYear = p[2];
  }

  let todayTotal = 0;
  let w1Total = 0;
  let w2Total = 0;
  let w3Total = 0;
  let w4Total = 0;
  let fixedTotal = 0;
  let procTotal = 0;
  let monthlyTotal = 0;

  (expenses || []).forEach(e => {
    const amt = Number(e.amount) || 0;
    const dateStr = String(e.date || "");

    // Today
    if (dateStr === today) {
      todayTotal += amt;
    }

    // Check if in current month
    let day = 0;
    let inCurMonth = true;
    if (dateStr.includes(".")) {
      const parts = dateStr.split(".");
      day = parseInt(parts[0], 10) || 0;
      if (curMonth && curYear && (parts[1] !== curMonth || parts[2] !== curYear)) {
        inCurMonth = false;
      }
    }

    if (inCurMonth) {
      monthlyTotal += amt;

      // Weeks breakdown
      if (day >= 1 && day <= 7) w1Total += amt;
      else if (day >= 8 && day <= 14) w2Total += amt;
      else if (day >= 15 && day <= 21) w3Total += amt;
      else if (day >= 22) w4Total += amt;

      // Sabit Masraflar (Kira, Stopaj, Elektrik, Su, Doğalgaz, Maaş)
      const mainCat = String(e.mainCategory || e.category || "");
      const sub = String(e.subType || "").toLowerCase();
      const desc = String(e.desc || "").toLowerCase();
      const isFixed = (
        mainCat.includes("Kira") ||
        mainCat.includes("Sabit") ||
        mainCat.includes("Personel") ||
        sub.includes("kira") ||
        sub.includes("elektrik") ||
        sub.includes("su") ||
        sub.includes("internet") ||
        sub.includes("maaş") ||
        sub.includes("aidat") ||
        desc.includes("kira") ||
        desc.includes("elektrik") ||
        desc.includes("fatura")
      );
      if (isFixed) fixedTotal += amt;

      // Toptancı Alımları & Mal Maliyeti
      const isProc = (
        mainCat === "Toptancı Alımı" ||
        e.expenseType === "procurement" ||
        e.category === "Ürün Alımı" ||
        e.supplierName
      );
      if (isProc) procTotal += amt;
    }
  });

  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = val.toFixed(2) + " ₺";
  };

  setTxt("kpiExpToday", todayTotal);
  setTxt("kpiExpW1", w1Total);
  setTxt("kpiExpW2", w2Total);
  setTxt("kpiExpW3", w3Total);
  setTxt("kpiExpW4", w4Total);
  setTxt("kpiExpFixed", fixedTotal);
  setTxt("kpiExpProc", procTotal);
  setTxt("kpiExpTotal", monthlyTotal);

  const monthLabel = document.getElementById("kpiExpMonthLabel");
  if (monthLabel) {
    monthLabel.innerText = `${getMonthYearHeader(today)} Toplamı`;
  }
}

function renderExpensesTable() {
  renderUnifiedExpenseKPIs();

  const unifiedTbody = document.getElementById("unifiedExpensesTableBody");
  if (!unifiedTbody) return;

  const catFilter = document.getElementById("expenseCategoryFilter")?.value || "TÜMÜ";
  const searchQ = (document.getElementById("expenseSearchInput")?.value || "").trim().toLowerCase();

  unifiedTbody.innerHTML = "";

  const filtered = (expenses || []).filter(e => {
    const mainCat = e.mainCategory || e.category || "Diğer";
    if (catFilter !== "TÜMÜ" && mainCat !== catFilter) {
      if (catFilter === "Toptancı Alımı" && e.expenseType !== "procurement") return false;
      if (catFilter !== "Toptancı Alımı" && !mainCat.includes(catFilter)) return false;
    }

    if (searchQ) {
      const matchText = [
        e.date, e.mainCategory, e.subType, e.category, e.desc,
        e.supplierName, e.paymentMethod, e.source
      ].filter(Boolean).join(" ").toLowerCase();
      if (!matchText.includes(searchQ)) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    unifiedTbody.innerHTML = `<tr><td colspan="12" class="empty-state">Kayıtlı gider bulunamadı.</td></tr>`;
  } else {
    filtered.forEach(e => {
      const amt = Number(e.amount) || 0;
      const vatRate = e.vatRate !== undefined ? e.vatRate : 20;
      const vatAmt = Number(e.vatAmount || 0);
      const isInv = e.hasInvoice !== undefined ? Boolean(e.hasInvoice) : Boolean(e.isInvoice);

      // Tax shield deduction
      let taxDed = 0;
      if (e.taxDeduction !== undefined) {
        taxDed = Number(e.taxDeduction);
      } else if (isInv) {
        taxDed = vatRate > 0 ? (amt - vatAmt) : amt;
      }

      // Invoice status badge
      let invBadge = "";
      if (isInv) {
        invBadge = `<span class="badge" style="background:#f0fdf4; color:#166534; font-weight:600; font-size:11px;">${e.invoiceStatus || '🧾 Faturalı'}</span>`;
      } else {
        invBadge = `<span class="badge" style="background:#fef2f2; color:#b91c1c; font-weight:600; font-size:11px;">⚠️ Faturasız</span>`;
      }

      // Category color tag
      const mainCat = e.mainCategory || (e.expenseType === "procurement" ? "Toptancı Alımı" : (e.expenseType === "major" ? "Sabit & Majör Gider" : "Genel Dükkân / Sarf"));
      let catTagClass = "chip-info";
      if (mainCat.includes("Toptancı")) catTagClass = "chip-ok";
      else if (mainCat.includes("Taşıt")) catTagClass = "chip-warn";
      else if (mainCat.includes("Kira")) catTagClass = "chip-info";

      // Tax shield badges with KKEG and withholding
      let taxShieldHtml = `<span class="badge-tax-shield">🛡️ ${taxDed.toFixed(2)} ₺</span>`;
      if (e.kkeg && Number(e.kkeg) > 0) {
        taxShieldHtml += `<br><span class="badge-kkeg mt-1">KKEG: ${Number(e.kkeg).toFixed(2)} ₺</span>`;
      }
      if (e.withholdingTax && Number(e.withholdingTax) > 0) {
        taxShieldHtml += `<br><span class="badge" style="font-size:10px; background:#fffbeb; color:#b45309; margin-top:2px;">Stopaj: ${Number(e.withholdingTax).toFixed(2)} ₺</span>`;
      }

      unifiedTbody.innerHTML += `
        <tr>
          <td><b>${e.date}</b></td>
          <td><span class="text-xs text-muted">${e.time || '-'}</span></td>
          <td><span class="chip ${catTagClass}" style="font-size:10.5px;">${mainCat}</span></td>
          <td><b>${e.subType || e.supplierName || e.category || '-'}</b></td>
          <td style="max-width:240px; font-size:12px;">${e.desc || '-'}</td>
          <td><b style="color:var(--danger); font-size:13px;">${amt.toFixed(2)} ₺</b></td>
          <td><span class="badge" style="background:#f1f5f9; color:#475569;">%${vatRate}</span></td>
          <td class="text-sm font-bold" style="color:var(--primary);">${vatAmt.toFixed(2)} ₺</td>
          <td class="text-xs">${e.paymentMethod || e.source || '-'}</td>
          <td>${invBadge}</td>
          <td>${taxShieldHtml}</td>
          <td>
            <button class="btn btn-danger btn-xs" onclick="deleteExpense(${e.id})" title="Gideri Sil">🗑️</button>
          </td>
        </tr>
      `;
    });
  }

  renderDualFinancialOverviewCard();
}
