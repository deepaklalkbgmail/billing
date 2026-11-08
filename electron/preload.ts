import { contextBridge, ipcRenderer } from 'electron';

export interface PrintReceiptOptions {
  deviceName?: string;
  silent?: boolean;
}

export interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  getPrinters: () => Promise<any[]>;
  printReceipt: (options?: PrintReceiptOptions) => Promise<{ success: boolean; error?: string }>;
  printSilentBill: (htmlContent: string, printerName?: string) => Promise<{ success: boolean; error?: string }>;
  getAppVersion: () => Promise<string>;
}

const electronAPI: ElectronAPI = {
  isElectron: true,
  platform: process.platform,
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printReceipt: (options) => ipcRenderer.invoke('print-receipt', options || {}),
  printSilentBill: (htmlContent, printerName) => ipcRenderer.invoke('print-silent-bill', htmlContent, printerName),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
