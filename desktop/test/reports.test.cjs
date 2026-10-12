const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {buildAybarsSnapshotTables}=require('../../js/report-tables.js');
test('Daily/monthly reports separate credit sales, refunds and collections; item margins flag missing costs',()=>{
  const reports=buildAybarsSnapshotTables({salesHistory:[
    {id:1,date:'12.10.2026',total:100,paymentType:'Veresiye',soldItems:[{id:1,name:'Mama',qty:1,price:100,cost:40}]},
    {id:2,date:'2026-10-12',total:200,paymentType:'Kredi Kartı',splitCard:200,soldItems:[]},
    {id:3,date:'12.10.2026',total:-50,isRefund:true,paymentType:'Nakit',splitCash:-50,soldItems:[]},
    {id:4,date:'12.10.2026',total:100,channel:'Veresiye Tahsilatı',paymentType:'Nakit',splitCash:100,soldItems:[]}
  ],expenses:[{date:'12.10.2026',amount:25}]});
  const daily=reports['GÜNLÜK ÖZET'][1];
  assert.equal(daily[1],300);assert.equal(daily[2],50);assert.equal(daily[3],250);
  assert.equal(daily[5],200);assert.equal(daily[7],100);assert.equal(daily[11],100);assert.equal(daily[12],25);
  assert.equal(reports['AYLIK ÖZET'][1][3],250);assert.equal(reports['ÜRÜN SATIŞ ÖZETİ'][1][5],60);
});
test('Unreconciled split payment and unknown legacy methods are flagged instead of guessed',()=>{
  const r=buildAybarsSnapshotTables({salesHistory:[{id:1,date:'12.10.2026',total:100,paymentType:'Parçalı'},{id:2,date:'12.10.2026',total:100,paymentType:'Bilinmiyor'}]});
  assert.ok(r['VERİ KONTROLÜ'].length>2);
  assert.equal(r['GÜNLÜK ÖZET'][1][5],0);
});
test('Financial card total excludes bank transfers and includes split card payments and card refunds',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../../js/expenses.js'),'utf8');
  const c=vm.createContext({products:[],suppliers:[],expenses:[],salesHistory:[
    {total:100,paymentType:'Parçalı',splitCard:30,splitCash:70},
    {total:200,paymentType:'Havale / IBAN'},
    {total:60,paymentType:'Kredi Kartı'},
    {total:-10,paymentType:'Kredi Kartı',splitCard:-10,isRefund:true}
  ]});
  vm.runInContext(source.slice(source.indexOf('function calculateDualFinancialOverview()'),source.indexOf('function renderDualFinancialOverviewCard()')),c);
  assert.equal(c.calculateDualFinancialOverview().cardSales,80);
});
test('Legacy income calendar counts credit once, excludes repayment from turnover and subtracts refunds',()=>{
  const cells=new Map();
  const col=s=>[...s].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0);
  function get(r,c){const v=cells.get(r+','+c);if(typeof v==='number')return v;if(typeof v!=='string'||!v.startsWith('='))return 0;
    let formula=v.slice(1).replace(/SUM\(([A-Z]+)(\d+):[A-Z]+(\d+)\)/g,(_,letter,a,b)=>{let n=0;for(let i=+a;i<=+b;i++)n+=get(i,col(letter));return String(n);});
    formula=formula.replace(/([A-Z]+)(\d+)/g,(_,letter,row)=>String(get(+row,col(letter))));
    return (formula.match(/[+-]?\d+(?:\.\d+)?/g)||[]).reduce((n,v)=>n+Number(v),0);
  }
  const sheet={getRange:(r,c)=>({getValue:()=>get(r,c),setValue:v=>cells.set(r+','+c,v),setFormula:v=>cells.set(r+','+c,v)})};
  const context=vm.createContext({SpreadsheetApp:{flush:()=>{}}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../../Code.gs'),'utf8'),context);
  context.getOrCreateMonthlySalesSheet=()=>sheet;context.deleteGunSonuKasaIfExists=()=>{};
  const sale=x=>context.handleSaveSale({}, {date:'12.10.2026',...x});
  sale({total:100,paymentType:'Veresiye'});
  sale({total:100,paymentType:'Nakit',cashSales:100,channel:'Veresiye Tahsilatı'});
  sale({total:200,paymentType:'Kredi Kartı',cardSales:200});
  sale({total:-50,paymentType:'Nakit',cashSales:-50,isRefund:true});
  const c=context.getSalesColumnForDay(12);
  assert.equal(get(5,c),250);assert.equal(get(18,c),100);assert.equal(get(19,c),100);assert.equal(get(20,c),50);
});
