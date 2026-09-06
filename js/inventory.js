/* ===================================================================
   INVENTORY MODULE — Products, Bundles, Waste
   =================================================================== */

// ── Add/Edit Product Modal ──
function openAddProductModal(preSelectedSupplier = null) {
  populateCategoryDropdowns();
  populateSupplierDropdowns();
  populateAllProductDatalists();

  document.getElementById("quickProductSearch").value = "";
  document.getElementById("npName").value = "";
  document.getElementById("npPrice").value = "";
  document.getElementById("npCost").value = "";
  document.getElementById("npStock").value = "10";
  const vatEl = document.getElementById("npVatRate");
  if (vatEl) vatEl.value = "20";

  const titleEl = document.getElementById("addProductModalTitle");
  if (preSelectedSupplier) {
    titleEl.innerText = `+ "${preSelectedSupplier}" İçin Ürün Ekle`;
    document.getElementById("npSupplierSelect").value = preSelectedSupplier;
  } else {
    titleEl.innerText = "+ Yeni Ürün Tanımla";
  }
  openModal("addProductModal");
}

function handleAutoFillExistingProduct(val) {
  if (!val) return;
  const p = (typeof findMatchingProduct === "function") ? findMatchingProduct(val) : products.find(prod => prod.name.toLowerCase() === val.trim().toLowerCase());
  if (p) {
    document.getElementById("npName").value = p.name;
    document.getElementById("npCategory").value = p.category || categories[0];
    document.getElementById("npPrice").value = p.price || "";
    document.getElementById("npCost").value = p.cost || "";
    document.getElementById("npStock").value = p.stock || 10;
    const vatEl = document.getElementById("npVatRate");
    if (vatEl) vatEl.value = String(p.vatRate !== undefined ? p.vatRate : 20);
    if (p.supplier && p.supplier !== "-") document.getElementById("npSupplierSelect").value = p.supplier;
  }
}

function saveNewProduct() {
  const name = document.getElementById("npName").value.trim();
  const price = Number(document.getElementById("npPrice").value);
  let cat = document.getElementById("npCategory").value;
  let sup = document.getElementById("npSupplierSelect").value;
  const stock = Number(document.getElementById("npStock").value) || 0;
  const cost = Number(document.getElementById("npCost").value) || 0;
  const vatRate = Number(document.getElementById("npVatRate")?.value) || 20;

  if (!name) return toast("Lütfen ürün adını yazın!", "error");
  if (isNaN(price) || price <= 0) return toast("Geçerli bir satış fiyatı girin!", "error");
  if (!cat) cat = categories[0] || "Genel";

  let existing = products.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    existing.price = price; existing.cost = cost; existing.stock = stock;
    existing.category = cat; existing.supplier = sup || "-";
    existing.vatRate = vatRate;
    toast(`✅ "${name}" güncellendi!`);
  } else {
    products.push({ id: Date.now(), name, category: cat, price, cost, stock, supplier: sup || "-", vatRate });
    toast(`✅ "${name}" stoğa eklendi!`);
  }

  saveData(); closeModal("addProductModal");
  renderCatalog(); renderInventoryTable(); populateAllProductDatalists();
}

// ── SKT (FIFO Expiry) Radar Calculation Engine ──
function getDaysUntilExpiry(expiryStr) {
  if (!expiryStr) return 9999;
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let targetDate = null;
  if (typeof expiryStr === "string") {
    if (expiryStr.includes("-")) {
      const parts = expiryStr.split("-");
      if (parts.length === 2) {
        // YYYY-MM -> set to last day of that month
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        targetDate = new Date(y, m, 0);
      } else if (parts.length === 3) {
        // YYYY-MM-DD
        targetDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    } else if (expiryStr.includes(".")) {
      const parts = expiryStr.split(".");
      if (parts.length === 3) {
        // DD.MM.YYYY
        targetDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      } else if (parts.length === 2) {
        // MM.YYYY
        targetDate = new Date(parseInt(parts[1], 10), parseInt(parts[0], 10), 0);
      }
    }
  }

  if (!targetDate || isNaN(targetDate.getTime())) return 9999;
  const diffTime = targetDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function renderSktRadarWidget() {
  const container = document.getElementById("sktRadarBatchList");
  if (!container) return;

  container.innerHTML = "";

  let redBatches = [];
  let yellowBatches = [];
  let safeCount = 0;

  (products || []).forEach(p => {
    if (p.isBundle) return;
    if (Array.isArray(p.batches) && p.batches.length > 0) {
      p.batches.forEach(b => {
        if (b.qty <= 0) return;
        const days = getDaysUntilExpiry(b.expiry);
        const item = { product: p, batch: b, days };

        if (days <= 15) {
          redBatches.push(item);
        } else if (days <= 30) {
          yellowBatches.push(item);
        } else {
          safeCount++;
        }
      });
    }
  });

  // Sort batches: earliest expiry first
  redBatches.sort((a, b) => a.days - b.days);
  yellowBatches.sort((a, b) => a.days - b.days);

  const redCountEl = document.getElementById("sktRedCount");
  const yellowCountEl = document.getElementById("sktYellowCount");
  const safeCountEl = document.getElementById("sktSafeCount");

  if (redCountEl) redCountEl.innerText = `${redBatches.length} Kalem`;
  if (yellowCountEl) yellowCountEl.innerText = `${yellowBatches.length} Kalem`;
  if (safeCountEl) safeCountEl.innerText = `${safeCount} Kalem`;

  const allAlerts = [...redBatches, ...yellowBatches];

  if (allAlerts.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align:center; padding:18px; color:#94a3b8; font-size:12px;">
        ✅ Önümüzdeki 30 gün içinde son kullanma tarihi yaklaşan kritik parti bulunmuyor. Tüm stoklar güvenli aralıkta.
      </div>`;
    return;
  }

  allAlerts.forEach(item => {
    const isRed = item.days <= 15;
    const borderClass = isRed ? "border-red" : "border-yellow";
    const chipClass = isRed ? "chip-red" : "chip-yellow";
    let countdownText = "";
    if (item.days <= 0) countdownText = "🚨 SÜRESİ DOLDU";
    else if (isRed) countdownText = `🚨 ${item.days} Gün Kaldı`;
    else countdownText = `⚠️ ${item.days} Gün Kaldı`;

    container.innerHTML += `
      <div class="skt-batch-card ${borderClass}">
        <div class="skt-batch-info">
          <b>${item.product.name}</b>
          <span>Parti: <code>${item.batch.lotNumber || '-'}</code> · SKT: <b>${item.batch.expiry || '-'}</b> · Kalan: <b style="color:${isRed ? '#fca5a5' : '#fde68a'}; font-size:13px;">${item.batch.qty} adet</b></span>
        </div>
        <div class="skt-batch-actions">
          <span class="skt-days-chip ${chipClass}">${countdownText}</span>
          <button class="skt-quick-action-btn" onclick="quickPromoBatch(${item.product.id}, '${item.batch.lotNumber}')" title="Bu partiyi eritmek için kampanya paketine dönüştür veya indirim uygula">
            🎁 Paket Yap / İndirimli Satış
          </button>
        </div>
      </div>
    `;
  });
}

function quickPromoBatch(productId, lotNumber) {
  const p = products.find(prod => prod.id === productId);
  if (!p) return;

  const b = (p.batches || []).find(item => item.lotNumber === lotNumber);
  const lotInfo = b ? `(Parti: ${b.lotNumber} · SKT: ${b.expiry} · ${b.qty} adet)` : '';

  const choice = confirm(
    `"${p.name}" ${lotInfo} için hızlı eritme aksiyonu:\n\n` +
    `[TAMAM] -> Bu ürünü Kampanya Paketi (Bundle) oluşturma ekranına otomatik ekle.\n` +
    `[İPTAL] -> Rafta anında %25 acil indirimli satış fiyatı uygula.`
  );

  if (choice) {
    openAddBundleModal();
    const existing = tempBundleItems.find(i => i.productId === p.id);
    if (existing) existing.qty += 1;
    else tempBundleItems.push({ productId: p.id, name: p.name, qty: 1 });
    renderTempBundleItems();
    toast(`🎁 "${p.name}" yeni kampanya paketine eklendi!`, "info");
  } else {
    const oldPrice = p.price;
    const discounted = Math.round(oldPrice * 0.75);
    p.price = discounted;
    saveData();
    renderInventoryTable();
    renderCatalog();
    toast(`🏷️ "${p.name}" fiyatı %25 indirimle ${discounted} ₺ olarak güncellendi!`);
  }
}

// ── Inventory Table ──
function renderInventoryTable() {
  renderSktRadarWidget();

  const q = (document.getElementById("invSearchInput")?.value || "").trim().toLowerCase();
  const cat = (document.getElementById("invCatFilter")?.value || "TÜMÜ").trim();
  const tbody = document.getElementById("inventoryTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const filtered = products.filter(p => {
    if (p.isBundle) return false;
    const prodCat = (p.category || "").trim();
    const catMatch = (cat === "TÜMÜ" || !cat || prodCat.toLowerCase() === cat.toLowerCase());
    const prodName = (p.name || "").toLowerCase();
    const nameMatch = prodName.includes(q);
    return catMatch && nameMatch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-state">Ürün bulunamadı.</td></tr>`;
    return;
  }

  filtered.forEach(p => {
    const numCost = Number(p.cost) || 0;
    const numPrice = Number(p.price) || 0;
    const margin = numCost > 0 ? (((numPrice - numCost) / numCost) * 100).toFixed(0) + "%" : "-";
    const stockVal = isNaN(Number(p.stock)) ? 0 : Number(p.stock);
    const vatRate = p.vatRate !== undefined ? p.vatRate : 20;

    // Nearest batch expiry tag
    let batchTag = "";
    if (Array.isArray(p.batches) && p.batches.length > 0) {
      const activeBatches = p.batches.filter(b => b.qty > 0);
      if (activeBatches.length > 0) {
        activeBatches.sort((a, b) => getDaysUntilExpiry(a.expiry) - getDaysUntilExpiry(b.expiry));
        const nearest = activeBatches[0];
        const days = getDaysUntilExpiry(nearest.expiry);
        if (days <= 15) {
          batchTag = `<br><span class="badge" style="font-size:10px; background:#fee2e2; color:#b91c1c; border:1px solid #fecaca;">🚨 SKT: ${nearest.expiry} (${nearest.qty} ad.)</span>`;
        } else if (days <= 30) {
          batchTag = `<br><span class="badge" style="font-size:10px; background:#fef3c7; color:#b45309; border:1px solid #fde68a;">⚠️ SKT: ${nearest.expiry} (${nearest.qty} ad.)</span>`;
        } else if (nearest.expiry) {
          batchTag = `<br><span class="badge" style="font-size:10px; background:#f8fafc; color:#64748b;">📅 SKT: ${nearest.expiry}</span>`;
        }
      }
    }

    tbody.innerHTML += `
      <tr>
        <td><b>${p.name || '-'}</b>${batchTag}</td>
        <td>${p.category || '-'}</td>
        <td>${p.supplier || '-'}</td>
        <td>${numCost > 0 ? numCost.toFixed(2) + ' ₺' : '-'}</td>
        <td><b>${numPrice.toFixed(2)} ₺</b></td>
        <td><span class="badge" style="background:#f1f5f9; color:#334155; font-weight:600;">%${vatRate}</span></td>
        <td>${margin}</td>
        <td><input type="number" value="${stockVal}" style="width:60px; padding:4px; border:1px solid var(--border); border-radius:4px; font-family:inherit;" onchange="updateStockFast(${p.id}, this.value)"></td>
        <td class="flex gap-1">
          <button class="btn btn-ghost btn-xs" onclick="openProductPurchaseHistory(${p.id})">📜 Geçmiş</button>
          <button class="btn btn-danger btn-xs" onclick="deleteProduct(${p.id})">Sil</button>
        </td>
      </tr>`;
  });
}

function updateStockFast(id, val) {
  const p = products.find(prod => prod.id === id);
  if (p) { p.stock = Number(val); saveData(); renderCatalog(); }
}

function deleteProduct(id) {
  if (confirm("Ürünü silmek istiyor musunuz?")) {
    products = products.filter(p => p.id !== id);
    saveData(); renderCatalog(); renderInventoryTable(); populateAllProductDatalists();
  }
}

// ── Product Purchase History ──
function openProductPurchaseHistory(prodId) {
  const p = products.find(item => item.id === prodId);
  if (!p) return;

  const numCost = Number(p.cost) || 0;
  const prodName = p.name || "";
  document.getElementById("pphProdName").innerText = prodName;
  document.getElementById("pphProdDetails").innerText = `Kategori: ${p.category || '-'} | Tedarikçi: ${p.supplier || '-'} | Maliyet: ${numCost.toFixed(2)} ₺ | Stok: ${p.stock || 0}`;

  const container = document.getElementById("productPurchaseHistoryList");
  container.innerHTML = "";
  let productPurchases = [];
  suppliers.forEach(s => {
    (s.transactions || []).filter(t => t.type === "Alım" && (t.item || "").toLowerCase().includes(prodName.toLowerCase())).forEach(t => {
      productPurchases.push({ ...t, supplierName: s.name });
    });
  });

  if (productPurchases.length === 0) {
    container.innerHTML = `<div class="empty-state">Bu ürüne ait geçmiş toptancı faturası yok.</div>`;
  } else {
    productPurchases.forEach(t => {
      container.innerHTML += `
        <div class="flex items-center justify-between" style="background:var(--bg); border:1px solid var(--border); padding:10px 14px; border-radius:var(--radius-sm);">
          <div>
            <div class="font-bold text-sm">${t.date} ${t.time || ''} — ${t.supplierName}</div>
            <div class="text-sm">Alım: <b>${t.item}</b></div>
            <div class="text-xs text-muted">Durum: <b style="color:${t.status.includes('Borç') ? 'var(--danger)' : 'var(--success)'};">${t.status}</b></div>
          </div>
          <div class="flex items-center gap-2">
            <b style="color:var(--success-dark);">${Number(t.amount).toFixed(2)} ₺</b>
            ${t.invoiceImg ? `<button class="btn btn-ghost btn-xs" onclick="viewInvoiceImage('${t.invoiceImg}')">📸</button>` : ''}
          </div>
        </div>`;
    });
  }
  openModal("productPurchaseHistoryModal");
}

// ── Bundles ──
function openAddBundleModal() {
  tempBundleItems = [];
  document.getElementById("bundleName").value = "";
  document.getElementById("bundlePrice").value = "";
  document.getElementById("bundleProductSearch").value = "";
  document.getElementById("bundleProductQty").value = "1";
  populateAllProductDatalists();
  renderTempBundleItems();
  openModal("addBundleModal");
}

function addProductToBundle() {
  const searchVal = document.getElementById("bundleProductSearch").value.trim();
  const qty = Number(document.getElementById("bundleProductQty").value) || 1;
  const p = (typeof findMatchingProduct === "function") ? findMatchingProduct(searchVal) : products.find(item => item.name.toLowerCase() === searchVal.toLowerCase());
  if (!p) return toast("Geçerli bir ürün seçin!", "error");
  const existing = tempBundleItems.find(i => i.productId === p.id);
  if (existing) existing.qty += qty;
  else tempBundleItems.push({ productId: p.id, name: p.name, qty });
  document.getElementById("bundleProductSearch").value = "";
  renderTempBundleItems();
}

function renderTempBundleItems() {
  const container = document.getElementById("bundleItemsList");
  if (!container) return;
  container.innerHTML = "";
  tempBundleItems.forEach((item, idx) => {
    container.innerHTML += `
      <div class="flex items-center justify-between" style="background:white; border:1px solid var(--border); padding:6px 10px; border-radius:var(--radius-sm); font-size:12px;">
        <span>📦 ${item.qty}x <b>${item.name}</b></span>
        <button class="btn btn-danger btn-xs" onclick="removeTempBundleItem(${idx})">Kaldır</button>
      </div>`;
  });
}

function removeTempBundleItem(idx) { tempBundleItems.splice(idx, 1); renderTempBundleItems(); }

function saveBundle() {
  const name = document.getElementById("bundleName").value.trim();
  const price = Number(document.getElementById("bundlePrice").value);
  if (!name || isNaN(price) || price <= 0 || tempBundleItems.length === 0) return toast("Ad, fiyat girin ve en az 1 ürün ekleyin!", "error");

  const bundleObj = { id: Date.now(), name: `🎁 [KAMPANYA] ${name}`, category: "Kampanyalar", price, cost: 0, stock: 99, isBundle: true, bundleItems: [...tempBundleItems] };
  bundles.unshift(bundleObj);
  products.push(bundleObj);
  closeModal("addBundleModal"); saveData(); renderCatalog(); renderBundlesTable();
  toast(`🎁 "${name}" kampanyası oluşturuldu!`);
}

function renderBundlesTable() {
  const tbody = document.getElementById("bundlesTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (bundles.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Henüz kampanya paketi yok.</td></tr>`;
    return;
  }
  bundles.forEach((b, idx) => {
    const itemsDesc = (b.bundleItems || []).map(i => `• ${i.qty}x ${i.name}`).join("<br>");
    tbody.innerHTML += `<tr><td><b>${b.name}</b></td><td class="text-sm">${itemsDesc}</td><td><b class="text-primary">${Number(b.price).toFixed(2)} ₺</b></td><td><button class="btn btn-danger btn-xs" onclick="deleteBundle(${idx}, ${b.id})">Sil</button></td></tr>`;
  });
}

function deleteBundle(bundleIdx, prodId) {
  if (confirm("Bu kampanyayı silmek istediğinize emin misiniz?")) {
    bundles.splice(bundleIdx, 1);
    products = products.filter(p => p.id !== prodId);
    saveData(); renderCatalog(); renderBundlesTable();
  }
}

// ── Waste / Fire ──
function openAddWasteModal() {
  populateAllProductDatalists();
  document.getElementById("wasteProductSearch").value = "";
  document.getElementById("wasteProductNameDisplay").value = "";
  document.getElementById("wasteSelectedProductId").value = "";
  document.getElementById("wasteCostDisplay").value = "";
  document.getElementById("wasteQty").value = "1";
  document.getElementById("wasteNote").value = "";
  openModal("addWasteModal");
}

function handleAutoFillWasteProduct(val) {
  if (!val) return;
  const p = (typeof findMatchingProduct === "function") ? findMatchingProduct(val) : products.find(prod => prod.name.toLowerCase() === val.trim().toLowerCase());
  if (p) {
    document.getElementById("wasteProductNameDisplay").value = `${p.name} (Stok: ${p.stock})`;
    document.getElementById("wasteSelectedProductId").value = p.id;
    document.getElementById("wasteCostDisplay").value = (p.cost || 0).toFixed(2);
  }
}

function saveWasteRecord() {
  const prodId = Number(document.getElementById("wasteSelectedProductId").value);
  const qty = Number(document.getElementById("wasteQty").value);
  const reason = document.getElementById("wasteReason").value;
  const note = document.getElementById("wasteNote").value.trim();
  const p = products.find(prod => prod.id === prodId);
  if (!p || isNaN(qty) || qty <= 0) return toast("Geçerli ürün ve adet girin!", "error");

  p.stock -= qty;
  wasteRecords.unshift({ id: Date.now(), date: nowDate(), time: nowTime(), productName: p.name, qty, unitCost: p.cost || 0, totalLoss: qty * (p.cost || 0), reason, note });
  closeModal("addWasteModal"); saveData(); renderCatalog(); renderInventoryTable(); renderWasteTable();
  toast(`🗑️ ${qty}x "${p.name}" zayi olarak düşüldü!`);
}

function renderWasteTable() {
  const tbody = document.getElementById("wasteTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (wasteRecords.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Henüz fire/zayi kaydı yok.</td></tr>`;
    return;
  }
  wasteRecords.forEach(w => {
    tbody.innerHTML += `<tr>
      <td>${w.date} ${w.time}</td>
      <td><b>${w.productName}</b></td>
      <td><b class="text-danger">${w.qty} adet</b></td>
      <td>${(w.unitCost || 0).toFixed(2)} ₺</td>
      <td><b class="text-danger">${(w.totalLoss || 0).toFixed(2)} ₺</b></td>
      <td><span class="chip chip-err">${w.reason}</span> ${w.note ? `(${w.note})` : ''}</td>
    </tr>`;
  });
}
