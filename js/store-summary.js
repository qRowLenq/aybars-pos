// Shared by the cloud API and the live register. Dates follow the store's Istanbul day.
function aybarsStoreSummary(state, now = new Date()) {
 const list = key => { try { const value = JSON.parse(state?.[key] || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };
 const products = list('ps_products'), sales = list('ps_sales_history');
 const parts = new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const part = type => parts.find(p => p.type === type).value;
 const day = `${part('year')}-${part('month')}-${part('day')}`;
 const dateKey = value => {
  const text = String(value || '').trim();
  const tr = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  return tr ? `${tr[3]}-${tr[2].padStart(2,'0')}-${tr[1].padStart(2,'0')}` : text.slice(0,10);
 };
 const todaySales = sales.filter(row => dateKey(row.date) === day);
 const refunds = todaySales.filter(row => row.isRefund || Number(row.total) < 0);
 return {products:products.length,critical:products.filter(p=>Number(p.stock)<=2).length,
  sales:sales.slice(0,30),expenses:list('ps_expenses').length,
  today:{day,total:todaySales.reduce((n,row)=>n+(Number(row.total)||0),0),
   count:todaySales.length-refunds.length,refundCount:refunds.length}};
}
