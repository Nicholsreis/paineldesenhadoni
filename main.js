const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Tenta importar serialport (opcional)
let SerialPort;
try {
  ({ SerialPort } = require('serialport'));
} catch (e) {
  console.warn('[SerialPort] Módulo não disponível:', e.message);
}

// =========================================================
// Estado global
// =========================================================
const PRINTER_BAUD_RATE = 9600;
let printerPort  = null;
let paperStatus  = 'ok'; // 'ok' | 'near' | 'out'
let mainWindow   = null;
let printWindow  = null;

// =========================================================
// Janela oculta de impressão — sem diálogo
// =========================================================
function createPrintWindow() {
  printWindow = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  printWindow.on('closed', () => { printWindow = null; });
}

// =========================================================
// IPC — imprime HTML direto na impressora padrão
// =========================================================
ipcMain.handle('print-ticket', (_event, html) => {
  return new Promise((resolve) => {
    if (!printWindow || printWindow.isDestroyed()) createPrintWindow();

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    printWindow.webContents.once('did-finish-load', async () => {
      // Mede a altura real do conteúdo em pixels e converte para micrômetros
      const contentHeightPx = await printWindow.webContents.executeJavaScript(
        'document.body.scrollHeight'
      );
      // 1px ≈ 264.583 micrômetros (96dpi → mm → µm)
      const heightMicrons = Math.max(352, Math.ceil(contentHeightPx * 264.583));

      printWindow.webContents.print(
        {
          silent:          true,
          printBackground: true,
          deviceName:      '',
          pageSize:        { width: 80000, height: heightMicrons },
          margins:         { marginType: 'none' },
          scaleFactor:     100,
        },
        (success, errorType) => {
          if (!success) console.error('[Print] Erro:', errorType);
          resolve({ success, errorType: errorType || null });
        }
      );
    });
  });
});

// =========================================================
// IPC — status do papel e portas seriais
// =========================================================
ipcMain.handle('get-paper-status', () => paperStatus);

ipcMain.handle('get-printer-ports', async () => {
  if (!SerialPort) return [];
  const ports = await SerialPort.list();
  return ports.map(p => ({ path: p.path, manufacturer: p.manufacturer, vendorId: p.vendorId }));
});

// =========================================================
// Detecta porta serial da K80 automaticamente
// =========================================================
async function findPrinterPort() {
  if (!SerialPort) return null;
  try {
    const ports = await SerialPort.list();
    console.log('[Printer] Portas:', ports.map(p => p.path));
    const found = ports.find(p =>
      (p.vendorId && p.vendorId.toLowerCase() === '0dd4') ||
      (p.manufacturer && p.manufacturer.toLowerCase().includes('custom'))
    );
    return found ? found.path : null;
  } catch (e) {
    console.error('[Printer] Erro ao listar portas:', e.message);
    return null;
  }
}

// =========================================================
// Polling ESC/POS de status de papel (a cada 5s)
// =========================================================
function startPaperPolling() {
  if (!printerPort || !printerPort.isOpen) return;

  const STATUS_CMD   = Buffer.from([0x10, 0x04, 0x04]);
  let responseBuffer = Buffer.alloc(0);

  printerPort.on('data', (data) => {
    responseBuffer = Buffer.concat([responseBuffer, data]);
    if (responseBuffer.length < 1) return;
    const byte    = responseBuffer[0];
    responseBuffer = Buffer.alloc(0);

    const newStatus = (byte & 0x08) ? 'out' : (byte & 0x04) ? 'near' : 'ok';
    if (newStatus !== paperStatus) {
      paperStatus = newStatus;
      console.log('[Printer] Papel:', paperStatus);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('printer-paper-status', paperStatus);
      }
    }
  });

  const poll = setInterval(() => {
    if (!printerPort || !printerPort.isOpen) { clearInterval(poll); return; }
    printerPort.write(STATUS_CMD, (err) => {
      if (err) console.error('[Printer] Erro status:', err.message);
    });
  }, 5000);

  printerPort.write(STATUS_CMD);
}

// =========================================================
// Conecta à impressora com reconexão automática
// =========================================================
async function connectPrinter() {
  if (!SerialPort) return;

  const portPath = await findPrinterPort();
  if (!portPath) {
    console.warn('[Printer] Não encontrada. Tentando em 10s...');
    setTimeout(connectPrinter, 10000);
    return;
  }

  printerPort = new SerialPort({ path: portPath, baudRate: PRINTER_BAUD_RATE, autoOpen: false });

  printerPort.open((err) => {
    if (err) { console.error('[Printer] Erro ao abrir:', err.message); setTimeout(connectPrinter, 10000); return; }
    console.log('[Printer] Conectado em', portPath);
    startPaperPolling();
  });

  printerPort.on('error', () => { printerPort = null; setTimeout(connectPrinter, 10000); });
  printerPort.on('close', () => { printerPort = null; setTimeout(connectPrinter, 5000); });
}

// =========================================================
// Janela principal
// =========================================================
function createWindow() {
  const modeArg = process.argv.find(a => a.startsWith('--mode='));
  const mode    = modeArg ? modeArg.split('=')[1] : null;

  const cfg = {
    width: 1280, height: 800,
    backgroundColor: '#f8fafc',
    title: 'BALCÃO — Sistema de Senhas',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
  };

  if (mode === 'totem' || mode === 'painel') {
    cfg.fullscreen = true; cfg.kiosk = true; cfg.frame = false; cfg.alwaysOnTop = true;
  }

  mainWindow = new BrowserWindow(cfg);

  const url = mode
    ? `file://${path.join(__dirname, 'index.html')}?mode=${mode}`
    : `file://${path.join(__dirname, 'index.html')}`;

  mainWindow.loadURL(url);

  if (process.argv.includes('--dev')) mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => { mainWindow = null; });
}

// =========================================================
// Lifecycle
// =========================================================
app.whenReady().then(() => { createWindow(); connectPrinter(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
