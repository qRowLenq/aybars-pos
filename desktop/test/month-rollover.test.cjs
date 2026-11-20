const assert=require('node:assert/strict');
const {test}=require('node:test');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');

test('monthly reporting grows an empty sales grid and opens each Istanbul calendar month only once',()=>{
  const older={getLastRow:()=>20}, tabs=new Map([['GELİR - EKİM 2026',older]]);
  let timestamp='2026-11', releases=0;
  const ss={getSpreadsheetTimeZone:()=> 'Europe/Istanbul',getSheetByName:n=>tabs.get(n)};
  const c=vm.createContext({
    SpreadsheetApp:{getActiveSpreadsheet:()=>ss,flush(){}},
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>releases++})},
    Utilities:{formatDate:(_date,tz,pattern)=>{assert.equal(tz,'Europe/Istanbul');assert.equal(pattern,'yyyy-MM');return timestamp;}}
  });
  vm.runInContext(readFileSync(join(__dirname,'../../Code.gs'),'utf8'),c);
  c.getOrCreateMonthlySalesSheet=(_ss,title)=>tabs.set('GELİR - '+title,{getLastRow:()=>20});
  c.getOrCreateMonthlyExpenseSheet=(_ss,title)=>tabs.set('GİDER - '+title,{});
  c.AYBARS_BU_AYI_AC();c.AYBARS_BU_AYI_AC();
  assert.equal(tabs.size,3);assert.equal(tabs.get('GELİR - EKİM 2026'),older);
  assert.ok(tabs.has('GELİR - KASIM 2026'));assert.ok(tabs.has('GİDER - KASIM 2026'));
  timestamp='2027-01';c.AYBARS_BU_AYI_AC();assert.ok(tabs.has('GELİR - OCAK 2027'));assert.equal(releases,3);
  let width=26,height=10;
  const grid={getMaxColumns:()=>width,getMaxRows:()=>height,
    insertColumnsAfter:(p,n)=>{assert.equal(p,width);width+=n;},
    insertRowsAfter:(p,n)=>{assert.equal(p,height);height+=n;}};
  c.ensureMonthlySalesGrid(grid);c.ensureMonthlySalesGrid(grid);
  assert.equal(width,43);assert.equal(height,20);
});
