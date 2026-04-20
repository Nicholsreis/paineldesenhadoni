import React from 'react';
import { callNext } from '../logic/callNext.js';
import { repeatCall } from '../logic/repeatCall.js';

export function OperadorModule() {
  const s = window.APP_STATE;
  const activeStations = s.stations.filter(st => st.active);
  const [stationId, setStationId] = React.useState(activeStations[0]?.id || 1);

  const allEmpty = s.queue.length === 0;

  return (
    <div className="operador">
      <div className="operador-header">
        <div className="operador-header-title">Painel de senha do Ni — Operador</div>
        <div className="operador-station-selector">
          <span>Guichê:</span>
          <select value={stationId} onChange={e => setStationId(Number(e.target.value))}>
            {activeStations.map(st => (
              <option key={st.id} value={st.id}>{st.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="operador-summary-cards">
        {s.services.filter(sv => sv.active).map(svc => {
          const count = s.queue.filter(q => q.serviceId === svc.id).length;
          const lastCalled = [...s.called].reverse().find(c => c.serviceId === svc.id);
          return (
            <div key={svc.id} className="summary-card" style={{ borderLeftColor: svc.color }}>
              <div className="summary-card-label">{svc.label}</div>
              <div className="summary-card-count" style={{ color: svc.color }}>{count}</div>
              {count === 0
                ? <div className="summary-card-empty">⚠ Fila vazia</div>
                : <div className="summary-card-last">na fila</div>
              }
              {lastCalled && (
                <div className="summary-card-last">Última: <strong>{lastCalled.ticket}</strong></div>
              )}
            </div>
          );
        })}
      </div>

      <div className="operador-controls">
        <button
          className="btn btn-primary"
          disabled={allEmpty}
          onClick={() => callNext(stationId)}
        >
          🔔 Chamar Próxima Senha
        </button>
        <button
          className="btn btn-secondary"
          disabled={!s.currentCall}
          onClick={() => repeatCall()}
        >
          🔁 Repetir Chamada
        </button>
        {s.services.filter(sv => sv.active).map(svc => {
          const empty = s.queue.filter(q => q.serviceId === svc.id).length === 0;
          return (
            <button
              key={svc.id}
              className="btn"
              style={{ background: svc.color, color: '#fff', opacity: empty ? 0.4 : 1 }}
              disabled={empty}
              onClick={() => callNext(stationId, svc.id)}
            >
              Chamar {svc.label}
            </button>
          );
        })}
      </div>

      <div>
        <table className="call-history-table">
          <thead>
            <tr>
              <th>Senha</th>
              <th>Tipo</th>
              <th>Guichê</th>
              <th>Horário</th>
            </tr>
          </thead>
          <tbody>
            {s.called.length === 0 ? (
              <tr><td colSpan="4">Nenhuma chamada realizada</td></tr>
            ) : [...s.called].reverse().map((c, i) => {
              const svc = s.services.find(sv => sv.id === c.serviceId);
              const st = s.stations.find(st => st.id === c.stationId);
              const t = new Date(c.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              return (
                <tr key={i}>
                  <td><span className="ticket-badge" style={{ color: svc?.color }}>{c.ticket}</span></td>
                  <td><span className="type-badge" style={{ background: svc?.color }}>{svc?.label || c.serviceId}</span></td>
                  <td>{st?.label || `Guichê ${c.stationId}`}</td>
                  <td>{t}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
