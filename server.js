const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');
const os   = require('os');

const PORT = 3080;
const DB_FILE = path.join(__dirname, 'db.json');
const MEDIA_DIR = path.join(__dirname, 'media');

// Estado inicial se o db.json não existir
const INITIAL_STATE = {
  config: {
    unitName: 'Frutas Secas',
    sectorName: 'Painel de senha do Ni',
    companySlogan: 'Qualidade em cada detalhe',
    welcomeMessage: 'Seja bem-vindo!',
    footerMessage: 'Obrigado pela preferência',
    workingHours: { start: '08:00', end: '18:00' },
    pauseMediaOnCall: true,
    overlayDuration: 5,
    enableCallSound: true,
    callSoundMode: 'both',
    soundVolume: 0.8,
    staffUnlockCode: '1234',
    serverIp: 'localhost'
  },
  services: [
    { id: 'general',  label: 'Geral',        color: '#2563eb', active: true, counter: 0, priority: 1 },
    { id: 'priority', label: 'Preferencial',  color: '#059669', active: true, counter: 0, priority: 2 },
  ],
  stations: [
    { id: 1, label: 'Guichê 1', active: true },
    { id: 2, label: 'Guichê 2', active: true },
  ],
  queue: [],
  called: [],
  currentCall: null,
  mediaItems: [],
  logoUrl: ''
};

// Carrega ou inicializa o banco de dados
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_STATE, null, 2));
    return INITIAL_STATE;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    console.error('Erro ao ler db.json, usando estado inicial:', e.message);
    return INITIAL_STATE;
  }
}

function saveDB(state) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('Erro ao salvar db.json:', e.message);
  }
}

// =========================================================
// SSE — Server-Sent Events para push em tempo real
// =========================================================
const sseClients = new Set();

function broadcastState(state) {
  const data = `data: ${JSON.stringify(state)}\n\n`;
  for (const client of sseClients) {
    try { client.write(data); } catch (e) { sseClients.delete(client); }
  }
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname  = parsedUrl.pathname;

  // CORS headers para permitir acesso de qualquer IP na rede local
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- SSE endpoint — push em tempo real ---
  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(':ok\n\n'); // handshake inicial

    // Envia estado atual imediatamente ao conectar
    const current = loadDB();
    res.write(`data: ${JSON.stringify(current)}\n\n`);

    sseClients.add(res);
    console.log(`[SSE] Cliente conectado. Total: ${sseClients.size}`);

    // Heartbeat a cada 25s para manter conexão viva
    const heartbeat = setInterval(() => {
      try { res.write(':ping\n\n'); } catch (e) { clearInterval(heartbeat); }
    }, 25000);

    req.on('close', () => {
      sseClients.delete(res);
      clearInterval(heartbeat);
      console.log(`[SSE] Cliente desconectado. Total: ${sseClients.size}`);
    });
    return;
  }

  // --- API ---
  if (pathname === '/api/state') {
    if (req.method === 'GET') {
      const state = loadDB();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(state));
    } 
    else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const newState = JSON.parse(body);
          saveDB(newState);
          broadcastState(newState); // push imediato para todos os clientes SSE
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.writeHead(400);
          res.end('JSON Inválido');
        }
      });
    }
    return;
  }

  // --- Servir arquivos estáticos ---
  let filePath = '';

  // Rotas de acesso direto por modo
  if (pathname === '/painel' || pathname === '/telao') {
    res.writeHead(302, { 'Location': '/index.html?mode=painel' });
    res.end();
    return;
  }
  if (pathname === '/totem') {
    res.writeHead(302, { 'Location': '/index.html?mode=totem' });
    res.end();
    return;
  }
  if (pathname === '/admin') {
    res.writeHead(302, { 'Location': '/index.html?mode=admin' });
    res.end();
    return;
  }
  if (pathname === '/operador') {
    res.writeHead(302, { 'Location': '/mobile.html' });
    res.end();
    return;
  }

  if (pathname === '/') {
    // Página de entrada com links para todos os modos
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Painel de senha do Ni</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', sans-serif; background: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .card { background: #fff; border-radius: 16px; padding: 2.5rem; max-width: 420px; width: 90%; box-shadow: 0 4px 24px rgba(0,0,0,0.08); text-align: center; }
  h1 { font-size: 1.4rem; color: #0f172a; margin-bottom: 0.25rem; }
  p { color: #64748b; font-size: 0.9rem; margin-bottom: 2rem; }
  .links { display: flex; flex-direction: column; gap: 0.75rem; }
  a { display: block; padding: 0.9rem 1.5rem; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 1rem; transition: filter 0.15s; }
  a:hover { filter: brightness(1.08); }
  .a-painel   { background: #1e3a8a; color: #fff; }
  .a-totem    { background: #065f46; color: #fff; }
  .a-operador { background: #1d4ed8; color: #fff; }
  .a-admin    { background: #7c3aed; color: #fff; }
  .hint { font-size: 0.75rem; color: #94a3b8; margin-top: 1.5rem; }
</style>
</head>
<body>
  <div class="card">
    <h1>🎫 Painel de senha do Ni</h1>
    <p>Selecione o modo de acesso:</p>
    <div class="links">
      <a class="a-painel"   href="/painel">📺 Telão / Painel</a>
      <a class="a-totem"    href="/totem">🖨️ Totem (Emissão de Senhas)</a>
      <a class="a-operador" href="/operador">📱 Operador (Mobile)</a>
      <a class="a-admin"    href="/admin">⚙️ Administrador</a>
    </div>
    <div class="hint">Acesse pelo navegador em qualquer dispositivo na mesma rede Wi-Fi</div>
  </div>
</body>
</html>`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (pathname.startsWith('/media/')) {
    filePath = path.join(__dirname, pathname);
  } else {
    filePath = path.join(__dirname, pathname);
  }

  // Segurança básica: evita que saiam do diretório do app
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Acesso negado');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Arquivo não encontrado');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.js':   'text/javascript',
      '.css':  'text/css',
      '.json': 'application/json',
      '.png':  'image/png',
      '.jpg':  'image/jpeg',
      '.gif':  'image/gif',
      '.wav':  'audio/wav',
      '.mp4':  'video/mp4',
      '.mp3':  'audio/mpeg',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  let localIp = 'localhost';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        localIp = net.address;
        break;
      }
    }
  }

  console.log(`\x1b[36m%s\x1b[0m`, `=================================================`);
  console.log(`\x1b[32m%s\x1b[0m`, `   SERVIDOR LOCAL - PAINEL DE SENHA DO NI`);
  console.log(`\x1b[36m%s\x1b[0m`, `=================================================`);
  console.log(`\n🖥️  MODO TOTEM/PAINEL (Este PC):`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`\n📱 MODO OPERADOR MOBILE (Outros aparelhos):`);
  console.log(`   http://${localIp}:${PORT}/mobile.html`);
  console.log(`\n⚙️  DICA: Certifique-se que o celular está no mesmo WiFi.`);
  console.log(`\n\x1b[36m%s\x1b[0m`, `=================================================`);
  console.log(`Pressione Ctrl+C para encerrar.`);
});
