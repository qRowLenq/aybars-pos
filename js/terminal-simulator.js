/* Replace this adapter when a verified device/provider is selected. No endpoints. */
(function(root){root.BlueTerminalSimulator={
 name:'POS Simülasyonu',
 create({id,amount,currency,items}){if(!id||!Number.isInteger(amount)||amount<=0||currency!=='TRY')throw Error('Geçersiz terminal isteği.');return {id,amount,currency,items:JSON.parse(JSON.stringify(items)),status:'sending',connected:true,decision:null,events:[]};},
 waiting(r){if(r.status==='sending')r.status='waiting';},
 decide(r,result,{deliver=true}={}){if(!['approved','rejected','cancelled'].includes(result))throw Error('Geçersiz benzetim sonucu.');if(r.decision&&r.decision!==result)throw Error('Terminalin kesin sonucu değiştirilemez.');r.decision=result;return deliver&&r.connected?this.query(r):null;},
 disconnect(r){r.connected=false;r.status='unknown';},
 query(r){if(!r.connected)return {requestId:r.id,amount:r.amount,currency:r.currency,status:'unknown'};return {requestId:r.id,amount:r.amount,currency:r.currency,status:r.decision||'unknown',provider:'SIMULATOR'};}
 };})(typeof window!=='undefined'?window:globalThis);
