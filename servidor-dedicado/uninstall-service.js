/**
 * Remove o serviço Windows
 * Execute como Administrador: node uninstall-service.js
 */
const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'Painel de senha do Ni - Servidor',
  script: path.join(__dirname, 'server.js'),
});

svc.on('uninstall', () => {
  console.log('✓ Serviço removido com sucesso!');
});

svc.on('error', (err) => {
  console.error('✗ Erro:', err);
});

console.log('Removendo serviço Windows...');
svc.uninstall();
