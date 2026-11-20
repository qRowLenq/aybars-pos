/* Non-blocking stock approval and sales-based replenishment estimates. */
function stockRequirements(items) {
  const totals = new Map();
  for (const item of items) {
    const parts = item.isBundle ? item.bundleItems || [] : [{productId:item.id, qty:1}];
    for (const part of parts) {
      const id = String(part.productId);
      totals.set(id, (totals.get(id) || 0) + Number(part.qty) * Number(item.qty));
    }
  }
  return totals;
}

function stockShortages(items, list) {
  return [...stockRequirements(items)].map(([id, qty]) => {
    const product = list.find(p => String(p.id) === id);
    return {id, name:product?.name || 'Silinmiş ürün', stock:Number(product?.stock) || 0, qty, missing:!product};
  }).filter(line => line.missing || line.qty > line.stock);
}

function deductProductStockFIFO(product,quantity){return BlueStock.take(product,quantity,{allowNegative:true,allowExpired:true});}
function deductCartStock(items){
  const moves=new Map();
  for(const [id,qty] of stockRequirements(items)){const p=products.find(p=>String(p.id)===id);if(p)moves.set(id,deductProductStockFIFO(p,qty));}
  return moves;
}

let pendingStockCheckout = null, stockApproval = null;
function stockCartSignature() {
  return JSON.stringify({cart, requirements:stockShortages(cart, products)});
}
function requireStockApproval(checkout) {
  if (!cart.length) return false;
  const shortages = stockShortages(cart, products);
  if (shortages.some(s => s.missing)) { toast('Sepette silinmiş bir ürün var. Ürünü sepetten kaldırın.', 'warning'); return true; }
  if (!shortages.length) { pendingStockCheckout = null; renderStockWarning(); return false; }
  if (stockApproval === stockCartSignature()) { stockApproval = null; pendingStockCheckout = null; return false; }
  pendingStockCheckout = checkout;
  renderStockWarning();
  focusCatalogSearch();
  return true;
}
function renderStockWarning() {
  const box = document.getElementById('stockCheckoutWarning');
  if (!box) return;
  const lines = stockShortages(cart, products);
  box.hidden = !lines.length;
  box.replaceChildren();
  if (!cart.length) pendingStockCheckout = null;
  if (!lines.length) return;
  const title = document.createElement('strong'); title.textContent = 'Stok yetersiz görünüyor'; box.append(title);
  for (const line of lines) {
    const text = document.createElement('p');
    text.textContent = `${line.name}: stokta ${line.stock}, sepette ${line.qty} adet.`; box.append(text);
  }
  const hint = document.createElement('p');
  hint.textContent = 'Barkod okutmaya devam edebilirsin. Onay verirsen güncel sepet işlenir; eksik miktar eksi stok olarak görünür.';
  box.append(hint);
  if (pendingStockCheckout) {
    const approve = document.createElement('button'); approve.type = 'button'; approve.className = 'btn btn-warning btn-sm';
    approve.id = 'approveStockCheckout'; approve.textContent = 'Güncel sepeti onayla ve devam et';
    approve.onclick = () => {
      const checkout = pendingStockCheckout;
      if (!checkout) return;
      stockApproval = stockCartSignature();
      try { checkout(); } finally { stockApproval = null; renderStockWarning(); }
    };
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'btn btn-ghost btn-sm';
    cancel.textContent = 'Satışı beklet'; cancel.onclick = () => { pendingStockCheckout = null; renderStockWarning(); focusCatalogSearch(); };
    box.append(approve, cancel);
  }
}

function stockDateDay(value) {
  const text = String(value || '').split('T')[0];
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text) || /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text);
  if (!match) return NaN;
  const [y,m,d] = match[1].length === 4 ? [match[1],match[2],match[3]] : [match[3],match[2],match[1]];
  return Date.UTC(Number(y),Number(m)-1,Number(d))/86400000;
}
function stockVelocity(list, history, today) {
  const end = stockDateDay(today), start = end - 29;
  const valid = history.map(s => ({sale:s, day:stockDateDay(s.date)})).filter(s => Number.isFinite(s.day) && s.day <= end);
  const first = valid.reduce((day, record) => Math.min(day, record.day), end);
  const days = Math.max(1, Math.min(30, end - first + 1));
  const sold = new Map();
  for (const {sale, day} of valid) {
    if (day < start) continue;
    // Refund records carry negative quantities; do not subtract returnedQty again.
    for (const [id, qty] of stockRequirements(sale.soldItems || [])) sold.set(id, (sold.get(id) || 0) + qty);
  }
  return list.filter(p => !p.isBundle).map(p => {
    const quantity = Math.max(0, sold.get(String(p.id)) || 0), rate = quantity / days;
    const stock = Number(p.stock) || 0;
    return {product:p, stock, quantity, rate, days, remaining:rate > 0 ? Math.max(0,stock)/rate : null};
  });
}
function renderStockVelocity() {
  const container = document.getElementById('stockVelocityList');
  if (!container) return;
  const incoming=(manualDeficits||[]).filter(d=>d.ordered && d.productId && Number(d.orderQty)>0).map(d=>({status:'ordered',items:[{productId:d.productId,qty:d.orderQty,received:d.receivedQty}]}));
  const rows = stockVelocity(products, salesHistory, nowDate()).map(r=>BlueStock.reorder(r,incoming)).filter(r=>r.suggested>0)
    .sort((a,b) => (a.stock <= 0 ? -1 : a.remaining ?? Infinity) - (b.stock <= 0 ? -1 : b.remaining ?? Infinity));
  document.getElementById('stockVelocityCount').textContent = `${rows.length} ürün`;
  container.replaceChildren();
  if (!rows.length) { container.textContent = 'Mevcut satış hızına göre 7 gün içinde tükenmesi beklenen ürün yok.'; return; }
  for (const row of rows) {
    const item = document.createElement('div'); item.className = 'stock-velocity-item';
    const name = document.createElement('strong'); name.textContent = row.product.name;
    const detail = document.createElement('span');
    detail.textContent = `Stok: ${row.stock} · ` + (row.rate > 0 ? `${row.days} günde net ${row.quantity} adet · ${row.rate.toLocaleString('tr-TR',{maximumFractionDigits:2})} adet/gün · yaklaşık ${Math.ceil(row.remaining)} gün yeter${row.days < 7 ? ' (veri az, ilk tahmin)' : ''}` : 'Satış verisi yetersiz; düşük stok uyarısı');
    detail.textContent += " · Tedarik "+row.lead+" gün · Güvenlik "+row.safety+" · Yolda "+row.incoming+" · Öneri "+row.suggested+" adet";
    const add = document.createElement('button'); add.type = 'button'; add.className = 'btn btn-outline btn-sm';
    add.disabled = isStockNeedListed(row.product); add.textContent = add.disabled ? 'İhtiyaç listesinde' : '+ İhtiyaca ekle';
    add.onclick = () => addProductToDeficits(row.product.id);
    item.append(name, detail, add); container.append(item);
  }
}

function isStockNeedListed(product) {
  return manualDeficits.some(d => String(d.productId) === String(product.id) || (!d.productId && String(d.name).toLocaleLowerCase('tr-TR') === String(product.name).toLocaleLowerCase('tr-TR')));
}
function renderStockAlerts() {
  renderStockVelocity(); renderSktRadarWidget(); renderStockNeeds();
}
function addStockManualNeed() {
  const input=document.getElementById('stockManualNeed');
  const name=input.value.trim();
  if (!name) return toast('Ürün veya ihtiyaç adı yazın.', 'warning');
  const product=products.find(p => String(p.name).toLocaleLowerCase('tr-TR') === name.toLocaleLowerCase('tr-TR'));
  if (product) {
    addProductToDeficits(product.id);
  } else {
    if (manualDeficits.some(d => String(d.name).toLocaleLowerCase('tr-TR') === name.toLocaleLowerCase('tr-TR'))) return toast('Bu ihtiyaç zaten listede.', 'warning');
    manualDeficits.push({id:crypto.randomUUID(),name,supplier:'-',ordered:false});
    saveData(); renderDeficitsTable();
  }
  input.value=''; input.focus();
}
function renderStockNeeds() {
  const list=document.getElementById('stockNeedsList');
  if (!list) return;
  list.replaceChildren();
  document.getElementById('stockNeedsCount').textContent = `${manualDeficits.filter(d => !d.ordered).length} bekliyor`;
  if (!manualDeficits.length) { list.textContent='Henüz ihtiyaç eklenmedi. Yukarıdaki ürünlerden “İhtiyaca ekle” ile başlayabilirsin.'; return; }
  manualDeficits.forEach((need,index) => {
    const row=document.createElement('div'); row.className='stock-velocity-item';
    const name=document.createElement('strong'); name.textContent=need.name;
    const status=document.createElement('span'); status.textContent=`${need.supplier || 'Tedarikçi belirtilmemiş'} · ${need.ordered ? 'Sipariş verildi' : 'Bekliyor'}`;
    const toggle=document.createElement('button'); toggle.type='button'; toggle.className='btn btn-outline btn-sm';
    toggle.textContent=need.ordered ? 'Siparişi geri al' : 'Sipariş verildi'; toggle.onclick=()=>toggleDeficitOrdered(index);
    const remove=document.createElement('button'); remove.type='button'; remove.className='btn btn-danger btn-sm';
    remove.textContent='Listeden çıkar'; remove.onclick=()=>removeDeficit(index);
    row.append(name,status,toggle,remove); list.append(row);
  });
}
