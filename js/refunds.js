/* Both linked and cart returns use the same stock, payment and receipt routing. */
function originalReceiptStatus(sale) {
  if (sale.isOfficial === true || sale.isOfficial === 'true') return 'official';
  if (sale.isOfficial === false || sale.isOfficial === 'false') return 'unofficial';
  if (/kart/i.test(sale.paymentType || '') && !/parçalı/i.test(sale.paymentType || '')) return 'official';
  return '';
}
function refundSheetsPayload(record) {
  return {action:'save_sale',date:record.date,time:record.time,customerName:record.customerName,
    channel:'Ürün İadesi',itemsSummary:record.itemsSummary,paymentType:record.paymentType,
    total:record.total,cardSales:record.splitCard,cashSales:record.splitCash,transferSales:record.splitTransfer,
    creditSales:record.splitCredit,officialCash:record.isOfficial ? record.splitCash : 0,
    unoffCash:record.isOfficial ? 0 : record.splitCash,officialTransfer:record.isOfficial ? record.splitTransfer : 0,
    unoffTransfer:record.isOfficial ? 0 : record.splitTransfer,vatTotal:record.vatTotal,isOfficial:record.isOfficial,
    transactionId:record.id,isRefund:true,refundSource:record.refundSource,originalSaleId:record.originalSaleId};
}
function saveRefundTransaction({lines,method,receipt,customer,sale=null}) {
  if (isDayClosed(nowDate())) throw Error('Aktif kasa günü kapalı. Açık kasa gününe geçip yeniden dene.');
  if (!lines.length) throw Error('İade için ürün ekle.');
  if (!['Nakit','Kredi Kartı','Havale / IBAN','Veresiye'].includes(method)) throw Error('Geri ödeme yöntemini seç.');
  if (!['official','unofficial'].includes(receipt)) throw Error('Ürünün alındığı satışın fiş durumunu seç.');
  if (sale && (sale.isRefund || sale.refunded)) throw Error('Bu satış zaten iade edilmiş.');
  if (sale && originalReceiptStatus(sale) && receipt !== originalReceiptStatus(sale)) throw Error('Fiş durumu eski satış kaydıyla aynı olmalı.');
  let amount=0, vat=0;
  const stockLines=[];
  for (const line of lines) {
    const {item,qty} = line;
    const price=Number(item.customPrice ?? item.price);
    const rate=Number(item.vatRate ?? 20);
    if (!Number.isFinite(qty) || qty<=0 || !Number.isFinite(price) || price<0 || !Number.isFinite(rate) || rate<0) throw Error('Ürün adedi, fiyatı veya KDV oranı geçersiz.');
    if (sale) {
      const source=sale.soldItems[line.index];
      const remaining=Number(source?.qty)-Number(source?.returnedQty || 0);
      if (!source || qty>remaining) throw Error(`İade adedi en fazla ${remaining} olmalı.`);
    }
    amount+=qty*price;
    vat+=rate>0 ? qty*price-qty*price/(1+rate/100) : 0;
    const parts=item.isBundle ? (item.bundleItems || []).map(b=>({id:b.productId,qty:Number(b.qty)*qty})) : [{id:item.id,qty}];
    if (!parts.length) throw Error('Paket içeriği bulunamadı.');
    stockLines.push(...parts);
  }
  amount=Math.round(amount*100)/100; vat=Math.round(vat*100)/100;
  if (!Number.isFinite(amount) || !Number.isFinite(vat)) throw Error('İade tutarı hesaplanamadı.');
  if (stockLines.some(line=>!Number.isFinite(line.qty) || line.qty<=0 || !products.some(p=>String(p.id)===String(line.id)))) throw Error('İade ürünü veya paket içeriği stokta bulunamadı.');
  if (method==='Veresiye' && (!customer || Number(customer.balance || 0)<amount)) throw Error('Müşteri seçilmeli ve açık borcu iade tutarını karşılamalı.');
  if (sale) {
    const previous=salesHistory.filter(s=>s.isRefund && String(s.originalSaleId)===String(sale.id)).reduce((n,s)=>n-Math.min(0,Number(s.total)||0),0);
    if (previous+amount>Number(sale.total)+0.01) throw Error('İade tutarı satışın kalan tutarını aşıyor.');
  }
  const summary=lines.map(({item,qty})=>`${qty}x ${item.name} (${historyMoney(item.customPrice ?? item.price)})`).join(', ');
  const record={id:'refund_'+crypto.randomUUID(),date:nowDate(),time:nowTime(),
    customerId:customer?.id ?? sale?.customerId ?? null,customerName:customer?.name || sale?.customerName || 'Tezgâh',
    originalSaleId:sale?.id ?? null,originalSaleDate:sale?.date ?? null,isRefund:true,refundSource:sale ? 'sale' : 'cart',
    originalItemIndex:sale && lines.length===1 ? lines[0].index : null,
    itemsSummary:`İADE: ${summary}${sale ? ' · Satış #'+sale.id : ' · Sepetten iade'}`,
    soldItems:lines.map(({item,qty})=>({...item,qty:-qty,returnedQty:0})),total:-amount,vatTotal:-vat,
    paymentType:method,splitCash:method==='Nakit' ? -amount : 0,splitCard:method==='Kredi Kartı' ? -amount : 0,
    splitTransfer:method==='Havale / IBAN' ? -amount : 0,splitCredit:method==='Veresiye' ? -amount : 0,
    isOfficial:receipt==='official'};
  const snapshot=JSON.stringify({products,customers,salesHistory});
  if(sale){
    for(const line of lines) sale.soldItems[line.index].returnedQty=Number(sale.soldItems[line.index].returnedQty || 0)+line.qty;
    sale.refunded=sale.soldItems.every(item=>Number(item.returnedQty || 0)>=Number(item.qty));
  }
  for(const line of stockLines){
    const product=products.find(p=>String(p.id)===String(line.id));
    product.stock=(Number(product.stock)||0)+line.qty;
    if(Array.isArray(product.batches) && product.batches.length) product.batches.push({lotNumber:record.id,qty:line.qty,initialQty:line.qty,cost:Number(product.cost)||0,expiry:'',source:'İade',date:record.date});
  }
  if(customer){
    if(method==='Veresiye')customer.balance=Math.round((Number(customer.balance)-amount)*100)/100;
    if(!Array.isArray(customer.purchaseHistory))customer.purchaseHistory=[];
    customer.purchaseHistory.unshift({saleId:record.id,date:record.date,time:record.time,items:record.itemsSummary,total:-amount,payment:`İade (${method})`});
  }
  salesHistory.unshift(record);
  try{saveData();}catch(error){
    const before=JSON.parse(snapshot);
    products=window.products=before.products;customers=window.customers=before.customers;salesHistory=window.salesHistory=before.salesHistory;
    try{saveData();}catch(_){}
    throw Error('İade kaydedilemedi. Tarayıcı depolamasını kontrol et.');
  }
  sendToGoogleSheets(refundSheetsPayload(record));
  renderCatalog();renderPosSalesHistory();updateAllBadges();
  if(document.getElementById('tab-inventory')?.classList.contains('active'))renderInventoryTable();
  if(typeof syncTaxReportToSheets==='function')setTimeout(syncTaxReportToSheets,600);
  return record;
}
let pendingCartRefund=null;
function openCartRefund(){
  if(!cart.length)return toast('İade edilecek ürünleri önce sepete ekle.','warning');
  if(isDayClosed(nowDate()))return toast('Aktif kasa günü kapalı.','warning');
  pendingCartRefund={items:JSON.parse(JSON.stringify(cart)),fingerprint:JSON.stringify(cart),customerId:document.getElementById('cartCustomerSelect').value};
  document.getElementById('cartRefundItems').innerHTML='<table class="history-detail-table"><thead><tr><th>Ürün</th><th>Adet</th><th>İade birim fiyatı</th><th>Tutar</th></tr></thead><tbody>'+pendingCartRefund.items.map(item=>`<tr><td>${historyEscape(item.name)}</td><td>${Number(item.qty)}</td><td>${historyMoney(item.customPrice ?? item.price)}</td><td>${historyMoney(item.qty*(item.customPrice ?? item.price))}</td></tr>`).join('')+'</tbody></table>';
  document.getElementById('cartRefundTotal').textContent=historyMoney(cart.reduce((n,item)=>n+item.qty*(item.customPrice ?? item.price),0));
  document.getElementById('cartRefundMethod').value='Nakit';
  document.getElementById('cartRefundReceipt').value='';
  document.getElementById('cartRefundReceipt').disabled=false;
  document.getElementById('cartRefundError').textContent='';
  document.getElementById('cartRefundDay').textContent=`İade ${nowDate()} aktif kasa gününe kaydedilecek.`;
  document.getElementById('cartRefundDialog').showModal();
}
function updateCartRefundMethod(){
  const select=document.getElementById('cartRefundReceipt');
  const card=document.getElementById('cartRefundMethod').value==='Kredi Kartı';
  if(card){select.dataset.previous=select.value;select.value='official';}
  else if(select.disabled)select.value=select.dataset.previous || '';
  select.disabled=card;
}
function completeCartRefund(event){
  event?.preventDefault();
  if(!pendingCartRefund)return false;
  try{
    if(pendingCartRefund.fingerprint!==JSON.stringify(cart))throw Error('Sepet değişti. İade penceresini kapatıp yeniden aç.');
    const record=saveRefundTransaction({lines:pendingCartRefund.items.map(item=>({item,qty:Number(item.qty)})),method:document.getElementById('cartRefundMethod').value,receipt:document.getElementById('cartRefundReceipt').value,customer:customers.find(c=>String(c.id)===String(pendingCartRefund.customerId))});
    pendingCartRefund=null;
    cart=window.cart=[];renderCart();
    document.getElementById('cartCustomerSelect').value='';
    document.getElementById('quickCartDiscountInput').value='';
    document.getElementById('cartRefundDialog').close();
    toast(`${historyMoney(-record.total)} iade kaydedildi · ${record.paymentType} · ${record.isOfficial ? 'Fişli' : 'Fişsiz'}`,'success');
    return true;
  }catch(error){document.getElementById('cartRefundError').textContent=error.message;return false;}
}
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('cartRefundDialog').addEventListener('close',()=>pendingCartRefund=null);
});
