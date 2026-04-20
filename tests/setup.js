import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';
import { FACTORY_STATE } from '../src/logic/state.js';

beforeEach(() => {
  // Reset completo do estado global
  window.APP_STATE = JSON.parse(JSON.stringify(FACTORY_STATE));

  // Mock de dispatchUpdate rastreável
  window.dispatchUpdate = vi.fn();

  // Mock de electronAPI
  window.electronAPI = {
    isElectron: true,
    printTicket: vi.fn().mockResolvedValue({ success: true, errorType: null }),
    getPaperStatus: vi.fn().mockResolvedValue('ok'),
    getPrinterPorts: vi.fn().mockResolvedValue([]),
    checkPrinterWMI: vi.fn().mockResolvedValue('ok'),
    resetPaperStatus: vi.fn().mockResolvedValue({ success: true }),
    diagnosePrinter: vi.fn().mockResolvedValue({ paperStatusGlobal: 'ok', win32Printers: '[]', printJobs: '(fila vazia)' }),
    onPaperStatusChange: vi.fn(),
    offPaperStatusChange: vi.fn(),
  };

  // Modo de estação
  window.STATION_MODE = null;

  // Firebase mocks
  window.FB_READY = false;
  window.fbPush = vi.fn();
  window.fbListen = vi.fn();
});
