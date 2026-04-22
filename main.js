const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs   = require('fs');
const { execFile, exec } = require('child_process');

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

// Pasta de mídias locais — ao lado do executável (fora do .asar, gravável)
// Em produção: pasta media/ ao lado do .exe
// Em dev: pasta media/ na raiz do projeto
function getMediaDir() {
  if (app.isPackaged) {
    // app.getPath('exe') = caminho do .exe; dirname = pasta onde está o .exe
    return path.join(path.dirname(app.getPath('exe')), 'media');
  }
  return path.join(__dirname, 'media');
}
// Inicializado após app.whenReady
let MEDIA_DIR = path.join(__dirname, 'media');

// =========================================================
// Porta configurada manualmente — persiste em arquivo
// =========================================================
// Arquivo de config da impressora — ao lado do executável (gravável)
function getPrinterConfigFile() {
  if (app.isPackaged) {
    return path.join(path.dirname(app.getPath('exe')), 'printer-config.json');
  }
  return path.join(__dirname, 'printer-config.json');
}
const PRINTER_CONFIG_FILE = path.join(__dirname, 'printer-config.json'); // fallback dev

function loadPrinterConfig() {
  const configFile = getPrinterConfigFile();
  try {
    if (fs.existsSync(configFile)) {
      const data = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      configuredPrinterPort = (data.port || '').trim();
      if (configuredPrinterPort) {
        console.log('[Printer] Porta carregada do arquivo:', configuredPrinterPort);
      }
    }
  } catch (e) {
    console.warn('[Printer] Erro ao carregar config:', e.message);
  }
}

let configuredPrinterPort = '';

function setConfiguredPrinterPort(port) {
  const newPort = (port || '').trim();
  if (newPort === configuredPrinterPort) return;
  configuredPrinterPort = newPort;
  console.log('[Printer] Porta configurada:', configuredPrinterPort || '(detecção automática)');
  try {
    fs.writeFileSync(getPrinterConfigFile(), JSON.stringify({ port: configuredPrinterPort }), 'utf8');
  } catch (e) {
    console.warn('[Printer] Erro ao salvar config:', e.message);
  }
}

// =========================================================
// Envia buffer ESC/POS bruto para a impressora
// Ordem de tentativa:
//   1. Porta serial aberta (SerialPort)
//   2. Porta configurada manualmente (configuredPrinterPort)
//   3. Detecção automática via WMI (fallback)
// =========================================================
function sendRawToPrinter(buffer, retryCount = 0) {
  const MAX_RETRIES = 2;

  // 1. Porta serial aberta
  if (printerPort && printerPort.isOpen) {
    console.log('[PrintRaw] Usando porta serial:', printerPort.path);
    printerPort.write(buffer, (err) => {
      if (err) {
        console.error('[PrintRaw] Erro serial:', err.message);
        if (retryCount < MAX_RETRIES - 1) setTimeout(() => sendRawToPrinter(buffer, retryCount + 1), 500);
      } else {
        console.log('[PrintRaw] ✓ Enviado via serial');
      }
    });
    return;
  }

  // 2. Porta configurada manualmente
  if (configuredPrinterPort) {
    console.log('[PrintRaw] Usando porta configurada:', configuredPrinterPort);
    sendViaPort(buffer, configuredPrinterPort, retryCount, MAX_RETRIES);
    return;
  }

  // 3. Detecção automática via WMI
  console.log('[PrintRaw] Detectando porta automaticamente via WMI...');
  const psGetPort = `$p = Get-CimInstance -ClassName Win32_Printer | Where-Object { $_.Default -eq $true } | Select-Object -First 1; if ($p) { Write-Output $p.PortName } else { Write-Output 'not-found' }`;
  exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psGetPort}"`, (err, stdout) => {
    if (err || !stdout.trim() || stdout.trim() === 'not-found') {
      console.error('[PrintRaw] Porta não detectada automaticamente');
      if (retryCount < MAX_RETRIES - 1) setTimeout(() => sendRawToPrinter(buffer, retryCount + 1), 1000);
      return;
    }
    const port = stdout.trim();
    console.log('[PrintRaw] Porta detectada automaticamente:', port);
    sendViaPort(buffer, port, retryCount, MAX_RETRIES);
  });
}

// Envia buffer para uma porta específica via copy /b (USB/LPT/TMUSB) ou mode+copy (COM)
function sendViaPort(buffer, port, retryCount, MAX_RETRIES) {
  try {
    const tmpFile = path.join(app.getPath('temp'), `print_job_${Date.now()}.bin`);
    fs.writeFileSync(tmpFile, buffer);

    let cmd = '';
    if (port.startsWith('COM')) {
      cmd = `mode ${port} baud=9600 parity=n data=8 stop=1 && copy /b "${tmpFile}" ${port}`;
    } else {
      // USB, LPT, TMUSB, WSD, etc.
      cmd = `copy /b "${tmpFile}" ${port}`;
    }

    console.log('[PrintRaw] Executando:', cmd);
    exec(cmd, { shell: 'cmd.exe' }, (err) => {
      if (err) {
        console.error('[PrintRaw] Erro ao enviar para', port, ':', err.message);
        if (retryCount < MAX_RETRIES - 1) setTimeout(() => sendViaPort(buffer, port, retryCount + 1, MAX_RETRIES), 800);
      } else {
        console.log('[PrintRaw] ✓ Enviado com sucesso para', port);
      }
      setTimeout(() => { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); }, 5000);
    });
  } catch (e) {
    console.error('[PrintRaw] Erro fatal:', e.message);
  }
}

// =========================================================
// Funções ESC/POS mantidas para referência futura
// (não usadas na impressão principal — usamos webContents.print())
// =========================================================
function sendCutCommand() {
  const CUT_CMD = Buffer.from([0x1D, 0x56, 0x00]);
  sendRawToPrinter(CUT_CMD);
}

function escposText(str) {
  return Buffer.from(
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x00-\x7F]/g, '?'),
    'ascii'
  );
}

// =========================================================
// Janela oculta de impressão — sem diálogo
// Largura = 302px ≈ 80mm @ 96dpi para layout correto do comprovante
// =========================================================
function createPrintWindow() {
  printWindow = new BrowserWindow({
    show:   false,
    width:  302,   // 80mm @ 96dpi
    height: 600,   // altura inicial — será ignorada pelo pageSize dinâmico
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  printWindow.on('closed', () => { printWindow = null; });
}

// =========================================================
// IPC — imprime HTML direto na impressora padrão
// =========================================================
// =========================================================
// Monitora fila de impressão do Windows após submissão do job
// Detecta jobs com erro/pausa que indicam falta de papel
// Retorna: 'ok' | 'error' | 'timeout'
//
// JobStatus é um bitmask Win32 (DWORD):
//   0x0001 = Paused         0x0002 = Error
//   0x0004 = Deleting       0x0008 = Printing
//   0x0010 = Offline        0x0020 = PaperOut
//   0x0040 = Printed        0x0080 = Deleted
//   0x0100 = Blocked        0x0200 = UserIntervention
//   0x0400 = Restarting     0x1000 = Complete
//   0x2000 = Retained       0x4000 = Rendering locally
// =========================================================
const JOB_STATUS_ERROR_BITS = 
  0x0002 | // Error
  0x0010 | // Offline
  0x0020 | // PaperOut
  0x0100 | // Blocked
  0x0200;  // UserIntervention

function monitorPrintQueue(printerName, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const interval = 800;

    // Captura o snapshot dos job IDs existentes ANTES de começar a monitorar
    // para ignorar jobs antigos que já estavam na fila
    let knownJobIds = null;

    const getJobs = (callback) => {
      const ps = printerName
        ? `Get-PrintJob -PrinterName '${printerName.replace(/'/g, "''")}' -ErrorAction SilentlyContinue | Select-Object -Property Id,JobStatus,DocumentName | ConvertTo-Json -Compress`
        : `Get-Printer -ErrorAction SilentlyContinue | Where-Object { $_.Default -eq $true } | ForEach-Object { Get-PrintJob -PrinterName $_.Name -ErrorAction SilentlyContinue } | Select-Object -Property Id,JobStatus,DocumentName | ConvertTo-Json -Compress`;

      exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${ps.replace(/"/g, '`"')}"`, (err, stdout) => {
        if (err) { callback(null, err); return; }
        const output = stdout.trim();
        if (!output) { callback([], null); return; }
        try {
          const raw = JSON.parse(output);
          callback(Array.isArray(raw) ? raw : [raw], null);
        } catch (e) {
          callback(null, e);
        }
      });
    };

    const check = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= timeoutMs) {
        console.log('[PrintQueue] Timeout monitorando fila — assumindo OK');
        resolve('ok');
        return;
      }

      getJobs((jobs, err) => {
        if (err) {
          console.warn('[PrintQueue] Erro ao verificar fila:', err.message);
          resolve('ok');
          return;
        }

        // Primeira chamada: registra IDs existentes para ignorá-los
        if (knownJobIds === null) {
          knownJobIds = new Set((jobs || []).map(j => j.Id));
          console.log('[PrintQueue] Jobs pré-existentes ignorados:', knownJobIds.size);
          setTimeout(check, interval);
          return;
        }

        // Filtra apenas jobs NOVOS (não estavam na fila antes)
        const newJobs = (jobs || []).filter(j => !knownJobIds.has(j.Id));
        console.log('[PrintQueue] Novos jobs na fila:', newJobs.length, newJobs.map(j => `id=${j.Id} status=${j.JobStatus}`).join(', ') || '(nenhum)');

        if (newJobs.length === 0) {
          // Nenhum job novo ainda — aguarda
          setTimeout(check, interval);
          return;
        }

        // Verifica se algum job novo tem bits de erro
        const hasError = newJobs.some(job => {
          const statusRaw = job.JobStatus;
          // JobStatus pode ser número (bitmask) ou string ("Printing, Retained", "Error", etc.)
          let isError = false;
          if (typeof statusRaw === 'number') {
            isError = (statusRaw & JOB_STATUS_ERROR_BITS) !== 0;
          } else if (typeof statusRaw === 'string') {
            const s = statusRaw.toLowerCase();
            isError = s.includes('error') || s.includes('offline') || s.includes('paperout') ||
                      s.includes('paper out') || s.includes('blocked') || s.includes('intervention') ||
                      s.includes('paused') || s.includes('retained');
          }
          console.log(`[PrintQueue] Job ${job.Id} "${job.DocumentName}": status="${statusRaw}" error=${isError}`);
          return isError;
        });

        if (hasError) {
          console.warn('[PrintQueue] ✗ Job com erro detectado (sem papel ou offline)');
          resolve('error');
          return;
        }

        // Verifica se todos os jobs novos terminaram
        const JOB_DONE_BITS = 0x0040 | 0x0080 | 0x1000;
        const allDone = newJobs.every(job => {
          const statusRaw = job.JobStatus;
          if (typeof statusRaw === 'number') {
            const s = statusRaw;
            return s === 0 || (s & JOB_DONE_BITS) !== 0;
          }
          // String: job sumiu da fila ou está "Printed"/"Deleted"/"Complete"
          const s = (statusRaw || '').toLowerCase();
          return s === '' || s === 'normal' || s.includes('printed') || s.includes('deleted') || s.includes('complete');
        });

        const anyDone = newJobs.some(job => {
          const statusRaw = job.JobStatus;
          if (typeof statusRaw === 'number') return (statusRaw & JOB_DONE_BITS) !== 0;
          const s = (statusRaw || '').toLowerCase();
          return s === 'normal' || s.includes('printed') || s.includes('complete');
        });

        if (allDone && anyDone) {
          console.log('[PrintQueue] ✓ Job concluído com sucesso');
          resolve('ok');
          return;
        }

        // Jobs ainda processando (status=Printing ou 0) — verifica novamente
        setTimeout(check, interval);
      });
    };

    // Snapshot inicial imediato, depois começa a monitorar após 500ms
    getJobs((jobs, err) => {
      if (!err && jobs) {
        knownJobIds = new Set(jobs.map(j => j.Id));
        console.log('[PrintQueue] Snapshot inicial:', knownJobIds.size, 'jobs pré-existentes');
      } else {
        knownJobIds = new Set();
      }
      setTimeout(check, 500);
    });
  });
}

// =========================================================
// Obtém nome da impressora padrão via PowerShell
// =========================================================
function getDefaultPrinterName() {
  return new Promise((resolve) => {
    const ps = `Get-CimInstance -ClassName Win32_Printer | Where-Object { $_.Default -eq $true } | Select-Object -First 1 -ExpandProperty Name`;
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${ps}"`, (err, stdout) => {
      if (err || !stdout.trim()) {
        resolve(null);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

// =========================================================
// Gera buffer ESC/POS para o ticket
// IMPORTANTE: Impressoras térmicas Epson usam encoding CP850/Latin-1
// Não usar Buffer.from(string) sem encoding — usa UTF-8 por padrão
// =========================================================
function escposText(str) {
  // Converte string para Latin-1 (ISO-8859-1) que a Epson entende
  // Substitui caracteres especiais do português
  const normalized = str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^\x00-\x7F]/g, '?'); // substitui não-ASCII por ?
  return Buffer.from(normalized, 'ascii');
}

function generateTicketBuffer(ticket, state) {
  const config = state.config || {};
  const chunks = [];

  // 1. Inicializa (ESC @)
  chunks.push(Buffer.from([0x1B, 0x40]));

  // 2. Alinhamento Central (ESC a 1)
  chunks.push(Buffer.from([0x1B, 0x61, 0x01]));

  // 3. Nome da Unidade
  chunks.push(escposText('\n' + (config.unitName || 'Painel do Ni').toUpperCase() + '\n'));
  chunks.push(escposText((config.sectorName || '').toUpperCase() + '\n\n'));

  // 4. Título da Senha
  chunks.push(escposText('SENHA DE ATENDIMENTO\n'));

  // 5. Número da Senha (Grande: GS ! 0x11)
  chunks.push(Buffer.from([0x1D, 0x21, 0x11])); // Double width/height
  chunks.push(escposText(ticket.ticket || '000'));
  chunks.push(Buffer.from([0x1D, 0x21, 0x00])); // Reset size
  chunks.push(escposText('\n\n'));

  // 6. Tipo de serviço
  const service = state.services ? state.services.find(s => s.id === ticket.serviceId) : null;
  if (service) {
    chunks.push(escposText('TIPO: ' + service.label.toUpperCase() + '\n'));
  }

  // 7. Alinhamento Esquerda (ESC a 0)
  chunks.push(Buffer.from([0x1B, 0x61, 0x00]));

  // 8. Data e Hora
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  chunks.push(escposText('\nData: ' + dateStr + '  Hora: ' + timeStr + '\n'));

  // 9. Mensagem de rodapé
  if (config.footerMessage) {
    chunks.push(escposText('\n' + config.footerMessage + '\n'));
  }

  // 10. Avança papel e corta (GS V 0)
  chunks.push(Buffer.from([0x0A, 0x0A, 0x0A, 0x0A, 0x0A])); // 5x LF
  chunks.push(Buffer.from([0x1D, 0x56, 0x00]));              // GS V 0 = corte parcial

  return Buffer.concat(chunks);
}

// Handler de impressão — usa webContents.print() do Electron com driver Windows
ipcMain.handle('print-ticket', async (_event, data) => {
  console.log('[Print] Handler chamado');
  try {
    const { ticket, state } = data;
    if (!ticket) return { success: false, error: 'ticket ausente' };

    // Só atualiza porta se vier uma porta não-vazia no state
    if (state && state.config && state.config.printerPort) {
      setConfiguredPrinterPort(state.config.printerPort);
    }

    const config = state ? state.config || {} : {};
    const services = state ? state.services || [] : [];
    const service = services.find(s => s.id === ticket.serviceId);
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Monta HTML do comprovante otimizado para 80mm
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    width: 72mm;
    padding: 4mm;
  }
  .center { text-align: center; }
  .big { font-size: 32px; font-weight: bold; margin: 8px 0; }
  .line { border-top: 1px dashed #000; margin: 4px 0; }
  .label { font-size: 10px; color: #555; }
</style>
</head>
<body>
  <div class="center">
    <div style="font-weight:bold;font-size:14px;">${config.unitName || 'Painel do Ni'}</div>
    <div>${config.sectorName || 'Painel de senha do Ni'}</div>
  </div>
  <div class="line"></div>
  <div class="center">
    <div class="label">SENHA DE ATENDIMENTO</div>
    <div class="big">${ticket.ticket}</div>
    <div>${service ? service.label.toUpperCase() : ticket.serviceId}</div>
  </div>
  <div class="line"></div>
  <div>${dateStr} ${timeStr}</div>
  ${config.footerMessage ? `<div class="line"></div><div class="center">${config.footerMessage}</div>` : ''}
</body>
</html>`;

    // Determina nome da impressora para usar com webContents.print()
    let printerName = null;
    if (configuredPrinterPort) {
      // Busca impressora pelo nome da porta
      const printers = await mainWindow.webContents.getPrintersAsync();
      console.log('[Print] Impressoras disponíveis:', printers.map(p => `${p.name} (${p.options?.['printer-make-and-model'] || ''})`).join(', '));
      // Tenta encontrar por porta ou por nome contendo "EPSON" ou "BALCAO"
      const match = printers.find(p =>
        p.name.toUpperCase().includes('EPSON') ||
        p.name.toUpperCase().includes('NI') ||
        p.name.toUpperCase().includes('SENHA') ||
        p.isDefault
      );
      if (match) {
        printerName = match.name;
        console.log('[Print] Usando impressora:', printerName);
      }
    }

    // Cria janela oculta para impressão
    const win = new BrowserWindow({
      show: false,
      width: 302,
      height: 800,
      webPreferences: { contextIsolation: true, nodeIntegration: false },
    });

    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    return new Promise((resolve) => {
      const printOptions = {
        silent: true,
        printBackground: false,
        margins: { marginType: 'none' },
        pageSize: { width: 80000, height: 297000 },
      };
      if (printerName) printOptions.deviceName = printerName;

      win.webContents.print(printOptions, async (success, reason) => {
        win.close();

        if (!success) {
          console.error('[Print] ✗ Driver recusou o job:', reason);
          paperStatus = 'out';
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('printer-paper-status', 'out');
          }
          lastKnownPrinterStatus = 'error';
          startPrinterMonitor();
          resolve({ success: false, error: reason });
          return;
        }

        // Job aceito pelo driver — monitora a fila por até 8s para detectar erro
        console.log('[Print] Job submetido, monitorando fila...');
        // Usa o nome da impressora que foi usada para imprimir
        const monitorName = printerName || null;
        const queueResult = await monitorPrintQueue(monitorName, 8000);

        if (queueResult === 'error') {
          console.warn('[Print] ✗ Job com erro na fila (sem papel ou offline)');
          paperStatus = 'out';
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('printer-paper-status', 'out');
          }
          lastKnownPrinterStatus = 'error';
          startPrinterMonitor();
          resolve({ success: false, error: 'paper-out' });
        } else {
          console.log('[Print] ✓ Impresso com sucesso');
          stopPrinterMonitor();
          lastKnownPrinterStatus = 'ok';
          resolve({ success: true });
        }
      });
    });

  } catch (e) {
    console.error('[Print] Erro no handler:', e.message);
    return { success: false, error: e.message };
  }
});

// Salva porta configurada pelo Admin
ipcMain.handle('set-printer-port', (_event, port) => {
  setConfiguredPrinterPort(port);
  return { success: true };
});

// Retorna porta configurada atualmente
ipcMain.handle('get-printer-port', () => configuredPrinterPort);

// Lista portas disponíveis para o Admin escolher
ipcMain.handle('list-printer-ports', async () => {
  const ports = [];

  // Portas WMI (impressoras Windows)
  await new Promise((resolve) => {
    const ps = `Get-CimInstance -ClassName Win32_Printer | Select-Object Name, PortName, Default | ConvertTo-Json -Compress`;
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${ps}"`, (err, stdout) => {
      if (!err && stdout.trim()) {
        try {
          const raw = JSON.parse(stdout.trim());
          const arr = Array.isArray(raw) ? raw : [raw];
          arr.forEach(p => {
            if (p.PortName) ports.push({ name: p.Name, port: p.PortName, isDefault: p.Default });
          });
        } catch (e) { /* ignora */ }
      }
      resolve();
    });
  });

  // Portas seriais (SerialPort)
  if (SerialPort) {
    try {
      const serialPorts = await SerialPort.list();
      serialPorts.forEach(p => {
        if (!ports.find(x => x.port === p.path)) {
          ports.push({ name: p.friendlyName || p.path, port: p.path, isDefault: false });
        }
      });
    } catch (e) { /* ignora */ }
  }

  return ports;
});

// =========================================================
// Verifica status da impressora via WMI (Windows)
// Retorna: 'ok' | 'error' | 'offline' | 'out-of-paper'
// 
// IMPORTANTE: Impressoras USB térmicas (como Epson) podem não reportar
// status de papel via WMI. Neste caso, usamos o paperStatus global
// que é atualizado quando a impressão falha.
// 
// Windows 11: Usa Get-CimInstance em vez de wmic (deprecado)
// =========================================================
async function checkPrinterStatusWMI() {
  // FALLBACK: Se paperStatus global indica problema, retorna imediatamente
  if (paperStatus === 'out') {
    console.log('[Printer] WMI check: usando paperStatus global (out)');
    return 'out-of-paper';
  }
  if (paperStatus === 'near') {
    console.log('[Printer] WMI check: usando paperStatus global (near)');
    return 'ok';
  }
  
  return new Promise((resolve) => {
    // Se há porta configurada, busca a impressora por porta; senão usa a padrão
    const portFilter = configuredPrinterPort
      ? `Where-Object { $_.PortName -eq '${configuredPrinterPort}' }`
      : `Where-Object { $_.Default -eq $true }`;

    const ps = `
      try {
        $printer = Get-CimInstance -ClassName Win32_Printer | ${portFilter} | Select-Object -First 1
        if ($printer) {
          $status = if ($printer.PrinterStatus) { $printer.PrinterStatus } else { 0 }
          $state = if ($printer.PrinterState) { $printer.PrinterState } else { 0 }
          Write-Output "$status|$state"
        } else {
          Write-Output "not-found"
        }
      } catch {
        Write-Output "error|$($_.Exception.Message)"
      }
    `;

    exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${ps.replace(/"/g, '`"')}"`, (err, stdout, stderr) => {
      if (err) {
        console.warn('[Printer] PowerShell check falhou:', err.message);
        resolve(paperStatus === 'out' ? 'out-of-paper' : 'ok');
        return;
      }

      const output = stdout.trim();
      console.log('[Printer] WMI status:', output);

      if (output === 'not-found') {
        resolve('error');
      } else {
        const [, state] = output.split('|').map(s => parseInt(s));
        if (state === 4) resolve('out-of-paper');
        else if (state === 6) resolve('out-of-paper');
        else if (state === 7) resolve('offline');
        else if (state === 1) resolve('error');
        else if (state === 3) resolve('error');
        else resolve(paperStatus === 'out' ? 'out-of-paper' : 'ok');
      }
    });
  });
}

// =========================================================
// IPC — verifica status da impressora via WMI
// =========================================================
ipcMain.handle('check-printer-wmi', async () => {
  const status = await checkPrinterStatusWMI();
  console.log('[Printer] Status WMI:', status);
  
  // Atualiza paperStatus global
  if (status === 'out-of-paper') {
    paperStatus = 'out';
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('printer-paper-status', 'out');
    }
  } else if (status === 'ok') {
    if (paperStatus === 'out') {
      paperStatus = 'ok';
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('printer-paper-status', 'ok');
      }
    }
  }
  
  return status;
});

// =========================================================
// IPC — status do papel e portas seriais
// =========================================================
ipcMain.handle('get-paper-status', () => paperStatus);

// Diagnóstico: retorna output bruto do Get-PrintJob e Win32_Printer para debug
ipcMain.handle('diagnose-printer', async () => {
  const results = {};

  // 1. Nome e status da impressora padrão via Win32_Printer
  await new Promise((resolve) => {
    const ps = `Get-CimInstance -ClassName Win32_Printer | Select-Object Name,Default,PrinterStatus,PrinterState,WorkOffline,Detected | ConvertTo-Json -Compress`;
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${ps}"`, (err, stdout, stderr) => {
      results.win32Printers = err ? `ERRO: ${err.message}` : (stdout.trim() || '(vazio)');
      if (stderr) results.win32PrintersStderr = stderr.trim();
      resolve();
    });
  });

  // 2. Jobs na fila da impressora padrão
  await new Promise((resolve) => {
    const ps = `Get-Printer | Where-Object { $_.Default -eq $true } | ForEach-Object { $name = $_.Name; Get-PrintJob -PrinterName $name -ErrorAction SilentlyContinue | Select-Object Id,DocumentName,JobStatus,Size,TotalPages | ConvertTo-Json -Compress }`;
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${ps}"`, (err, stdout, stderr) => {
      results.printJobs = err ? `ERRO: ${err.message}` : (stdout.trim() || '(fila vazia)');
      if (stderr) results.printJobsStderr = stderr.trim();
      resolve();
    });
  });

  // 3. paperStatus global atual
  results.paperStatusGlobal = paperStatus;

  console.log('[Diagnose] Resultado completo:', JSON.stringify(results, null, 2));
  return results;
});

// Reset paper status (quando usuário confirma que papel foi reposto)
ipcMain.handle('reset-paper-status', () => {
  console.log('[Printer] Paper status resetado pelo usuário');
  paperStatus = 'ok';
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('printer-paper-status', 'ok');
  }
  return { success: true };
});

// IPC — retorna IP local da máquina para QR Code do operador mobile
ipcMain.handle('get-local-ip', () => {
  const os = require('os');
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
});

// IPC — gera QR Code como data URL (funciona offline)
ipcMain.handle('generate-qrcode', async (_event, text) => {
  try {
    const QRCode = require('qrcode');
    const dataUrl = await QRCode.toDataURL(text, {
      width: 200,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    });
    return dataUrl;
  } catch (e) {
    console.error('[QRCode] Erro:', e.message);
    return null;
  }
});

// =========================================================
// Sistema de Licença — validação via Supabase (inline)
// =========================================================
const SUPABASE_URL  = 'https://npfqnsgjicmxwmurwosu.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wZnFuc2dqaWNteHdtdXJ3b3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3ODQyNDQsImV4cCI6MjA5MjM2MDI0NH0.wLIFMxZkE9rjGQjZF7eFi0dyDioOGQfg1jfhRy32O90';

async function validateSerial(code) {
  if (!code || !code.trim()) return { isValid: false, license: null, error: 'Por favor, insira um código de licença.' };
  const cleanCode = code.trim().toUpperCase();
  try {
    const { net } = require('electron');
    const url = `${SUPABASE_URL}/rest/v1/serials?code=eq.${encodeURIComponent(cleanCode)}&select=*&limit=1`;
    const response = await fetch(url, {
      headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data || data.length === 0) return { isValid: false, license: null, error: 'Código de licença inválido ou não encontrado.' };
    const serial = data[0];
    if (serial.status === 'Revoked') return { isValid: false, license: serial, error: 'Esta licença foi revogada. Entre em contato com o suporte.' };
    if (serial.status === 'Pending') return { isValid: false, license: serial, error: 'Esta licença ainda não foi ativada.' };
    if (serial.status !== 'Active') return { isValid: false, license: serial, error: `Status inválido: ${serial.status}.` };
    if (serial.expiration_date) {
      const expDate = new Date(serial.expiration_date);
      if (expDate <= new Date()) {
        const fmt = expDate.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
        return { isValid: false, license: serial, error: `Sua licença (${serial.license_type || 'Padrão'}) expirou em ${fmt}.` };
      }
    }
    return { isValid: true, license: serial, error: null };
  } catch (err) {
    console.error('[License] Erro:', err.message);
    return { isValid: false, license: null, error: 'Não foi possível verificar a licença. Verifique sua conexão.' };
  }
}

function getLicenseFile() {
  if (app.isPackaged) return path.join(path.dirname(app.getPath('exe')), 'license.json');
  return path.join(__dirname, 'license.json');
}
function readSavedLicense() {
  try { const f = getLicenseFile(); if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) {}
  return null;
}
function saveLicense(data) {
  try { fs.writeFileSync(getLicenseFile(), JSON.stringify(data, null, 2), 'utf8'); } catch (e) { console.error('[License] Erro ao salvar:', e.message); }
}
function clearLicense() {
  try { const f = getLicenseFile(); if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) {}
}

ipcMain.handle('license-validate', async (_event, code) => {
  const result = await validateSerial(code);
  if (result.isValid && result.license) saveLicense({ code, license: result.license, validatedAt: new Date().toISOString() });
  return result;
});
ipcMain.handle('license-get-saved', () => readSavedLicense());
ipcMain.handle('license-clear', () => { clearLicense(); return { success: true }; });

// IPC — salva configuração da estação (IP do servidor, modo)
ipcMain.handle('save-station-config', (_event, config) => {
  try {
    const cfgFile = app.isPackaged
      ? path.join(path.dirname(app.getPath('exe')), 'station-config.json')
      : path.join(__dirname, 'station-config.json');
    let current = {};
    if (fs.existsSync(cfgFile)) {
      try { current = JSON.parse(fs.readFileSync(cfgFile, 'utf8')); } catch (e) { /* ignora */ }
    }
    const updated = { ...current, ...config };
    fs.writeFileSync(cfgFile, JSON.stringify(updated, null, 2), 'utf8');
    console.log('[Station] Config salva:', updated);
    return { success: true };
  } catch (e) {
    console.error('[Station] Erro ao salvar config:', e.message);
    return { success: false, error: e.message };
  }
});

// IPC — lê configuração da estação
ipcMain.handle('get-station-config', () => {
  try {
    const cfgFile = app.isPackaged
      ? path.join(path.dirname(app.getPath('exe')), 'station-config.json')
      : path.join(__dirname, 'station-config.json');
    if (fs.existsSync(cfgFile)) {
      return JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
    }
  } catch (e) { /* ignora */ }
  return {};
});

ipcMain.handle('get-printer-ports', async () => {
  if (!SerialPort) return [];
  const ports = await SerialPort.list();
  return ports.map(p => ({ path: p.path, manufacturer: p.manufacturer, vendorId: p.vendorId }));
});

// =========================================================
// IPC — controle de fullscreen
// =========================================================
ipcMain.handle('set-fullscreen', (_event, enable) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setFullScreen(enable);
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('is-fullscreen', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow.isFullScreen();
  }
  return false;
});

// =========================================================
// IPC — mídias locais (pasta media/)
// =========================================================
const MEDIA_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.ogg'];

// Lista arquivos de mídia disponíveis na pasta media/
ipcMain.handle('list-media-files', () => {
  try {
    if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });
    const files = fs.readdirSync(MEDIA_DIR)
      .filter(f => MEDIA_EXTENSIONS.includes(path.extname(f).toLowerCase()))
      .map(f => ({
        name: f,
        path: path.join(MEDIA_DIR, f),
        url:  `file://${path.join(MEDIA_DIR, f).replace(/\\/g, '/')}`,
        type: ['.mp4', '.webm', '.ogg'].includes(path.extname(f).toLowerCase()) ? 'video' : 'image',
      }));
    return files;
  } catch (e) {
    console.error('[Media] Erro ao listar:', e.message);
    return [];
  }
});

// Abre diálogo para selecionar arquivo de mídia e copia para media/
ipcMain.handle('import-media-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecionar Mídia',
    defaultPath: app.getPath('pictures'),
    filters: [
      { name: 'Imagens e Vídeos', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'ogg'] },
    ],
    properties: ['openFile', 'multiSelections'],
  });

  if (result.canceled || result.filePaths.length === 0) return [];

  if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });

  const imported = [];
  for (const src of result.filePaths) {
    const filename = path.basename(src);
    const dest = path.join(MEDIA_DIR, filename);
    try {
      fs.copyFileSync(src, dest);
      const ext = path.extname(filename).toLowerCase();
      imported.push({
        name: filename,
        path: dest,
        url:  `file://${dest.replace(/\\/g, '/')}`,
        type: ['.mp4', '.webm', '.ogg'].includes(ext) ? 'video' : 'image',
      });
      console.log('[Media] Importado:', filename, '→', dest);
    } catch (e) {
      console.error('[Media] Erro ao importar', filename, ':', e.message);
    }
  }
  console.log('[Media] Total importado:', imported.length, 'arquivo(s)');
  return imported;
});

// Abre diálogo para selecionar uma PASTA e retorna todos os arquivos de mídia nela
ipcMain.handle('select-media-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecionar Pasta de Mídia',
    defaultPath: app.getPath('pictures'),
    properties: ['openDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) return { canceled: true, files: [] };

  const folderPath = result.filePaths[0];
  const files = [];

  try {
    const entries = fs.readdirSync(folderPath);
    for (const entry of entries) {
      const ext = path.extname(entry).toLowerCase();
      if (!MEDIA_EXTENSIONS.includes(ext)) continue;
      const fullPath = path.join(folderPath, entry);
      files.push({
        name: entry,
        path: fullPath,
        url: `file://${fullPath.replace(/\\/g, '/')}`,
        type: ['.mp4', '.webm', '.ogg'].includes(ext) ? 'video' : 'image',
      });
    }
    console.log('[Media] Pasta selecionada:', folderPath, '—', files.length, 'arquivo(s)');
  } catch (e) {
    console.error('[Media] Erro ao ler pasta:', e.message);
  }

  return { canceled: false, folder: folderPath, files };
});

// Remove arquivo de mídia da pasta media/
ipcMain.handle('delete-media-file', (_event, filename) => {
  try {
    const filePath = path.join(MEDIA_DIR, path.basename(filename)); // basename evita path traversal
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    }
    return { success: false, error: 'Arquivo não encontrado' };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Retorna URL do arquivo de campainha
ipcMain.handle('get-bell-url', () => {
  const bellPath = path.join(MEDIA_DIR, 'campainha.mp3');
  if (fs.existsSync(bellPath)) {
    return `file://${bellPath.replace(/\\/g, '/')}`;
  }
  return null;
});

// Retorna o MP3 da campainha como base64 para reprodução segura no renderer
ipcMain.handle('get-bell-base64', () => {
  const bellPath = path.join(MEDIA_DIR, 'campainha.mp3');
  if (fs.existsSync(bellPath)) {
    const data = fs.readFileSync(bellPath);
    return `data:audio/mpeg;base64,${data.toString('base64')}`;
  }
  return null;
});

// =========================================================
// Detecta porta serial da K80 automaticamente
// =========================================================
// =========================================================
// Inicialização do Hardware (K80 Tornado)
// =========================================================
async function initHardware() {
  console.log('[Hardware] Iniciando detecção de portas...');
  
  if (!SerialPort) {
    console.warn('[Hardware] Módulo SerialPort não carregado. Operando sem impressão serial.');
    return;
  }

  try {
    const ports = await SerialPort.list();
    console.log(`[Hardware] ${ports.length} porta(s) encontrada(s):`);
    ports.forEach(p => {
      console.log(`  - ${p.path} [VID:${p.vendorId} PID:${p.productId}] ${p.friendlyName || ''}`);
    });

    // Tenta encontrar a Custom K80 Tornado (VID 0DD4)
    const custom = ports.find(p => p.vendorId && p.vendorId.toLowerCase() === '0dd4');
    
    if (custom) {
      console.log('[Hardware] ✓ Impressora Custom K80 detectada em:', custom.path);
      connectToPort(custom.path);
    } else {
      console.warn('[Hardware] ⚠ Impressora Custom não detectada via VID/PID.');
    }
  } catch (err) {
    console.error('[Hardware] Erro ao listar portas:', err.message);
  }
}

function connectToPort(path) {
  if (printerPort) {
    try { printerPort.close(); } catch(e) {}
  }

  printerPort = new SerialPort({ 
    path: path, 
    baudRate: PRINTER_BAUD_RATE,
    autoOpen: false 
  });

  printerPort.open((err) => {
    if (err) {
      console.error(`[Serial] Falha ao abrir ${path}:`, err.message);
      setTimeout(() => connectToPort(path), 10000);
      return;
    }
    console.log('[Serial] ✓ Porta aberta com sucesso:', path);
    setupPortEvents();
  });

  printerPort.on('error', (err) => {
    console.error('[Serial] Erro crítico:', err.message);
    setTimeout(() => initHardware(), 15000);
  });

  printerPort.on('close', () => {
    console.warn('[Serial] Porta fechada. Tentando reconectar...');
    setTimeout(() => initHardware(), 5000);
  });
}

function setupPortEvents() {
  if (!printerPort) return;

  // Polling de status (ESC v para Custom K80)
  const STATUS_CMD = Buffer.from([0x1B, 0x76]);
  
  const pollInterval = setInterval(() => {
    if (printerPort && printerPort.isOpen) {
      printerPort.write(STATUS_CMD);
    } else {
      clearInterval(pollInterval);
    }
  }, 5000);

  printerPort.on('data', (data) => {
    // Lógica Custom K80: Byte 0: status. Bit 2=Paper out, Bit 0=Paper near
    const byte = data[0];
    const isOut = (byte & 0x04) !== 0;
    const isNear = (byte & 0x01) !== 0;

    let newStatus = 'ok';
    if (isOut) newStatus = 'out';
    else if (isNear) newStatus = 'near';

    if (newStatus !== paperStatus) {
      paperStatus = newStatus;
      console.log('[Hardware] Mudança de status do papel:', paperStatus);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('printer-paper-status', paperStatus);
      }
    }
  });
}

// =========================================================
// Servidor HTTP embutido — sincroniza estado entre clientes
// Roda na porta 3080 dentro do processo Electron
// =========================================================
function startLocalServer() {
  try {
    const http = require('http');
    const urlModule = require('url');
    const PORT = 3080;
    const DB_FILE = path.join(path.dirname(app.isPackaged ? app.getPath('exe') : __dirname), 'db.json');

    const sseClients = new Set();

    function broadcastState(state) {
      const data = `data: ${JSON.stringify(state)}\n\n`;
      for (const client of sseClients) {
        try { client.write(data); } catch (e) { sseClients.delete(client); }
      }
    }

    function loadDB() {
      try {
        if (fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      } catch (e) { /* ignora */ }
      return null;
    }

    function saveDB(state) {
      try { fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2)); } catch (e) { /* ignora */ }
    }

    const server = http.createServer((req, res) => {
      const parsed = urlModule.parse(req.url, true);
      const pathname = parsed.pathname;

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

      if (pathname === '/api/events') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
        res.write(':ok\n\n');
        const current = loadDB();
        if (current) res.write(`data: ${JSON.stringify(current)}\n\n`);
        sseClients.add(res);
        const hb = setInterval(() => { try { res.write(':ping\n\n'); } catch (e) { clearInterval(hb); } }, 25000);
        req.on('close', () => { sseClients.delete(res); clearInterval(hb); });
        return;
      }

      if (pathname === '/api/state') {
        if (req.method === 'GET') {
          const state = loadDB() || {};
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(state));
        } else if (req.method === 'POST') {
          let body = '';
          req.on('data', c => { body += c; });
          req.on('end', () => {
            try {
              const newState = JSON.parse(body);
              saveDB(newState);
              broadcastState(newState);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (e) { res.writeHead(400); res.end('JSON Inválido'); }
          });
        }
        return;
      }

      // Serve arquivos estáticos
      const appDir = app.isPackaged ? path.dirname(app.getPath('exe')) : __dirname;
      let filePath = path.join(appDir, pathname === '/' ? 'index.html' : pathname);
      if (!filePath.startsWith(appDir)) { res.writeHead(403); res.end(); return; }

      fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) { res.writeHead(404); res.end('Not found'); return; }
        const ext = path.extname(filePath).toLowerCase();
        const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg' };
        res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      });
    });

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] Servidor embutido rodando na porta ${PORT}`);
    });

    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        console.log(`[Server] Porta ${PORT} já em uso — usando servidor externo`);
      } else {
        console.error('[Server] Erro:', e.message);
      }
    });

  } catch (e) {
    console.error('[Server] Falha ao iniciar servidor embutido:', e.message);
  }
}

// =========================================================
// Monitor proativo da impressora — só ativa após falha de impressão
// Verifica a cada 2s até a impressora voltar ao normal
// =========================================================
let printerMonitorInterval = null;
let lastKnownPrinterStatus = 'ok';

function startPrinterMonitor() {
  // Não inicia se já está rodando
  if (printerMonitorInterval) return;

  console.log('[PrinterMonitor] Iniciando monitoramento após falha (intervalo: 2s)');

  printerMonitorInterval = setInterval(async () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      stopPrinterMonitor();
      return;
    }
    try {
      const status = await checkPrinterStatusWMI();
      if (status !== lastKnownPrinterStatus) {
        lastKnownPrinterStatus = status;
        console.log('[PrinterMonitor] Status mudou:', status);
        mainWindow.webContents.send('printer-paper-status', status === 'ok' ? 'ok' : status);
        if (status === 'out-of-paper') paperStatus = 'out';
        else if (status === 'ok') paperStatus = 'ok';
      }
      // Impressora voltou ao normal — para o monitoramento
      if (status === 'ok') {
        console.log('[PrinterMonitor] Impressora OK — parando monitoramento');
        stopPrinterMonitor();
      }
    } catch (e) {
      console.warn('[PrinterMonitor] Erro:', e.message);
    }
  }, 2000);
}

function stopPrinterMonitor() {
  if (printerMonitorInterval) {
    clearInterval(printerMonitorInterval);
    printerMonitorInterval = null;
    console.log('[PrinterMonitor] Monitoramento parado');
  }
}

// =========================================================
// Janela principal
// =========================================================
function createWindow() {
  const modeArg = process.argv.find(a => a.startsWith('--mode='));
  let mode = modeArg ? modeArg.split('=')[1] : null;

  // Se não há argumento --mode, lê do arquivo de configuração da estação
  if (!mode && app.isPackaged) {
    try {
      const cfgFile = path.join(path.dirname(app.getPath('exe')), 'station-config.json');
      if (fs.existsSync(cfgFile)) {
        const cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
        mode = cfg.mode || null;
        console.log('[Station] Modo carregado do arquivo:', mode);
      }
    } catch (e) {
      console.warn('[Station] Erro ao ler station-config.json:', e.message);
    }
  }

  const ipArg = process.argv.find(a => a.startsWith('--server-ip='));
  let serverIp = ipArg ? ipArg.split('=')[1] : null;

  // Lê IP do servidor do arquivo de configuração se não foi passado como argumento
  if (!serverIp && app.isPackaged) {
    try {
      const cfgFile = path.join(path.dirname(app.getPath('exe')), 'station-config.json');
      if (fs.existsSync(cfgFile)) {
        const cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
        serverIp = cfg.serverIp || null;
      }
    } catch (e) { /* ignora */ }
  }

  // =========================================================
  // Modo dual monitor: operador no principal + telão no estendido
  // =========================================================
  if (mode === 'dual') {
    const { screen } = require('electron');
    const displays = screen.getAllDisplays();
    const primaryDisplay = screen.getPrimaryDisplay();
    const secondaryDisplay = displays.find(d => d.id !== primaryDisplay.id) || primaryDisplay;

    console.log('[DualMonitor] Displays detectados:', displays.length);
    console.log('[DualMonitor] Principal:', primaryDisplay.bounds);
    console.log('[DualMonitor] Secundário:', secondaryDisplay.bounds);

    // Janela do Operador — monitor principal, janela normal
    const operadorCfg = {
      x: primaryDisplay.bounds.x,
      y: primaryDisplay.bounds.y,
      width: primaryDisplay.bounds.width,
      height: primaryDisplay.bounds.height,
      backgroundColor: '#f8fafc',
      title: 'Painel de senha do Ni — Operador',
      icon: path.join(__dirname, 'build', 'icon.ico'),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    };

    mainWindow = new BrowserWindow(operadorCfg);
    let operadorUrl = `file://${path.join(__dirname, 'index.html')}?mode=operador`;
    if (serverIp) operadorUrl += `&server=${serverIp}`;
    mainWindow.loadURL(operadorUrl);
    mainWindow.maximize();
    if (process.argv.includes('--dev')) mainWindow.webContents.openDevTools();
    mainWindow.on('closed', () => { mainWindow = null; app.quit(); });

    // Janela do Telão — monitor estendido, fullscreen
    const painelCfg = {
      x: secondaryDisplay.bounds.x,
      y: secondaryDisplay.bounds.y,
      width: secondaryDisplay.bounds.width,
      height: secondaryDisplay.bounds.height,
      backgroundColor: '#0f172a',
      title: 'Painel de senha do Ni — Telão',
      icon: path.join(__dirname, 'build', 'icon.ico'),
      frame: false,
      fullscreen: true,
      kiosk: displays.length > 1, // kiosk só se tiver segundo monitor real
      alwaysOnTop: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    };

    const painelWindow = new BrowserWindow(painelCfg);
    let painelUrl = `file://${path.join(__dirname, 'index.html')}?mode=painel`;
    if (serverIp) painelUrl += `&server=${serverIp}`;
    painelWindow.loadURL(painelUrl);
    painelWindow.on('closed', () => { app.quit(); });

    console.log('[DualMonitor] Operador no monitor principal, Telão no monitor estendido');
    return;
  }

  // =========================================================
  // Modo single window (padrão)
  // =========================================================
  const cfg = {
    width: 1280, height: 800,
    backgroundColor: '#f8fafc',
    title: 'Painel de senha do Ni',
    icon: path.join(__dirname, 'build', 'icon.ico'),
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

  let url = `file://${path.join(__dirname, 'index.html')}?mode=${mode || ''}`;
  if (serverIp) url += `&server=${serverIp}`;

  mainWindow.loadURL(url);

  if (process.argv.includes('--dev')) mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => { mainWindow = null; });
}

// =========================================================
// Lifecycle
// =========================================================
app.whenReady().then(() => {
  MEDIA_DIR = getMediaDir();
  if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });
  console.log('[Media] Pasta de mídia:', MEDIA_DIR);
  loadPrinterConfig();
  // Inicia o servidor HTTP automaticamente
  startLocalServer();
  createWindow();
  initHardware();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
