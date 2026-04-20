/**
 * Instala o servidor como serviço Windows
 * Execute como Administrador: node install-service.js
 */
const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'Painel de senha do Ni - Servidor',
  description: 'Servidor HTTP do sistema de senhas Painel de senha do Ni (porta 3080)',
  script: path.join(__dirname, 'server.js'),
  nodeOptions: [],
  env: [
    { name: 'NODE_ENV', value: 'production' }
  ]
});

svc.on('install', () => {
  console.log('✓ Serviço instalado com sucesso!');
  console.log('  Iniciando serviço...');
  svc.start();
});

svc.on('start', () => {
  console.log('✓ Serviço iniciado!');
  console.log('  O servidor está rodando na porta 3080.');
  console.log('  Acesse: http://localhost:3080');
});

svc.on('error', (err) => {
  console.error('✗ Erro:', err);
});

svc.on('alreadyinstalled', () => {
  console.log('⚠ Serviço já está instalado.');
  console.log('  Para reinstalar, execute primeiro: node uninstall-service.js');
});

console.log('Instalando serviço Windows...');
svc.install();
