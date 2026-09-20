/* ===================================================================
   INVENTORY MODULE — Products, Bundles, Waste
   =================================================================== */

// ── Catalog Select & Quick Stock Entry ──
function populateCatalogProductSelect() {
  try {
    const sel = document.getElementById("quickProductSelect");
    if (!sel) return;
    const pList = [...(window.products || products || [])];
    pList.sort((a, b) => (a.name || "").localeCompare(b.name || "", "tr"));
    let html = '<option value="">-- Katalogdaki Ürünlerden Birini Seçin (A-Z) --</option>';
    pList.forEach(p => {
      if (p && !p.isBundle) {
        const stockStr = `Stok: ${p.stock !== undefined ? p.stock : 0}`;
        const costStr = p.cost > 0 ? `Alış: ${p.cost}₺` : 'Alış: Yok';
        const priceStr = p.price > 0 ? `Satış: ${p.price}₺` : 'Satış: Yok';
        html += `<option value="${p.id}">${p.name} (${stockStr} · ${costStr} · ${priceStr})</option>`;
      }
    });
    sel.innerHTML = html;
  } catch (err) {
    console.error("populateCatalogProductSelect error:", err);
  }
}

function handleSelectCatalogProductForEdit(id) {
  const npId = document.getElementById("npProductId");
  if (!id) {
    if (npId) npId.value = "";
    return;
  }
  const pList = window.products || products || [];
  const p = pList.find(prod => Number(prod.id) === Number(id));
  if (!p) return;

  if (npId) npId.value = String(p.id);
  const npName = document.getElementById("npName");
  if (npName) npName.value = p.name || "";
  const npCat = document.getElementById("npCategory");
  if (npCat) npCat.value = p.category || (categories && categories[0]) || "Genel";
  const npPrice = document.getElementById("npPrice");
  if (npPrice) npPrice.value = p.price > 0 ? p.price : "";
  const npCost = document.getElementById("npCost");
  if (npCost) npCost.value = p.cost > 0 ? p.cost : "";
  const npStock = document.getElementById("npStock");
  if (npStock) npStock.value = (p.stock !== undefined && p.stock !== null) ? p.stock : 0;
  const vatEl = document.getElementById("npVatRate");
  if (vatEl) vatEl.value = String(p.vatRate !== undefined ? p.vatRate : 20);
  const supSelect = document.getElementById("npSupplierSelect");
  if (supSelect && p.supplier && p.supplier !== "-") supSelect.value = p.supplier;

  const titleEl = document.getElementById("addProductModalTitle");
  if (titleEl) titleEl.innerText = `✏️ Ürünü Düzenle: ${p.name}`;
}

// ── Dedicated Stock Entry Modal ──
function openStockEntryModal(id) {
  try {
    const pList = window.products || products || [];
    const p = pList.find(prod => Number(prod.id) === Number(id));
    if (!p) return toast("Ürün bulunamadı!", "error");

    const idInput = document.getElementById("seProductId");
    if (idInput) idInput.value = p.id;

    const nameInput = document.getElementById("seProductNameDisplay");
    if (nameInput) nameInput.value = p.name || "";

    const catDisplay = document.getElementById("seProductCatDisplay");
    if (catDisplay) catDisplay.innerText = `Kategori: ${p.category || 'Genel'} | Mevcut Stok: ${p.stock !== undefined ? p.stock : 0} Adet`;

    const costInput = document.getElementById("seCost");
    if (costInput) costInput.value = p.cost > 0 ? p.cost : "";

    const priceInput = document.getElementById("sePrice");
    if (priceInput) priceInput.value = p.price > 0 ? p.price : "";

    const stockInput = document.getElementById("seStock");
    if (stockInput) stockInput.value = (p.stock !== undefined && p.stock !== null) ? p.stock : 0;

    const vatInput = document.getElementById("seVatRate");
    if (vatInput) vatInput.value = String(p.vatRate !== undefined ? p.vatRate : 20);

    const barcodeInput = document.getElementById("seBarcode");
    if (barcodeInput) barcodeInput.value = p.barcode || "";

    const titleEl = document.getElementById("stockEntryModalTitle");
    if (titleEl) titleEl.innerText = `📦 Stok & Fiyat Ekle: ${p.name}`;

    openModal("stockEntryModal");
    setTimeout(() => {
      if (barcodeInput && (!p.barcode || p.barcode === "")) barcodeInput.focus();
      else if (costInput && (!p.cost || p.cost <= 0)) costInput.focus();
      else if (stockInput) stockInput.focus();
    }, 100);
  } catch (err) {
    console.error("openStockEntryModal error:", err);
  }
}

function saveStockEntry() {
  try {
    const idInput = document.getElementById("seProductId");
    const id = idInput ? idInput.value : null;
    if (!id) return toast("Geçersiz ürün!", "error");

    const pList = window.products || products || [];
    const p = pList.find(prod => Number(prod.id) === Number(id));
    if (!p) return toast("Ürün bulunamadı!", "error");

    const costInput = document.getElementById("seCost");
    const priceInput = document.getElementById("sePrice");
    const stockInput = document.getElementById("seStock");
    const vatInput = document.getElementById("seVatRate");
    const barcodeInput = document.getElementById("seBarcode");

    const cost = costInput ? (parseFloat(costInput.value) || 0) : 0;
    const price = priceInput ? (parseFloat(priceInput.value) || 0) : 0;
    const stock = stockInput ? (parseInt(stockInput.value, 10) || 0) : 0;
    const vatRate = vatInput ? (parseInt(vatInput.value, 10) || 20) : 20;
    const barcode = barcodeInput ? barcodeInput.value.trim() : "";

    p.cost = Math.max(0, cost);
    p.price = Math.max(0, price);
    p.stock = Math.max(0, stock);
    p.vatRate = vatRate;
    p.barcode = barcode;

    saveData();
    closeModal("stockEntryModal");

    if (typeof sendToGoogleSheets === "function") {
      sendToGoogleSheets({ action: "inventory_sync", items: window.products });
    }

    if (typeof renderCatalog === "function") renderCatalog();
    if (typeof renderInventoryTable === "function") renderInventoryTable();
    if (typeof renderQuickPricingTable === "function") renderQuickPricingTable();
    if (typeof updateQuickPricingStats === "function") updateQuickPricingStats();
    if (typeof updateAllBadges === "function") updateAllBadges();

    toast(`✅ "${p.name}" güncellendi! Stok: ${p.stock}, Fiyat: ${p.price}₺, Barkod: ${p.barcode || 'Yok'}`, "success");
  } catch (err) {
    console.error("saveStockEntry error:", err);
    toast("Kaydedilirken hata oluştu!", "error");
  }
}

// ── Add/Edit Product Modal ──
function openAddProductModal(preSelectedSupplier = null, initialBarcode = null) {
  try {
    if (typeof populateCategoryDropdowns === "function") populateCategoryDropdowns();
    if (typeof populateSupplierDropdowns === "function") populateSupplierDropdowns();
    if (typeof populateAllProductDatalists === "function") populateAllProductDatalists();
    if (typeof populateCatalogProductSelect === "function") populateCatalogProductSelect();

    const npId = document.getElementById("npProductId");
    if (npId) npId.value = "";

    const qSelect = document.getElementById("quickProductSelect");
    if (qSelect) qSelect.value = "";
    const qSearch = document.getElementById("quickProductSearch");
    if (qSearch) qSearch.value = "";
    const npName = document.getElementById("npName");
    if (npName) npName.value = "";
    const npBarcode = document.getElementById("npBarcode");
    if (npBarcode) npBarcode.value = initialBarcode ? String(initialBarcode).trim() : "";
    const npPrice = document.getElementById("npPrice");
    if (npPrice) npPrice.value = "";
    const npCost = document.getElementById("npCost");
    if (npCost) npCost.value = "";
    const npStock = document.getElementById("npStock");
    if (npStock) npStock.value = "0";
    const vatEl = document.getElementById("npVatRate");
    if (vatEl) vatEl.value = "20";

    const titleEl = document.getElementById("addProductModalTitle");
    if (titleEl) {
      if (preSelectedSupplier) {
        titleEl.innerText = `+ "${preSelectedSupplier}" İçin Ürün Ekle`;
      } else {
        titleEl.innerText = "+ Yeni Ürün Tanımla";
      }
    }
    const supSelect = document.getElementById("npSupplierSelect");
    if (supSelect && preSelectedSupplier) {
      supSelect.value = preSelectedSupplier;
    }
  } catch (err) {
    console.error("openAddProductModal error:", err);
  }
  openModal("addProductModal");
  setTimeout(() => {
    const npBarcode = document.getElementById("npBarcode");
    const npName = document.getElementById("npName");
    if (initialBarcode && npName) {
      npName.focus();
    } else if (npBarcode && !npBarcode.value) {
      npBarcode.focus();
    } else if (npName) {
      npName.focus();
    }
  }, 100);
}

function openEditProductModal(id) {
  try {
    const pList = window.products || products || [];
    const p = pList.find(prod => Number(prod.id) === Number(id));
    if (!p) return toast("Ürün bulunamadı!", "error");

    if (typeof populateCategoryDropdowns === "function") populateCategoryDropdowns();
    if (typeof populateSupplierDropdowns === "function") populateSupplierDropdowns();
    if (typeof populateAllProductDatalists === "function") populateAllProductDatalists();
    if (typeof populateCatalogProductSelect === "function") populateCatalogProductSelect();

    const npId = document.getElementById("npProductId");
    if (npId) npId.value = String(p.id);

    const qSelect = document.getElementById("quickProductSelect");
    if (qSelect) qSelect.value = p.id;
    const qSearch = document.getElementById("quickProductSearch");
    if (qSearch) qSearch.value = p.name || "";
    const npName = document.getElementById("npName");
    if (npName) npName.value = p.name || "";
    const npBarcode = document.getElementById("npBarcode");
    if (npBarcode) npBarcode.value = p.barcode || "";
    const npCat = document.getElementById("npCategory");
    if (npCat) npCat.value = p.category || (categories && categories[0]) || "Genel";
    const npPrice = document.getElementById("npPrice");
    if (npPrice) npPrice.value = p.price > 0 ? p.price : "";
    const npCost = document.getElementById("npCost");
    if (npCost) npCost.value = p.cost > 0 ? p.cost : "";
    const npStock = document.getElementById("npStock");
    if (npStock) npStock.value = p.stock !== undefined ? p.stock : 0;
    const vatEl = document.getElementById("npVatRate");
    if (vatEl) vatEl.value = String(p.vatRate !== undefined ? p.vatRate : 20);
    const supSelect = document.getElementById("npSupplierSelect");
    if (supSelect && p.supplier && p.supplier !== "-") supSelect.value = p.supplier;

    const titleEl = document.getElementById("addProductModalTitle");
    if (titleEl) titleEl.innerText = `✏️ Ürünü Düzenle: ${p.name}`;
  } catch (err) {
    console.error("openEditProductModal error:", err);
  }
  openModal("addProductModal");
  setTimeout(() => {
    const npBarcode = document.getElementById("npBarcode");
    if (npBarcode) {
      npBarcode.focus();
      npBarcode.select();
    }
  }, 100);
}

function handleAutoFillExistingProduct(val) {
  if (!val) return;
  const pList = window.products || products || [];
  const p = (typeof findMatchingProduct === "function") ? findMatchingProduct(val) : pList.find(prod => prod && prod.name && prod.name.toLowerCase() === val.trim().toLowerCase());
  if (p) {
    const npId = document.getElementById("npProductId");
    if (npId) npId.value = String(p.id);
    const qSelect = document.getElementById("quickProductSelect");
    if (qSelect) qSelect.value = p.id;
    const npName = document.getElementById("npName");
    if (npName) npName.value = p.name || "";
    const npBarcode = document.getElementById("npBarcode");
    if (npBarcode) npBarcode.value = p.barcode || "";
    const npCat = document.getElementById("npCategory");
    if (npCat) npCat.value = p.category || (categories && categories[0]) || "Genel";
    const npPrice = document.getElementById("npPrice");
    if (npPrice) npPrice.value = p.price || "";
    const npCost = document.getElementById("npCost");
    if (npCost) npCost.value = p.cost || "";
    const npStock = document.getElementById("npStock");
    if (npStock) npStock.value = (p.stock !== undefined && p.stock !== null) ? p.stock : 0;
    const vatEl = document.getElementById("npVatRate");
    if (vatEl) vatEl.value = String(p.vatRate !== undefined ? p.vatRate : 20);
    const supSelect = document.getElementById("npSupplierSelect");
    if (supSelect && p.supplier && p.supplier !== "-") supSelect.value = p.supplier;

    const titleEl = document.getElementById("addProductModalTitle");
    if (titleEl) titleEl.innerText = `✏️ Ürünü Düzenle: ${p.name}`;
  }
}

function saveNewProduct() {
  try {
    const nameEl = document.getElementById("npName");
    const name = nameEl ? nameEl.value.trim() : "";
    const barcodeEl = document.getElementById("npBarcode");
    const barcode = barcodeEl ? barcodeEl.value.trim() : "";
    const priceEl = document.getElementById("npPrice");
    const price = priceEl ? (Number(priceEl.value) || 0) : 0;
    const catEl = document.getElementById("npCategory");
    let cat = catEl ? catEl.value : "Genel";
    const supEl = document.getElementById("npSupplierSelect");
    let sup = supEl ? supEl.value : "-";
    const stockEl = document.getElementById("npStock");
    const stock = stockEl ? (Number(stockEl.value) || 0) : 0;
    const costEl = document.getElementById("npCost");
    const cost = costEl ? (Number(costEl.value) || 0) : 0;
    const vatEl = document.getElementById("npVatRate");
    const vatRate = vatEl ? (Number(vatEl.value) || 20) : 20;

    if (!name) return toast("Lütfen ürün adını yazın!", "error");
    if (!cat) cat = (categories && categories[0]) || "Genel";

    const editId = document.getElementById("npProductId")?.value;
    let pList = window.products || products || [];

    if (editId) {
      // Düzenleme modu: ID eşleşmesiyle mevcut ürünü güncelle (ismi değişse bile yeni ürün oluşturmaz)
      let existing = pList.find(p => Number(p.id) === Number(editId) || String(p.id) === String(editId));
      if (existing) {
        existing.name = name;
        existing.barcode = barcode;
        existing.price = price;
        existing.cost = cost;
        existing.stock = stock;
        existing.category = cat;
        existing.supplier = sup || "-";
        existing.vatRate = vatRate;
        toast(`✅ "${name}" başarıyla güncellendi!`);
      } else {
        const newProd = {
          id: Number(editId) || Date.now(),
          name,
          barcode,
          category: cat,
          price,
          cost,
          stock,
          supplier: sup || "-",
          vatRate,
          batches: []
        };
        pList.unshift(newProd);
        toast(`✅ "${name}" stoğa eklendi!`);
      }
    } else {
      // Yeni ürün modu
      let existingByName = pList.find(p => p && p.name && p.name.toLowerCase() === name.toLowerCase());
      if (existingByName) {
        existingByName.barcode = barcode || existingByName.barcode || "";
        existingByName.price = price;
        existingByName.cost = cost;
        existingByName.stock = stock;
        existingByName.category = cat;
        existingByName.supplier = sup || "-";
        existingByName.vatRate = vatRate;
        toast(`✅ "${name}" güncellendi!`);
      } else {
        const newProd = {
          id: Date.now(),
          name,
          barcode,
          category: cat,
          price,
          cost,
          stock,
          supplier: sup || "-",
          vatRate,
          batches: []
        };
        pList.unshift(newProd); // En başa ekle
        toast(`✅ "${name}" stoğa eklendi!`);
      }
    }

    window.products = pList;
    products = pList;

    saveData();
    closeModal("addProductModal");

    if (typeof sendToGoogleSheets === "function") {
      sendToGoogleSheets({ action: "inventory_sync", items: window.products });
    }

    if (typeof renderCatalog === "function") renderCatalog();
    if (typeof renderInventoryTable === "function") renderInventoryTable();
    if (typeof renderQuickPricingTable === "function") renderQuickPricingTable();
    if (typeof populateAllProductDatalists === "function") populateAllProductDatalists();
    if (typeof populateCatalogProductSelect === "function") populateCatalogProductSelect();
    if (typeof updateAllBadges === "function") updateAllBadges();
  } catch (err) {
    console.error("saveNewProduct error:", err);
    toast("Kaydedilirken hata oluştu!", "error");
  }
}

window.openAddProductModal = openAddProductModal;
window.openEditProductModal = openEditProductModal;
window.handleAutoFillExistingProduct = handleAutoFillExistingProduct;
window.saveNewProduct = saveNewProduct;
window.populateCatalogProductSelect = populateCatalogProductSelect;
window.handleSelectCatalogProductForEdit = handleSelectCatalogProductForEdit;
window.openStockEntryModal = openStockEntryModal;
window.saveStockEntry = saveStockEntry;

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

  const pList = window.products || products || [];
  const normFn = (typeof normalizeCategoryName === "function") ? normalizeCategoryName : s => (s || "").toLowerCase().trim();
  const filtered = pList.filter(p => {
    if (p.isBundle) return false;
    const prodCat = (p.category || "").trim();
    const catMatch = (cat === "TÜMÜ" || !cat || normFn(prodCat) === normFn(cat));
    const prodName = (p.name || "").toLowerCase();
    const nameMatch = prodName.includes(q) || (p.barcode && String(p.barcode).toLowerCase().includes(q));
    return catMatch && nameMatch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-state">Ürün bulunamadı.</td></tr>`;
    return;
  }

  const sortVal = document.getElementById("invSortSelect")?.value || "name-asc";
  filtered.sort((a, b) => {
    if (sortVal === "name-asc") return (a.name || "").localeCompare(b.name || "", "tr");
    if (sortVal === "name-desc") return (b.name || "").localeCompare(a.name || "", "tr");
    if (sortVal === "stock-desc") return (Number(b.stock) || 0) - (Number(a.stock) || 0);
    if (sortVal === "stock-asc") return (Number(a.stock) || 0) - (Number(b.stock) || 0);
    if (sortVal === "price-desc") return (Number(b.price) || 0) - (Number(a.price) || 0);
    if (sortVal === "price-asc") return (Number(a.price) || 0) - (Number(b.price) || 0);
    if (sortVal === "cost-desc") return (Number(b.cost) || 0) - (Number(a.cost) || 0);
    if (sortVal === "id-desc") return (Number(b.id) || 0) - (Number(a.id) || 0);
    return (a.name || "").localeCompare(b.name || "", "tr");
  });

  const activeCats = (typeof getActiveCategories === "function") ? getActiveCategories() : (window.categories || categories || ["Kedi", "Köpek", "Kuş / Kemirgen", "Açık Mama", "Kum", "Kozmetik", "Kampanyalar", "elekli paspas"]);

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

    let barcodeBadge = "";
    if (p.barcode) {
      barcodeBadge = `<br><span class="badge cursor-pointer" style="font-size:11px; font-family:monospace; background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; margin-top:3px; display:inline-flex; align-items:center; gap:4px;" onclick="openBarcodeModal('${p.id}')" title="Barkodu Düzenle veya Etiket Yazdır">🏷️ ${p.barcode} ✏️</span>`;
    } else {
      barcodeBadge = `<br><button class="btn btn-xs" style="font-size:10.5px; padding:1px 6px; background:#fef3c7; color:#b45309; border:1px dashed #d97706; border-radius:4px; margin-top:3px;" onclick="openBarcodeModal('${p.id}')" title="Bu ürüne barkod ata">+ 🏷️ Barkod Ekle</button>`;
    }

    const catOptionsHtml = activeCats.map(c => `<option value="${c}" ${(p.category || '').toLowerCase() === c.toLowerCase() ? 'selected' : ''}>${c}</option>`).join('');

    tbody.innerHTML += `
      <tr id="inv-row-${p.id}">
        <td><b>${p.name || '-'}</b>${barcodeBadge}${batchTag}</td>
        <td>
          <select class="fc" style="padding:2px 4px; font-size:11.5px; height:26px; width:125px; font-weight:500;" onchange="updateProductCategoryFast(${p.id}, this.value)" title="Kategori Değiştir">
            ${catOptionsHtml}
          </select>
        </td>
        <td>${p.supplier || '-'}</td>
        <td>
          <div class="quick-cell">
            <input type="number" step="any" min="0" value="${numCost > 0 ? numCost : ''}" placeholder="0.00" class="inv-quick-input" title="Alış Maliyeti" onchange="updateProductCostFast(${p.id}, this.value)"> ₺
          </div>
        </td>
        <td>
          <div class="quick-cell">
            <input type="number" step="any" min="0" value="${numPrice > 0 ? numPrice : ''}" placeholder="0.00" class="inv-quick-input font-bold text-primary" title="Satış Fiyatı" onchange="updateProductPriceFast(${p.id}, this.value)"> ₺
          </div>
        </td>
        <td><span class="badge" style="background:#f1f5f9; color:#334155; font-weight:600;">%${vatRate}</span></td>
        <td id="inv-margin-${p.id}"><span class="badge ${numCost > 0 && numPrice >= numCost ? 'badge-success' : 'badge-ghost'}">${margin}</span></td>
        <td><input type="number" value="${stockVal}" class="inv-quick-input text-center" style="width:65px;" onchange="updateStockFast(${p.id}, this.value)"></td>
        <td class="flex gap-1 items-center">
          <button class="btn btn-outline btn-xs" onclick="openBarcodeModal('${p.id}')" title="Barkod Tanımla / Etiket Yazdır">🏷️</button>
          <button class="btn btn-primary btn-xs" onclick="openStockEntryModal(${p.id})" title="Alış/Satış Fiyatı ve Stok Ekle">📦 Stok Ekle</button>
          <button class="btn btn-ghost btn-xs" onclick="openEditProductModal(${p.id})" title="Detaylı Düzenle">✏️ Düzenle</button>
          <button class="btn btn-ghost btn-xs" onclick="openProductPurchaseHistory(${p.id})" title="Geçmiş">📜</button>
          <button class="btn btn-danger btn-xs" onclick="deleteProduct(${p.id})" title="Sil">Sil</button>
        </td>
      </tr>`;
  });
}

function updateProductCategoryFast(id, newCat) {
  if (!newCat) return;
  const pList = window.products || products || [];
  const p = pList.find(prod => Number(prod.id) === Number(id));
  if (p) {
    p.category = newCat.trim();
    saveData();
    if (typeof populateCategoryDropdowns === "function") populateCategoryDropdowns();
    if (typeof renderCatalog === "function") renderCatalog();
    if (typeof updateQuickPricingStats === "function") updateQuickPricingStats();
    toast(`✅ "${p.name}" kategorisi "${newCat}" olarak güncellendi!`);
  }
}
window.updateProductCategoryFast = updateProductCategoryFast;

function updateProductCostFast(id, val) {
  const pList = window.products || products || [];
  const p = pList.find(prod => Number(prod.id) === Number(id));
  if (p) {
    p.cost = Math.max(0, parseFloat(val) || 0);
    saveData();
    refreshInventoryRowMargin(id);
    updateQuickPricingStats();
  }
}

function updateProductPriceFast(id, val) {
  const pList = window.products || products || [];
  const p = pList.find(prod => Number(prod.id) === Number(id));
  if (p) {
    p.price = Math.max(0, parseFloat(val) || 0);
    saveData();
    if (typeof renderCatalog === "function") renderCatalog();
    refreshInventoryRowMargin(id);
    updateQuickPricingStats();
  }
}

function updateStockFast(id, val) {
  const pList = window.products || products || [];
  const p = pList.find(prod => Number(prod.id) === Number(id));
  if (p) {
    p.stock = Math.max(0, parseInt(val, 10) || 0);
    saveData();
    if (typeof renderCatalog === "function") renderCatalog();
    if (typeof renderSktRadarWidget === "function") renderSktRadarWidget();
    updateQuickPricingStats();
  }
}

function refreshInventoryRowMargin(id) {
  const pList = window.products || products || [];
  const p = pList.find(prod => Number(prod.id) === Number(id));
  if (!p) return;
  const numCost = Number(p.cost) || 0;
  const numPrice = Number(p.price) || 0;
  const cell = document.getElementById(`inv-margin-${id}`);
  if (cell) {
    if (numCost > 0 && numPrice > 0) {
      const margin = (((numPrice - numCost) / numCost) * 100).toFixed(0);
      const isProfitable = numPrice >= numCost;
      cell.innerHTML = `<span class="badge ${isProfitable ? 'badge-success' : 'badge-danger'}">%${margin}</span>`;
    } else {
      cell.innerHTML = `<span class="badge badge-ghost">-</span>`;
    }
  }
}

// ── Quick Pricing Subtab Module ──
window.qpCurrentFilter = "all";

function setQpFilter(filter) {
  window.qpCurrentFilter = filter;
  document.querySelectorAll(".qp-filter-btn").forEach(btn => {
    if (btn.dataset.filter === filter) btn.classList.add("active");
    else btn.classList.remove("active");
  });
  renderQuickPricingTable();
}

function filterQuickPricing(filter) {
  setQpFilter(filter);
}

function updateQuickPricingStats() {
  try {
    const pList = window.products || products || [];
    const validProds = pList.filter(p => p && !p.isBundle);
    const total = validProds.length;
    const missingPrice = validProds.filter(p => !p.price || Number(p.price) <= 0).length;
    const missingCost = validProds.filter(p => !p.cost || Number(p.cost) <= 0).length;
    const zeroStock = validProds.filter(p => !p.stock || Number(p.stock) <= 0).length;
    const ready = validProds.filter(p => Number(p.price) > 0 && Number(p.cost) > 0 && Number(p.stock) > 0).length;

    const pct = total > 0 ? Math.round((ready / total) * 100) : 0;

    const fillEl = document.getElementById("qpProgressBarFill");
    if (fillEl) fillEl.style.width = `${pct}%`;
    const pctEl = document.getElementById("qpProgressPercent");
    if (pctEl) pctEl.innerText = `${pct}%`;
    const txtEl = document.getElementById("qpProgressText");
    if (txtEl) txtEl.innerText = `${total} üründen ${ready} tanesi hazır (%${pct})`;

    const elTotal = document.getElementById("qpTotalProducts");
    if (elTotal) elTotal.innerText = total;
    const elMissP = document.getElementById("qpMissingPrice");
    if (elMissP) elMissP.innerText = missingPrice;
    const elMissC = document.getElementById("qpMissingCost");
    if (elMissC) elMissC.innerText = missingCost;
    const elZeroS = document.getElementById("qpZeroStock");
    if (elZeroS) elZeroS.innerText = zeroStock;
    const elReady = document.getElementById("qpReadyCount");
    if (elReady) elReady.innerText = ready;
  } catch (err) {
    console.error("updateQuickPricingStats error:", err);
  }
}

function renderQuickPricingTable() {
  try {
    // Make sure state is loaded
    let pList = window.products || products || [];
    if (!Array.isArray(pList) || pList.length < 50) {
      if (typeof catalogProducts !== "undefined" && Array.isArray(catalogProducts) && catalogProducts.length > 0) {
        window.products = JSON.parse(JSON.stringify(catalogProducts));
        products = window.products;
        pList = window.products;
        if (typeof saveData === "function") saveData();
      }
    }

    updateQuickPricingStats();

    // Populate category filter if empty
    const catSelect = document.getElementById("qpCategoryFilter");
    if (catSelect && catSelect.options.length <= 1) {
      let catList = Array.isArray(window.categories) ? window.categories : (Array.isArray(categories) ? categories : []);
      if (!catList || catList.length === 0) {
        catList = ["Kedi", "Köpek", "Kuş / Kemirgen", "Açık Mama", "Kum", "Kozmetik", "Kampanyalar", "elekli paspas"];
      }
      catSelect.innerHTML = `<option value="TÜMÜ">Tüm Kategoriler (${pList.length})</option>` + catList.map(c => {
        const count = pList.filter(p => (p.category || "").toLowerCase() === c.toLowerCase()).length;
        return `<option value="${c}">${c} (${count})</option>`;
      }).join("");
      catSelect.value = "TÜMÜ";
    }

    const searchInput = document.getElementById("qpSearchInput");
    const search = (searchInput ? searchInput.value : "").trim().toLowerCase();
    const selCat = (catSelect ? catSelect.value : "TÜMÜ") || "TÜMÜ";
    const tbody = document.getElementById("quickPricingTableBody");
    if (!tbody) return;

    const filterType = window.qpCurrentFilter || "all";

    // Sync filter button active states
    document.querySelectorAll(".qp-filter-btn").forEach(btn => {
      if (btn.dataset.filter === filterType) btn.classList.add("active");
      else btn.classList.remove("active");
    });

    const normFn = (typeof normalizeCategoryName === "function") ? normalizeCategoryName : s => (s || "").toLowerCase().trim();
    const filtered = pList.filter(p => {
      if (!p || p.isBundle) return false;

      // Category match
      if (selCat !== "TÜMÜ" && selCat && normFn(p.category) !== normFn(selCat)) {
        return false;
      }

      // Search match
      if (search) {
        const matchName = (p.name || "").toLowerCase().includes(search);
        const matchId = String(p.id).includes(search);
        const matchBarcode = p.barcode && String(p.barcode).toLowerCase().includes(search);
        if (!matchName && !matchId && !matchBarcode) return false;
      }

      // Filter type match
      const pCost = Number(p.cost) || 0;
      const pPrice = Number(p.price) || 0;
      const pStock = Number(p.stock) || 0;

      if (filterType === "missing-price") return pPrice <= 0;
      if (filterType === "missing-cost") return pCost <= 0;
      if (filterType === "zero-stock") return pStock <= 0;
      if (filterType === "ready") return pPrice > 0 && pCost > 0 && pStock > 0;

      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-state" style="text-align:center; padding:35px 20px; color:var(--text-muted);">
        Filtreye uygun ürün bulunamadı.
        <div class="mt-2"><button class="btn btn-primary btn-sm" onclick="setQpFilter('all')">👁️ Tüm Ürünleri Göster</button></div>
      </td></tr>`;
      return;
    }

    const sortVal = document.getElementById("qpSortSelect")?.value || "name-asc";
    filtered.sort((a, b) => {
      if (sortVal === "name-asc") return (a.name || "").localeCompare(b.name || "", "tr");
      if (sortVal === "name-desc") return (b.name || "").localeCompare(a.name || "", "tr");
      if (sortVal === "id-asc") return (Number(a.id) || 0) - (Number(b.id) || 0);
      if (sortVal === "id-desc") return (Number(b.id) || 0) - (Number(a.id) || 0);
      if (sortVal === "price-desc") return (Number(b.price) || 0) - (Number(a.price) || 0);
      if (sortVal === "price-asc") return (Number(a.price) || 0) - (Number(b.price) || 0);
      if (sortVal === "stock-asc") return (Number(a.stock) || 0) - (Number(b.stock) || 0);
      return (a.name || "").localeCompare(b.name || "", "tr");
    });

    const activeCats = (typeof getActiveCategories === "function") ? getActiveCategories() : (window.categories || categories || ["Kedi", "Köpek", "Kuş / Kemirgen", "Açık Mama", "Kum", "Kozmetik", "Kampanyalar", "elekli paspas"]);

    const rowsHtml = filtered.map(p => {
      const numCost = Number(p.cost) || 0;
      const numPrice = Number(p.price) || 0;
      const stockVal = isNaN(Number(p.stock)) ? 0 : Number(p.stock);

      let marginStr = "-";
      let marginClass = "badge-ghost";
      if (numCost > 0 && numPrice > 0) {
        const mVal = (((numPrice - numCost) / numCost) * 100).toFixed(0);
        marginStr = `%${mVal}`;
        marginClass = numPrice >= numCost ? "badge-success" : "badge-danger";
      }

      let statusBadge = "";
      if (numPrice > 0 && numCost > 0 && stockVal > 0) {
        statusBadge = `<span class="badge badge-success" style="font-size:11px;">✅ Hazır</span>`;
      } else if (numPrice <= 0) {
        statusBadge = `<span class="badge badge-warning" style="font-size:11px;">🏷️ Fiyat Bekliyor</span>`;
      } else if (stockVal <= 0) {
        statusBadge = `<span class="badge badge-danger" style="font-size:11px;">⚠️ Stoksuz (0)</span>`;
      } else {
        statusBadge = `<span class="badge badge-ghost" style="font-size:11px;">📥 Maliyet Yok</span>`;
      }

      const safeName = String(p.name || "").replace(/"/g, '&quot;');
      const catSelectOpts = activeCats.map(c => `<option value="${c}" ${(p.category || '').toLowerCase() === c.toLowerCase() ? 'selected' : ''}>${c}</option>`).join('');

      const barcodeBadge = p.barcode
        ? `<span class="badge cursor-pointer" style="font-size:10.5px; font-family:monospace; background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; margin-top:2px; display:inline-flex; align-items:center; gap:3px;" onclick="openBarcodeModal('${p.id}')" title="Barkodu Düzenle veya Yazdır">🏷️ ${p.barcode} ✏️</span>`
        : `<button class="btn btn-xs" style="font-size:10px; padding:1px 5px; background:#fef3c7; color:#b45309; border:1px dashed #d97706; border-radius:4px; margin-top:2px;" onclick="openBarcodeModal('${p.id}')" title="Bu ürüne barkod ata">+ 🏷️ Barkod Ekle</button>`;

      return `
        <tr id="qp-row-${p.id}">
          <td style="text-align:center; color:var(--text-muted); font-size:12px; font-weight:600;">${p.id}</td>
          <td>
            <div style="font-weight:600; font-size:13px; color:var(--text);">${safeName}</div>
            <div style="margin-top:2px;">${barcodeBadge}</div>
          </td>
          <td>
            <select class="fc" style="padding:2px 4px; font-size:11px; height:26px; width:125px; font-weight:500;" onchange="updateProductCategoryFast(${p.id}, this.value)" title="Kategori Değiştir">
              ${catSelectOpts}
            </select>
          </td>
          <td style="text-align:right;">
            <input type="number" step="any" min="0" value="${numCost > 0 ? numCost : ''}" placeholder="0.00" 
              class="qp-bulk-input" data-id="${p.id}" data-field="cost"
              onchange="handleQpCostChange(${p.id}, this.value)"
              onfocus="this.select()"> ₺
          </td>
          <td style="text-align:right;">
            <input type="number" step="any" min="0" value="${numPrice > 0 ? numPrice : ''}" placeholder="0.00" 
              class="qp-bulk-input font-bold text-primary" data-id="${p.id}" data-field="price"
              onchange="handleQpPriceChange(${p.id}, this.value)"
              onfocus="this.select()"> ₺
          </td>
          <td style="text-align:center;">
            <input type="number" step="1" min="0" value="${stockVal}" 
              class="qp-bulk-input text-center" style="width:75px;" data-id="${p.id}" data-field="stock"
              onchange="handleQpStockChange(${p.id}, this.value)"
              onfocus="this.select()">
          </td>
          <td style="text-align:center;" id="qp-margin-${p.id}">
            <span class="badge ${marginClass}">${marginStr}</span>
          </td>
          <td style="text-align:center;" id="qp-status-${p.id}">${statusBadge}</td>
          <td style="text-align:center;">
            <div class="flex gap-1 justify-center">
              <button class="btn btn-outline btn-xs" onclick="openBarcodeModal('${p.id}')" title="Barkod Tanımla / Etiket Yazdır">🏷️</button>
              <button class="btn btn-primary btn-xs" onclick="openStockEntryModal(${p.id})" title="Alış/Satış Fiyatı ve Stok Ekle">📦 Stok Ekle</button>
              <button class="btn btn-ghost btn-xs" onclick="openEditProductModal(${p.id})" title="Detaylı Düzenle">✏️</button>
            </div>
          </td>
        </tr>`;
    }).join("");

    tbody.innerHTML = rowsHtml;
  } catch (err) {
    console.error("renderQuickPricingTable error:", err);
  }
}

function handleQpCostChange(id, val) {
  updateProductCostFast(id, val);
  refreshQpRow(id);
}

function handleQpPriceChange(id, val) {
  updateProductPriceFast(id, val);
  refreshQpRow(id);
}

function handleQpStockChange(id, val) {
  updateStockFast(id, val);
  refreshQpRow(id);
}

function refreshQpRow(id) {
  const pList = window.products || products || [];
  const p = pList.find(prod => Number(prod.id) === Number(id));
  if (!p) return;
  const numCost = Number(p.cost) || 0;
  const numPrice = Number(p.price) || 0;
  const stockVal = Number(p.stock) || 0;

  const marginCell = document.getElementById(`qp-margin-${id}`);
  if (marginCell) {
    if (numCost > 0 && numPrice > 0) {
      const mVal = (((numPrice - numCost) / numCost) * 100).toFixed(0);
      marginCell.innerHTML = `<span class="badge ${numPrice >= numCost ? 'badge-success' : 'badge-danger'}">%${mVal}</span>`;
    } else {
      marginCell.innerHTML = `<span class="badge badge-ghost">-</span>`;
    }
  }

  const statusCell = document.getElementById(`qp-status-${id}`);
  if (statusCell) {
    if (numPrice > 0 && numCost > 0 && stockVal > 0) {
      statusCell.innerHTML = `<span class="badge badge-success" style="font-size:11px;">✅ Hazır</span>`;
    } else if (numPrice <= 0) {
      statusCell.innerHTML = `<span class="badge badge-warning" style="font-size:11px;">🏷️ Fiyat Bekliyor</span>`;
    } else if (stockVal <= 0) {
      statusCell.innerHTML = `<span class="badge badge-danger" style="font-size:11px;">⚠️ Stoksuz (0)</span>`;
    } else {
      statusCell.innerHTML = `<span class="badge badge-ghost" style="font-size:11px;">📥 Maliyet Yok</span>`;
    }
  }

  updateQuickPricingStats();
}

function bulkSetDefaultStock() {
  // Kaldırıldı
}

function bulkApplyMargin() {
  // Kaldırıldı
}

function saveQuickPricingAll() {
  saveData();
  if (typeof renderCatalog === "function") renderCatalog();
  if (typeof renderInventoryTable === "function") renderInventoryTable();
  updateQuickPricingStats();
  toast("💾 Tüm fiyat ve stok değişiklikleri başarıyla kaydedildi!", "success");
}

// Attach all functions to window for global access
window.renderQuickPricingTable = renderQuickPricingTable;
window.updateQuickPricingStats = updateQuickPricingStats;
window.setQpFilter = setQpFilter;
window.filterQuickPricing = filterQuickPricing;
window.handleQpCostChange = handleQpCostChange;
window.handleQpPriceChange = handleQpPriceChange;
window.handleQpStockChange = handleQpStockChange;
window.bulkSetDefaultStock = bulkSetDefaultStock;
window.bulkApplyMargin = bulkApplyMargin;
window.saveQuickPricingAll = saveQuickPricingAll;

function deleteProduct(id) {
  if (confirm("Ürünü silmek istiyor musunuz?")) {
    let pList = window.products || products || [];
    pList = pList.filter(p => Number(p.id) !== Number(id));
    products = pList;
    window.products = pList;
    saveData();
    renderCatalog();
    renderInventoryTable();
    if (typeof renderQuickPricingTable === "function") renderQuickPricingTable();
    populateAllProductDatalists();
    if (typeof populateCatalogProductSelect === "function") populateCatalogProductSelect();
    if (typeof updateAllBadges === "function") updateAllBadges();
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

/* ===================================================================
   BARCODE MANAGEMENT & PRINTING ENGINE
   =================================================================== */

// 1. Generate unique 13-digit EAN-compliant Barcode
function generateUniqueBarcode(prefix = "869") {
  const pList = window.products || products || [];
  const existingSet = new Set(pList.filter(p => p && p.barcode).map(p => String(p.barcode).trim()));

  for (let attempt = 0; attempt < 500; attempt++) {
    // 869 + 9 random digits = 12 digits
    let code12 = prefix;
    while (code12.length < 12) {
      code12 += Math.floor(Math.random() * 10).toString();
    }
    // Calculate EAN-13 check digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(code12[i], 10);
      sum += (i % 2 === 0) ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    const fullBarcode = code12 + checkDigit.toString();

    if (!existingSet.has(fullBarcode)) {
      return fullBarcode;
    }
  }
  return "869" + Date.now().toString().slice(-10);
}
window.generateUniqueBarcode = generateUniqueBarcode;

function generateBarcodeForAddProductModal() {
  const code = generateUniqueBarcode();
  const el = document.getElementById("npBarcode");
  if (el) {
    el.value = code;
    toast(`🎲 Barkod üretildi: ${code}`);
  }
}
window.generateBarcodeForAddProductModal = generateBarcodeForAddProductModal;

function generateBarcodeForStockEntryModal() {
  const code = generateUniqueBarcode();
  const el = document.getElementById("seBarcode");
  if (el) {
    el.value = code;
    toast(`🎲 Barkod üretildi: ${code}`);
  }
}
window.generateBarcodeForStockEntryModal = generateBarcodeForStockEntryModal;

function generateBarcodeForBarcodeModal() {
  const code = (typeof generateUniqueBarcode === "function") ? generateUniqueBarcode() : '869' + Date.now().toString().slice(-10);
  const el = document.getElementById("bmBarcode");
  if (el) {
    el.value = code;
    updateBarcodePreviewLive(code);
    toast(`🎲 Barkod üretildi: ${code}`);
  }
}
window.generateBarcodeForBarcodeModal = generateBarcodeForBarcodeModal;
window.generateBarcodeForModal = generateBarcodeForBarcodeModal;

// 2. Open Dedicated Barcode Modal for Any Product
function openBarcodeModal(productId) {
  try {
    const pList = window.products || products || [];
    const p = pList.find(prod => String(prod.id) === String(productId) || Number(prod.id) === Number(productId));
    if (!p) return toast("Ürün bulunamadı!", "error");

    const idInput = document.getElementById("bmProductId");
    if (idInput) idInput.value = p.id;

    const nameEl = document.getElementById("bmProductNameDisplay") || document.getElementById("bmProductName");
    if (nameEl) {
      nameEl.innerHTML = `<span style="font-weight:700; color:var(--text-main); font-size:15px;">${p.name || '-'}</span> <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">Kategori: <b>${p.category || 'Genel'}</b> | Satış Fiyatı: <b>${(Number(p.price) || 0).toFixed(2)} ₺</b> | Stok: <b>${p.stock || 0} Adet</b></div>`;
    }

    const barcodeInput = document.getElementById("bmBarcode");
    if (barcodeInput) {
      barcodeInput.value = p.barcode || "";
    }

    updateBarcodePreviewLive(p.barcode || "");
    openModal("barcodeModal");

    setTimeout(() => {
      if (barcodeInput) {
        barcodeInput.focus();
        barcodeInput.select();
      }
    }, 120);
  } catch (err) {
    console.error("openBarcodeModal error:", err);
  }
}
window.openBarcodeModal = openBarcodeModal;

// 3. Save Barcode from Modal
function saveBarcodeModal() {
  try {
    const id = document.getElementById("bmProductId")?.value;
    const barcode = (document.getElementById("bmBarcode")?.value || "").trim();

    // Eğer id boşsa ve addProductModal açıksa oraya yaz
    if (!id) {
      const npBarcode = document.getElementById("npBarcode");
      if (npBarcode) npBarcode.value = barcode;
      closeModal("barcodeModal");
      toast(barcode ? `✅ Barkod (${barcode}) form alanına aktarıldı!` : `ℹ️ Barkod temizlendi.`);
      return;
    }

    const pList = window.products || products || [];
    const p = pList.find(prod => String(prod.id) === String(id) || Number(prod.id) === Number(id));
    if (!p) return toast("Ürün bulunamadı!", "error");

    // Aynı barkodun başka bir üründe olup olmadığını kontrol et (uyarı amaçlı)
    if (barcode) {
      const dup = pList.find(o => o && String(o.id) !== String(id) && o.barcode && String(o.barcode).trim() === barcode);
      if (dup) {
        toast(`⚠️ Bilgi: Bu barkod (${barcode}) "${dup.name}" ürününde de kayıtlı.`, "warning");
      }
    }

    p.barcode = barcode;

    // Eğer düzenleme formları açıksa onların inputlarını da güncelle
    const npBarcode = document.getElementById("npBarcode");
    if (npBarcode && document.getElementById("npProductId")?.value == id) {
      npBarcode.value = barcode;
    }
    const seBarcode = document.getElementById("seBarcode");
    if (seBarcode && document.getElementById("seProductId")?.value == id) {
      seBarcode.value = barcode;
    }

    saveData();
    closeModal("barcodeModal");

    if (typeof sendToGoogleSheets === "function") {
      sendToGoogleSheets({ action: "inventory_sync", items: window.products });
    }

    if (typeof renderInventoryTable === "function") renderInventoryTable();
    if (typeof renderQuickPricingTable === "function") renderQuickPricingTable();
    if (typeof renderCatalog === "function") renderCatalog();
    if (typeof populateAllProductDatalists === "function") populateAllProductDatalists();

    toast(barcode ? `✅ "${p.name}" barkodu [${barcode}] olarak güncellendi ve kaydedildi!` : `ℹ️ "${p.name}" barkodu temizlendi.`, "success");
  } catch (err) {
    console.error("saveBarcodeModal error:", err);
    toast("Barkod kaydedilemedi!", "error");
  }
}
window.saveBarcodeModal = saveBarcodeModal;
window.saveBarcodeFromModal = saveBarcodeModal;

function clearBarcodeFromModal() {
  const input = document.getElementById("bmBarcode");
  if (input) {
    input.value = "";
    updateBarcodePreviewLive("");
  }
}
window.clearBarcodeFromModal = clearBarcodeFromModal;

// 4. Lightweight SVG Barcode Renderer (Code 128 / High-contrast retail barcode pattern)
function generateBarcodeSvgMarkup(codeStr, width = 280, height = 70) {
  if (!codeStr || !String(codeStr).trim()) {
    return `<div style="color:#94a3b8; font-size:12px; font-style:italic;">Barkod girilmediğinde önizleme oluşturulamaz.</div>`;
  }
  const cleanCode = String(codeStr).trim();
  
  // Standard Code-128 Pattern Table (Patterns 0 to 106)
  const CODE128_PATTERNS = [
    "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
    "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
    "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
    "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
    "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
    "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
    "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
    "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111",
    "111242","121142","121241","114212","124112","124211","411212","421112","421211","212141",
    "214121","412121","111143","111341","131141","114113","114311","411113","411311","113141",
    "114131","311141","411131","211412","211214","211232","2331112"
  ];
  const START_B = 104;
  const STOP = 106;

  let codes = [START_B];
  for (let i = 0; i < cleanCode.length; i++) {
    const ascii = cleanCode.charCodeAt(i);
    let val = ascii - 32;
    if (val < 0 || val > 105) val = 0;
    codes.push(val);
  }

  // Calculate checksum
  let checksum = codes[0];
  for (let i = 1; i < codes.length; i++) {
    checksum += codes[i] * i;
  }
  codes.push(checksum % 103);
  codes.push(STOP);

  // Convert codes to bar pattern string
  let barPattern = "";
  for (let c of codes) {
    barPattern += CODE128_PATTERNS[c] || "212222";
  }

  // Build SVG bars
  let totalUnits = 0;
  for (let i = 0; i < barPattern.length; i++) {
    totalUnits += parseInt(barPattern[i], 10);
  }

  const quietZone = 12; // units padding on sides
  const fullUnits = totalUnits + (quietZone * 2);
  const unitWidth = Math.max(1.4, (width / fullUnits));
  const svgWidth = fullUnits * unitWidth;

  let currentX = quietZone * unitWidth;
  let rects = "";

  for (let i = 0; i < barPattern.length; i++) {
    const len = parseInt(barPattern[i], 10);
    const barWidth = len * unitWidth;
    const isBlack = (i % 2 === 0);
    if (isBlack) {
      rects += `<rect x="${currentX.toFixed(2)}" y="0" width="${barWidth.toFixed(2)}" height="${height}" fill="#0f172a" />`;
    }
    currentX += barWidth;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth.toFixed(2)} ${height}" width="100%" height="${height}" style="display:block; margin:0 auto; background:#ffffff;">
    <rect width="100%" height="100%" fill="#ffffff" />
    ${rects}
  </svg>`;
}
window.generateBarcodeSvgMarkup = generateBarcodeSvgMarkup;

function updateBarcodePreviewLive(val) {
  const wrap = document.getElementById("bmBarcodeSvgWrap");
  const textEl = document.getElementById("bmBarcodeText");
  const btnPrint = document.getElementById("bmBtnPrint");
  const trimmed = String(val || "").trim();

  if (!trimmed) {
    if (wrap) wrap.innerHTML = `<div style="color:#94a3b8; font-size:12.5px; padding:8px;">Barkod okutun veya yukarıdan "🎲 Rastgele Barkod Üret" butonuna basın.</div>`;
    if (textEl) textEl.innerText = "";
    if (btnPrint) btnPrint.disabled = true;
    return;
  }

  if (wrap) wrap.innerHTML = generateBarcodeSvgMarkup(trimmed, 300, 65);
  if (textEl) textEl.innerText = trimmed;
  if (btnPrint) btnPrint.disabled = false;
}
window.updateBarcodePreviewLive = updateBarcodePreviewLive;

// 5. Professional Barcode Label Printing (Thermal / Standard sticker ready)
function printBarcodeLabelFromModal() {
  const id = document.getElementById("bmProductId")?.value;
  const barcode = (document.getElementById("bmBarcode")?.value || "").trim();
  if (!id) return;
  printBarcodeLabel(id, barcode);
}
window.printBarcodeLabelFromModal = printBarcodeLabelFromModal;

function printBarcodeLabel(productId, customBarcode = null) {
  const pList = window.products || products || [];
  const p = pList.find(prod => Number(prod.id) === Number(productId));
  if (!p) return toast("Ürün bulunamadı!", "error");

  const barcode = customBarcode || p.barcode;
  if (!barcode) {
    return toast("Yazdırmak için önce bu ürüne bir barkod tanımlayın!", "warning");
  }

  const svgMarkup = generateBarcodeSvgMarkup(barcode, 320, 75);
  const priceFormatted = (Number(p.price) || 0).toFixed(2);
  const storeName = "AYBARS PET SHOP";

  const printWindow = window.open("", "_blank", "width=480,height=520");
  if (!printWindow) {
    return alert("Yazdırma penceresi açılamadı. Lütfen tarayıcınızın açılır pencere (pop-up) engelleyicisini kapatın.");
  }

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Barkod Etiketi - ${p.name}</title>
      <style>
        @page {
          size: auto;
          margin: 4mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          margin: 0;
          padding: 10px;
          background: #ffffff;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .label-card {
          width: 58mm;
          min-height: 38mm;
          border: 1px dashed #94a3b8;
          border-radius: 4px;
          padding: 6px 8px;
          box-sizing: border-box;
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: #fff;
        }
        .store-header {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1px;
          color: #0f172a;
          text-transform: uppercase;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 2px;
          margin-bottom: 3px;
        }
        .prod-name {
          font-size: 10px;
          font-weight: 700;
          color: #1e293b;
          line-height: 1.2;
          max-height: 24px;
          overflow: hidden;
          margin-bottom: 3px;
        }
        .svg-container {
          width: 100%;
          margin: 2px 0;
        }
        .barcode-num {
          font-family: monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 2px;
          color: #000000;
          margin-top: 1px;
        }
        .price-tag {
          font-size: 15px;
          font-weight: 900;
          color: #0f172a;
          margin-top: 3px;
          border-top: 1px solid #e2e8f0;
          padding-top: 2px;
        }
        @media print {
          body { padding: 0; }
          .label-card { border: none; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="label-card">
        <div class="store-header">${storeName}</div>
        <div class="prod-name">${p.name}</div>
        <div class="svg-container">${svgMarkup}</div>
        <div class="barcode-num">${barcode}</div>
        <div class="price-tag">${priceFormatted} ₺</div>
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 250);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
window.printBarcodeLabel = printBarcodeLabel;

function openBarcodeModalForCurrentProduct() {
  const prodId = document.getElementById("npProductId")?.value;
  if (prodId) {
    openBarcodeModal(prodId);
  } else {
    const name = document.getElementById("npName")?.value || "Yeni Ürün";
    const barcode = (document.getElementById("npBarcode")?.value || "").trim();
    if (!barcode) {
      toast("Lütfen önce bir barkod girin veya 'Barkod Üret'e basın.", "warning");
      return;
    }
    const idEl = document.getElementById("bmProductId");
    if (idEl) idEl.value = "";
    const nameEl = document.getElementById("bmProductNameDisplay");
    if (nameEl) nameEl.innerText = name;
    const barEl = document.getElementById("bmBarcode");
    if (barEl) barEl.value = barcode;
    updateBarcodePreviewLive(barcode);
    openModal("barcodeModal");
  }
}
window.openBarcodeModalForCurrentProduct = openBarcodeModalForCurrentProduct;
