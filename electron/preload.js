const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = {
  isElectron: true,
  platform: process.platform,
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printReceipt: (options) => ipcRenderer.invoke('print-receipt', options || {}),
  printSilentBill: (htmlContent, printerName) => ipcRenderer.invoke('print-silent-bill', htmlContent, printerName),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
