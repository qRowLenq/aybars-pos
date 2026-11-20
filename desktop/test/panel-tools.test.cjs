const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const path=require('node:path');
function fixture(){
  const c={crypto,TextDecoder,TextEncoder,Uint8Array,DataView,Blob,Response,DecompressionStream,document:{addEventListener(){},getElementById(){return null;}},toast(){},nowDate:()=> '20.11.2026',nowTime:()=> '12:00',isDayClosed:()=>false,historyMoney:String,saveData(){},sendToGoogleSheets(){},renderCatalog(){},renderPosSalesHistory(){},updateAllBadges(){},salesHistory:[],customers:[],wasteRecords:[]};
  c.window=c;vm.createContext(c);
  for(const file of ['stock-domain','stock-flow','terminal-simulator','simulation-engine','import-export','store-summary','excel','panel-tools','refunds'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../js',file+'.js'),'utf8'),c,{filename:file});
  return c;
}
const cards=()=>[{id:1,name:'15 kg çuval',stock:8,cost:1200,price:2100,barcode:'00001',batches:[{lotNumber:'A',expiry:'2099-11-01',qty:8,cost:1200}]},{id:2,name:'1 kg paket',stock:4,cost:80,price:145,barcode:'00002'}];
test('Product split: 15 or 14, unchanged on invalid stock, duplicate safe, pack barcode consumes only pack',()=>{
  const c=fixture(),start=cards(),op={id:'a',sourceId:1,targetId:2,opened:1,produced:15,actor:'Örnek'};
  const {next,record}=c.prepareProductSplit(start,op);
  assert.equal(next[0].stock,7);assert.equal(next[1].stock,19);assert.equal(record.unitCost,80);assert.equal(record.expiry,'2099-11-01');assert.equal(record.allocations[0].lotNumber,'A');
  assert.equal(c.prepareProductSplit(next,op),null);
  const second=c.prepareProductSplit(next,{...op,id:'b',produced:14}).next;
  assert.equal(second[0].stock,6);assert.equal(second[1].stock,33);
  const before=JSON.stringify(second);
  assert.throws(()=>c.prepareProductSplit(second,{...op,id:'c',opened:7}),/stok yetersiz/i);
  assert.equal(JSON.stringify(second),before);
  const scan=c.BlueStock.barcode(second,'00002');c.products=second;c.deductCartStock([{id:scan.product.id,qty:scan.factor}]);
  assert.equal(second[0].stock,6);assert.equal(second[1].stock,32);
});
test('Linked refund: damaged goes to existing waste history, repeat ignored, sellable returns original batch',()=>{
  const c=fixture();c.products=cards();
  const item={...c.products[1],qty:2,customPrice:145,allocations:[{lotNumber:'LOT',qty:2,cost:80,expiry:'2099-01-01'}]},sale={id:42,total:290,soldItems:[item],isOfficial:false};
  c.salesHistory.push(sale);
  const args={sale,lines:[{item,index:0,qty:1}],method:'Nakit',receipt:'unofficial',condition:'damaged',commandId:'damaged'};
  const record=c.saveRefundTransaction(args);c.saveRefundTransaction(args);
  assert.equal(record.originalSaleId,42);assert.equal(c.wasteRecords.length,1);assert.equal(c.products[1].stock,4);
  c.saveRefundTransaction({...args,condition:'sellable',commandId:'sellable'});
  assert.equal(c.products[1].stock,5);assert.equal(c.products[1].batches[0].lotNumber,'LOT');assert.equal(sale.refunded,true);
});
test('Product Excel round trip and repeated stock import sets absolute stock once',async()=>{
  const c=fixture(),s={products:cards(),imports:[],audit:[],stockMovements:[],terminalRequests:[],revision:0};
  for(const p of s.products)p.batches||=[];
  const book=c.storeExcel({state:{ps_products:JSON.stringify([{...s.products[1],stock:11}])}});
  const rows=await c.BlueFiles.xlsx(book);
  const map={barcode:2,stock:6,name:1,price:4,cost:5};
  const plan=await c.BlueFiles.preview(s,rows,map,'stock');assert.equal(plan.lines[0].barcode,'00002');assert.equal(plan.valid,1);
  c.BlueFiles.apply(s,plan);assert.equal(s.products[1].stock,11);
  assert.throws(()=>c.BlueFiles.apply(s,plan),/daha önce/);assert.equal(s.products[1].stock,11);
});
test('POS adapter: refusal, cancel, unknown/disconnection and repeated approval preserve stock semantics',()=>{
  const c=fixture(),live=cards(),s={products:structuredClone(live),cart:{cash:4500,items:[{id:2,qty:1}]},checkoutTotal:14500,terminalRequests:[],stockMovements:[],salesHistory:[]};
  const T=c.BlueTerminalSimulator;
  const open=id=>{const r=T.create({id,amount:s.checkoutTotal-s.cart.cash,currency:'TRY',items:s.cart.items});s.terminalRequests.push(r);s.activeRequest=id;T.waiting(r);return r;};
  for(const status of ['rejected','cancelled']){const r=open(status);c.receivePanelSimulation(s,T.decide(r,status));assert.equal(s.products[1].stock,4);assert.equal(s.cart.items.length,1);}
  const r=open('success');assert.equal(r.amount,10000);T.disconnect(r);T.decide(r,'approved');c.receivePanelSimulation(s,T.query(r));assert.equal(r.status,'unknown');assert.throws(()=>c.BlueDemo.unlocked(s));
  r.connected=true;c.receivePanelSimulation(s,T.query(r));c.receivePanelSimulation(s,T.query(r));
  assert.equal(s.salesHistory.length,1);assert.equal(s.stockMovements.length,1);assert.equal(s.products[1].stock,3);assert.equal(live[1].stock,4);
});
test('Reorder accounts for lead time, safety stock and partial supplier delivery',()=>{
  const c=fixture(),p={id:2,leadTimeDays:5,safetyStock:3,reviewDays:4};const row=c.BlueStock.reorder({product:p,rate:2,days:20,stock:4},[{status:'ordered',items:[{productId:2,qty:9,received:3}]}]);
  assert.equal(row.suggested,11);
});

test('Main register holds the active cart before restoring an older one',()=>{
  const c=fixture(),customer={value:'1'};
  c.addEventListener=()=>{};c.setTimeout=()=>{};c.document.readyState='loading';c.document.getElementById=id=>id==='cartCustomerSelect'?customer:null;
  c.prompt=()=> 'Bekleyen';c.renderCatalog=()=>{};c.closeModal=()=>{};c.cart=[{id:1,qty:1}];c.heldCarts=[];
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../../js/pos.js'),'utf8'),c,{filename:'pos.js'});
  c.renderCart=()=>{};
  c.holdCurrentCart();assert.equal(c.cart.length,0);assert.equal(customer.value,'');
  c.cart.push({id:2,qty:1});customer.value='2';c.restoreHeldCart(0);
  assert.equal(c.cart[0].id,1);assert.equal(customer.value,'1');assert.equal(c.heldCarts[0].items[0].id,2);assert.equal(c.heldCarts[0].customerId,'2');
});
