const {app,BrowserWindow,ipcMain,dialog,shell,safeStorage,session}=require('electron');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {Store}=require('./store.cjs');
const {Sync}=require('./sync.cjs');
let store, sync, window, interval, backupTimer;
app.setName('aybars-pos');
if (process.platform==='win32') app.setAppUserModelId('com.aybars.pos');
const userData=process.env.AYBARS_TEST_DATA && !app.isPackaged
  ? path.resolve(process.env.AYBARS_TEST_DATA) : path.join(app.getPath('appData'),'aybars-pos');
require('node:fs').mkdirSync(userData,{recursive:true});
app.setPath('userData',userData);
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.focus();}});
  app.whenReady().then(()=>{
    const pageURL=pathToFileURL(path.join(__dirname,'../index.html')).href;
    const directory=path.join(app.getPath('userData'),'data');
    const cipher={
      encrypt:value=>{
        if (!safeStorage.isEncryptionAvailable() || (process.platform==='linux' && safeStorage.getSelectedStorageBackend()==='basic_text'))
          throw new Error('Windows güvenli anahtar saklama kullanılamıyor. Bağlantı ayarı kaydedilemedi.');
        return safeStorage.encryptString(value).toString('base64');
      },
      decrypt:value=>safeStorage.decryptString(Buffer.from(value,'base64'))
    };
    store=new Store(directory,cipher);
    store.backup();
    sync=new Sync(store);
    const trusted=event=>{if(event.sender!==window?.webContents || event.senderFrame?.url!==pageURL)throw new Error('Yetkisiz pencere.');};
    ipcMain.on('pos:snapshot',event=>{try {trusted(event);event.returnValue={ok:true,data:store.snapshot()};}catch {event.returnValue={ok:false};}});
    ipcMain.on('pos:write',(event,entries,events)=>{
      try {trusted(event);store.write(entries,events);event.returnValue={ok:true};setImmediate(()=>sync.flush());}
      catch {event.returnValue={ok:false,error:'Kayıt diske yazılamadı. İşlemi sürdürmeyin; disk alanını ve veri klasörünü kontrol edin.'};}
    });
    const handle=(channel,fn)=>ipcMain.handle(channel,async(event,...args)=>{
      trusted(event);return fn(...args);
    });
    handle('pos:settings',()=>store.publicSettings());
    handle('pos:configure',async input=>{
      if(input.endpoint)await sync.probe(input);
      const settings=store.configure(input);setImmediate(()=>sync.flush());return settings;
    });
    handle('pos:status',()=>store.status());
    handle('pos:sync',()=>sync.flush(true));
    handle('pos:backup',async()=>{
      store.backup();
      const result=await dialog.showSaveDialog(window,{title:'Yedeği başka bir diske kaydet',defaultPath:'Aybars-POS-Yedek.sqlite',filters:[{name:'Aybars veritabanı',extensions:['sqlite']}]});
      if(!result.canceled){
        if(path.resolve(result.filePath)===path.join(directory,'aybars.sqlite'))
          throw new Error('Çalışan veritabanının üzerine yedek yazılamaz. Başka bir dosya seçin.');
        // Use a fresh consistent snapshot for the chosen destination.
        const fs=require('node:fs');fs.copyFileSync(store.backup(),result.filePath);
        return true;
      }
      return false;
    });
    handle('pos:open-data',()=>shell.openPath(directory));
    // Desktop works offline; never load remote renderer resources or navigate away.
    session.defaultSession.webRequest.onBeforeRequest((details,callback)=>callback({cancel:/^https?:/.test(details.url)}));
    window=new BrowserWindow({width:1440,height:940,minWidth:1024,minHeight:700,title:'Aybars POS',
      webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
    window.webContents.setWindowOpenHandler(({url})=>url==='about:blank'
      ? {action:'allow',overrideBrowserWindowOptions:{webPreferences:{preload:path.join(__dirname,'print-preload.cjs'),
        nodeIntegration:false,contextIsolation:true,sandbox:true}}} : {action:'deny'});
    window.webContents.on('did-create-window',child=>{
      child.webContents.on('will-navigate',event=>event.preventDefault());
      child.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    });
    window.webContents.on('will-navigate',(event,url)=>{if(url!==pageURL)event.preventDefault();});
    window.webContents.on('will-attach-webview',event=>event.preventDefault());
    window.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
    window.setMenuBarVisibility(false);
    window.loadURL(pageURL);
    interval=setInterval(()=>sync.flush(),15000);
    backupTimer=setInterval(()=>{try{store.backup();}catch{dialog.showErrorBox('Yedek alınamadı','Disk alanını ve veri klasörünü kontrol edin.');}},3600000);
    sync.flush();
  }).catch(()=>{dialog.showErrorBox('Aybars POS açılamadı','Veritabanı veya yedek dosyası açılamadı. Veri klasörünü silmeyin; disk alanını ve izinleri kontrol edin.');app.quit();});
  app.on('window-all-closed',()=>app.quit());
  app.on('will-quit',()=>{clearInterval(interval);clearInterval(backupTimer);if(store){try{store.backup();}finally{store.close();}}});
}
