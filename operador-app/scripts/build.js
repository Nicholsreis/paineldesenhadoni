/**
 * Build script: copia mobile.html para www/index.html
 * e injeta configurações para o APK Android
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '../../mobile.html');
const WWW = path.join(__dirname, '../www');
const DEST = path.join(WWW, 'index.html');

if (!fs.existsSync(WWW)) fs.mkdirSync(WWW, { recursive: true });

let html = fs.readFileSync(SRC, 'utf8');

// Injeta meta tags para PWA/Android
const metaInject = `
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="theme-color" content="#2563eb">
  <link rel="manifest" href="manifest.json">
`;

html = html.replace('</head>', metaInject + '</head>');

fs.writeFileSync(DEST, html, 'utf8');
console.log('✓ www/index.html gerado');

// Copia assets se existirem
const assetsDir = path.join(__dirname, '../../media');
const wwwAssetsDir = path.join(WWW, 'media');
if (fs.existsSync(assetsDir)) {
  if (!fs.existsSync(wwwAssetsDir)) fs.mkdirSync(wwwAssetsDir, { recursive: true });
  fs.readdirSync(assetsDir).forEach(f => {
    fs.copyFileSync(path.join(assetsDir, f), path.join(wwwAssetsDir, f));
  });
  console.log('✓ media/ copiada');
}

console.log('Build concluído! Execute: npx cap sync android');
