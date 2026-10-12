(() => {
  if (!window.aybarsDesktop) return;
  // Commit each synchronous business operation and its outbox events together.
  for(const name of ['saveData','completeSale','chargeToCredit','saveDispatchOrder','saveRefundTransaction','markOrderDelivered',
    'saveExpense','saveSupplierIntake','confirmSupplierPayment','confirmDebtCollection',
    'saveManualPlatformIncome','completeDailyClose','reopenTodayDailyClose','reopenDailyCloseById',
    'saveStockEntry','saveNewProduct','saveBarcodeModal','saveQuickPricingAll']) {
    const original=window[name];
    if(typeof original==='function')window[name]=function(...args){return window.desktopStorage.transaction(()=>original.apply(this,args));};
  }
  async function refresh(){
    const s=await window.aybarsDesktop.status();
    document.getElementById('localSyncStatus').textContent=s.blocked ? 'Aktarım durdu · bağlantıyı kontrol edin'
      : !s.configured ? `E-Tablo ayarlanmamış · ${s.pending} kayıt bekliyor`
      : s.pending ? `${s.pending} kayıt aktarım bekliyor` : 'E-Tablo aktarımı güncel';
    document.getElementById('localConnectionStatus').textContent=s.error || (s.lastSync ? 'Son aktarım: '+new Date(s.lastSync).toLocaleString('tr-TR') : 'Henüz aktarım yapılmadı.');
  }
  function showName(name){document.getElementById('localStoreName').textContent=name;document.title=name+' · Aybars POS';}
  document.addEventListener('DOMContentLoaded',async()=>{
    const button=document.createElement('button');button.className='btn btn-outline btn-sm';button.textContent='Mağaza & Bağlantı';
    document.querySelector('.header-actions').prepend(button);
    const dialog=document.createElement('dialog');dialog.className='local-settings-dialog';
    dialog.innerHTML=`<form id="localSettingsForm">
      <h2>Mağaza ve Google E-Tablo</h2>
      <p>Kasa internetsiz çalışır. Aktarım için bu mağazaya ait Apps Script bağlantısını kurun.</p>
      <label>Mağaza adı<input id="localName" required maxlength="100"></label>
      <label>Mağaza kimliği<input id="localStoreId" readonly></label>
      <label>Apps Script web uygulaması adresi<input id="localEndpoint" type="url" placeholder="https://script.google.com/macros/s/…/exec"></label>
      <label>Bağlantı anahtarı<input id="localApiKey" type="password" autocomplete="new-password" minlength="24" placeholder="Mevcut anahtarı korumak için boş bırakın"></label>
      <p>Apps Script ayarlarında POS_STORE_ID değerini mağaza kimliği, POS_API_KEY değerini en az 24 karakterlik bağlantı anahtarı olarak kaydedin. Kurulum rehberindeki Code.gs sürümünü kullanın.</p>
      <p id="localConnectionStatus" role="status"></p><p id="localSettingsError" role="alert"></p>
      <div class="local-settings-actions">
        <button type="submit" class="btn btn-primary">Bağlantıyı doğrula ve kaydet</button>
        <button type="button" id="localSyncNow" class="btn btn-outline">Şimdi aktar</button>
        <button type="button" id="localBackup" class="btn btn-outline">Dosya yedeği al</button>
        <button type="button" id="localDataFolder" class="btn btn-outline">Veri klasörünü aç</button>
        <button type="button" id="localClose" class="btn btn-ghost">Kapat</button>
      </div></form>`;
    document.body.appendChild(dialog);
    async function load(){
      const s=await window.aybarsDesktop.settings();showName(s.storeName);
      document.getElementById('localName').value=s.storeName;
      document.getElementById('localStoreId').value=s.storeId;
      document.getElementById('localEndpoint').value=s.endpoint || '';
      document.getElementById('localApiKey').value='';await refresh();
    }
    button.onclick=async()=>{await load();dialog.showModal();};
    document.getElementById('localClose').onclick=()=>dialog.close();
    const error=document.getElementById('localSettingsError');
    document.getElementById('localSettingsForm').onsubmit=async event=>{
      event.preventDefault();error.textContent='';const save=event.submitter;save.disabled=true;
      try {
        const s=await window.aybarsDesktop.configure({storeName:document.getElementById('localName').value,
          endpoint:document.getElementById('localEndpoint').value,apiKey:document.getElementById('localApiKey').value});
        showName(s.storeName);document.getElementById('localApiKey').value='';await refresh();error.textContent='Ayarlar kaydedildi.';
      } catch {error.textContent='Kaydedilemedi. Adresi, mağaza kimliğini, bağlantı anahtarını ve bekleyen kayıtları kontrol edin.';}
      finally {save.disabled=false;}
    };
    document.getElementById('localSyncNow').onclick=async()=>{await window.aybarsDesktop.sync();await refresh();};
    document.getElementById('localBackup').onclick=async()=>{try{if(await window.aybarsDesktop.backup())error.textContent='Yedek dosyası kaydedildi.';}catch{error.textContent='Yedek alınamadı; disk alanını kontrol edin.';}};
    document.getElementById('localDataFolder').onclick=()=>window.aybarsDesktop.openData();
    await load();setInterval(()=>refresh().catch(()=>{}),5000);
  });
})();
