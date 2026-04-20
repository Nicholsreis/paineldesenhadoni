// dailyReset, fullReset, exportHistory
// Extraído de index.html para testes
// Depende de: window.APP_STATE, window.dispatchUpdate, FACTORY_STATE

import { FACTORY_STATE } from './state.js';

export function dailyReset() {
  const s = window.APP_STATE;
  s.queue = [];
  s.called = [];
  s.currentCall = null;
  s.services.forEach(sv => { sv.counter = 0; });
  window.dispatchUpdate();
}

export function fullReset() {
  window.APP_STATE = JSON.parse(JSON.stringify(FACTORY_STATE));
  window.dispatchUpdate();
}

export function exportHistory() {
  const data = window.APP_STATE.called.map(c => ({
    ticket: c.ticket,
    serviceId: c.serviceId,
    stationId: c.stationId,
    time: c.time,
  }));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `historico-balcao-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
