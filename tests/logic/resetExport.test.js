import { describe, test, expect, vi } from 'vitest';
import { dailyReset, fullReset, exportHistory } from '../../src/logic/resetExport.js';
import { FACTORY_STATE } from '../../src/logic/state.js';
import { generateTicket } from '../../src/logic/generateTicket.js';
import { callNext } from '../../src/logic/callNext.js';

describe('dailyReset', () => {
  test('limpa queue, called, currentCall e zera todos os counter', () => {
    // Popula o estado
    generateTicket('general');
    callNext(1);
    
    dailyReset();
    
    expect(window.APP_STATE.queue).toEqual([]);
    expect(window.APP_STATE.called).toEqual([]);
    expect(window.APP_STATE.currentCall).toBeNull();
    expect(window.APP_STATE.services[0].counter).toBe(0);
    expect(window.APP_STATE.services[1].counter).toBe(0);
  });

  test('preserva config, services (exceto counter), stations e mediaItems', () => {
    const configBefore = { ...window.APP_STATE.config };
    const servicesLabelsBefore = window.APP_STATE.services.map(s => ({ id: s.id, label: s.label, color: s.color, active: s.active, priority: s.priority }));
    const stationsBefore = [...window.APP_STATE.stations];
    const mediaItemsBefore = [...window.APP_STATE.mediaItems];
    
    generateTicket('general');
    dailyReset();
    
    expect(window.APP_STATE.config).toEqual(configBefore);
    expect(window.APP_STATE.services.map(s => ({ id: s.id, label: s.label, color: s.color, active: s.active, priority: s.priority }))).toEqual(servicesLabelsBefore);
    expect(window.APP_STATE.stations).toEqual(stationsBefore);
    expect(window.APP_STATE.mediaItems).toEqual(mediaItemsBefore);
  });

  test('invoca dispatchUpdate exatamente uma vez', () => {
    dailyReset();
    expect(window.dispatchUpdate).toHaveBeenCalledTimes(1);
  });
});

describe('fullReset', () => {
  test('restaura APP_STATE para deep equality com FACTORY_STATE', () => {
    // Modifica o estado
    generateTicket('general');
    callNext(1);
    window.APP_STATE.config.unitName = 'Modificado';
    
    fullReset();
    
    expect(JSON.parse(JSON.stringify(window.APP_STATE))).toEqual(FACTORY_STATE);
  });

  test('restaura config modificado para valores de fábrica', () => {
    window.APP_STATE.config.unitName = 'Modificado';
    window.APP_STATE.config.sectorName = 'Outro Setor';
    
    fullReset();
    
    expect(window.APP_STATE.config.unitName).toBe(FACTORY_STATE.config.unitName);
    expect(window.APP_STATE.config.sectorName).toBe(FACTORY_STATE.config.sectorName);
  });

  test('invoca dispatchUpdate exatamente uma vez', () => {
    fullReset();
    expect(window.dispatchUpdate).toHaveBeenCalledTimes(1);
  });
});

describe('exportHistory', () => {
  test('cria elemento <a> com atributo download contendo data no formato YYYY-MM-DD', () => {
    const createElementSpy = vi.spyOn(document, 'createElement');
    
    exportHistory();
    
    const aElement = createElementSpy.mock.results.find(r => r.value.tagName === 'A')?.value;
    expect(aElement).toBeDefined();
    expect(aElement.download).toMatch(/^historico-balcao-\d{4}-\d{2}-\d{2}\.json$/);
    
    createElementSpy.mockRestore();
  });

  test('conteúdo do blob é JSON válido e parseável', () => {
    generateTicket('general');
    callNext(1);
    
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    const blobSpy = vi.spyOn(global, 'Blob');
    
    exportHistory();
    
    const blobContent = blobSpy.mock.calls[0][0][0];
    expect(() => JSON.parse(blobContent)).not.toThrow();
    
    createObjectURLSpy.mockRestore();
    blobSpy.mockRestore();
  });

  test('cada item exportado contém exatamente ticket, serviceId, stationId e time', () => {
    generateTicket('general');
    callNext(1);
    
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    const blobSpy = vi.spyOn(global, 'Blob');
    
    exportHistory();
    
    const blobContent = blobSpy.mock.calls[0][0][0];
    const exported = JSON.parse(blobContent);
    
    expect(exported.length).toBe(1);
    expect(Object.keys(exported[0])).toEqual(['ticket', 'serviceId', 'stationId', 'time']);
    
    createObjectURLSpy.mockRestore();
    blobSpy.mockRestore();
  });

  test('exportHistory com called vazio exporta array vazio', () => {
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    const blobSpy = vi.spyOn(global, 'Blob');
    
    exportHistory();
    
    const blobContent = blobSpy.mock.calls[0][0][0];
    const exported = JSON.parse(blobContent);
    
    expect(exported).toEqual([]);
    
    createObjectURLSpy.mockRestore();
    blobSpy.mockRestore();
  });
});
