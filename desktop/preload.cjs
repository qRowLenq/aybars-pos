const {contextBridge, ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('aybarsDesktop', {
  snapshot:()=>ipcRenderer.sendSync('pos:snapshot'),
  write:(entries,events)=>ipcRenderer.sendSync('pos:write',entries,events),
  settings:()=>ipcRenderer.invoke('pos:settings'),
  configure:input=>ipcRenderer.invoke('pos:configure',input),
  status:()=>ipcRenderer.invoke('pos:status'),
  sync:()=>ipcRenderer.invoke('pos:sync'),
  backup:()=>ipcRenderer.invoke('pos:backup'),
  openData:()=>ipcRenderer.invoke('pos:open-data')
});
