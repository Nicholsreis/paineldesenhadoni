# Painel de senha do Ni

Sistema de gerenciamento de senhas para atendimento presencial em balcões, totens e estabelecimentos comerciais. Desenvolvido com Electron, Node.js e React.

---

## Visão Geral

O sistema permite emitir senhas numeradas no totem, exibir chamadas em tempo real no telão, e gerenciar o atendimento pelo celular ou computador do operador — tudo sincronizado em tempo real via servidor local na rede interna.

---

## Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                  Rede Local (Wi-Fi)                  │
│                                                       │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │   PC Totem   │    │     PC Servidor           │   │
│  │  (Electron)  │    │  server.js :3080          │   │
│  │  --mode=totem│◄──►│  db.json (banco de dados) │   │
│  │  Impressora  │    │  SSE (tempo real)         │   │
│  └──────────────┘    └──────────────────────────┘   │
│                              ▲                        │
│  ┌──────────────┐            │                        │
│  │   PC Telão   │            │                        │
│  │  (Electron)  │◄───────────┤                        │
│  │  --mode=painel│           │                        │
│  └──────────────┘            │                        │
│                              │                        │
│  ┌──────────────┐            │                        │
│  │   Celular    │◄───────────┘                        │
│  │  mobile.html │                                     │
│  └──────────────┘                                     │
└─────────────────────────────────────────────────────┘
```

---

## Módulos

### 🖨️ Totem
Interface de emissão de senhas para o cliente. Exibe botões por tipo de serviço (Geral, Preferencial). Ao clicar, imprime o comprovante na impressora térmica e exibe o modal de confirmação.

- Impressão via driver Windows (`webContents.print`)
- Verificação de status da impressora antes de imprimir
- Card de erro quando impressora está sem papel ou offline
- Modo quiosque (tela cheia, sem barra de título)

### 📺 Telão (Painel)
Exibe a senha atual sendo chamada com animação de overlay, histórico das últimas chamadas e carrossel de mídia indoor (imagens e vídeos).

- Atualização em tempo real via SSE (Server-Sent Events)
- Overlay animado ao chamar nova senha
- Carrossel de mídia configurável pelo Admin
- Contadores de fila por tipo de serviço

### 📱 Operador Mobile
Interface web responsiva acessada pelo celular do operador via browser. Permite chamar próxima senha, repetir chamada e devolver senha à fila.

- Acesso via `http://IP_SERVIDOR:3080/mobile.html`
- QR Code gerado automaticamente no painel Admin
- Cards de fila em tempo real por tipo de serviço
- Seleção de guichê

### ⚙️ Administrador
Painel completo de gerenciamento do sistema.

- **Dashboard**: métricas do dia (emitidas, chamadas, aguardando)
- **Tipos de Senha**: configurar serviços (Geral, Preferencial, etc.)
- **Guichês**: ativar/desativar guichês
- **Mídia Indoor**: gerenciar slides do carrossel (importar arquivos ou apontar pasta)
- **Configurações**: nome da unidade, setor, impressora, IP do servidor
- **Backup/Restauração**: exportar e importar configurações completas
- **QR Code**: acesso rápido ao operador mobile

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Desktop | Electron 30 |
| Frontend | React 18 (via Babel standalone) |
| Servidor | Node.js HTTP nativo |
| Banco de dados | JSON local (`db.json`) |
| Sincronização | SSE (Server-Sent Events) |
| Impressão | Windows Print Spooler (`webContents.print`) |
| Testes | Vitest + Testing Library + fast-check |

---

## Instalação

### Pré-requisitos
- Windows 10/11 64-bit
- Node.js 18+ (apenas para o servidor dedicado)

### Instaladores disponíveis em `dist/`

| Arquivo | Destino |
|---------|---------|
| `Painel de senha do Ni - Totem Setup.exe` | PC do Totem (com impressora) |
| `Painel de senha do Ni - Telao Setup.exe` | PC do Telão/TV |
| `Painel de senha do Ni - Admin Setup.exe` | PC do Administrador |

### Servidor Dedicado

A pasta `servidor-dedicado/` contém o servidor HTTP que sincroniza todos os clientes.

```
1. Instale o Node.js: https://nodejs.org
2. Copie a pasta servidor-dedicado/ para o PC servidor
3. Execute INSTALAR-SERVIDOR.bat como Administrador
4. O serviço inicia automaticamente com o Windows
```

---

## Configuração de Rede

1. Instale o servidor dedicado no PC servidor
2. Descubra o IP do servidor: `ipconfig` no CMD
3. No instalador do Telão, informe o IP durante a instalação
4. No Admin → Configurações → IP do Servidor, configure e salve

### URLs de acesso direto (via browser)

| URL | Destino |
|-----|---------|
| `http://IP:3080` | Página de entrada |
| `http://IP:3080/totem` | Totem |
| `http://IP:3080/painel` | Telão |
| `http://IP:3080/operador` | Operador mobile |
| `http://IP:3080/admin` | Administrador |

---

## Impressora

Compatível com impressoras térmicas de 80mm conectadas via USB.

Testado com: **EPSON TM-T (TMUSB001)**

**Configuração:**
1. Abra o Admin → Configurações → 🖨️ Impressora
2. Selecione a impressora no dropdown ou digite a porta manualmente
3. Clique em **💾 Salvar Porta**
4. Teste com **🖨️ Imprimir Teste**

> **Nota:** Impressoras Epson USB não reportam status de papel via WMI. O sistema detecta falha de impressão pelo callback do driver Windows.

---

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm start

# Rodar modo específico
npx electron . --mode=totem --dev
npx electron . --mode=painel --dev
npx electron . --mode=admin --dev

# Testes
npm test
npm run test:coverage

# Build
npm run build:dir    # Apenas pasta (sem instalador, mais rápido)
npm run build:all    # 3 instaladores (Totem, Telão, Admin)
```

---

## Estrutura do Projeto

```
├── main.js                  # Processo principal Electron
├── preload.js               # Bridge IPC renderer ↔ main
├── server.js                # Servidor HTTP (porta 3080)
├── index.html               # Interface principal (React inline)
├── mobile.html              # Interface operador mobile
├── src/
│   ├── components/          # Componentes React (JSX)
│   │   ├── TotemModule.jsx
│   │   ├── PainelModule.jsx
│   │   ├── OperadorModule.jsx
│   │   └── AdminModule.jsx
│   └── logic/               # Lógica de negócio
│       ├── state.js         # Estado inicial de fábrica
│       ├── generateTicket.js
│       ├── callNext.js
│       ├── repeatCall.js
│       └── resetExport.js
├── tests/                   # Testes automatizados
├── build/                   # Assets de build (ícone)
├── dist/                    # Instaladores gerados
├── servidor-dedicado/       # Servidor standalone
└── operador-app/            # Projeto Capacitor (APK Android)
```

---

## Sincronização em Tempo Real

O sistema usa **Server-Sent Events (SSE)** para push instantâneo:

1. Cliente conecta em `GET /api/events`
2. Servidor mantém conexão aberta
3. Quando qualquer cliente faz `POST /api/state`, o servidor faz broadcast para todos os clientes conectados
4. Latência < 50ms na rede local

Fallback automático para polling a cada 1.5s se SSE não estiver disponível.

---

## Operador Mobile (APK Android)

A pasta `operador-app/` contém um projeto Capacitor para gerar APK Android da interface do operador.

```bash
# Abrir no Android Studio
cd operador-app
npx cap open android
```

Consulte `operador-app/COMO-GERAR-APK.md` para instruções completas.

---

## Licença

Desenvolvido para uso interno. Todos os direitos reservados.
