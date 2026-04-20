import React from 'react';
import { dailyReset, fullReset, exportHistory } from '../logic/resetExport.js';

function AdminMedia() {
  const s = window.APP_STATE;
  const isElectron = !!(window.electronAPI && window.electronAPI.isElectron);
  const [localFiles, setLocalFiles] = React.useState([]);
  const [, forceRender] = React.useState(0);

  // Carrega arquivos locais da pasta media/ (apenas Electron)
  React.useEffect(() => {
    if (isElectron && window.electronAPI.listMediaFiles) {
      window.electronAPI.listMediaFiles().then(files => setLocalFiles(files || []));
    }
  }, [isElectron]);

  const handleImport = async () => {
    if (!isElectron || !window.electronAPI.importMediaFile) return;
    const imported = await window.electronAPI.importMediaFile();
    if (imported && imported.length > 0) {
      setLocalFiles(prev => {
        const names = new Set(prev.map(f => f.name));
        return [...prev, ...imported.filter(f => !names.has(f.name))];
      });
    }
  };

  const handleDeleteLocal = async (filename) => {
    if (!isElectron || !window.electronAPI.deleteMediaFile) return;
    const result = await window.electronAPI.deleteMediaFile(filename);
    if (result && result.success) {
      setLocalFiles(prev => prev.filter(f => f.name !== filename));
    }
  };

  const addSlide = (file) => {
    const exists = s.mediaItems.some(m => m.url === file.url);
    if (exists) return;
    const newItem = {
      id: String(Date.now()),
      title: file.name.replace(/\.[^.]+$/, ''),
      caption: '',
      url: file.url,
      fallbackColor: '#1e3a8a',
      duration: 6,
      active: true,
      order: s.mediaItems.length + 1,
      type: file.type,
    };
    s.mediaItems.push(newItem);
    window.dispatchUpdate();
    forceRender(n => n + 1);
  };

  const removeSlide = (id) => {
    const idx = s.mediaItems.findIndex(m => m.id === id);
    if (idx !== -1) {
      s.mediaItems.splice(idx, 1);
      window.dispatchUpdate();
      forceRender(n => n + 1);
    }
  };

  const updateSlide = (id, field, val) => {
    const item = s.mediaItems.find(m => m.id === id);
    if (item) {
      item[field] = val;
      window.dispatchUpdate();
      forceRender(n => n + 1);
    }
  };

  return (
    <div>
      {/* Arquivos locais disponíveis */}
      {isElectron && (
        <div className="admin-section">
          <div className="admin-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Arquivos na Pasta Media</span>
            <button className="btn btn-primary" style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }} onClick={handleImport}>
              📁 Importar Arquivo
            </button>
          </div>
          {localFiles.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontFamily: 'Rajdhani, sans-serif', padding: '1rem 0' }}>
              Nenhum arquivo na pasta media/. Clique em "Importar Arquivo" para adicionar imagens ou vídeos.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
              {localFiles.map(file => {
                const inUse = s.mediaItems.some(m => m.url === file.url);
                return (
                  <div key={file.name} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    {file.type === 'video' ? (
                      <video src={file.url} style={{ width: '100%', height: '100px', objectFit: 'cover' }} muted />
                    ) : (
                      <img src={file.url} alt={file.name} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                    )}
                    <div style={{ padding: '0.5rem', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.8rem' }}>
                      <div style={{ color: 'var(--text-secondary)', marginBottom: '0.4rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
                        {file.name}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          className="btn btn-success"
                          style={{ flex: 1, fontSize: '0.75rem', padding: '0.25rem 0.5rem', opacity: inUse ? 0.4 : 1 }}
                          disabled={inUse}
                          onClick={() => addSlide(file)}
                        >
                          {inUse ? '✓ Adicionado' : '+ Slide'}
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          onClick={() => handleDeleteLocal(file.name)}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Slides ativos no carrossel */}
      <div className="admin-section">
        <div className="admin-section-title">Slides do Carrossel</div>
        {s.mediaItems.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontFamily: 'Rajdhani, sans-serif', padding: '1rem 0' }}>
            Nenhum slide configurado.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
            {s.mediaItems.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', padding: '0.75rem', border: '1px solid var(--border)' }}>
                {/* Preview */}
                <div style={{ width: '80px', height: '50px', flexShrink: 0, borderRadius: '4px', overflow: 'hidden', background: item.url ? 'transparent' : item.fallbackColor }}>
                  {item.url && item.type === 'video' ? (
                    <video src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                  ) : item.url ? (
                    <img src={item.url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem' }}>Cor</div>
                  )}
                </div>
                {/* Campos */}
                <div style={{ flex: 1, display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    style={{ flex: '2', minWidth: '120px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.3rem 0.5rem', fontFamily: 'Rajdhani, sans-serif', color: 'var(--text-primary)' }}
                    value={item.title}
                    placeholder="Título"
                    onChange={e => updateSlide(item.id, 'title', e.target.value)}
                  />
                  <input
                    style={{ flex: '2', minWidth: '120px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.3rem 0.5rem', fontFamily: 'Rajdhani, sans-serif', color: 'var(--text-primary)' }}
                    value={item.caption}
                    placeholder="Legenda (opcional)"
                    onChange={e => updateSlide(item.id, 'caption', e.target.value)}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <span>⏱</span>
                    <input
                      type="number"
                      min="2"
                      max="60"
                      style={{ width: '55px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.3rem 0.4rem', fontFamily: 'Rajdhani, sans-serif', color: 'var(--text-primary)', textAlign: 'center' }}
                      value={item.duration}
                      onChange={e => updateSlide(item.id, 'duration', Number(e.target.value))}
                    />
                    <span>s</span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={item.active} onChange={e => updateSlide(item.id, 'active', e.target.checked)} />
                    Ativo
                  </label>
                </div>
                <button className="btn btn-danger" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', flexShrink: 0 }} onClick={() => removeSlide(item.id)}>
                  🗑 Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminDashboard() {
  const s = window.APP_STATE;
  const activeCount = s.services.filter(sv => sv.active).length;
  const statusLabel = activeCount === 2 ? 'Operacional' : activeCount === 1 ? 'Parcial' : 'Indisponível';

  const totalIssued = s.services.reduce((a, sv) => a + sv.counter, 0);
  const totalCalled = s.called.length;
  const waiting = s.queue.length;
  const activeStations = s.stations.filter(st => st.active).length;

  return (
    <div>
      <div className="metrics-grid">
        <div className="metric-card"><div className="metric-label">Emitidas hoje</div><div className="metric-value">{totalIssued}</div></div>
        <div className="metric-card"><div className="metric-label">Chamadas hoje</div><div className="metric-value">{totalCalled}</div></div>
        <div className="metric-card"><div className="metric-label">Aguardando</div><div className="metric-value">{waiting}</div></div>
        <div className="metric-card"><div className="metric-label">Guichês ativos</div><div className="metric-value">{activeStations}</div></div>
        {s.services.filter(sv => sv.active).map(svc => (
          <div key={svc.id} className="metric-card">
            <div className="metric-label">{svc.label} na fila</div>
            <div className="metric-value">{s.queue.filter(q => q.serviceId === svc.id).length}</div>
          </div>
        ))}
        <div className="metric-card"><div className="metric-label">Status</div><div>{statusLabel}</div></div>
      </div>
    </div>
  );
}

function AdminServices() {
  const s = window.APP_STATE;
  const [, forceRender] = React.useState(0);

  const update = (id, field, val) => {
    const svc = s.services.find(sv => sv.id === id);
    if (svc) { svc[field] = val; window.dispatchUpdate(); forceRender(n => n + 1); }
  };

  return (
    <div>
      <div className="admin-section">
        <div className="admin-section-title">Tipos de Senha</div>
        {s.services.map(svc => (
          <div key={svc.id} className="service-editor-row">
            <label className="toggle">
              <input
                type="checkbox"
                checked={svc.active}
                onChange={e => update(svc.id, 'active', e.target.checked)}
                aria-label={`Ativar ${svc.label}`}
              />
              <span className="toggle-slider" />
            </label>
            <span>{svc.label}</span>
            <span>Contador: {svc.counter}</span>
            <span>Prioridade: {svc.priority}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminStations() {
  const s = window.APP_STATE;
  const [, forceRender] = React.useState(0);

  return (
    <div>
      <div className="admin-section">
        <div className="admin-section-title">Total de Guichês</div>
        {s.stations.map(st => (
          <div key={st.id} className="station-editor-row">
            <label className="toggle">
              <input
                type="checkbox"
                checked={st.active}
                onChange={e => { st.active = e.target.checked; window.dispatchUpdate(); forceRender(n => n + 1); }}
                aria-label={`Ativar ${st.label}`}
              />
              <span className="toggle-slider" />
            </label>
            <span>{st.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminSettings() {
  const s = window.APP_STATE;
  const isElectron = !!(window.electronAPI && window.electronAPI.isElectron);
  const [form, setForm] = React.useState({
    ...s.config,
    workingHoursStart: s.config.workingHours?.start || '08:00',
    workingHoursEnd:   s.config.workingHours?.end   || '18:00',
    printerPort: s.config.printerPort || '',
  });
  const [availablePorts, setAvailablePorts] = React.useState([]);
  const [printerStatus, setPrinterStatus] = React.useState(null);
  const [testMsg, setTestMsg] = React.useState('');

  // Carrega portas disponíveis
  React.useEffect(() => {
    if (isElectron && window.electronAPI.listPrinterPorts) {
      window.electronAPI.listPrinterPorts().then(ports => setAvailablePorts(ports || []));
    }
  }, [isElectron]);

  // Carrega porta salva
  React.useEffect(() => {
    if (isElectron && window.electronAPI.getPrinterPort) {
      window.electronAPI.getPrinterPort().then(port => {
        if (port) setForm(f => ({ ...f, printerPort: port }));
      });
    }
  }, [isElectron]);

  const save = () => {
    s.config.unitName      = form.unitName;
    s.config.sectorName    = form.sectorName;
    s.config.welcomeMessage = form.welcomeMessage;
    s.config.footerMessage  = form.footerMessage;
    s.config.workingHours   = { start: form.workingHoursStart, end: form.workingHoursEnd };
    s.config.printerPort    = form.printerPort;
    window.dispatchUpdate();
    // Aplica porta no processo main imediatamente
    if (isElectron && window.electronAPI.setPrinterPort) {
      window.electronAPI.setPrinterPort(form.printerPort);
    }
  };

  const checkPrinter = async () => {
    if (!isElectron || !window.electronAPI.checkPrinterWMI) return;
    setPrinterStatus('verificando...');
    const status = await window.electronAPI.checkPrinterWMI();
    const labels = { ok: '✅ OK — Pronta para imprimir', 'out-of-paper': '🔴 Sem papel', offline: '🟡 Offline', error: '🔴 Erro' };
    setPrinterStatus(labels[status] || status);
  };

  const testPrint = async () => {
    if (!isElectron) return;
    setTestMsg('Enviando teste...');
    // Monta ticket de teste
    const ticketObj = { ticket: 'TESTE', serviceId: 'general' };
    const result = await window.electronAPI.printTicket({ ticket: ticketObj, state: s });
    setTestMsg(result.success ? '✅ Enviado! Verifique a impressora.' : '❌ Falha ao enviar.');
    setTimeout(() => setTestMsg(''), 4000);
  };

  return (
    <div>
      {/* Impressora */}
      <div className="admin-section">
        <div className="admin-section-title">🖨️ Impressora</div>
        <div className="settings-form">
          <div className="settings-field">
            <label className="settings-label">Porta da Impressora</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                className="settings-input"
                style={{ flex: 1 }}
                value={form.printerPort}
                placeholder="Ex: TMUSB001, USB001, COM3 (vazio = automático)"
                onChange={e => setForm(f => ({ ...f, printerPort: e.target.value }))}
              />
              {availablePorts.length > 0 && (
                <select
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.4rem 0.5rem', fontFamily: 'Rajdhani, sans-serif', color: 'var(--text-primary)', cursor: 'pointer' }}
                  value=""
                  onChange={e => { if (e.target.value) setForm(f => ({ ...f, printerPort: e.target.value })); }}
                >
                  <option value="">Selecionar...</option>
                  {availablePorts.map(p => (
                    <option key={p.port} value={p.port}>
                      {p.isDefault ? '★ ' : ''}{p.name} ({p.port})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              Deixe vazio para detecção automática pela impressora padrão do Windows.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-secondary" onClick={checkPrinter}>🔍 Verificar Status</button>
            <button className="btn btn-info" onClick={testPrint}>🖨️ Imprimir Teste</button>
            {printerStatus && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '1rem' }}>{printerStatus}</span>}
            {testMsg && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '1rem' }}>{testMsg}</span>}
          </div>
        </div>
      </div>

      {/* Configurações Gerais */}
      <div className="admin-section">
        <div className="admin-section-title">Configurações Gerais</div>
        <div className="settings-form">
          <div className="settings-field">
            <label className="settings-label">Nome da Unidade</label>
            <input className="settings-input" value={form.unitName || ''} onChange={e => setForm(f => ({ ...f, unitName: e.target.value }))} />
          </div>
          <div className="settings-field">
            <label className="settings-label">Nome do Setor</label>
            <input className="settings-input" value={form.sectorName || ''} onChange={e => setForm(f => ({ ...f, sectorName: e.target.value }))} />
          </div>
          <button className="btn btn-primary" onClick={save}>Salvar Configurações</button>
        </div>
      </div>
      <div className="admin-section">
        <div className="admin-section-title">Operações de Reset e Exportação</div>
        <div className="reset-buttons">
          <button onClick={() => { if (window.confirm('Confirma reset diário?')) dailyReset(); }}>🔄 Reset Diário</button>
          <button onClick={() => { if (window.confirm('Reset completo?') && window.confirm('Tem certeza?')) fullReset(); }}>⚠️ Reset Completo</button>
          <button onClick={exportHistory}>📥 Exportar Histórico JSON</button>
        </div>
      </div>
    </div>
  );
}

export function AdminModule() {
  const [tab, setTab] = React.useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'services',  label: '🎫 Tipos de Senha' },
    { id: 'media',     label: '🖼 Mídia Indoor' },
    { id: 'stations',  label: '🏢 Guichês' },
    { id: 'settings',  label: '⚙️ Configurações' },
  ];

  return (
    <div className="admin">
      <div className="admin-header">
        <div className="admin-header-title">Painel de senha do Ni — Administrador</div>
      </div>
      <div className="admin-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`admin-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'dashboard' && <AdminDashboard />}
      {tab === 'services'  && <AdminServices />}
      {tab === 'media'     && <AdminMedia />}
      {tab === 'stations'  && <AdminStations />}
      {tab === 'settings'  && <AdminSettings />}
    </div>
  );
}
