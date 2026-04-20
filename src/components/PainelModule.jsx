import React from 'react';

export function MediaCarousel({ paused }) {
  const s = window.APP_STATE;
  const activeSlides = s.mediaItems
    .filter(m => m.active)
    .sort((a, b) => a.order - b.order);
  const [idx, setIdx] = React.useState(0);

  React.useEffect(() => {
    if (activeSlides.length === 0 || paused) return;
    const slide = activeSlides[idx] || activeSlides[0];
    const duration = (slide?.duration || 6) * 1000;
    const t = setTimeout(() => setIdx(i => (i + 1) % activeSlides.length), duration);
    return () => clearTimeout(t);
  }, [idx, paused, activeSlides.length]);

  if (activeSlides.length === 0) return null;
  const slide = activeSlides[idx % activeSlides.length];

  const bgStyle = slide.url
    ? { backgroundImage: `url(${slide.url})` }
    : { background: slide.fallbackColor };

  return (
    <div className="media-carousel">
      <div className="media-slide" style={bgStyle}>
        <div className="media-slide-overlay" />
        <div className="media-slide-content">
          <div className="media-slide-title">{slide.title}</div>
          {slide.caption && <div className="media-slide-caption">{slide.caption}</div>}
        </div>
      </div>
      <div className="media-dots">
        {activeSlides.map((_, i) => (
          <div key={i} className={`media-dot${i === idx % activeSlides.length ? ' active' : ''}`} />
        ))}
      </div>
    </div>
  );
}

export function PainelModule() {
  const s = window.APP_STATE;
  const [flash, setFlash] = React.useState(false);
  const [fadeOut, setFadeOut] = React.useState(false);
  const [clock, setClock] = React.useState(new Date());
  const [mediaPaused, setMediaPaused] = React.useState(false);
  const prevCallRef = React.useRef(null);

  React.useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  React.useEffect(() => {
    const cur = s.currentCall;
    const prev = prevCallRef.current;
    
    // Detecta quando a chamada é removida (reset para tela principal)
    if (prev && !cur) {
      setFadeOut(true);
      setTimeout(() => {
        setFadeOut(false);
        prevCallRef.current = null;
      }, 500);
      return;
    }
    
    // Detecta nova chamada
    if (cur && JSON.stringify(cur) !== JSON.stringify(prev)) {
      prevCallRef.current = cur;
      setFlash(true);
      if (s.config.pauseMediaOnCall) {
        setMediaPaused(true);
        setTimeout(() => setMediaPaused(false), 3000);
      }
      setTimeout(() => setFlash(false), 1200);
    }
  });

  const cur = s.currentCall;
  const curService = cur ? s.services.find(sv => sv.id === cur.serviceId) : null;
  const curStation = cur ? s.stations.find(st => st.id === cur.stationId) : null;

  const recentCalls = [...s.called].reverse().slice(0, 5);

  const dateStr = clock.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = clock.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="painel">
      <div className="painel-header">
        <span className="painel-header-sector">{s.config.sectorName}</span>
        <span>{s.config.unitName}</span>
      </div>
      <div className="painel-body">
        <div className="painel-main">
          <div className={`current-call-area${fadeOut ? ' fade-exit' : ''}`}>
            {cur ? (
              <>
                <div className="current-call-label">Senha Atual</div>
                <div
                  className={`current-call-number${flash ? ' flash' : ''}`}
                  style={{ color: curService?.color || 'var(--accent)' }}
                >
                  {cur.ticket}
                </div>
                <span
                  className="current-call-type"
                  style={{ background: curService?.color || 'var(--accent)' }}
                >
                  {curService?.label || cur.serviceId}
                </span>
                <div className="current-call-station">
                  {curStation?.label || `Guichê ${cur.stationId}`}
                </div>
              </>
            ) : (
              <div className="painel-waiting">
                <div style={{ fontSize: '4rem' }}>🎫</div>
                <div className="painel-waiting-text">Aguardando chamada...</div>
              </div>
            )}
          </div>
          <div className="queue-counters">
            {s.services.filter(sv => sv.active).map(svc => {
              const count = s.queue.filter(q => q.serviceId === svc.id).length;
              return (
                <div key={svc.id} className="queue-counter-card" style={{ borderColor: svc.color }}>
                  <div className="queue-counter-value" style={{ color: svc.color }}>{count}</div>
                  <div className="queue-counter-label">{svc.label} aguardando</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="painel-sidebar">
          <div className="recent-calls">
            <div className="recent-calls-title">Últimas chamadas</div>
            {recentCalls.length === 0 ? (
              <div>Nenhuma chamada ainda</div>
            ) : recentCalls.map((c, i) => {
              const svc = s.services.find(sv => sv.id === c.serviceId);
              const st = s.stations.find(st => st.id === c.stationId);
              const t = new Date(c.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={i} className="recent-call-item">
                  <span className="recent-call-ticket" style={{ color: svc?.color }}>{c.ticket}</span>
                  <span className="recent-call-meta">{svc?.label} · {st?.label || `G${c.stationId}`} · {t}</span>
                </div>
              );
            })}
          </div>
          <MediaCarousel paused={mediaPaused} />
        </div>
      </div>
      <div className="painel-footer">
        <span>{s.config.footerMessage}</span>
        <span>{dateStr} · {timeStr}</span>
      </div>
    </div>
  );
}
