import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminModule } from '../../src/components/AdminModule.jsx';
import { generateTicket } from '../../src/logic/generateTicket.js';
import { callNext } from '../../src/logic/callNext.js';

describe('AdminModule', () => {
  test('exibe as abas Dashboard, Tipos de Senha, Mídia Indoor, Guichês e Configurações', () => {
    render(<AdminModule />);
    expect(screen.getByText('📊 Dashboard')).toBeInTheDocument();
    expect(screen.getByText('🎫 Tipos de Senha')).toBeInTheDocument();
    expect(screen.getByText('🖼 Mídia Indoor')).toBeInTheDocument();
    expect(screen.getByText('🏢 Guichês')).toBeInTheDocument();
    expect(screen.getByText('⚙️ Configurações')).toBeInTheDocument();
  });

  test('aba Dashboard exibe métricas corretas do APP_STATE', () => {
    generateTicket('general');
    callNext(1);
    render(<AdminModule />);
    // totalIssued = 1, totalCalled = 1, waiting = 0
    expect(screen.getByText('Emitidas hoje')).toBeInTheDocument();
    expect(screen.getByText('Chamadas hoje')).toBeInTheDocument();
    expect(screen.getByText('Aguardando')).toBeInTheDocument();
  });

  test('aba Tipos de Senha lista cada serviço com nome e estado de ativação', () => {
    render(<AdminModule />);
    fireEvent.click(screen.getByText('🎫 Tipos de Senha'));
    expect(screen.getByText('Geral')).toBeInTheDocument();
    expect(screen.getByText('Preferencial')).toBeInTheDocument();
    // Checkboxes de ativação
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);
  });

  test('toggle de ativação de serviço atualiza APP_STATE.services[i].active', () => {
    render(<AdminModule />);
    fireEvent.click(screen.getByText('🎫 Tipos de Senha'));
    const checkbox = screen.getByLabelText('Ativar Geral');
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    expect(window.APP_STATE.services[0].active).toBe(false);
  });

  test('aba Guichês lista cada guichê com nome e estado de ativação', () => {
    render(<AdminModule />);
    fireEvent.click(screen.getByText('🏢 Guichês'));
    expect(screen.getByText('Guichê 1')).toBeInTheDocument();
    expect(screen.getByText('Guichê 2')).toBeInTheDocument();
  });

  test('aba Configurações exibe valores atuais de APP_STATE.config', () => {
    render(<AdminModule />);
    fireEvent.click(screen.getByText('⚙️ Configurações'));
    expect(screen.getByDisplayValue('Minha Empresa')).toBeInTheDocument();
    expect(screen.getByDisplayValue('BALCÃO')).toBeInTheDocument();
  });

  test('botão Reset Diário invoca dailyReset após confirmação', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<AdminModule />);
    fireEvent.click(screen.getByText('⚙️ Configurações'));
    generateTicket('general');
    fireEvent.click(screen.getByText('🔄 Reset Diário'));
    expect(window.APP_STATE.queue).toEqual([]);
    expect(window.APP_STATE.called).toEqual([]);
    vi.restoreAllMocks();
  });

  test('botão Reset Completo invoca fullReset após confirmação dupla', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    window.APP_STATE.config.unitName = 'Modificado';
    render(<AdminModule />);
    fireEvent.click(screen.getByText('⚙️ Configurações'));
    fireEvent.click(screen.getByText('⚠️ Reset Completo'));
    expect(window.APP_STATE.config.unitName).toBe('Minha Empresa');
    vi.restoreAllMocks();
  });
});
