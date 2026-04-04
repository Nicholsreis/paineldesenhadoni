# BALCÃO Senhas — Documento de Continuidade

## Estado atual do projeto (04/04/2026)

### O que foi feito

**Sistema base (index.html)**
- Aplicação React 18 + Babel Standalone em arquivo único
- 4 módulos: Totem, Painel, Operador, Administrador
- Tema claro (white) com variáveis CSS
- Estado global em memória (`window.APP_STATE`)
- Navegação por abas (NavBar) ou por parâmetro `?mode=` na URL

**Módulo Totem**
- Botões de senha (Geral e Preferencial) com cores configuráveis
- Geração de senha sequencial 001–999 com ciclo contínuo (sem prefixo)
- Modal de comprovante com auto-close em 6 segundos
- Card de aviso de papel vazio (`PaperOutCard`) — estados: `near` e `out`
- Impressão direta via Electron (sem diálogo) ou fallback via `window.print()`

**Módulo Painel**
- Senha atual em destaque (fonte 10rem, animação flash)
- Histórico das últimas 5 chamadas
- Contadores por tipo de senha
- Carrossel de mídia indoor com slides configuráveis
- Pausa do carrossel ao chamar senha (configurável)
- Rodapé com data/hora em tempo real

**Módulo Operador**
- Cards de resumo por tipo com indicador de fila vazia
- Botões: Chamar Próxima, Repetir, Chamar Geral, Chamar Preferencial
- Seletor de guichê ativo
- Tabela de histórico de chamadas

**Módulo Administrador**
- Dashboard com métricas em tempo real e gráfico de emissões por hora
- Gerenciamento de tipos de senha (toggle, editar label/cor/prioridade, zerar contador)
- Gerenciamento de mídia indoor (adicionar, editar, reordenar, excluir slides)
- Gerenciamento de guichês (1–20, toggle, label)
- Configurações gerais (unitName, sectorName, welcomeMessage, footerMessage, horário)
- Reset diário (zera filas e contadores) e reset completo (restaura fábrica)
- Exportar histórico como JSON

**Electron (main.js + preload.js)**
- Impressão direta `silent: true` na impressora padrão sem diálogo
- Altura do cupom calculada dinamicamente via `document.body.scrollHeight`
- Detecção automática da impressora K80 Tornado via porta serial (VendorId `0x0DD4`)
- Polling ESC/POS a cada 5s para status de papel (`DLE EOT 0x04`)
- IPC: `print-ticket`, `get-paper-status`, `get-printer-ports`, `printer-paper-status`
- Modo kiosk automático para `--mode=totem` e `--mode=painel`
- Reconexão automática da impressora

**Firebase (opcional)**
- Integração com Firebase Realtime Database para sincronização entre estações
- Cada estação abre `index.html?mode=totem|painel|operador|admin`
- Fallback local se Firebase não configurado
- Config em `FIREBASE_CONFIG` no início do `index.html`

**Impressora K80 Tornado (Custom)**
- Papel 80mm, largura de impressão 72mm
- CSS do cupom: Arial, negrito, `@page { size: 80mm auto }`
- Detecção de papel via serialport (Node.js) no Electron

---

## Pendências / Próximos passos

- [ ] Testar detecção de papel vazio com a K80 conectada (cabo USB/Serial)
- [ ] Ajustar `padding-bottom` do cupom se ainda sobrar espaço após o corte da guilhotina
- [ ] Configurar Firebase (criar projeto, colar credenciais no `FIREBASE_CONFIG`)
- [ ] Testar sincronização entre estações na rede local
- [ ] Gerar instalador Windows: `npm run build`
- [ ] Configurar atalhos por estação no Desktop (ver `ELECTRON.md`)
- [ ] Definir impressora padrão no Windows como a K80 Tornado
- [ ] Testar modo kiosk no Totem (tela cheia, sem barra de endereço)
- [ ] Adicionar ícone do app (`assets/icon.ico`) para o instalador

---

## Estrutura de arquivos

```
PAINEL D SENHA PARA FRUTAS SECAS/
├── index.html          ← aplicação completa (React + CSS + lógica)
├── main.js             ← processo principal Electron
├── preload.js          ← bridge IPC Electron ↔ frontend
├── package.json        ← dependências e scripts
├── INSTALACAO.md       ← guia de instalação Firebase + estações
├── ELECTRON.md         ← como rodar e compilar o Electron
├── CONTINUIDADE.md     ← este arquivo
├── .gitignore
└── .kiro/
    └── specs/
        └── password-queue-system/
            ├── requirements.md
            ├── design.md
            └── tasks.md
```

---

## Como retomar o desenvolvimento

```bash
# Instalar dependências (só na primeira vez)
npm install

# Rodar em desenvolvimento
npx electron . --mode=totem --dev   # Totem
npx electron . --mode=painel --dev  # Painel
npx electron . --mode=operador --dev
npx electron . --mode=admin --dev
npx electron . --dev                # Todos os módulos

# Gerar instalador
npm run build
```

---

## Dependências principais

| Pacote | Versão | Uso |
|--------|--------|-----|
| electron | ^30 | App desktop |
| electron-builder | ^24 | Gerar instalador .exe |
| serialport | ^12 | Comunicação com impressora K80 |
| React 18 | CDN unpkg | UI (via Babel Standalone) |
| Firebase SDK 10 | CDN gstatic | Sincronização entre estações |
