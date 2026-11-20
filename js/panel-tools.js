/* Main-panel inventory and isolated payment tools. */
const panelClone = value => JSON.parse(JSON.stringify(value));
const panelKey = kind => kind + '_' + crypto.randomUUID();
const splitHistory = list => list.flatMap(p => p.splitHistory || []).sort((a,b) => b.at.localeCompare(a.at));
function prepareProductSplit(list, {id,sourceId,targetId,opened,produced,actor}) {
  if (!id || !actor?.trim()) throw Error('İşlemi yapan kişinin adını girin.');
  if (splitHistory(list).some(row => row.id === id)) return null;
  if (![opened,produced].every(n => Number.isSafeInteger(n) && n > 0)) throw Error('Adetler pozitif tam sayı olmalı.');
  if (String(sourceId) === String(targetId)) throw Error('İki farklı ürün seçin.');
  const next = panelClone(list);
  const source = next.find(p => String(p.id) === String(sourceId) && !p.isBundle);
  const target = next.find(p => String(p.id) === String(targetId) && !p.isBundle);
  if (!source || !target) throw Error('İki stok kartını da seçin.');
  if (!Number.isSafeInteger(Number(source.stock)) || !Number.isSafeInteger(Number(target.stock) + produced)) throw Error('Stok adetleri geçersiz.');
  const before = [Number(source.stock),Number(target.stock)];
  const allocations = BlueStock.take(source,opened);
  const unitCost = BlueStock.cost(allocations)/produced;
  const expiry = allocations.map(a => a.expiry).filter(Boolean).sort()[0] || '';
  const previousCost = Number(target.cost) || 0;
  target.stock = before[1] + produced;
  const existing = Math.max(0,before[1]);
  target.cost = (existing*previousCost + unitCost*produced)/(existing+produced);
  target.batches ||= [];
  target.batches.push({lotNumber:id,qty:produced,initialQty:produced,cost:unitCost,expiry,source:'Ürün Bölme',date:new Date().toISOString().slice(0,10)});
  const record = {id,at:new Date().toISOString(),actor:actor.trim(),sourceId,targetId,source:source.name,target:target.name,opened,produced,before,after:[source.stock,target.stock],allocations,expiry,unitCost};
  (target.splitHistory ||= []).unshift(record);
  return {next,record};
}
const panelId = id => document.getElementById(id);
const panelText = (id,value) => { panelId(id).textContent = value; };
const panelMoney = n => Number(n).toLocaleString('tr-TR',{style:'currency',currency:'TRY'});
function persistPanelProducts(list) {
  // One write carries both product cards and the operation history.
  const stored = localStorage.getItem('ps_products');
  if(stored && JSON.stringify(JSON.parse(stored))!==JSON.stringify(products))throw Error('Stok kaydı başka bir sekmede değişti. Sayfayı yenileyin.');
  localStorage.setItem('ps_products',JSON.stringify(list));
  products = window.products = list;
}
function panelStockRefresh() { renderInventoryTable(); renderCatalog(); updateAllBadges(); }
function openProductSplit() {
  const form=panelId('productSplitForm');
  form.reset(); panelId('productSplitSave').disabled=false; panelText('splitMessage',''); form.dataset.operation=panelKey('split');
  for(const side of ['Source','Target']) fillSplitPicker(side);
  renderSplitPreview(); renderSplitHistory(); panelId('splitExamples').hidden=!window.BLUEPETSHOP_DEMO; panelId('productSplitDialog').showModal();
}
function loadSplitExamples(){
  if(!window.BLUEPETSHOP_DEMO)return;
  try{
    const names=['Örnek · 15 kg çuval','Örnek · 1 kg paket'],next=panelClone(products),ids=[];
    for(const [i,name] of names.entries()){
      let p=next.find(x=>x.name===name);
      if(!p){p={id:Math.max(Date.now(),...next.map(x=>Number(x.id)||0))+1,name,category:'Örnek stok',barcode:i?'0000009014202':'0000009014201',stock:i?4:8,price:i?145:2100,cost:i?80:1200,batches:[]};if(BlueStock.barcode(next,p.barcode))throw Error('Örnek barkod başka bir ürüne bağlı.');next.push(p);}
      ids.push(p.id);
    }
    persistPanelProducts(next); panelStockRefresh();
    for(const [i,side] of ['Source','Target'].entries()){panelId('search'+side).value='';fillSplitPicker(side);panelId('split'+side).value=ids[i];}
    panelId('splitProduced').value=15;renderSplitPreview();panelText('splitMessage','Örnek kartlar seçildi. Küçük paketin barkodu: 0000009014202');
  }catch(error){panelText('splitMessage',error.message);}
}
function fillSplitPicker(side) {
  const select=panelId('split'+side), query=panelId('search'+side).value.trim().toLocaleLowerCase('tr-TR'), old=select.value;
  const matches=products.filter(p=>!p.isBundle && (String(p.id)===old || (p.name+' '+(p.barcode||'')).toLocaleLowerCase('tr-TR').includes(query)));
  select.replaceChildren(new Option('Ürün seçin',''),...matches.map(p=>new Option(p.name+(p.barcode?' · '+p.barcode:''),p.id)));
  select.value=old;
  renderSplitPreview();
}
function renderSplitPreview() {
  for(const [side,field,sign] of [['Source','splitOpened',-1],['Target','splitProduced',1]]) {
    const p=products.find(p=>String(p.id)===panelId('split'+side).value), n=Number(panelId(field).value);
    panelText('preview'+side,p ? 'Stok: '+p.stock+(n>0 ? ' → '+(Number(p.stock)+sign*n) : '') : 'Ürün seçilmedi.');
  }
}
function renderSplitHistory() {
  const list=panelId('splitHistory'); list.replaceChildren();
  for(const row of splitHistory(products)) {
    const entry=document.createElement('li');
    entry.textContent='Ürün Bölme · '+new Date(row.at).toLocaleString('tr-TR')+' · '+row.actor+' — '+row.source+' −'+row.opened+' → '+row.target+' +'+row.produced+' · SKT: '+(row.expiry||'belirtilmedi')+' · '+panelMoney(row.unitCost)+'/adet · Partiler: '+row.allocations.map(x=>x.lotNumber+' × '+x.qty).join(', ');
    list.append(entry);
  }
}
function saveProductSplit(event) {
  event.preventDefault();
  try {
    const result=prepareProductSplit(products,{id:event.currentTarget.dataset.operation,sourceId:panelId('splitSource').value,targetId:panelId('splitTarget').value,opened:Number(panelId('splitOpened').value),produced:Number(panelId('splitProduced').value),actor:panelId('splitActor').value});
    if (!result) return;
    persistPanelProducts(result.next);
    panelId('productSplitSave').disabled=true;
    renderSplitHistory(); renderSplitPreview(); panelStockRefresh();
    panelText('splitMessage','Bölme kaydedildi. Yeni işlem için Ürün Bölme’yi yeniden açın.');
  } catch(error) { panelText('splitMessage',error.message); }
}
function newPanelCart() {
  if(cart.length) holdCurrentCart();
  panelId('cartCustomerSelect').value='';
  focusCatalogSearch();
}
function renderPanelFavorites() {
  const box=panelId('panelFavorites'); if(!box)return;
  const counts=new Map();
  for(const s of salesHistory.slice(0,500)) if(!s.isRefund) for(const item of s.soldItems||[]) counts.set(item.id,(counts.get(item.id)||0)+Number(item.qty));
  const list=[...counts].sort((a,b)=>b[1]-a[1]).map(([id])=>products.find(p=>p.id===id)).filter(Boolean).slice(0,6);
  box.replaceChildren(); box.hidden=!list.length;
  if(list.length)box.append('Sık satılanlar: ');
  for(const p of list){const b=document.createElement('button');b.className='btn btn-outline btn-xs';b.textContent=p.name;b.onclick=()=>addToCart(p);box.append(b);}
}

let panelImportRows, panelImportPlan, panelImportBase;
const panelImportFields={name:'Ürün adı',barcode:'Barkod',price:'Satış fiyatı',stock:'Stok',cost:'Maliyet'};
function productImportState() {
  const snapshot=panelClone(products);
  for(const p of snapshot){p.barcode=String(p.barcode??'').trim();p.batches ||= [];}
  return {products:snapshot,imports:snapshot.flatMap(p=>p.importHistory||[]),stockMovements:[],audit:[],terminalRequests:[],revision:0};
}
function resetPanelImport() { panelImportPlan=null;panelId('importConfirm').disabled=true;panelId('importPreview').replaceChildren(); }
async function readPanelImport() {
  resetPanelImport(); panelImportRows=null;
  const file=panelId('importFile').files[0], fields=panelId('importFields');
  fields.replaceChildren();
  if(!file)return;
  try {
    if(file.size>5_000_000)throw Error('En fazla 5 MB dosya yükleyin.');
    const rows=/\.xlsx$/i.test(file.name)?await BlueFiles.xlsx(await file.arrayBuffer()):BlueFiles.csv(await file.text());
    if(panelId('importFile').files[0]!==file)return;
    if(!rows[0]?.length)throw Error('Başlık satırı bulunamadı.');
    panelImportRows=rows;
    const patterns={name:/^ad$|ürün.*ad|urun.*ad|name/i,barcode:/barkod|barcode/i,price:/satış.*fiyat|fiyat|price/i,stock:/stok|stock/i,cost:/maliyet|alış.*fiyat|cost/i};
    for(const [key,label] of Object.entries(panelImportFields)){
      const container=document.createElement('label'), select=document.createElement('select');select.id='map_'+key;select.onchange=resetPanelImport;
      select.replaceChildren(new Option('Eşleştirme yok',-1),...rows[0].map((c,i)=>new Option(String(c.value),i)));
      select.value=rows[0].findIndex(c=>patterns[key].test(c.value));container.append(label,select);fields.append(container);
    }
    panelText('importMessage','Sütunları kontrol edin, ardından önizleyin.');
  } catch(error){panelText('importMessage',error.message);}
}
async function previewPanelImport() {
  resetPanelImport();
  try {
    if(!panelImportRows)throw Error('Önce Excel veya CSV seçin.');
    const rows=panelImportRows, mode=panelId('importMode').value, base=JSON.stringify(products);
    const mapping=Object.fromEntries(Object.keys(panelImportFields).map(k=>[k,Number(panelId('map_'+k).value)]));
    if(mode==='stock' && mapping.stock<0)throw Error('Stok sütununu eşleştirin.');
    const plan=await BlueFiles.preview(productImportState(),rows,mapping,mode);
    if(rows!==panelImportRows || mode!==panelId('importMode').value || Object.entries(mapping).some(([k,v])=>Number(panelId('map_'+k)?.value)!==v))return;
    panelImportPlan=plan; panelImportBase=base;
    for(const row of plan.lines){
      const tr=document.createElement('tr');
      const p=products.find(p=>p.id===row.productId);
      for(const value of [row.row,row.barcode,row.name||p?.name||'—',mode==='stock'?p?.stock+' → '+row.stock:row.stock??'—',row.errors.join(' · ')||'Hazır']){const td=document.createElement('td');td.textContent=value;tr.append(td);}
      panelId('importPreview').append(tr);
    }
    panelId('importConfirm').disabled=plan.already||!plan.valid;
    panelText('importMessage',plan.already?'Bu dosya bu işlemle daha önce aktarıldı.':plan.valid+' geçerli · '+(plan.lines.length-plan.valid)+' atlanacak. Yalnızca geçerli satırlar kaydedilir.');
  }catch(error){panelText('importMessage',error.message);}
}
function applyPanelImport() {
  try {
    const plan=panelImportPlan;
    if(!plan || panelImportBase!==JSON.stringify(products))throw Error('Stok veya ürünler değişti. Önizlemeyi yenileyin.');
    const snapshot=productImportState(), count=BlueFiles.apply(snapshot,plan);
    const first=plan.lines.find(l=>!l.errors.length);
    const p=snapshot.products.find(p=>p.barcode===first.barcode);
    (p.importHistory ||= []).push(snapshot.imports.at(-1));
    persistPanelProducts(snapshot.products);resetPanelImport();panelStockRefresh();
    panelText('importMessage',count+' satır kaydedildi.');
  }catch(error){panelText('importMessage',error.message);}
}
function panelDownload(format,template=false){
  const source={products:template?[{name:'Örnek ürün',barcode:'000012340001',price:30,cost:20,stock:5,unit:'adet'}]:products.filter(p=>!p.isBundle)};
  const data=format==='csv'?BlueFiles.csvExport(BlueFiles.exportRows(source)):storeExcel({store:{name:'Bluepetshop'},state:{ps_products:JSON.stringify(source.products.map(({id,name,barcode,category,price,cost,stock})=>({id,name,barcode,category,price,cost,stock})))}});
  const href=URL.createObjectURL(new Blob([data],{type:format==='csv'?'text/csv;charset=utf-8':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  const link=document.createElement('a');link.href=href;link.download=(template?'urun-sablonu':'urun-stok-'+new Date().toISOString().slice(0,10))+'.'+format;link.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
}

let panelSimulation=null;
const simulationLabels={sending:'Gönderiliyor',waiting:'Ödeme bekleniyor',approved:'Onaylandı',rejected:'Reddedildi',cancelled:'İptal',unknown:'Sonuç belirsiz'};
function openPanelSimulation(){
  if(!cart.length && !BlueDemo.request(panelSimulation||{terminalRequests:[]}))return toast('Önce kasada sepet hazırlayın.','warning');
  if(!panelSimulation || !BlueDemo.request(panelSimulation)){
    panelSimulation={products:panelClone(products),cart:{id:panelKey('cart'),items:[...stockRequirements(cart)].map(([id,qty])=>{const p=products.find(p=>String(p.id)===id);return {...p,qty,customPrice:0};}),cash:0},terminalRequests:[],activeRequest:null,audit:[],stockMovements:[],salesHistory:[]};
    // Keep checkout amount independent from bundle component prices.
    panelSimulation.checkoutTotal=cart.reduce((n,i)=>n+Math.round(i.qty*i.customPrice*100),0);
    panelSimulation.terminalItems=cart.map(({name,qty,customPrice})=>({name,qty,customPrice}));
    panelId('simCash').value='';
  }
  renderPanelSimulation();panelId('panelSimDialog').showModal();
}
function renderPanelSimulation(){
  const s=panelSimulation,r=s.terminalRequests.at(-1),active=BlueDemo.request(s),sale=s.salesHistory[0];
  panelText('simItems',s.terminalItems.map(i=>i.qty+' × '+i.name).join(' · '));
  panelText('simStatus',r?simulationLabels[r.status]+' · POS tutarı '+panelMoney(r.amount/100):'Sepet: '+panelMoney(s.checkoutTotal/100));
  panelText('simResult',sale?'1 demo satış · '+s.stockMovements.length+' demo stok hareketi · Nakit '+panelMoney(sale.splitCash)+' + Kart '+panelMoney(sale.splitCard):'');
  panelId('simSend').disabled=!!active||!!sale;
  panelId('simCash').disabled=!!active||!!sale;
  for(const b of panelId('simActions').querySelectorAll('button')){
    const a=b.dataset.sim;
    b.disabled=a==='repeat'?!sale:a==='query'?active?.status!=='unknown':!active||active.status==='sending'||(a==='disconnect'&&active.status==='unknown');
  }
}
function panelSimAction(action){
  try {
    const s=panelSimulation;let r=BlueDemo.request(s);
    if(action==='send'){
      BlueDemo.unlocked(s);
      if(s.salesHistory.length)return;
      const raw=Number(panelId('simCash').value||0),cash=Math.round(raw*100),amount=s.checkoutTotal-cash;
      if(!Number.isFinite(raw)||raw<0||amount<=0)throw Error('Nakit tutarı sıfır veya sepetten küçük olmalı.');
      for(const line of s.cart.items){const p=s.products.find(p=>p.id===line.id);if(!p)throw Error('Stok kartı bulunamadı.');BlueStock.take(panelClone(p),line.qty);}
      r=BlueTerminalSimulator.create({id:panelKey('terminal'),amount,currency:'TRY',items:s.terminalItems});
      s.cart.cash=cash;s.terminalRequests.push(r);s.activeRequest=r.id;
      setTimeout(()=>{BlueTerminalSimulator.waiting(r);if(panelSimulation===s)renderPanelSimulation();},300);
    } else if(action==='repeat'){
      r=s.terminalRequests.at(-1);receivePanelSimulation(s,BlueTerminalSimulator.query(r));
    } else if(r){
      if(action==='disconnect')BlueTerminalSimulator.disconnect(r);
      else if(action==='query'){r.connected=true;receivePanelSimulation(s,BlueTerminalSimulator.query(r));}
      else { const response=BlueTerminalSimulator.decide(r,action);if(response)receivePanelSimulation(s,response); }
    }
    renderPanelSimulation();
  }catch(error){panelText('simStatus',error.message);}
}
function receivePanelSimulation(s,response){
  const r=s.terminalRequests.find(x=>x.id===response.requestId);
  if(!r||r.amount!==response.amount||r.currency!==response.currency)throw Error('POS yanıtı eşleşmedi.');
  if(r.id!==s.activeRequest||['approved','rejected','cancelled'].includes(r.status))return;
  if(!['approved','rejected','cancelled','unknown'].includes(response.status))throw Error('Geçersiz POS sonucu.');
  if(response.status==='approved'){
    const next=panelClone(s.products);
    const movements=s.cart.items.map(i=>({productId:i.id,qty:-i.qty,allocations:BlueStock.take(next.find(p=>p.id===i.id),i.qty),transactionId:r.id}));
    s.products=next;s.stockMovements.push(...movements);
    s.salesHistory.push({id:r.id,total:s.checkoutTotal/100,splitCash:s.cart.cash/100,splitCard:r.amount/100});
  }
  r.status=response.status;if(r.status!=='unknown')s.activeRequest=null;
}
document.addEventListener('DOMContentLoaded',()=>{
  panelId('simActions').addEventListener('click',e=>{if(e.target.dataset.sim)panelSimAction(e.target.dataset.sim);});
  document.addEventListener('keydown',e=>{
    if(e.repeat||document.querySelector('dialog[open],.modal.active')||!panelId('tab-pos')?.classList.contains('active'))return;
    const action={F2:focusCatalogSearch,F4:newPanelCart,F6:openHoldCartModal}[e.key];
    if(action&&!e.ctrlKey&&!e.altKey&&!e.metaKey){e.preventDefault();action();}
  });
});
