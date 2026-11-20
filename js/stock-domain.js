/* Shared stock calculations used by the existing inventory/stock-flow and demo. */
(function(root){
 const clone=x=>JSON.parse(JSON.stringify(x)),round=n=>Math.round(n*1e6)/1e6;
 function positive(q){if(!Number.isFinite(q)||q<=0)throw Error('Miktar sıfırdan büyük olmalı.');}
 function take(p,q,{allowNegative=false,allowExpired=false}={}){
  positive(q);if(!Number.isFinite(Number(p.stock))||(!allowNegative&&q>Number(p.stock)))throw Error(p.name+': stok yetersiz.');
  const today=new Date().toISOString().slice(0,10),batches=(p.batches||[]).filter(b=>Number(b.qty)>0).sort((a,b)=>(a.expiry||'9999').localeCompare(b.expiry||'9999'));
  const tracked=batches.reduce((n,b)=>n+Number(b.qty),0),untracked=Math.max(0,Number(p.stock)-tracked);
  const usable=batches.filter(b=>allowExpired||!b.expiry||b.expiry>=today);
  if(!allowNegative&&q>usable.reduce((n,b)=>n+Number(b.qty),untracked))throw Error('Satılabilir parti stoğu yetersiz; son kullanma tarihlerini kontrol et.');
  let remaining=q;const allocations=[];
  for(const b of usable){const amount=Math.min(Number(b.qty),remaining);if(amount<=0)continue;b.qty=round(Number(b.qty)-amount);remaining=round(remaining-amount);allocations.push({lotNumber:b.lotNumber||'Belirtilmemiş',expiry:b.expiry||'',qty:amount,cost:Number(b.cost??p.cost)||0});}
  if(remaining>0)allocations.push({lotNumber:'PARTİSİZ',expiry:'',qty:remaining,cost:Number(p.cost)||0});
  p.stock=round(Number(p.stock)-q);return allocations;
 }
 const cost=allocations=>round(allocations.reduce((n,b)=>n+b.qty*b.cost,0));
 function waste(state,productId,q,reason,note=''){
  positive(q);if(!String(reason||'').trim())throw Error('Fire nedeni gerekli.');const p=state.products.find(p=>String(p.id)===String(productId));if(!p)throw Error('Ürün bulunamadı.');
  const allocations=take(p,q,{allowExpired:true}),loss=cost(allocations),record={id:'waste_'+crypto.randomUUID(),productId:p.id,productName:p.name,qty:q,unit:p.unit||'adet',unitCost:loss/q,totalLoss:loss,reason,note,allocations,date:new Date().toLocaleDateString('tr-TR'),time:new Date().toLocaleTimeString('tr-TR')};
  state.wasteRecords.unshift(record);return record;
 }
 function unpack(state,sourceId,targetId,count=1){
  positive(count);if(!Number.isInteger(count))throw Error('Açılacak kapalı paket sayısı tam olmalı.');const source=state.products.find(p=>p.id===sourceId),target=state.products.find(p=>p.id===targetId);
  if(!source||!target||source.id===target.id||target.unit!=='g'||source.openProductId!==target.id||!(source.gramsPerBag>0))throw Error('Kapalı çuval / açık mama eşleştirmesi geçersiz.');
  const allocations=take(source,count);target.batches??=[];for(const a of allocations)target.batches.push({...a,lotNumber:a.lotNumber+' / açıldı',sourceLot:a.lotNumber,qty:round(a.qty*source.gramsPerBag),initialQty:round(a.qty*source.gramsPerBag),cost:a.cost/source.gramsPerBag,source:'Çuval açılışı'});
  target.stock=round(Number(target.stock)+count*source.gramsPerBag);return {sourceId,targetId,count,grams:count*source.gramsPerBag,allocations};
 }
 function barcode(list,code){const matches=[];for(const p of list){if(!p)continue;const all=[{code:p.barcode,factor:1,label:p.unit||'adet'},...(p.barcodes||[])];for(const b of all)if(b.code&&String(b.code)===String(code).trim())matches.push({product:p,factor:Number.isSafeInteger(Number(b.factor))&&Number(b.factor)>0?Number(b.factor):1,label:b.label||'adet'});}const unique=[...new Map(matches.map(m=>[m.product.id+':'+m.factor,m])).values()];if(unique.length>1)throw Error('Barkod birden fazla ürün/birime bağlı. Eşleştirmeyi düzelt.');return unique[0]||null;}
 function incoming(list,id){return list.filter(o=>['ordered','in_transit'].includes(o.status)).reduce((n,o)=>n+(o.items||[]).filter(i=>String(i.productId)===String(id)).reduce((t,i)=>t+Math.max(0,(Number(i.qty)||0)-(Number(i.received)||0)),0),0);}
 function reorder(row,purchaseOrders){const p=row.product,lead=Math.max(0,Number(p.leadTimeDays??3)||0),safety=Math.max(0,Number(p.safetyStock??2)||0),review=Math.max(1,Number(p.reviewDays??7)||7),onWay=incoming(purchaseOrders,p.id),target=Math.ceil(row.rate*(lead+review)+safety);return {...row,lead,safety,review,incoming:onWay,target,suggested:Math.max(0,Math.ceil(target-row.stock-onWay)),uncertain:row.days<7};}
 root.BlueStock={take,cost,waste,unpack,barcode,reorder,incoming,clone,round};
})(typeof window!=='undefined'?window:globalThis);
