import { describe, test, expect } from 'vitest';
import { generateTicket } from '../../src/logic/generateTicket.js';

describe('generateTicket', () => {
  test('retorna ticket com formato de 2 ou 3 dígitos para serviço ativo', () => {
    const ticket = generateTicket('general');
    expect(ticket).toMatch(/^\d{2,3}$/);
    expect(ticket).toBe('01');
  });

  test('gera sequência incremental em N chamadas consecutivas', () => {
    const tickets = [];
    for (let i = 0; i < 5; i++) {
      tickets.push(generateTicket('general'));
    }
    expect(tickets).toEqual(['01', '02', '03', '04', '05']);
  });

  test('ciclo reinicia após contador atingir 999', () => {
    // Configura contador em 998
    window.APP_STATE.services[0].counter = 998;
    
    const ticket1 = generateTicket('general');
    expect(ticket1).toBe('999');
    
    const ticket2 = generateTicket('general');
    expect(ticket2).toBe('01');
  });

  test('retorna null para serviço inativo sem modificar queue', () => {
    window.APP_STATE.services[0].active = false;
    const queueLengthBefore = window.APP_STATE.queue.length;
    
    const ticket = generateTicket('general');
    
    expect(ticket).toBeNull();
    expect(window.APP_STATE.queue.length).toBe(queueLengthBefore);
  });

  test('retorna null para serviceId inexistente sem modificar queue', () => {
    const queueLengthBefore = window.APP_STATE.queue.length;
    
    const ticket = generateTicket('nonexistent');
    
    expect(ticket).toBeNull();
    expect(window.APP_STATE.queue.length).toBe(queueLengthBefore);
  });

  test('item adicionado à fila tem estrutura correta', () => {
    const ticket = generateTicket('general');
    
    const lastItem = window.APP_STATE.queue[window.APP_STATE.queue.length - 1];
    
    expect(lastItem).toHaveProperty('ticket', ticket);
    expect(lastItem).toHaveProperty('serviceId', 'general');
    expect(lastItem).toHaveProperty('time');
    expect(typeof lastItem.time).toBe('number');
    expect(lastItem.time).toBeGreaterThan(0);
    expect(lastItem).toHaveProperty('id');
    expect(typeof lastItem.id).toBe('string');
    expect(lastItem.id.length).toBeGreaterThan(0);
  });

  test('invoca dispatchUpdate exatamente uma vez por chamada válida', () => {
    generateTicket('general');
    expect(window.dispatchUpdate).toHaveBeenCalledTimes(1);
  });

  test('não invoca dispatchUpdate para serviço inválido', () => {
    window.APP_STATE.services[0].active = false;
    generateTicket('general');
    expect(window.dispatchUpdate).not.toHaveBeenCalled();
  });
});
