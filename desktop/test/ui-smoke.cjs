const { _electron:electron }=require('playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'aybars-ui-'));
const launch=()=>electron.launch({args:['--no-sandbox',path.join(__dirname,'../..')],env:{...process.env,AYBARS_TEST_DATA:directory},timeout:30000});
(async()=>{
  let app;
  try {
    app=await launch();let page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.waitForFunction(()=>document.getElementById('localStoreName') && typeof completeSale==='function');
    assert.equal(await page.evaluate(()=>products.length),0);
    assert.equal(await page.evaluate(()=>suppliers.length+salesHistory.length+expenses.length+customers.length),0);
    await page.evaluate(()=>{
      products=window.products=[{id:1,name:'Test Mama',barcode:'123456789',category:'Kedi',stock:5,price:100,cost:50,vatRate:20,batches:[]}];
      saveData();renderCatalog();
    });
    await page.locator('#productGrid .product-card').first().click();
    await page.locator('button[onclick="completeSale(\'Nakit\')"]').click();
    assert.equal(await page.evaluate(()=>salesHistory[0].total),100);
    assert.equal(await page.evaluate(()=>products[0].stock),4);
    assert.ok(await page.evaluate(()=>window.aybarsDesktop.status().then(s=>s.pending>=1)));
    await page.getByRole('button',{name:'Mağaza & Bağlantı',exact:true}).click();
    await page.locator('#localName').fill('Test Petshop');
    await page.getByRole('button',{name:'Bağlantıyı doğrula ve kaydet',exact:true}).click();
    await page.waitForFunction(()=>document.getElementById('localStoreName').textContent==='Test Petshop');
    const popupReady=page.waitForEvent('popup');
    await page.evaluate(()=>{
      const child=window.open('','_blank');
      if(!child)throw new Error('Etiket penceresi açılamadı.');
      child.document.write('<p id="labelProbe">Etiket</p>');child.document.close();
    });
    const popup=await popupReady;
    assert.equal(await popup.locator('#labelProbe').textContent(),'Etiket');
    assert.equal(await popup.evaluate(()=>typeof window.aybarsDesktop),'undefined');
    await popup.close();
    await app.close();app=await launch();page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));
    await page.waitForFunction(()=>window.products?.length===1);
    assert.equal(await page.evaluate(()=>products[0].stock),4);
    assert.equal(await page.evaluate(()=>salesHistory.length),1);
    assert.equal(await page.evaluate(()=>suppliers.length),0);
    await page.waitForFunction(()=>document.getElementById('localStoreName').textContent==='Test Petshop');
    assert.ok(await page.evaluate(()=>window.aybarsDesktop.status().then(s=>s.pending>=1)));
    assert.deepEqual(errors,[]);
    console.log('PASS: isolated shop, SQLite IPC, cash sale + outbox, settings, label popup, restart persistence, no runtime errors.');
  } finally {if(app)await app.close();fs.rmSync(directory,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
