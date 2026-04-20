import React from 'react';
import { generateTicket } from '../logic/generateTicket.js';

// printTicket — impressão direta (Electron via ESC/POS raw) ou via janela (browser)
// Retorna Promise<boolean> no Electron (true = sucesso, false = falha)
function printTicket(ticketNumber, service, onPaperOut) {
  const s = window.APP_STATE;

  if (window.electronAPI && window.electronAPI.isElectron) {
    // Monta objeto ticket compatível com generateTicketBuffer() no main.js
    const ticketObj = {
      ticket: ticketNumber,
      serviceId: service.id,
    };
    return window.electronAPI.printTicket({ ticket: ticketObj, state: s }).then(result => {
      if (!result.success && onPaperOut) {
        onPaperOut('out');
        return false;
      }
      return true;
    }).catch(err => {
      console.error('[printTicket] Erro:', err);
      if (onPaperOut) onPaperOut('out');
      return false;
    });
  }

  // Fallback web: abre janela de impressão com HTML
  const queueAhead = s.queue.filter(q => q.serviceId === service.id).length;
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/><title>Comprovante ${ticketNumber}</title></head>
<body>
<div>
  <div>${s.config.unitName}</div>
  <div>${s.config.sectorName}</div>
  <div>${ticketNumber}</div>
  <div>${service.label}</div>
  <div>${dateStr} | ${timeStr}</div>
  <div>Senhas na frente: ${queueAhead}</div>
  <div>${s.config.welcomeMessage}</div>
</div>
</body>
</html>`;
  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) return Promise.resolve(true);
  win.document.write(html);
  win.document.close();
  return Promise.resolve(true);
}

export function TicketModal({ ticket, service, onClose }) {
  const s = window.APP_STATE;
  const queueAhead = s.queue.filter(q => q.serviceId === service.id).length;
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  React.useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-ticket" onClick={e => e.stopPropagation()}>
        <div className="modal-timer-bar" />
        <div className="modal-sector">{s.config.sectorName}</div>
        <div className="modal-ticket-number" style={{ color: service.color }}>{ticket}</div>
        <span className="modal-service-label" style={{ background: service.color }}>{service.label}</span>
        <div className="modal-info">📅 {dateStr} às {timeStr}</div>
        <div className="modal-info">⏳ {queueAhead} senha{queueAhead !== 1 ? 's' : ''} à sua frente</div>
        <div className="modal-welcome">{s.config.welcomeMessage}</div>
        <button className="modal-close-btn" onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}

export function ServiceButton({ service, onTicketGenerated, onPaperOut }) {
  const icon = service.id === 'priority' ? '⭐' : '🎫';
  
  const handleClick = async () => {
    const isElectron = window.electronAPI && window.electronAPI.isElectron;
    
    console.log('[ServiceButton] Click - isElectron:', isElectron);
    
    // Check printer status via WMI before printing (Bug Fix: Task 5.2)
    if (isElectron && window.electronAPI.checkPrinterWMI) {
      try {
        console.log('[ServiceButton] Verificando status da impressora via WMI...');
        const status = await window.electronAPI.checkPrinterWMI();
        console.log('[ServiceButton] Status WMI retornado:', status);
        
        // Block printing if printer is not ready
        if (status === 'out-of-paper') {
          console.log('[ServiceButton] BLOQUEADO: Impressora sem papel');
          onPaperOut('out');
          return;
        }
        
        if (status === 'offline' || status === 'error') {
          console.log('[ServiceButton] BLOQUEADO: Impressora offline/erro');
          onPaperOut(status);
          return;
        }
        
        console.log('[ServiceButton] Status OK, prosseguindo com impressão...');
        // If status is 'ok', proceed with printing
      } catch (error) {
        console.error('[ServiceButton] WMI check failed:', error);
        // Continue with printing if WMI check fails (fallback behavior)
      }
    } else {
      console.log('[ServiceButton] WMI não disponível, prosseguindo sem verificação');
    }
    
    // Generate and print ticket
    const ticket = generateTicket(service.id);
    console.log('[ServiceButton] Senha gerada:', ticket);
    if (ticket) {
      const printResult = await printTicket(ticket, service, onPaperOut);
      // Só notifica sucesso se a impressão foi bem-sucedida (ou se não é Electron)
      if (printResult !== false) {
        onTicketGenerated(ticket, service);
      }
    }
  };
  
  return (
    <button
      className="service-btn"
      style={{ background: service.color }}
      onClick={handleClick}
    >
      <span className="service-btn-icon">{icon}</span>
      <span>{service.label}</span>
    </button>
  );
}

export function PaperOutCard({ status, onDismiss }) {
  const isNear = status === 'near';
  return (
    <div className="paper-out-overlay">
      <div className="paper-out-card">
        <span className="paper-out-icon">{isNear ? '⚠️' : '🖨️'}</span>
        <div className="paper-out-title">
          {isNear ? 'Papel Acabando' : 'Sem Papel'}
        </div>
        <div className="paper-out-msg">
          {isNear
            ? 'O papel da impressora está acabando. Avise o responsável para repor em breve.'
            : 'A impressora está sem papel. Não é possível emitir senhas no momento. Avise o responsável para repor o papel.'}
        </div>
        <button className="paper-out-dismiss" onClick={onDismiss}>
          {isNear ? 'Entendido' : 'Papel Reposto — Continuar'}
        </button>
      </div>
    </div>
  );
}

export function TotemModule() {
  const s = window.APP_STATE;
  const [modal, setModal] = React.useState(null);
  const [paperStatus, setPaperStatus] = React.useState(null);
  const activeServices = s.services.filter(sv => sv.active);
  const isElectron = !!(window.electronAPI && window.electronAPI.isElectron);

  React.useEffect(() => {
    if (isElectron) {
      window.electronAPI.getPaperStatus().then(status => {
        if (status !== 'ok') setPaperStatus(status);
      });
      window.electronAPI.onPaperStatusChange((status) => {
        setPaperStatus(status === 'ok' ? null : status);
      });
      return () => window.electronAPI.offPaperStatusChange();
    }
  }, [isElectron]);

  return (
    <div className="totem">
      <div className="totem-sector">{s.config.sectorName}</div>
      <div className="totem-instruction">Toque para retirar sua senha</div>
      {activeServices.length === 0 ? (
        <div className="totem-unavailable">⚠️ Sistema temporariamente indisponível</div>
      ) : (
        <div className="totem-buttons">
          {activeServices.map(svc => (
            <ServiceButton
              key={svc.id}
              service={svc}
              onPaperOut={(status) => setPaperStatus(status)}
              onTicketGenerated={(ticket, service) => {
                if (paperStatus === 'out') return;
                setModal({ ticket, service });
              }}
            />
          ))}
        </div>
      )}
      {modal && (
        <TicketModal
          ticket={modal.ticket}
          service={modal.service}
          onClose={() => setModal(null)}
        />
      )}
      {paperStatus && (
        <PaperOutCard
          status={paperStatus}
          onDismiss={() => setPaperStatus(null)}
        />
      )}
    </div>
  );
}
