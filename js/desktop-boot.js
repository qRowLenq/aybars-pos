/* Installed POS stores application keys in SQLite; the web demo keeps browser storage. */
(() => {
  if (!window.aybarsDesktop) return;
  const initial = window.aybarsDesktop.snapshot();
  if (!initial.ok) throw new Error('Yerel veritabanı açılamadı.');
  let values=initial.data, depth=0, entries={}, events=[];
  function commit() {
    if (depth || (!Object.keys(entries).length && !events.length)) return;
    const result=window.aybarsDesktop.write(entries,events);
    if (!result.ok) {
      document.addEventListener('DOMContentLoaded',()=>document.body.inert=true,{once:true});
      if(document.body)document.body.inert=true;
      alert(result.error || 'Yerel kayıt başarısız. Uygulamayı kapatıp disk alanını kontrol edin.');
      throw new Error('Yerel kayıt başarısız.');
    }
    entries={};events=[];
  }
  const storage={
    getItem:key=>Object.hasOwn(values,String(key)) ? values[String(key)] : null,
    setItem(key,value){key=String(key);value=String(value);values[key]=value;entries[key]=value;commit();},
    removeItem(key){key=String(key);delete values[key];entries[key]=null;commit();},
    key:index=>Object.keys(values)[index] ?? null,
    get length(){return Object.keys(values).length;},
    clear(){throw new Error('Tüm yerel kayıtlar bu yöntemle silinemez.');}
  };
  Object.defineProperty(window,'localStorage',{value:storage});
  window.desktopStorage={
    transaction(fn){
      const before={values:{...values},entries:{...entries},events:[...events]};
      depth++;
      try {const result=fn();depth--;commit();return result;}
      catch(e){if(depth>0)depth--;values=before.values;entries=before.entries;events=before.events;throw e;}
    },
    enqueue(payload){events.push(JSON.parse(JSON.stringify(payload)));commit();}
  };
  window.desktopStorage.transaction(()=>{
    if(storage.getItem('ps_local_initialized'))return;
    for(const name of ['products','suppliers','customers','orders','platform_pending','delivered_orders',
      'sales_history','expenses','deficits','held_carts','bundles','waste_records','daily_closes'])storage.setItem('ps_'+name,'[]');
    storage.setItem('ps_catalog_version','2026_09_v27_cleaned_375_urun');
    storage.setItem('ps_local_initialized','1');
  });
})();
