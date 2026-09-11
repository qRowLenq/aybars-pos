/* ===================================================================
   APP INIT & CORE FUNCTIONALITY — Backup, Daily Close, Startup
   =================================================================== */

// ── Daily Close (Gün Sonu Kapanış & Eski Güne Dönme) ──
function openDailyCloseModal() {
  document.querySelectorAll(".banknote-grid .fc").forEach(inp => inp.value = "");
  window._lastCountedCashTotal = 0;
  window._lastExpectedCashTotal = 0;
  window._lastDifference = 0;
  window._lastDailyCloseData = null;
  const totalCashEl = document.getElementById("dcTotalCash");
  if (totalCashEl) totalCashEl.innerText = "0.00 ₺";
  switchDcModalTab("today");
  calculateDailyClose();
  renderDailyCloseSalesTable();
  renderDailyCloseModalView();
  openModal("dailyCloseModal");
}

function switchDcModalTab(tab) {
  const todaySec = document.getElementById("dcTodaySection");
  const historySec = document.getElementById("dcHistorySection");
  const tabToday = document.getElementById("tabDcToday");
  const tabHistory = document.getElementById("tabDcHistory");

  if (tab === "today") {
    if (todaySec) todaySec.style.display = "block";
    if (historySec) historySec.style.display = "none";
    if (tabToday) {
      tabToday.style.background = "var(--primary)";
      tabToday.style.color = "#fff";
      tabToday.style.borderColor = "var(--primary)";
    }
    if (tabHistory) {
      tabHistory.style.background = "#f1f5f9";
      tabHistory.style.color = "#475569";
      tabHistory.style.borderColor = "transparent";
    }
    calculateDailyClose();
    renderDailyCloseSalesTable();
  } else {
    if (todaySec) todaySec.style.display = "none";
    if (historySec) historySec.style.display = "block";
    if (tabToday) {
      tabToday.style.background = "#f1f5f9";
      tabToday.style.color = "#475569";
      tabToday.style.borderColor = "transparent";
    }
    if (tabHistory) {
      tabHistory.style.background = "var(--primary)";
      tabHistory.style.color = "#fff";
      tabHistory.style.borderColor = "var(--primary)";
    }
    renderDailyCloseModalView();
  }
}

function safeParseMoney(val) {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (!val) return 0;
  var s = String(val).replace(/[^0-9.,-]/g, "").trim();
  if (!s) return 0;
  if (s.indexOf(".") !== -1 && s.indexOf(",") !== -1) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.indexOf(",") !== -1) {
    s = s.replace(",", ".");
  }
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function calculateDailyClose() {
  const getVal = id => {
    const el = document.getElementById(id);
    if (!el) return 0;
    const v = String(el.value || "").trim().replace(",", ".");
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };
  
  const b200 = getVal("b200") * 200;
  const b100 = getVal("b100") * 100;
  const b50 = getVal("b50") * 50;
  const b20 = getVal("b20") * 20;
  const b10 = getVal("b10") * 10;
  const b5 = getVal("b5") * 5;
  const coin = getVal("bCoin");

  const actualTotal = b200 + b100 + b50 + b20 + b10 + b5 + coin;
  window._lastCountedCashTotal = actualTotal;

  const totalCashEl = document.getElementById("dcTotalCash");
  if (totalCashEl) totalCashEl.innerText = actualTotal.toFixed(2) + " ₺";

  const today = nowDate();
  const todaySales = (salesHistory || []).filter(s => s.date === today);

  let cashSales = 0;
  let cardSales = 0;
  let transferSales = 0;
  let officialCash = 0;
  let unoffCash = 0;
  let officialTransfer = 0;
  let unoffTransfer = 0;
  let platformSales = 0;

  let cardCount = 0;
  let cashCount = 0;
  let transferCount = 0;

  todaySales.forEach(s => {
    const isOfficial = (s.isOfficial === true || s.isOfficial === "true" || (s.invoiceStatus || "").includes("Fişli"));
    const bk = (typeof getSalePaymentBreakdown === "function") 
      ? getSalePaymentBreakdown(s) 
      : { cash: Number(s.splitCash) || 0, card: Number(s.splitCard) || 0, transfer: Number(s.splitTransfer) || 0 };
    
    cashSales += bk.cash;
    cardSales += bk.card;
    transferSales += bk.transfer;

    if (isOfficial) {
      officialCash += bk.cash;
      officialTransfer += bk.transfer;
    } else {
      unoffCash += bk.cash;
      unoffTransfer += bk.transfer;
    }

    if (s.platform || (s.paymentType || "").toLowerCase().includes("platform")) {
      platformSales += Number(s.total) || 0;
    }

    if (bk.card > 0) cardCount++;
    if (bk.cash > 0) cashCount++;
    if (bk.transfer > 0) transferCount++;
  });

  // + Müşteri veresiye tahsilatları
  if (Array.isArray(window.customers || customers)) {
    (window.customers || customers).forEach(c => {
      (c.purchaseHistory || []).filter(h => h.date === today && (h.payment || "").includes("Tahsilat")).forEach(h => {
        const p = (h.payment || "").toLowerCase();
        const amt = Number(h.total) || 0;
        if (p.includes("nakit")) {
          cashSales += amt;
          unoffCash += amt;
          cashCount++;
        } else if (p.includes("kart")) {
          cardSales += amt;
          cardCount++;
        } else if (p.includes("havale") || p.includes("iban")) {
          transferSales += amt;
          unoffTransfer += amt;
          transferCount++;
        }
      });
    });
  }

  // EN ALTTA TOPLAT: Günlük Toplam Gelir (Ciro) = Kredi Kartı + Nakit + Havale
  const totalRevenue = cashSales + cardSales + transferSales;

  // - Nakit Çıkan Giderler
  let cashExpenses = 0;
  if (Array.isArray(window.expenses || expenses)) {
    (window.expenses || expenses).filter(e => e.date === today && (
      (e.paymentMethod && (e.paymentMethod.includes("Nakit") || e.paymentMethod.includes("Kasa"))) ||
      (e.source && (e.source.includes("Nakit") || e.source.includes("Kasa"))) ||
      e.status === "Peşin Ödendi"
    )).forEach(e => {
      cashExpenses += (Number(e.amount) || 0);
    });
  }

  // - Nakit Toptancı Ödemeleri
  if (Array.isArray(window.suppliers || suppliers)) {
    (window.suppliers || suppliers).forEach(s => {
      (s.transactions || []).filter(t => t.date === today && t.type === "Ödeme" && (t.item || "").includes("Kasa (Nakit)")).forEach(t => {
        cashExpenses += (Number(t.amount) || 0);
      });
    });
  }

  // UI Güncelleme: Kredi Kartı
  const cardEl = document.getElementById("dcCardSales");
  if (cardEl) cardEl.innerText = cardSales.toFixed(2) + " ₺";
  const cardCountEl = document.getElementById("dcCardCount");
  if (cardCountEl) cardCountEl.innerText = `${cardCount} işlem`;

  // UI Güncelleme: Nakit
  const cashEl = document.getElementById("dcCashSalesDisplay");
  if (cashEl) cashEl.innerText = cashSales.toFixed(2) + " ₺";
  const cashCountEl = document.getElementById("dcCashCount");
  if (cashCountEl) cashCountEl.innerText = `${cashCount} işlem`;

  // UI Güncelleme: Havale / IBAN
  const transferEl = document.getElementById("dcTransferSales");
  if (transferEl) transferEl.innerText = transferSales.toFixed(2) + " ₺";
  const transferCountEl = document.getElementById("dcTransferCount");
  if (transferCountEl) transferCountEl.innerText = `${transferCount} işlem`;

  // UI Güncelleme: Fişli ve Platform Detayları
  const offCashEl = document.getElementById("dcOfficialCash");
  if (offCashEl) offCashEl.innerText = officialCash.toFixed(2) + " ₺";
  const offTransEl = document.getElementById("dcOfficialTransfer");
  if (offTransEl) offTransEl.innerText = officialTransfer.toFixed(2) + " ₺";
  const platEl = document.getElementById("dcPlatformSales");
  if (platEl) platEl.innerText = platformSales.toFixed(2) + " ₺";

  // EN ALTTA TOPLAT: Günlük Toplam Gelir (Ciro)
  const totalRevEl = document.getElementById("dcTotalSalesDisplay");
  if (totalRevEl) totalRevEl.innerText = totalRevenue.toFixed(2) + " ₺";
  const totalCountEl = document.getElementById("dcTotalCountDisplay");
  if (totalCountEl) totalCountEl.innerText = `Toplam ${cardCount + cashCount + transferCount} işlem`;

  // Kasada olması beklenen nakit
  const expectedCash = Math.max(0, cashSales - cashExpenses);
  window._lastExpectedCashTotal = expectedCash;
  const expCashEl = document.getElementById("dcExpectedCash");
  if (expCashEl) expCashEl.innerText = expectedCash.toFixed(2) + " ₺";
  
  const diff = actualTotal - expectedCash;
  window._lastDifference = diff;

  window._lastDailyCloseData = {
    actualCash: actualTotal,
    expectedCash: expectedCash,
    difference: diff,
    cashSales: cashSales,
    cardSales: cardSales,
    transferSales: transferSales,
    platformSales: platformSales,
    officialCash: officialCash,
    unoffCash: unoffCash,
    officialTransfer: officialTransfer,
    unoffTransfer: unoffTransfer,
    totalRevenue: totalRevenue,
    cashExpenses: cashExpenses
  };

  const diffEl = document.getElementById("dcDifference");
  if (diffEl) {
    diffEl.innerText = (diff > 0 ? "+" : "") + diff.toFixed(2) + " ₺";
    diffEl.className = diff >= 0 ? (diff === 0 ? "text-success font-bold" : "text-primary font-bold") : "text-danger font-bold";
  }
}

function renderDailyCloseSalesTable() {
  const tbody = document.getElementById("dcSalesTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const today = nowDate();
  const todaySales = (salesHistory || []).filter(s => s.date === today);

  if (todaySales.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:16px;">Bugün henüz satış yapılmadı.</td></tr>`;
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

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-weight:600; color:#64748b;">${s.time || "-"}</td>
      <td><span class="badge" style="font-size:11px; font-weight:600; ${badgeStyle}">${badgeIcon} ${s.paymentType}</span></td>
      <td style="max-width:280px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${s.itemsSummary || ''}">${s.itemsSummary || '-'}</td>
      <td style="text-align:right; font-weight:700; color:#0f172a;">${Number(s.total).toFixed(2)} ₺</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderDailyCloseModalView() {
  const today = nowDate();
  const todayRecord = (typeof getTodayDailyCloseRecord === "function") 
    ? getTodayDailyCloseRecord(today) 
    : (dailyCloseRecords || []).find(r => r.date === today);

  const closedAlert = document.getElementById("dcTodayClosedAlert");
  const closedSubText = document.getElementById("dcTodayClosedSubText");
  const btnReopen = document.getElementById("btnReopenTodayAction");
  const btnComplete = document.getElementById("btnCompleteCloseAction");

  if (todayRecord) {
    if (closedAlert) closedAlert.style.display = "block";
    if (closedSubText) {
      closedSubText.innerHTML = `Saat <b>${todayRecord.time || ""}</b> itibarıyla gün sonu yapılmış. Toplam Ciro: <b>${(Number(todayRecord.totalRevenue) || 0).toFixed(2)} ₺</b> | Sayılan Kasa: <b>${(Number(todayRecord.actualCash) || 0).toFixed(2)} ₺</b>`;
    }
    if (btnReopen) btnReopen.style.display = "inline-block";
    if (btnComplete) {
      btnComplete.innerHTML = "🔄 Gün Sonunu Yeniden Kaydet";
      btnComplete.className = "btn btn-outline";
    }
  } else {
    if (closedAlert) closedAlert.style.display = "none";
    if (btnReopen) btnReopen.style.display = "none";
    if (btnComplete) {
      btnComplete.innerHTML = "🏁 Gün Sonunu Kapat";
      btnComplete.className = "btn btn-warning";
    }
  }

  // Geçmiş Gün Sonları Listesi
  const histContainer = document.getElementById("dcHistoryList");
  if (histContainer) {
    histContainer.innerHTML = "";
    const list = Array.isArray(window.dailyCloseRecords || dailyCloseRecords) 
      ? [...(window.dailyCloseRecords || dailyCloseRecords)] 
      : [];

    if (list.length === 0) {
      histContainer.innerHTML = `
        <div style="text-align:center; padding:24px 12px; color:#94a3b8; font-size:12px;">
          Henüz kaydedilmiş gün sonu kapanış kaydı bulunmuyor.
        </div>
      `;
      return;
    }

    // Tarihe göre ters sırala
    list.sort((a, b) => (b.closedAt || b.date || "").localeCompare(a.closedAt || a.date || ""));

    list.forEach(rec => {
      const isToday = rec.date === today;
      const diff = Number(rec.difference) || 0;
      let diffBadge = "✅ Tam Mutabakat";
      let diffColor = "#166534";
      let diffBg = "#dcfce7";

      if (diff > 0.01) {
        diffBadge = `📈 +${diff.toFixed(2)} ₺ Fazla`;
        diffColor = "#1e40af";
        diffBg = "#dbeafe";
      } else if (diff < -0.01) {
        diffBadge = `⚠️ ${diff.toFixed(2)} ₺ Açık`;
        diffColor = "#991b1b";
        diffBg = "#fee2e2";
      }

      const itemDiv = document.createElement("div");
      itemDiv.style.cssText = "background:#fff; border:1px solid var(--border); border-radius:var(--radius-sm); padding:10px 12px; margin-bottom:8px; box-shadow:0 1px 2px rgba(0,0,0,0.03);";
      itemDiv.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <b style="font-size:13px; color:#0f172a;">📅 ${rec.date} <span style="font-weight:normal; color:#64748b; font-size:11px;">(${rec.time || ""})</span></b>
            ${isToday ? '<span class="badge" style="background:#fef3c7; color:#92400e; font-size:10px; font-weight:700; border:1px solid #fde68a;">Bugün</span>' : ''}
          </div>
          <span class="badge" style="font-size:10.5px; font-weight:700; background:${diffBg}; color:${diffColor};">${diffBadge}</span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:6px; font-size:11.5px; background:#f8fafc; padding:7px 9px; border-radius:6px; margin-bottom:8px;">
          <div><span style="color:#64748b; font-size:10.5px; display:block;">Toplam Ciro:</span><b style="color:#6b21a8;">${(Number(rec.totalRevenue) || 0).toFixed(2)} ₺</b></div>
          <div><span style="color:#64748b; font-size:10.5px; display:block;">Nakit Satış:</span><b>${(Number(rec.cashSales) || 0).toFixed(2)} ₺</b></div>
          <div><span style="color:#64748b; font-size:10.5px; display:block;">Kredi Kartı:</span><b>${(Number(rec.cardSales) || 0).toFixed(2)} ₺</b></div>
          <div><span style="color:#64748b; font-size:10.5px; display:block;">Havale/IBAN:</span><b>${(Number(rec.transferSales) || 0).toFixed(2)} ₺</b></div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:11.5px; padding-top:4px; border-top:1px dashed #e2e8f0;">
          <span style="color:#64748b;">Sayılan: <b>${(Number(rec.actualCash) || 0).toFixed(2)} ₺</b> (Beklenen: ${(Number(rec.expectedCash) || 0).toFixed(2)} ₺)</span>
          <button class="btn btn-outline btn-xs" style="border-color:#f59e0b; color:#b45309; font-weight:700;" onclick="reopenDailyCloseById('${rec.id}')">
            ↩️ Eski Güne Dön (İptal Et)
          </button>
        </div>
      `;
      histContainer.appendChild(itemDiv);
    });
  }
}

function completeDailyClose() {
  const dcData = window._lastDailyCloseData || {};

  const actualNum = (typeof window._lastCountedCashTotal === "number") 
    ? window._lastCountedCashTotal 
    : safeParseMoney(document.getElementById("dcTotalCash")?.innerText);

  const expNum = (typeof window._lastExpectedCashTotal === "number") 
    ? window._lastExpectedCashTotal 
    : safeParseMoney(document.getElementById("dcExpectedCash")?.innerText);

  const diffNum = (typeof window._lastDifference === "number")
    ? window._lastDifference
    : (actualNum - expNum);

  const today = nowDate();
  const cashSales = dcData.cashSales || 0;
  const cardSales = dcData.cardSales || 0;
  const transferSales = dcData.transferSales || 0;
  const platformSales = dcData.platformSales || 0;
  const officialCash = dcData.officialCash || 0;
  const unoffCash = dcData.unoffCash || 0;
  const officialTransfer = dcData.officialTransfer || 0;
  const unoffTransfer = dcData.unoffTransfer || 0;
  const totalRevenue = dcData.totalRevenue || (cashSales + cardSales + transferSales);
  const cashExpenses = dcData.cashExpenses || 0;

  // Gün Sonu Kaydı oluştur ve yerel belleğe / localStorage'a kaydet
  const closeRecord = {
    id: "dc_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    date: today,
    time: nowTime(),
    actualCash: actualNum,
    expectedCash: expNum,
    cashSales: cashSales,
    cardSales: cardSales,
    transferSales: transferSales,
    platformSales: platformSales,
    officialCash: officialCash,
    unoffCash: unoffCash,
    officialTransfer: officialTransfer,
    unoffTransfer: unoffTransfer,
    totalRevenue: totalRevenue,
    cashExpenses: cashExpenses,
    difference: diffNum,
    closedAt: new Date().toISOString()
  };

  dailyCloseRecords = (window.dailyCloseRecords || dailyCloseRecords || []).filter(r => r.date !== today);
  dailyCloseRecords.unshift(closeRecord);
  window.dailyCloseRecords = dailyCloseRecords;
  saveData();
  
  // Google E-Tablo'ya gönder (GELİR tablosuna işlenir, eski Gün Sonu Kasa sekmesi silinir)
  sendToGoogleSheets({ 
    action: "daily_close", 
    date: today,
    time: nowTime(),
    actualCash: actualNum,
    expectedCash: expNum,
    cashSales: cashSales,
    cardSales: cardSales,
    transferSales: transferSales,
    platformSales: platformSales,
    officialCash: officialCash,
    unoffCash: unoffCash,
    officialTransfer: officialTransfer,
    unoffTransfer: unoffTransfer,
    totalSales: totalRevenue,
    cashExpenses: cashExpenses,
    difference: diffNum 
  });

  // GÜN SONU SONRASI OTOMATİK BİR SONRAKİ GÜNE GEÇİŞ (Yeni gün başlar: Örn: 8 Eylül -> 9 Eylül)
  const nextDay = (typeof getNextDayDateString === "function") 
    ? getNextDayDateString(today) 
    : today;
  window.activeBusinessDate = nextDay;
  localStorage.setItem("ps_active_business_date", nextDay);

  // UI'ı anında güncelle
  if (typeof renderPosSalesHistory === "function") renderPosSalesHistory();
  renderDailyCloseModalView();

  closeModal("dailyCloseModal");
  toast(`🏁 ${today} gün sonu kapatıldı! Kasa yeni güne (${nextDay}) geçti. Yeni satışlar ${nextDay} sütununa yazılacak.`, "success");
}

function reopenTodayDailyClose() {
  // Geri açılacak gün: Son kapatılan gün sonu kaydı veya mevcut gün
  const lastClosed = (window.dailyCloseRecords && window.dailyCloseRecords.length > 0) ? window.dailyCloseRecords[0] : null;
  const targetDay = lastClosed ? lastClosed.date : ((typeof getPrevDayDateString === "function") ? getPrevDayDateString(nowDate()) : nowDate());

  if (!confirm(`⚠️ ${targetDay} tarihli gün sonunu iptal edip o güne geri dönmek istiyor musunuz?\n\nBu işlemle ${targetDay} gün sonu kaydı iptal edilir, kasa o güne geri döner ve satış yapmaya devam edebilirsiniz.`)) {
    return;
  }

  dailyCloseRecords = (window.dailyCloseRecords || dailyCloseRecords || []).filter(r => r.date !== targetDay);
  window.dailyCloseRecords = dailyCloseRecords;
  saveData();

  // Aktif çalışma gününü eski güne geri al
  window.activeBusinessDate = targetDay;
  localStorage.setItem("ps_active_business_date", targetDay);

  // Google Sheets'e gün sonu iptali gönder
  sendToGoogleSheets({
    action: "reopen_daily_close",
    date: targetDay
  });

  if (typeof renderPosSalesHistory === "function") renderPosSalesHistory();
  renderDailyCloseModalView();

  toast(`↩️ ${targetDay} gün sonu iptal edildi! Kasa ${targetDay} gününe geri döndü.`, "success");
}

function reopenDailyCloseById(closeId) {
  const rec = (window.dailyCloseRecords || dailyCloseRecords || []).find(r => r.id === closeId);
  if (!rec) return;

  if (!confirm(`⚠️ ${rec.date} tarihli gün sonu kapanışını iptal edip ${rec.date} gününe geri dönmek istiyor musunuz?`)) {
    return;
  }

  const targetDay = rec.date;
  dailyCloseRecords = (window.dailyCloseRecords || dailyCloseRecords || []).filter(r => r.id !== closeId);
  window.dailyCloseRecords = dailyCloseRecords;
  saveData();

  // Aktif çalışma gününü seçilen güne geri al
  window.activeBusinessDate = targetDay;
  localStorage.setItem("ps_active_business_date", targetDay);

  sendToGoogleSheets({
    action: "reopen_daily_close",
    date: targetDay
  });

  if (typeof renderPosSalesHistory === "function") renderPosSalesHistory();
  renderDailyCloseModalView();

  toast(`↩️ ${targetDay} tarihli gün sonu iptal edildi ve kasa ${targetDay} gününe geri döndü!`, "success");
}

// ── Backup System ──
function exportData() {
  saveData();
  const data = {
    categories, products, customers, suppliers,
    orders, platformPendingOrders, deliveredOrders,
    salesHistory, expenses, manualDeficits, heldCarts,
    bundles, wasteRecords, exportDate: new Date().toISOString()
  };
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = `Petshop_Yedek_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  
  toast("💾 Yedek başarıyla indirildi!");
}

function downloadAybars222Backup() {
  try {
    const rawCatalog = (typeof window !== "undefined" && window.catalogProducts && window.catalogProducts.length > 0)
      ? window.catalogProducts
      : ((typeof catalogProducts !== "undefined" && Array.isArray(catalogProducts)) ? catalogProducts : []);

    const prods = rawCatalog.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category || "Genel",
      price: Number(p.price) || 0,
      cost: Number(p.cost) || 0,
      vatRate: Number(p.vatRate) || 20,
      stock: 0,
      supplier: p.supplier || "-",
      batches: []
    }));

    const backupData = {
      version: "2026_09_v9_stock0_ready",
      exportDate: new Date().toISOString(),
      categories: window.categories || categories || defaultCategories,
      products: prods,
      suppliers: window.suppliers || suppliers || sampleSuppliers,
      customers: [],
      orders: [],
      platformPendingOrders: [],
      deliveredOrders: [],
      salesHistory: [],
      expenses: [],
      manualDeficits: [],
      heldCarts: [],
      bundles: [],
      wasteRecords: []
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aybars_yedek_222_urun.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("📥 222 Ürünlük yedek dosyası başarıyla hazırlandı ve indirildi!", "success");
  } catch (err) {
    console.error("downloadAybars222Backup error:", err);
    toast("İndirme sırasında hata: " + err.message, "error");
  }
}
window.downloadAybars222Backup = downloadAybars222Backup;

function importData(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    let data;
    try {
      data = JSON.parse(e.target.result);
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr);
      toast("Seçilen dosya geçerli bir JSON dosyası değil!", "error");
      event.target.value = "";
      return;
    }

    try {
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        categories = data.categories;
        window.categories = data.categories;
      }
      if (Array.isArray(data.products) && data.products.length > 0) {
        data.products.forEach(p => {
          p.stock = (p.stock !== undefined && p.stock !== null && !isNaN(Number(p.stock))) ? Number(p.stock) : 0;
          p.cost = Number(p.cost) || 0;
          p.price = Number(p.price) || 0;
          p.vatRate = Number(p.vatRate) || 20;
          if (!Array.isArray(p.batches)) p.batches = [];
        });
        products = data.products;
        window.products = data.products;
      }
      if (data.customers) { customers = data.customers; window.customers = data.customers; }
      if (data.orders) { orders = data.orders; window.orders = data.orders; }
      if (data.platformPendingOrders) { platformPendingOrders = data.platformPendingOrders; window.platformPendingOrders = data.platformPendingOrders; }
      if (data.deliveredOrders) { deliveredOrders = data.deliveredOrders; window.deliveredOrders = data.deliveredOrders; }
      if (data.salesHistory) { salesHistory = data.salesHistory; window.salesHistory = data.salesHistory; }
      if (data.expenses) { expenses = data.expenses; window.expenses = data.expenses; }
      if (data.manualDeficits) { manualDeficits = data.manualDeficits; window.manualDeficits = data.manualDeficits; }
      if (data.suppliers) { suppliers = data.suppliers; window.suppliers = data.suppliers; }
      if (data.heldCarts) { heldCarts = data.heldCarts; window.heldCarts = data.heldCarts; }
      if (data.bundles) { bundles = data.bundles; window.bundles = data.bundles; }
      if (data.wasteRecords) { wasteRecords = data.wasteRecords; window.wasteRecords = data.wasteRecords; }
      
      saveData();
      initializeApp();
      toast(`📥 Yedek başarıyla yüklendi! (${(window.products || []).length} ürün)`, "success");
      event.target.value = "";
    } catch(err) {
      toast("Yedek verisi işlenirken hata: " + err.message, "error");
      console.error("importData application error:", err);
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

// ── App Initialization ──
function initializeApp() {
  try { loadState(); } catch(e) { console.error("loadState error:", e); }
  try { initCategoryBar(); } catch(e) { console.error("initCategoryBar error:", e); }
  try { populateCategoryDropdowns(); } catch(e) { console.error("populateCategoryDropdowns error:", e); }
  try { populateSupplierDropdowns(); } catch(e) { console.error("populateSupplierDropdowns error:", e); }
  try { renderCatalog(); } catch(e) { console.error("renderCatalog error:", e); }
  try { renderCart(); } catch(e) { console.error("renderCart error:", e); }
  try { renderPosSalesHistory(); } catch(e) { console.error("renderPosSalesHistory error:", e); }
  try { renderInventoryTable(); } catch(e) { console.error("renderInventoryTable error:", e); }
  try {
    if (typeof renderQuickPricingTable === "function") renderQuickPricingTable();
    else if (typeof window.renderQuickPricingTable === "function") window.renderQuickPricingTable();
  } catch(e) { console.error("renderQuickPricingTable error:", e); }
  try { renderBundlesTable(); } catch(e) { console.error("renderBundlesTable error:", e); }
  try { renderWasteTable(); } catch(e) { console.error("renderWasteTable error:", e); }
  try { renderSuppliersTable(); } catch(e) { console.error("renderSuppliersTable error:", e); }
  try { renderAllPurchasesTable(); } catch(e) { console.error("renderAllPurchasesTable error:", e); }
  try { renderExpensesTable(); } catch(e) { console.error("renderExpensesTable error:", e); }
  try { populateAllProductDatalists(); } catch(e) { console.error("populateAllProductDatalists error:", e); }
  try { updateAllBadges(); } catch(e) { console.error("updateAllBadges error:", e); }
  try {
    if (typeof setPosReceiptDefaultUnofficial === "function") setPosReceiptDefaultUnofficial();
    else if (typeof window !== "undefined" && typeof window.setPosReceiptDefaultUnofficial === "function") window.setPosReceiptDefaultUnofficial();
  } catch(e) {}
  
  // Set version in footer
  const vEl = document.getElementById("appVersion");
  if(vEl) vEl.innerText = "v3.0.0 (Enterprise Financial & Tax Architecture)";
}

// Expose daily close functions globally
window.openDailyCloseModal = openDailyCloseModal;
window.switchDcModalTab = switchDcModalTab;
window.calculateDailyClose = calculateDailyClose;
window.renderDailyCloseSalesTable = renderDailyCloseSalesTable;
window.renderDailyCloseModalView = renderDailyCloseModalView;
window.completeDailyClose = completeDailyClose;
window.reopenTodayDailyClose = reopenTodayDailyClose;
window.reopenDailyCloseById = reopenDailyCloseById;

// Start app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
