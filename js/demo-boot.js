/* This copy is an offline demo. All application keys have their own namespace. */
window.BLUEPETSHOP_DEMO = true;
(() => {
  const prefix = 'aybars_pos_demo_v1:';
  const original = {};
  for (const method of ['getItem', 'setItem', 'removeItem']) {
    original[method] = Storage.prototype[method];
    Storage.prototype[method] = function(key, ...args) {
      return original[method].call(this, String(key).startsWith('ps_') ? prefix + key : key, ...args);
    };
  }
  window.resetBlueDemo = () => {
    if (!confirm('Yalnızca bu demodaki denemeler silinecek. Baştan başlansın mı?')) return;
    for (const key of Object.keys(localStorage)) if (key.startsWith(prefix)) original.removeItem.call(localStorage, key);
    location.reload();
  };
  window.seedBlueDemo = () => {
    if (localStorage.getItem('ps_demo_seeded')) return;
    const demoProducts = window.catalogProducts.map((p, i) => ({...p, stock: i % 9 === 0 ? 2 : 8 + i % 24, batches: []}));
    window.catalogProducts = demoProducts;
    window.catalogDatabase = {categories: window.catalogDatabase.categories, products: demoProducts, suppliers: [], customers: [], salesHistory: [], expenses: []};
    localStorage.setItem('ps_products', JSON.stringify(demoProducts));
    localStorage.setItem('ps_catalog_version', '2026_09_v27_cleaned_375_urun');
    for (const key of ['suppliers','customers','orders','platform_pending','delivered_orders','sales_history','expenses','deficits','held_carts','bundles','waste_records','daily_closes']) localStorage.setItem('ps_' + key, '[]');
    localStorage.setItem('ps_demo_seeded', '1');
  };
})();
