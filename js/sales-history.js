/* Sale browsing never changes the active business date. */
const historyMoney = value => new Intl.NumberFormat('tr-TR', {style:'currency', currency:'TRY'}).format(Number(value) || 0);
const historyEscape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function historyDateKey(value) {
  const text = String(value || '');
  const parts = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  const key = parts ? `${parts[3]}-${parts[2].padStart(2,'0')}-${parts[1].padStart(2,'0')}` : text;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return '';
  const d = new Date(key + 'T12:00:00');
  return !isNaN(d) && d.getFullYear() === Number(key.slice(0,4)) && d.getMonth()+1 === Number(key.slice(5,7)) && d.getDate() === Number(key.slice(8,10)) ? key : '';
}
function setHistoryPeriod(period) {
  let start = historyDateKey(nowDate()), end = start;
  if (period === 'yesterday') start = end = historyDateKey(getPrevDayDateString(nowDate()));
  if (period === 'week') {
    let date = nowDate();
    for (let i=0;i<6;i++) date = getPrevDayDateString(date);
    start = historyDateKey(date);
  }
  if (period === 'all') start = end = '';
  document.getElementById('historyStart').value = start;
  document.getElementById('historyEnd').value = end;
  window.historyPeriod = period;
  refreshHistoryFilters();
}
function refreshHistoryFilters(custom = false) {
  if (custom) window.historyPeriod = 'custom';
  window.salesHistoryLimit = 20;
  renderSalesHistoryRows();
}
let historyPanelHome=null;
function openSalesHistory() {
  const panel=document.getElementById('posRecentSalesContainer');
  const dialog=document.getElementById('salesHistoryDialog');
  if(!historyPanelHome)historyPanelHome={parent:panel.parentNode,next:panel.nextSibling};
  document.getElementById('salesHistoryMount').appendChild(panel);
  document.getElementById('posRecentSalesBody').style.display='block';
  if(!window.historyOpened){setHistoryPeriod('all');window.historyOpened=true;}
  renderPosSalesHistory();
  if(!dialog.open)dialog.showModal();
  document.getElementById('historySearch').focus({preventScroll:true});
}
function restoreHistoryPanel(){
  if(!historyPanelHome)return;
  const panel=document.getElementById('posRecentSalesContainer');
  historyPanelHome.parent.insertBefore(panel,historyPanelHome.next);
  document.getElementById('posRecentSalesBody').style.display='none';
  document.getElementById('btnToggleRecentSales').textContent='▼ Göster';
  document.getElementById('posRecentSalesToggleIcon').textContent='▶';
}
function renderSalesHistoryRows() {
  const container = document.getElementById('posRecentSalesList');
  if (!container || !document.getElementById('historyStart')) return;
  if (!window.historyPeriod) window.historyPeriod = 'today';
  if (window.historyPeriod === 'today') {
    document.getElementById('historyStart').value = historyDateKey(nowDate());
    document.getElementById('historyEnd').value = historyDateKey(nowDate());
  }
  const from = document.getElementById('historyStart').value;
  const to = document.getElementById('historyEnd').value;
  const query = normalizeCategoryName(document.getElementById('historySearch').value);
  const info = document.getElementById('historyResultCount');
  const label = document.getElementById('historyDailyLabel');
  if (label) label.textContent = `Aktif kasa günü: ${nowDate()} · Aşağıdaki gelir kartları bu güne aittir.`;
  document.querySelectorAll('[data-history-period]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.historyPeriod === window.historyPeriod)));
  if (from && to && from > to) {
    info.textContent = 'Başlangıç tarihi bitiş tarihinden sonra olamaz.';
    container.replaceChildren(); return;
  }
  const list = salesHistory.filter(s => {
    const key = historyDateKey(s.date);
    const text = [s.id,s.customerName,s.itemsSummary,...(s.soldItems || []).map(p => `${p.name} ${p.barcode || ''}`)].join(' ');
    return (!from || key >= from) && (!to || (key && key <= to)) && (!query || normalizeCategoryName(text).includes(query));
  }).sort((a,b) => (historyDateKey(b.date) + (b.time || '')).localeCompare(historyDateKey(a.date) + (a.time || '')));
  info.textContent = `${list.length} kayıt · Seçili kayıtların net tutarı: ${historyMoney(list.reduce((n,s)=>n+Number(s.total || 0),0))}`;
  const limit = window.salesHistoryLimit || 20;
  const rows = list.slice(0,limit).map(s => {
    const returned = (s.soldItems || []).some(item => Number(item.returnedQty) > 0);
    const status = s.isRefund || Number(s.total)<0 ? 'İade kaydı' : s.refunded ? 'Tamamı iade' : returned ? 'Kısmi iade' : 'Satış';
    return `<tr><td>${historyEscape(s.date)}<small>${historyEscape(s.time)}</small></td><td>${historyEscape(s.customerName || 'Tezgâh')}</td><td class="history-products">${historyEscape(s.itemsSummary || 'Ürün özeti yok')}</td><td>${historyEscape(s.paymentType)}</td><td class="history-amount">${historyMoney(s.total)}</td><td>${status}</td><td class="history-actions"><button type="button" class="btn btn-outline btn-sm" data-history-sale="${historyEscape(s.id)}">Detay / İade</button></td></tr>`;
  }).join('');
  container.innerHTML = list.length ? `<table class="history-table"><thead><tr><th>Tarih / Saat</th><th>Müşteri</th><th>Satın alınan ürünler</th><th>Ödeme</th><th>Tutar</th><th>Durum</th><th class="history-actions">İşlem</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="history-empty">Bu tarih aralığında aramana uygun satış bulunamadı.</p>';
  const more = document.getElementById('historyLoadMore');
  more.hidden = list.length <= limit;
  more.textContent = `Daha fazla göster (${Math.max(0,list.length-limit)} kayıt)`;
}
function openSaleDetails(saleId) {
  const sale = salesHistory.find(s => String(s.id) === String(saleId));
  if (!sale) return;
  const dialog = document.getElementById('saleDetailsDialog');
  dialog.dataset.saleId = String(sale.id);
  document.getElementById('saleDetailsTitle').textContent = `${sale.isRefund ? 'İade' : 'Satış'} detayı · ${sale.date} ${sale.time || ''}`;
  document.getElementById('saleDetailsMeta').textContent = `${sale.customerName || 'Tezgâh'} · ${sale.paymentType || ''} · ${historyMoney(sale.total)} · ${originalReceiptStatus(sale) === 'official' ? 'Fişli' : originalReceiptStatus(sale) === 'unofficial' ? 'Fişsiz' : 'Fiş durumu bilinmiyor'} · Kayıt #${sale.id}`;
  const items = Array.isArray(sale.soldItems) ? sale.soldItems : [];
  document.getElementById('saleDetailsItems').innerHTML = items.length ? `<table class="history-detail-table"><thead><tr><th>Ürün</th><th>Satılan</th><th>İade edilen</th><th>Birim fiyat</th><th>Satır tutarı</th><th>İşlem</th></tr></thead><tbody>${items.map((item,index) => {
    const remaining = Math.max(0,Number(item.qty)-Number(item.returnedQty || 0));
    const price = Number(item.customPrice ?? item.price ?? 0);
    return `<tr data-item-row="${index}"><td>${historyEscape(item.name)}</td><td>${Math.abs(Number(item.qty))}</td><td>${Number(item.returnedQty || 0)}</td><td>${historyMoney(price)}</td><td>${historyMoney(Number(item.qty)*price)}</td><td><button type="button" class="btn btn-outline btn-sm" data-refund-index="${index}" ${sale.isRefund || sale.refunded || !remaining ? 'disabled' : ''}>İade</button></td></tr>`;
  }).join('')}</tbody></table>` : `<p>${historyEscape(sale.itemsSummary || 'Bu eski kayıtta ürün ayrıntıları bulunmuyor.')}</p>`;
  document.getElementById('saleRefundControls').hidden = true;
  delete dialog.dataset.itemIndex;
  document.getElementById('saleDetailNotice').textContent = sale.isRefund ? (sale.refundSource === 'cart' ? 'Eski satış bulunmadan sepetten yapılan iade.' : `Bağlı satış: #${sale.originalSaleId || '—'}. Bu bir iade kaydıdır.`) : sale.refunded ? 'Bu satışın tamamı iade edilmiş.' : !items.length ? 'Bu eski kayıtta ürün/adet bilgisi yok; güvenli stok iadesi yapılamıyor.' : `Ürünün yanındaki İade düğmesine bas, ardından adet ve ödeme yöntemini seç. İade ${nowDate()} aktif kasa gününe kaydedilir.`;
  document.getElementById('refundError').textContent = '';
  document.getElementById('refundMethod').value = 'Nakit';
  const receipt = document.getElementById('refundReceipt');
  receipt.value=originalReceiptStatus(sale); receipt.disabled=Boolean(receipt.value);
  document.getElementById('refundSelectionTotal').textContent = historyMoney(0);
  if (!dialog.open) dialog.showModal();
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('salesHistoryDialog').addEventListener('close',restoreHistoryPanel);
  document.getElementById('posRecentSalesList').addEventListener('click', event => {
    const button = event.target.closest('[data-history-sale]');
    if (button) openSaleDetails(button.dataset.historySale);
  });
  document.getElementById('saleDetailsItems').addEventListener('click', event => {
    const button = event.target.closest('[data-refund-index]');
    if (button && !button.disabled) selectRefundItem(Number(button.dataset.refundIndex));
  });
  setHistoryPeriod('today');
});

function selectRefundItem(index) {
  const dialog = document.getElementById('saleDetailsDialog');
  const sale = salesHistory.find(s => String(s.id) === dialog.dataset.saleId);
  const item = sale?.soldItems?.[index];
  if (!item || sale.isRefund || sale.refunded) return;
  const remaining = Number(item.qty) - Number(item.returnedQty || 0);
  if (!(remaining > 0)) return;
  dialog.dataset.itemIndex = String(index);
  document.querySelectorAll('[data-item-row]').forEach(row => row.classList.toggle('history-selected-item', Number(row.dataset.itemRow) === index));
  document.getElementById('refundProductName').textContent = item.name;
  const qty = document.getElementById('refundQuantity');
  qty.max = remaining;
  qty.value = Math.min(1,remaining);
  document.getElementById('saleRefundControls').hidden = false;
  document.getElementById('refundError').textContent = '';
  updateRefundPreview();
  qty.focus();
}
function updateRefundPreview() {
  const dialog = document.getElementById('saleDetailsDialog');
  const sale = salesHistory.find(s => String(s.id) === dialog.dataset.saleId);
  const item = sale?.soldItems?.[Number(dialog.dataset.itemIndex)];
  const qty = Number(document.getElementById('refundQuantity').value);
  document.getElementById('refundSelectionTotal').textContent = historyMoney(qty * Number(item?.customPrice ?? item?.price ?? 0));
}
function completeSelectedRefund(event) {
  event?.preventDefault();
  const dialog=document.getElementById('saleDetailsDialog');
  const sale=salesHistory.find(s=>String(s.id)===dialog.dataset.saleId);
  const index=Number(dialog.dataset.itemIndex),item=sale?.soldItems?.[index];
  try{
    if(!item || !sale || sale.isRefund || sale.refunded)throw Error('İade edilebilir bir ürün seç.');
    const matches=customers.filter(c=>sale.customerId!=null ? String(c.id)===String(sale.customerId) : c.name===sale.customerName);
    const record=saveRefundTransaction({lines:[{item,index,qty:Number(document.getElementById('refundQuantity').value)}],method:document.getElementById('refundMethod').value,receipt:document.getElementById('refundReceipt').value,customer:matches.length===1 ? matches[0] : null,sale});
    openSaleDetails(sale.id);
    toast(historyMoney(-record.total)+' iade kaydedildi · '+record.paymentType+' · '+(record.isOfficial ? 'Fişli' : 'Fişsiz'),'success');
    return true;
  }catch(error){document.getElementById('refundError').textContent=error.message;return false;}
}
