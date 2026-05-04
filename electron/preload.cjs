const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  platform: process.platform,
  printTicket: () => ipcRenderer.invoke('print-ticket'),
})
