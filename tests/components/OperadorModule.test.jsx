import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OperadorModule } from '../../src/components/OperadorModule.jsx';
import { generateTicket } from '../../src/logic/generateTicket.js';
import { callNext } from '../../src/logic/callNext.js';

describe('OperadorModule', () => {
  test('seletor de guichê exibe todos os guichês ativos', () => {
    render(<OperadorModule />);
    expect(screen.getByRole('option', { name: 'Guichê 1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Guichê 2' })).toBeInTheDocument();
  });

  test('botão "Chamar Próxima Senha" está desabilitado com fila vazia', () => {
    render(<OperadorModule />);
    expect(screen.getByText('🔔 Chamar Próxima Senha')).toBeDisabled();
  });

  test('botão "Chamar Próxima Senha" está habilitado com tickets na fila', () => {
    generateTicket('general');
    render(<OperadorModule />);
    expect(screen.getByText('🔔 Chamar Próxima Senha')).not.toBeDisabled();
  });

  test('clique em "Chamar Próxima Senha" chama callNext com stationId do guichê selecionado', () => {
    generateTicket('general');
    render(<OperadorModule />);
    fireEvent.click(screen.getByText('🔔 Chamar Próxima Senha'));
    expect(window.APP_STATE.currentCall).not.toBeNull();
    expect(window.APP_STATE.currentCall.stationId).toBe(1);
  });

  test('botão "Repetir Chamada" está desabilitado quando currentCall é null', () => {
    render(<OperadorModule />);
    expect(screen.getByText('🔁 Repetir Chamada')).toBeDisabled();
  });

  test('clique em "Repetir Chamada" invoca repeatCall quando currentCall está preenchido', () => {
    window.APP_STATE.currentCall = { ticket: '001', serviceId: 'general', stationId: 1 };
    render(<OperadorModule />);
    fireEvent.click(screen.getByText('🔁 Repetir Chamada'));
    expect(window.dispatchUpdate).toHaveBeenCalled();
  });

  test('botão de chamada específica é exibido para cada serviço ativo', () => {
    render(<OperadorModule />);
    expect(screen.getByText('Chamar Geral')).toBeInTheDocument();
    expect(screen.getByText('Chamar Preferencial')).toBeInTheDocument();
  });

  test('clique em botão de serviço específico chama callNext com stationId e serviceId corretos', () => {
    generateTicket('general');
    render(<OperadorModule />);
    fireEvent.click(screen.getByText('Chamar Geral'));
    expect(window.APP_STATE.currentCall?.serviceId).toBe('general');
    expect(window.APP_STATE.currentCall?.stationId).toBe(1);
  });

  test('tabela de histórico exibe chamadas em ordem decrescente de tempo', () => {
    generateTicket('general');
    callNext(1);
    generateTicket('general');
    callNext(1);
    render(<OperadorModule />);
    const rows = screen.getAllByRole('row');
    // Primeira linha de dados (índice 1, após o header) deve ser a mais recente
    expect(rows[1]).toHaveTextContent('02');
    expect(rows[2]).toHaveTextContent('01');
  });

  test('exibe "Nenhuma chamada realizada" quando called está vazio', () => {
    render(<OperadorModule />);
    expect(screen.getByText('Nenhuma chamada realizada')).toBeInTheDocument();
  });
});
