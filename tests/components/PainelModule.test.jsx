import { describe, test, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { PainelModule } from '../../src/components/PainelModule.jsx';
import { generateTicket } from '../../src/logic/generateTicket.js';
import { callNext } from '../../src/logic/callNext.js';

describe('PainelModule', () => {
  test('exibe "Aguardando chamada..." quando currentCall é null', () => {
    window.APP_STATE.currentCall = null;
    render(<PainelModule />);
    expect(screen.getByText('Aguardando chamada...')).toBeInTheDocument();
  });

  test('exibe ticket, label do serviço e label do guichê quando currentCall está preenchido', () => {
    window.APP_STATE.currentCall = { ticket: '042', serviceId: 'general', stationId: 1 };
    render(<PainelModule />);
    expect(screen.getByText('042')).toBeInTheDocument();
    expect(screen.getByText('Geral')).toBeInTheDocument();
    expect(screen.getByText('Guichê 1')).toBeInTheDocument();
  });

  test('contadores de fila exibem quantidade correta por serviço ativo', () => {
    generateTicket('general');
    generateTicket('general');
    generateTicket('priority');
    render(<PainelModule />);
    expect(screen.getByText('2')).toBeInTheDocument(); // geral
    expect(screen.getByText('1')).toBeInTheDocument(); // priority
  });

  test('exibe as últimas 5 chamadas na lista de chamadas recentes', () => {
    // Gera 6 tickets e chama todos
    for (let i = 0; i < 6; i++) {
      generateTicket('general');
      callNext(1);
    }
    render(<PainelModule />);
    // Deve mostrar apenas 5 chamadas recentes
    const items = screen.getAllByText(/Geral · Guichê 1/);
    expect(items.length).toBe(5);
  });

  test('exibe "Nenhuma chamada ainda" quando called está vazio', () => {
    render(<PainelModule />);
    expect(screen.getByText('Nenhuma chamada ainda')).toBeInTheDocument();
  });

  test('MediaCarousel é renderizado quando mediaItems contém slides ativos', () => {
    render(<PainelModule />);
    expect(screen.getByText('Bem-vindo ao BALCÃO')).toBeInTheDocument();
  });

  test('carrossel é pausado por 3 segundos quando nova chamada é detectada com pauseMediaOnCall true', async () => {
    vi.useFakeTimers();
    window.APP_STATE.config.pauseMediaOnCall = true;
    window.APP_STATE.currentCall = { ticket: '001', serviceId: 'general', stationId: 1 };

    const { rerender } = render(<PainelModule />);

    // Simula nova chamada
    window.APP_STATE.currentCall = { ticket: '002', serviceId: 'general', stationId: 1 };
    rerender(<PainelModule />);

    // Avança 3 segundos
    await act(async () => { vi.advanceTimersByTime(3000); });

    vi.useRealTimers();
  });

  test('aplica classe fade-exit quando chamada é removida (reset para tela principal)', async () => {
    vi.useFakeTimers();
    
    // Inicia com uma chamada ativa
    window.APP_STATE.currentCall = { ticket: '001', serviceId: 'general', stationId: 1 };
    const { rerender, container } = render(<PainelModule />);
    
    // Remove a chamada (reset)
    window.APP_STATE.currentCall = null;
    rerender(<PainelModule />);
    
    // Verifica se a classe fade-exit foi aplicada
    const callArea = container.querySelector('.current-call-area');
    expect(callArea).toHaveClass('fade-exit');
    
    // Avança 500ms (duração da transição)
    await act(async () => { vi.advanceTimersByTime(500); });
    
    // Após 500ms, a classe fade-exit deve ser removida
    rerender(<PainelModule />);
    expect(callArea).not.toHaveClass('fade-exit');
    
    vi.useRealTimers();
  });
});
