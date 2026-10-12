const { DatabaseSync } = require('node:sqlite');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function validateEndpoint(value) {
  if (!value) return '';
  let u;
  try {u=new URL(value);}catch{throw new Error('Geçerli bir Apps Script web uygulaması adresi girin.');}
  if (u.protocol !== 'https:' || u.hostname !== 'script.google.com' || u.port || u.username || u.password ||
      !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u.pathname) || u.search || u.hash) {
    throw new Error('Google Apps Script web uygulamasının https://script.google.com/macros/s/…/exec adresini girin.');
  }
  return u.href;
}

class Store {
  constructor(directory, crypto = { encrypt: v => v, decrypt: v => v }) {
    fs.mkdirSync(directory, { recursive: true });
    this.directory = directory;
    this.crypto = crypto;
    this.db = new DatabaseSync(path.join(directory, 'aybars.sqlite'));
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS outbox (id TEXT PRIMARY KEY, payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
        retry_at INTEGER NOT NULL DEFAULT 0, error TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
    this.db.prepare('INSERT OR IGNORE INTO settings VALUES (?, ?)').run('storeId', randomUUID());
    this.db.prepare('INSERT OR IGNORE INTO settings VALUES (?, ?)').run('storeName', 'Petshop');
  }
  snapshot() { return Object.fromEntries(this.db.prepare('SELECT key, value FROM state').all().map(r => [r.key, r.value])); }
  write(entries, events = []) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const set = this.db.prepare('INSERT INTO state VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
      const del = this.db.prepare('DELETE FROM state WHERE key=?');
      for (const [key, value] of Object.entries(entries)) {
        if (!key.startsWith('ps_')) throw new Error('Geçersiz kayıt anahtarı.');
        if (value === null) del.run(key); else set.run(key, String(value));
      }
      for (const payload of events) this.db.prepare('INSERT INTO outbox (id,payload,created_at) VALUES (?,?,?)')
        .run(randomUUID(), JSON.stringify(payload), new Date().toISOString());
      this.db.exec('COMMIT');
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  settings() {
    const s = Object.fromEntries(this.db.prepare('SELECT key,value FROM settings').all().map(r => [r.key, r.value]));
    if (s.apiKey) {
      try {s.apiKey=this.crypto.decrypt(s.apiKey);}
      catch {s.apiKey='';s.credentialUnavailable=true;}
    }
    return s;
  }
  publicSettings() { const { apiKey, ...s } = this.settings(); return { ...s, hasApiKey: !!apiKey }; }
  configure(input) {
    const old = this.settings();
    const endpoint = validateEndpoint(String(input.endpoint || '').trim());
    const apiKey = input.apiKey ? String(input.apiKey) : (old.apiKey || '');
    if (endpoint && apiKey.length < 24) throw new Error('Bağlantı anahtarı en az 24 karakter olmalıdır.');
    if (this.status().pending && old.endpoint && endpoint !== old.endpoint) {
      throw new Error('Bekleyen kayıtlar varken tablo bağlantısı değiştirilemez. Önce mevcut tabloya aktarımı tamamlayın.');
    }
    const name = String(input.storeName || '').trim();
    if (!name || name.length > 100) throw new Error('Mağaza adı 1–100 karakter olmalıdır.');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const q = this.db.prepare('INSERT INTO settings VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
      q.run('storeName', name); q.run('endpoint', endpoint);
      q.run('apiKey', apiKey ? this.crypto.encrypt(apiKey) : '');
      this.db.exec('COMMIT');
    } catch (e) {this.db.exec('ROLLBACK'); throw e;}
    return this.publicSettings();
  }
  next() { return this.db.prepare('SELECT * FROM outbox ORDER BY rowid LIMIT 1').get(); }
  acknowledge(id) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('DELETE FROM outbox WHERE id=?').run(id);
      this.db.prepare('INSERT INTO meta VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
        .run('lastSync', new Date().toISOString());
      this.db.exec('COMMIT');
    } catch (e) {this.db.exec('ROLLBACK'); throw e;}
  }
  failed(row, blocked, message) {
    const delay = Math.min(300000, 5000 * 2 ** Math.min(row.attempts, 6));
    this.db.prepare('UPDATE outbox SET status=?,attempts=attempts+1,retry_at=?,error=? WHERE id=?')
      .run(blocked ? 'blocked' : 'pending', Date.now()+delay, message, row.id);
  }
  status() {
    const pending = this.db.prepare('SELECT count(*) AS n FROM outbox').get().n;
    const first = this.next();
    return { pending, blocked: first?.status === 'blocked', error: first?.error || '',
      configured: !!this.settings().endpoint && !!this.settings().apiKey,
      lastSync: this.db.prepare("SELECT value FROM meta WHERE key='lastSync'").get()?.value || '' };
  }
  backup() {
    const folder = path.join(this.directory, 'backups');
    fs.mkdirSync(folder, {recursive:true});
    const target = path.join(folder, `aybars-${new Date().toISOString().replace(/[:.]/g,'-')}-${randomUUID().slice(0,8)}.sqlite`);
    // VACUUM INTO produces a consistent standalone database, including the outbox.
    this.db.prepare('VACUUM INTO ?').run(target);
    const files = fs.readdirSync(folder).filter(n=>/^aybars-.*\.sqlite$/.test(n)).sort();
    for (const name of files.slice(0,-30)) fs.unlinkSync(path.join(folder,name));
    return target;
  }
  close() {this.db.close();}
}
module.exports = { Store, validateEndpoint };
