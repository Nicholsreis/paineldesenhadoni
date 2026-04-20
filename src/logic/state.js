// FACTORY_STATE — estado inicial de fábrica
// Copiado de index.html para uso nos testes
export const FACTORY_STATE = {
  config: {
    unitName: 'Minha Empresa',
    sectorName: 'Painel de senha do Ni',
    welcomeMessage: 'Seja bem-vindo! Retire sua senha e aguarde ser chamado.',
    footerMessage: 'Painel de senha do Ni — Atendimento de Segunda a Sexta, 8h às 18h',
    workingHours: { start: '08:00', end: '18:00' },
    pauseMediaOnCall: true,
    overlayDuration: 5,        // Duração do overlay em segundos
    enableCallSound: true,      // Habilitar som de chamada
    callSoundMode: 'both',      // 'bell' | 'voice' | 'both' | 'none'
    soundVolume: 0.8,          // Volume do som (0.0 a 1.0)
    printerPort: '',            // Porta da impressora (ex: TMUSB001, USB001, COM3). Vazio = detecção automática
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
  mediaItems: [
    { id: '1', title: 'Bem-vindo ao Painel de senha do Ni',        caption: '',                          url: '', fallbackColor: '#1e3a8a', duration: 6, active: true, order: 1 },
    { id: '2', title: 'Horário: 8h às 18h',         caption: 'Seg a Sex',                 url: '', fallbackColor: '#064e3b', duration: 6, active: true, order: 2 },
    { id: '3', title: 'Atendimento Preferencial',   caption: 'Idoso · PCD · Gestante',    url: '', fallbackColor: '#4c1d95', duration: 6, active: true, order: 3 },
  ],
};
