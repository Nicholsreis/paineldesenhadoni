// generateTicket — gera ticket sequencial 001–999 com ciclo automático
// Extraído de index.html para testes
// Depende de: window.APP_STATE, window.dispatchUpdate

export function generateTicket(serviceId) {
  const s = window.APP_STATE;
  const service = s.services.find(sv => sv.id === serviceId);
  if (!service || !service.active) return null;

  // Ciclo 01–999
  const nextCounter = (service.counter % 999) + 1;
  service.counter = nextCounter;
  const ticket = nextCounter < 100
    ? String(nextCounter).padStart(2, '0')  // 01–99
    : String(nextCounter);                   // 100–999

  s.queue.push({
    id: crypto.randomUUID(),
    ticket,
    serviceId,
    time: Date.now(),
  });

  window.dispatchUpdate();
  return ticket;
}
