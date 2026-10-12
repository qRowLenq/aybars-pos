const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
function fixture(){
  const c=vm.createContext({document:{getElementById:()=>null},toast:()=>{},focusCatalogSearch:()=>{},cart:[],products:[]});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../../js/stock-flow.js'),'utf8'),c);
  return c;
}
test('Shared bundle components are combined; approved shortage remains negative and consumes expiry batches',()=>{
  const c=fixture();
  c.products=[{id:1,name:'Mama',stock:1,batches:[{qty:1,expiry:'2026-11'}]}];
  c.cart=[{id:1,qty:1},{id:2,isBundle:true,qty:1,bundleItems:[{productId:1,qty:2}]}];
  assert.equal(c.stockShortages(c.cart,c.products)[0].qty,3);
  c.deductCartStock(c.cart);
  assert.equal(c.products[0].stock,-2);
  assert.equal(c.products[0].batches[0].qty,0);
});
test('Checkout waits for approval; changing cart invalidates approval and no records change while waiting',()=>{
  const c=fixture();c.products=[{id:1,name:'Mama',stock:1}];c.cart=[{id:1,qty:3}];
  let called=0;
  assert.equal(c.requireStockApproval(()=>called++),true);
  assert.equal(c.products[0].stock,1);assert.equal(called,0);
  vm.runInContext('stockApproval=stockCartSignature()',c);
  c.cart.push({id:1,qty:1});
  assert.equal(c.requireStockApproval(()=>called++),true);
  vm.runInContext('stockApproval=stockCartSignature()',c);
  assert.equal(c.requireStockApproval(()=>called++),false);
  assert.equal(c.requireStockApproval(()=>called++),true); // approval cannot be reused
});
test('Velocity includes refunds and bundles once, excludes old/future sales, and reports no-data separately',()=>{
  const c=fixture();
  const rows=c.stockVelocity([{id:1,stock:5},{id:2,stock:1}], [
    {date:'2026-10-03',soldItems:[{id:1,qty:12}]},
    {date:'12.10.2026',isRefund:true,soldItems:[{id:1,qty:-2}]},
    {date:'2026-10-12',soldItems:[{isBundle:true,qty:2,bundleItems:[{productId:1,qty:2}]}]},
    {date:'2026-08-01',soldItems:[{id:1,qty:100}]},
    {date:'2026-10-13',soldItems:[{id:1,qty:100}]}
  ],'12.10.2026');
  assert.equal(rows[0].quantity,14);assert.equal(rows[0].days,30);
  assert.equal(rows[0].rate,14/30);assert.equal(rows[1].remaining,null);
  const first=c.stockVelocity([{id:1,stock:5}],[{date:'12.10.2026',soldItems:[{id:1,qty:5}]}],'12.10.2026')[0];
  assert.equal(first.days,1);assert.equal(first.remaining,1);
});
test('Needs deduplicate by product ID and recognize legacy names without blocking different products',()=>{
  const c=fixture();c.manualDeficits=[{productId:1,name:'Eski isim'},{name:'MAMA'}];
  assert.equal(c.isStockNeedListed({id:1,name:'Yeni isim'}),true);
  assert.equal(c.isStockNeedListed({id:2,name:'mama'}),true);
  assert.equal(c.isStockNeedListed({id:3,name:'Kum'}),false);
});
test('Manual needs accept products outside the catalog, reject duplicates and reuse catalog records',()=>{
  const c=fixture(); const input={value:'  Taşıma çantası  ',focus:()=>{}};
  c.document={getElementById:()=>input};c.manualDeficits=[];
  c.crypto=require('node:crypto');let writes=0;
  c.saveData=()=>writes++;c.renderDeficitsTable=()=>{};
  c.addStockManualNeed();
  assert.equal(c.manualDeficits[0].name,'Taşıma çantası');assert.equal(input.value,'');assert.equal(writes,1);
  input.value='taşıma çantası';c.addStockManualNeed();assert.equal(c.manualDeficits.length,1);assert.equal(writes,1);
  input.value='   ';c.addStockManualNeed();assert.equal(c.manualDeficits.length,1);
  let catalogId;c.products=[{id:7,name:'Mama'}];c.addProductToDeficits=id=>catalogId=id;
  input.value='mama';c.addStockManualNeed();assert.equal(catalogId,7);
});
