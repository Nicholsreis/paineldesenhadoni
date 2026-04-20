import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { TotemModule, TicketModal, PaperOutCard } from '../../src/components/TotemModule.jsx';

describe('TotemModule', () => {
  test('renderiza botão para cada serviço ativo', () => {
    render(<TotemModule />);
    expect(screen.getByText('Geral')).toBeInTheDocument();
    expect(screen.getByText('Preferencial')).toBeInTheDocument();
  });

  test('exibe mensagem de indisponibilidade quando nenhum serviço está ativo', () => {
    window.APP_STATE.services.forEach(s => { s.active = false; });
    render(<TotemModule />);
    expect(screen.getByText(/Sistema temporariamente indisponível/)).toBeInTheDocument();
    expect(screen.queryByText('Geral')).not.toBeInTheDocument();
  });

  test('clique em botão de serviço exibe TicketModal com o ticket gerado', async () => {
    render(<TotemModule />);
    fireEvent.click(screen.getByText('Geral'));
    await waitFor(() => {
      expect(screen.getByText('01')).toBeInTheDocument();
    });
  });

  test('TicketModal exibe ticket, nome do serviço, data/hora e quantidade à frente', async () => {
    render(<TotemModule />);
    fireEvent.click(screen.getByText('Geral'));
    await waitFor(() => {
      expect(screen.getByText('01')).toBeInTheDocument();
      // "Geral" aparece no botão e no modal — verifica que há pelo menos 2 ocorrências
      expect(screen.getAllByText('Geral').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText(/à sua frente/)).toBeInTheDocument();
    });
  });

  test('botão Fechar do TicketModal fecha o modal', async () => {
    render(<TotemModule />);
    fireEvent.click(screen.getByText('Geral'));
    await waitFor(() => expect(screen.getByText('01')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Fechar'));
    await waitFor(() => {
      expect(screen.queryByText('01')).not.toBeInTheDocument();
    });
  });

  test('TicketModal fecha automaticamente após 6 segundos', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    render(<TotemModule />);
    fireEvent.click(screen.getByText('Geral'));
    // Aguarda as Promises (checkPrinterWMI + printTicket) resolverem
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    // Agora o modal deve estar aberto — avança o timer para fechar
    await act(async () => { vi.advanceTimersByTime(6000); });
    expect(screen.queryByText('01')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  test('PaperOutCard exibido com mensagem de sem papel quando status é out', async () => {
    window.electronAPI.getPaperStatus.mockResolvedValue('out');
    render(<TotemModule />);
    await waitFor(() => {
      expect(screen.getByText('Sem Papel')).toBeInTheDocument();
    });
  });

  test('PaperOutCard exibido com mensagem de papel acabando quando status é near', async () => {
    window.electronAPI.getPaperStatus.mockResolvedValue('near');
    render(<TotemModule />);
    await waitFor(() => {
      expect(screen.getByText('Papel Acabando')).toBeInTheDocument();
    });
  });

  test('TicketModal não é exibido quando PaperOutCard está visível com status out', async () => {
    window.electronAPI.getPaperStatus.mockResolvedValue('out');
    render(<TotemModule />);
    await waitFor(() => expect(screen.getByText('Sem Papel')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Geral'));
    expect(screen.queryByText('01')).not.toBeInTheDocument();
  });

  test('botão de dispensar do PaperOutCard remove o card', async () => {
    window.electronAPI.getPaperStatus.mockResolvedValue('near');
    render(<TotemModule />);
    await waitFor(() => expect(screen.getByText('Papel Acabando')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Entendido'));
    await waitFor(() => {
      expect(screen.queryByText('Papel Acabando')).not.toBeInTheDocument();
    });
  });
});

describe('TicketModal', () => {
  const service = { id: 'general', label: 'Geral', color: '#2563eb' };

  test('exibe número do ticket', () => {
    const onClose = vi.fn();
    render(<TicketModal ticket="042" service={service} onClose={onClose} />);
    expect(screen.getByText('042')).toBeInTheDocument();
  });

  test('exibe label do serviço', () => {
    const onClose = vi.fn();
    render(<TicketModal ticket="042" service={service} onClose={onClose} />);
    expect(screen.getByText('Geral')).toBeInTheDocument();
  });
});

describe('PaperOutCard', () => {
  test('exibe título Sem Papel para status out', () => {
    render(<PaperOutCard status="out" onDismiss={vi.fn()} />);
    expect(screen.getByText('Sem Papel')).toBeInTheDocument();
  });

  test('exibe título Papel Acabando para status near', () => {
    render(<PaperOutCard status="near" onDismiss={vi.fn()} />);
    expect(screen.getByText('Papel Acabando')).toBeInTheDocument();
  });

  test('chama onDismiss ao clicar no botão', () => {
    const onDismiss = vi.fn();
    render(<PaperOutCard status="near" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByText('Entendido'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
