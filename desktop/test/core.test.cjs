const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const {Store,validateEndpoint}=require('../store.cjs');
const {Sync}=require('../sync.cjs');
const endpoint='https://script.google.com/macros/s/test-shop/exec';
const key='test-only-placeholder-key-123456789';
function fixture(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aybars-test-'));
  const store=new Store(dir);t.after(()=>{try{store.close();}catch{}fs.rmSync(dir,{recursive:true,force:true});});
  return {dir,store};
}
test('SQLite survives restart, rolls back failed writes, and creates consistent backups',t=>{
  const {dir,store}=fixture(t);
  store.write({'ps_products':'[{"id":1,"stock":4}]','ps_sales_history':'[{"total":100}]'},[{action:'save_sale',total:100}]);
  assert.throws(()=>store.write({'ps_products':'[]','invalid':'oops'},[{action:'save_sale'}]));
  assert.equal(JSON.parse(store.snapshot().ps_products)[0].stock,4);
  assert.equal(store.status().pending,1);
  const backup=store.backup();
  const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(backup);
  assert.equal(db.prepare('SELECT count(*) n FROM outbox').get().n,1);db.close();
  store.close();const reopened=new Store(dir);
  assert.equal(JSON.parse(reopened.snapshot().ps_sales_history)[0].total,100);
  assert.equal(reopened.status().pending,1);reopened.close();
});
test('Offline queue retains IDs and only removes events after matching acknowledgement',async t=>{
  const {store}=fixture(t);store.configure({storeName:'Test shop',endpoint,apiKey:key});
  store.write({'ps_sales_history':'[{"total":100}]'},[{action:'save_sale',total:100}]);
  const id=store.next().id;
  const offline=new Sync(store,async()=>{throw new Error('offline');});await offline.flush();
  assert.equal(store.next().id,id);assert.equal(store.status().pending,1);
  const online=new Sync(store,async(_url,opts)=>{
    const body=JSON.parse(opts.body);assert.equal(body.eventId,id);
    return {ok:true,json:async()=>({status:'success',protocol:'aybars-desktop-v1',eventId:body.eventId,storeId:body.storeId})};
  });
  await online.flush(true);assert.equal(store.status().pending,0);assert.ok(store.status().lastSync);
});
test('Uncertain responses stop automatic retries; manual retries still require server confirmation',async t=>{
  const {store}=fixture(t);store.configure({storeName:'Test',endpoint,apiKey:key});store.write({},[{action:'save_sale'}]);
  let requests=0;const sync=new Sync(store,async()=>{requests++;return {ok:true,json:async()=>({status:'error',code:'uncertain'})};});
  await sync.flush();await sync.flush();assert.equal(requests,1);assert.equal(store.status().blocked,true);
  await sync.flush(true);assert.equal(requests,2);assert.equal(store.status().pending,1);
  assert.throws(()=>store.configure({storeName:'Other',endpoint:endpoint.replace('test-shop','other'),apiKey:key}));
  for(const url of ['http://script.google.com/macros/s/a/exec','https://example.com/exec','https://script.google.com/macros/s/a/exec?token=x'])assert.throws(()=>validateEndpoint(url));
});
test('Apps Script rejects another shop, deduplicates retries and holds incomplete operations',()=>{
  const rows=[];let applied=0;
  const sheet={getLastRow:()=>rows.length,appendRow:r=>rows.push(r),hideSheet:()=>{},
    getRange:(row,col,count=1,cols=1)=>({getValues:()=>rows.slice(row-1,row-1+count).map(r=>r.slice(col-1,col-1+cols)),setValue:v=>{rows[row-1][col-1]=v;}})};
  const context=vm.createContext({LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},
    PropertiesService:{getScriptProperties:()=>({getProperty:n=>n==='POS_API_KEY'?key:'shop-a'})},
    SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:()=>rows.length>1?sheet:null,insertSheet:()=>sheet,getSheets:()=>[sheet,{}]}),flush:()=>{}},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../../Code.gs'),'utf8'),context);
  context.deleteGunSonuKasaIfExists=()=>{};context.handleSaveSale=()=>applied++;
  const payload={action:'save_sale',storeId:'shop-a',apiKey:key,eventId:'11111111-1111-4111-8111-111111111111'};
  const post=body=>context.doPost({postData:{contents:JSON.stringify(body)}});
  assert.equal(post({...payload,storeId:'wrong'}).code,'auth');assert.equal(applied,0);
  assert.equal(post(payload).status,'success');assert.equal(post(payload).status,'success');assert.equal(applied,1);
  rows[1][2]='processing';assert.equal(post(payload).code,'uncertain');assert.equal(applied,1);
  rows[1][2]='retry';assert.equal(post(payload).status,'success');assert.equal(applied,2);
  let snapshots=0;context.handleFullReportSnapshot=()=>snapshots++;
  const bulk={...payload,action:'full_report_snapshot',eventId:'22222222-2222-4222-8222-222222222222',snapshot:{salesHistory:[],products:[]}};
  assert.equal(post({...bulk,eventId:undefined}).code,'auth');assert.equal(snapshots,0);
  assert.equal(post({...bulk,storeId:'wrong'}).code,'auth');assert.equal(snapshots,0);
  assert.equal(post(bulk).status,'success');assert.equal(post(bulk).status,'success');assert.equal(snapshots,1);
});
