import { describe, test, expect } from 'vitest';
import { callNext } from '../../src/logic/callNext.js';
import { generateTicket } from '../../src/logic/generateTicket.js';

describe('callNext', () => {
  test('chama ticket do serviço com maior priority primeiro', () => {
    // Gera tickets: general (priority 1) e priority (priority 2)
    generateTicket('general');
    generateTicket('priority');
    
    callNext(1); // sem filtro de serviço
    
    // Deve chamar o ticket preferencial (priority 2) primeiro
    expect(window.APP_STATE.currentCall.serviceId).toBe('priority');
    expect(window.APP_STATE.currentCall.ticket).toBe('01');
  });

  test('em empate de prioridade, chama ticket com menor time (mais antigo)', () => {
    // Ambos os serviços têm priority diferente, vamos ajustar para testar empate
    window.APP_STATE.services[1].priority = 1; // iguala prioridades
    
    const ticket1 = generateTicket('general');
    const ticket2 = generateTicket('priority');
    
    callNext(1);
    
    // Deve chamar o primeiro ticket (mais antigo)
    expect(window.APP_STATE.currentCall.ticket).toBe(ticket1);
    expect(window.APP_STATE.currentCall.serviceId).toBe('general');
  });

  test('filtro por serviceId específico ignora outros serviços', () => {
    generateTicket('general');
    generateTicket('priority');
    
    callNext(1, 'general'); // filtro específico
    
    expect(window.APP_STATE.currentCall.serviceId).toBe('general');
    expect(window.APP_STATE.currentCall.ticket).toBe('01');
  });

  test('ticket chamado é removido de queue', () => {
    generateTicket('general');
    const queueLengthBefore = window.APP_STATE.queue.length;
    
    callNext(1);
    
    expect(window.APP_STATE.queue.length).toBe(queueLengthBefore - 1);
  });

  test('registro é adicionado a called com campos corretos', () => {
    const ticket = generateTicket('general');
    const calledLengthBefore = window.APP_STATE.called.length;
    
    callNext(1);
    
    expect(window.APP_STATE.called.length).toBe(calledLengthBefore + 1);
    
    const lastCall = window.APP_STATE.called[window.APP_STATE.called.length - 1];
    expect(lastCall).toHaveProperty('ticket', ticket);
    expect(lastCall).toHaveProperty('serviceId', 'general');
    expect(lastCall).toHaveProperty('stationId', 1);
    expect(lastCall).toHaveProperty('time');
    expect(typeof lastCall.time).toBe('number');
  });

  test('currentCall é atualizado corretamente', () => {
    const ticket = generateTicket('general');
    
    callNext(1);
    
    expect(window.APP_STATE.currentCall).toEqual({
      ticket,
      serviceId: 'general',
      stationId: 1,
    });
  });

  test('fila vazia não modifica currentCall nem called', () => {
    const currentCallBefore = window.APP_STATE.currentCall;
    const calledLengthBefore = window.APP_STATE.called.length;
    
    callNext(1);
    
    expect(window.APP_STATE.currentCall).toBe(currentCallBefore);
    expect(window.APP_STATE.called.length).toBe(calledLengthBefore);
  });

  test('guichê inativo não modifica estado', () => {
    generateTicket('general');
    window.APP_STATE.stations[0].active = false;
    
    const queueLengthBefore = window.APP_STATE.queue.length;
    const calledLengthBefore = window.APP_STATE.called.length;
    const currentCallBefore = window.APP_STATE.currentCall;
    
    callNext(1);
    
    expect(window.APP_STATE.queue.length).toBe(queueLengthBefore);
    expect(window.APP_STATE.called.length).toBe(calledLengthBefore);
    expect(window.APP_STATE.currentCall).toBe(currentCallBefore);
  });

  test('invoca dispatchUpdate exatamente uma vez por chamada bem-sucedida', () => {
    generateTicket('general');
    
    // Reset do mock após generateTicket
    window.dispatchUpdate.mockClear();
    
    callNext(1);
    
    expect(window.dispatchUpdate).toHaveBeenCalledTimes(1);
  });

  test('serviceId específico sem tickets na fila não modifica estado', () => {
    // Só tem ticket de 'general', mas pedimos 'priority'
    generateTicket('general');
    const queueLengthBefore = window.APP_STATE.queue.length;
    const calledLengthBefore = window.APP_STATE.called.length;
    const currentCallBefore = window.APP_STATE.currentCall;

    // Limpa mock após generateTicket
    window.dispatchUpdate.mockClear();

    callNext(1, 'priority');

    expect(window.APP_STATE.queue.length).toBe(queueLengthBefore);
    expect(window.APP_STATE.called.length).toBe(calledLengthBefore);
    expect(window.APP_STATE.currentCall).toBe(currentCallBefore);
    expect(window.dispatchUpdate).not.toHaveBeenCalled();
  });

  test('guichê inexistente não modifica estado', () => {
    generateTicket('general');
    const queueLengthBefore = window.APP_STATE.queue.length;
    const calledLengthBefore = window.APP_STATE.called.length;

    callNext(99); // guichê que não existe

    expect(window.APP_STATE.queue.length).toBe(queueLengthBefore);
    expect(window.APP_STATE.called.length).toBe(calledLengthBefore);
  });
});
