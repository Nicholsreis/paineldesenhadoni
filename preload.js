const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {

  // Imprime comprovante direto na impressora padrão (sem diálogo)
  printTicket: (html) => ipcRenderer.invoke('print-ticket', html),

  // Consulta status atual do papel
  getPaperStatus: () => ipcRenderer.invoke('get-paper-status'),

  // Lista portas seriais disponíveis (para diagnóstico no Admin)
  getPrinterPorts: () => ipcRenderer.invoke('get-printer-ports'),

  // Escuta mudanças de status do papel em tempo real
  onPaperStatusChange: (callback) => {
    ipcRenderer.on('printer-paper-status', (_event, status) => callback(status));
  },

  // Remove listener de status do papel
  offPaperStatusChange: () => {
    ipcRenderer.removeAllListeners('printer-paper-status');
  },

  // Verifica se está rodando no Electron
  isElectron: true,
});
