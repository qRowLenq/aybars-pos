(() => {
  const money = value => new Intl.NumberFormat('tr-TR', {style:'currency', currency:'TRY'}).format(value);
  function refreshSummary() {
    const today = nowDate();
    const sales = (window.salesHistory || []).filter(s => s.date === today);
    const total = sales.reduce((n,s) => n + (Number(s.total) || 0), 0);
    const values = [money(total), String(sales.length), String((window.products || []).filter(p => Number(p.stock) <= 2).length), String((window.products || []).length)];
    document.querySelectorAll('[data-demo-stat]').forEach((el,i) => el.textContent = values[i]);
  }
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.header-brand').innerHTML = '<span class="blue-logo">b.</span><div>aybars pos<small>Mağaza yönetimi</small></div>';
    const area = document.querySelector('.catalog-area');
    const intro = document.createElement('div');
    intro.className = 'demo-intro';
    intro.innerHTML = '<div><span class="demo-eyebrow">AYBARS POS / KASA</span><h1>İşlerin kontrolü sende.</h1><p>Ürününü bul, sepete ekle ve satışı tamamla.</p></div><span class="demo-date"></span>';
    intro.querySelector('.demo-date').textContent = new Date().toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'});
    const summary = document.createElement('div');
    summary.className = 'demo-summary';
    ['Bugünkü satış tutarı','Bugünkü işlem','Kritik stok','Katalogdaki ürün'].forEach((label,i) => {
      const card = document.createElement('button');
      card.className = 'demo-stat';
      card.innerHTML = `<span>${label}</span><strong data-demo-stat="${i}">0</strong><small>${i < 2 ? 'Satışlarını takip et ↗' : 'Stok ekranını aç ↗'}</small>`;
      card.onclick = () => i < 2 ? openSalesHistory() : switchTab('inventory');
      summary.appendChild(card);
    });
    area.prepend(summary); area.prepend(intro);
    const notice = document.createElement('div'); notice.className='demo-notice';
    notice.innerHTML='<span><b>DEMO SÜRÜMÜ</b> · Örnek stoklarla deneyebilirsin. İşlemler yalnızca bu tarayıcıda saklanır.</span><button class="btn btn-sm" onclick="resetBlueDemo()">Demoyu yeniden başlat ↻</button>';
    document.querySelector('.app-header').after(notice);
    document.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !document.querySelector('dialog[open]')) {
        event.preventDefault(); switchTab('pos'); document.getElementById('catalogSearch').focus();
      }
    });
    document.getElementById('catalogSearch').placeholder='Ürün veya barkod ara… (Ctrl+K)';
    const observer = new MutationObserver(refreshSummary);
    observer.observe(document.getElementById('posRecentSalesList'), {childList:true});
    observer.observe(document.getElementById('productGrid'), {childList:true});
    refreshSummary();
  });
})();
