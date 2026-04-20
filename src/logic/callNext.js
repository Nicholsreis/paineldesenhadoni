// callNext — chama próxima senha respeitando prioridade
// Extraído de index.html para testes
// Depende de: window.APP_STATE, window.dispatchUpdate

export function callNext(stationId, serviceId) {
  const s = window.APP_STATE;
  const station = s.stations.find(st => st.id === stationId);
  if (!station || !station.active) return;

  let candidate = null;

  if (serviceId) {
    // Chamada manual por tipo específico
    candidate = s.queue.find(q => q.serviceId === serviceId) || null;
  } else {
    // Respeita prioridade: maior priority primeiro, desempate por menor time
    const activeServiceIds = s.services
      .filter(sv => sv.active)
      .sort((a, b) => b.priority - a.priority)
      .map(sv => sv.id);

    for (const sid of activeServiceIds) {
      const item = s.queue.find(q => q.serviceId === sid);
      if (item) { candidate = item; break; }
    }

    // Desempate por time se mesma priority
    if (!candidate) return;
  }

  if (!candidate) return;

  s.queue = s.queue.filter(q => q.id !== candidate.id);

  const call = {
    ticket: candidate.ticket,
    serviceId: candidate.serviceId,
    stationId,
    time: Date.now(),
  };

  s.called.push(call);
  s.currentCall = { ticket: candidate.ticket, serviceId: candidate.serviceId, stationId };

  window.dispatchUpdate();
}
