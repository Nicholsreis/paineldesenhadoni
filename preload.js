const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {

  // Imprime comprovante direto na impressora padrão (sem diálogo)
  // Aceita objeto { ticket, state } para ESC/POS raw
  printTicket: (data) => ipcRenderer.invoke('print-ticket', data),

  // Consulta status atual do papel
  getPaperStatus: () => ipcRenderer.invoke('get-paper-status'),

  // Reset paper status (quando usuário confirma que papel foi reposto)
  resetPaperStatus: () => ipcRenderer.invoke('reset-paper-status'),

  // Verifica status da impressora via WMI (Windows Management Instrumentation)
  checkPrinterWMI: () => ipcRenderer.invoke('check-printer-wmi'),

  // Diagnóstico completo: Win32_Printer + fila de jobs (para debug)
  diagnosePrinter: () => ipcRenderer.invoke('diagnose-printer'),

  // Lista portas seriais disponíveis (para diagnóstico no Admin)
  getPrinterPorts: () => ipcRenderer.invoke('get-printer-ports'),

  // Configuração de porta da impressora
  setPrinterPort:    (port) => ipcRenderer.invoke('set-printer-port', port),
  getPrinterPort:    ()     => ipcRenderer.invoke('get-printer-port'),
  listPrinterPorts:  ()     => ipcRenderer.invoke('list-printer-ports'),

  // Escuta mudanças de status do papel em tempo real
  onPaperStatusChange: (callback) => {
    ipcRenderer.on('printer-paper-status', (_event, status) => callback(status));
  },

  // Remove listener de status do papel
  offPaperStatusChange: () => {
    ipcRenderer.removeAllListeners('printer-paper-status');
  },

  // Controle de fullscreen
  setFullscreen: (enable) => ipcRenderer.invoke('set-fullscreen', enable),
  isFullscreen: () => ipcRenderer.invoke('is-fullscreen'),

  // Mídias locais (pasta media/)
  listMediaFiles:   ()         => ipcRenderer.invoke('list-media-files'),
  importMediaFile:  ()         => ipcRenderer.invoke('import-media-file'),
  selectMediaFolder: ()        => ipcRenderer.invoke('select-media-folder'),
  deleteMediaFile:  (filename) => ipcRenderer.invoke('delete-media-file', filename),
  getBellUrl:       ()         => ipcRenderer.invoke('get-bell-url'),
  getBellBase64:    ()         => ipcRenderer.invoke('get-bell-base64'),

  // IP local para QR Code do operador mobile
  getLocalIp:        () =>         ipcRenderer.invoke('get-local-ip'),
  generateQrCode:    (text) =>     ipcRenderer.invoke('generate-qrcode', text),
  saveStationConfig: (config) =>   ipcRenderer.invoke('save-station-config', config),
  getStationConfig:  () =>         ipcRenderer.invoke('get-station-config'),

  // Verifica se está rodando no Electron
  isElectron: true,
});
