const { validateEndpoint } = require('./store.cjs');

async function request(endpoint, body, transport = fetch) {
  validateEndpoint(endpoint);
  const response = await transport(endpoint, { method: 'POST', redirect: 'follow',
    headers: {'Content-Type':'application/json'}, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`E-Tablo HTTP ${response.status}; kayıt yerelde bekliyor.`);
  let result;
  try {result = await response.json();} catch {throw new Error('E-Tablo yanıtı doğrulanamadı. Apps Script dağıtım izinlerini kontrol edin.');}
  return result;
}

class Sync {
  constructor(store, transport = fetch) {this.store=store;this.transport=transport;this.running=false;}
  async probe(settings) {
    const current=this.store.settings();
    const endpoint=validateEndpoint(settings.endpoint);
    const result=await request(endpoint,{action:'pos_probe',storeId:current.storeId,apiKey:settings.apiKey || current.apiKey},this.transport);
    if (result.status!=='success' || result.protocol!=='aybars-desktop-v1' || result.storeId!==current.storeId) {
      throw new Error('Bağlantı doğrulanamadı. Bu mağazanın Code.gs dosyasını ve POS_STORE_ID / POS_API_KEY ayarlarını kontrol edin.');
    }
    return true;
  }
  async flush(force = false) {
    if (this.running) return this.store.status();
    const settings=this.store.settings();
    if (!settings.endpoint || !settings.apiKey) return this.store.status();
    this.running=true;
    try {
      let count=0, row;
      while (count++ < 25 && (row=this.store.next())) {
        if (!force && (row.status==='blocked' || row.retry_at>Date.now())) break;
        try {
          const result=await request(settings.endpoint,{...JSON.parse(row.payload),eventId:row.id,
            storeId:settings.storeId,apiKey:settings.apiKey},this.transport);
          if (result.status!=='success' || result.eventId!==row.id || result.storeId!==settings.storeId || result.protocol!=='aybars-desktop-v1') {
            const blocked = result.code==='uncertain' || result.code==='auth' || result.status==='success';
            this.store.failed(row,blocked,'Aktarım doğrulanamadı. Mağaza bağlantısı veya Apps Script kaydı kontrol edilmeli.');
            break;
          }
          this.store.acknowledge(row.id);
        } catch {
          // Do not expose server responses, tokens, payloads, or URL details in logs/UI.
          this.store.failed(row,false,'E-Tabloya ulaşılamadı; kayıt bilgisayarda bekliyor.');
          break;
        }
      }
    } finally {this.running=false;}
    return this.store.status();
  }
}
module.exports = {Sync, request};
