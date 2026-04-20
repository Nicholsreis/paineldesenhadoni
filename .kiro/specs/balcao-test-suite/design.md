# Design Document — balcao-test-suite

## Overview

Este documento descreve a arquitetura técnica da suite de testes automatizados para o sistema **BALCÃO — Gerenciamento de Senhas**. O sistema é um aplicativo Electron 30 com React 18 carregado via CDN e Babel standalone, onde toda a lógica de negócio e os componentes React residem em um único arquivo `index.html`.

O principal desafio de design é que o código a ser testado não está em módulos ES/CommonJS — está embutido em um `<script type="text/babel">` dentro do HTML. A estratégia central é **extrair a lógica de negócio para arquivos `.js` testáveis** sem alterar o comportamento do sistema em produção.

### Objetivos

- Configurar Vitest + jsdom sem alterar a arquitetura de produção do Electron
- Extrair funções de negócio de `index.html` para módulos testáveis
- Cobrir lógica de negócio, componentes React e integração Electron com mocks
- Atingir ≥ 80% de cobertura de linhas nas funções de negócio
- Validar invariantes de estado com property-based testing (fast-check)

---

## Architecture

### Visão Geral das Camadas de Teste

```
┌─────────────────────────────────────────────────────────────┐
│                    Suite de Testes                          │
├──────────────────┬──────────────────┬───────────────────────┤
│  Lógica de       │  Componentes     │  Integração           │
│  Negócio         │  React           │  Electron             │
│  (Vitest puro)   │  (Vitest+jsdom   │  (Vitest+mocks)       │
│                  │  +@testing-lib)  │                       │
├──────────────────┼──────────────────┼───────────────────────┤
│ src/logic/       │ src/components/  │ tests/integration/    │
│ *.js             │ *.jsx            │ *.test.js             │
└──────────────────┴──────────────────┴───────────────────────┘
         ↑                  ↑                    ↑
    Extraídos de       Extraídos de         Testam main.js
    index.html         index.html           com mocks IPC
```

### Estratégia de Extração de Código

O código em `index.html` será **copiado** para arquivos `.js`/`.jsx` separados. O `index.html` original **não é modificado** — ele continua funcionando em produção via CDN + Babel. Os arquivos extraídos são usados **exclusivamente pelos testes**.

```
index.html (produção — não modificado)
    │
    ├── src/logic/state.js          ← FACTORY_STATE + window.APP_STATE init
    ├── src/logic/generateTicket.js ← função generateTicket
    ├── src/logic/callNext.js       ← função callNext
    ├── src/logic/repeatCall.js     ← função repeatCall
    ├── src/logic/resetExport.js    ← dailyReset, fullReset, exportHistory
    ├── src/components/TotemModule.jsx
    ├── src/components/PainelModule.jsx
    ├── src/components/OperadorModule.jsx
    └── src/components/AdminModule.jsx
```

Os arquivos extraídos usam `export` para expor as funções, mas internamente operam sobre `window.APP_STATE` e `window.dispatchUpdate` — exatamente como no `index.html` original. O setup de testes inicializa essas globais antes de cada teste.

---

## Components and Interfaces

### 1. Configuração do Framework (vitest.config.js)

```js
// vitest.config.js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      include: ['src/logic/**', 'src/components/**'],
      thresholds: { lines: 80 },
    },
  },
});
```

**Dependências de desenvolvimento a instalar:**
```
vitest @vitest/coverage-v8 jsdom
@testing-library/react @testing-library/jest-dom @testing-library/user-event
@vitejs/plugin-react fast-check
```

### 2. Setup Global (tests/setup.js)

O arquivo de setup é executado antes de cada arquivo de teste. Ele:
- Define `window.APP_STATE` como cópia profunda do `FACTORY_STATE`
- Define `window.dispatchUpdate` como `vi.fn()` (mock rastreável)
- Define `window.electronAPI` com todos os métodos mockados
- Define `window.STATION_MODE` como `null`
- Define `window.FB_READY`, `window.fbPush`, `window.fbListen`
- Importa `@testing-library/jest-dom` para matchers DOM

```js
// tests/setup.js
import '@testing-library/jest-dom';
import { FACTORY_STATE } from '../src/logic/state.js';

beforeEach(() => {
  // Reset completo do estado global
  window.APP_STATE = JSON.parse(JSON.stringify(FACTORY_STATE));

  // Mock de dispatchUpdate rastreável
  window.dispatchUpdate = vi.fn();

  // Mock de electronAPI
  window.electronAPI = {
    isElectron: true,
    printTicket: vi.fn().mockResolvedValue({ success: true, errorType: null }),
    getPaperStatus: vi.fn().mockResolvedValue('ok'),
    getPrinterPorts: vi.fn().mockResolvedValue([]),
    onPaperStatusChange: vi.fn(),
    offPaperStatusChange: vi.fn(),
  };

  // Modo de estação
  window.STATION_MODE = null;

  // Firebase mocks
  window.FB_READY = false;
  window.fbPush = vi.fn();
  window.fbListen = vi.fn();
});
```

### 3. Módulos Extraídos — Interfaces

#### src/logic/state.js
```js
export const FACTORY_STATE = { /* cópia do FACTORY_STATE de index.html */ };
// Não inicializa window.APP_STATE — isso é feito pelo setup de testes
```

#### src/logic/generateTicket.js
```js
// Depende de: window.APP_STATE, window.dispatchUpdate
export function generateTicket(serviceId) { /* ... */ }
```

#### src/logic/callNext.js
```js
// Depende de: window.APP_STATE, window.dispatchUpdate
export function callNext(stationId, serviceId) { /* ... */ }
```

#### src/logic/repeatCall.js
```js
// Depende de: window.APP_STATE, window.dispatchUpdate
export function repeatCall() { /* ... */ }
```

#### src/logic/resetExport.js
```js
// Depende de: window.APP_STATE, window.dispatchUpdate, FACTORY_STATE
export function dailyReset() { /* ... */ }
export function fullReset() { /* ... */ }
export function exportHistory() { /* ... */ }
```

### 4. Estrutura de Arquivos de Teste

```
tests/
├── setup.js                          ← setup global (beforeEach)
├── logic/
│   ├── generateTicket.test.js        ← Req 2
│   ├── callNext.test.js              ← Req 3
│   ├── repeatCall.test.js            ← Req 4
│   ├── resetExport.test.js           ← Req 5 + 6
│   └── stateInvariants.test.js       ← Req 15 (PBT)
├── components/
│   ├── TotemModule.test.jsx          ← Req 7
│   ├── PainelModule.test.jsx         ← Req 8
│   ├── OperadorModule.test.jsx       ← Req 9
│   └── AdminModule.test.jsx          ← Req 10
└── integration/
    ├── ipc-print.test.js             ← Req 11
    ├── ipc-status-ports.test.js      ← Req 12
    ├── serial-polling.test.js        ← Req 13
    └── firebase-sync.test.js         ← Req 14
src/
├── logic/
│   ├── state.js
│   ├── generateTicket.js
│   ├── callNext.js
│   ├── repeatCall.js
│   └── resetExport.js
└── components/
    ├── TotemModule.jsx
    ├── PainelModule.jsx
    ├── OperadorModule.jsx
    └── AdminModule.jsx
```

---

## Data Models

### APP_STATE (window global)

```typescript
interface AppState {
  config: {
    unitName: string;
    sectorName: string;
    welcomeMessage: string;
    footerMessage: string;
    workingHours: { start: string; end: string };
    pauseMediaOnCall: boolean;
  };
  services: Service[];
  stations: Station[];
  queue: QueueItem[];
  called: CallRecord[];
  currentCall: CurrentCall | null;
  mediaItems: MediaItem[];
}

interface Service {
  id: string;
  label: string;
  color: string;
  active: boolean;
  counter: number;   // 0–999
  priority: number;  // maior = mais prioritário
}

interface Station {
  id: number;
  label: string;
  active: boolean;
}

interface QueueItem {
  id: string;        // UUID
  ticket: string;    // "001"–"999"
  serviceId: string;
  time: number;      // Date.now()
}

interface CallRecord {
  ticket: string;
  serviceId: string;
  stationId: number;
  time: number;
}

interface CurrentCall {
  ticket: string;    // /^\d{3}$/
  serviceId: string;
  stationId: number;
}
```

### FACTORY_STATE

Estado inicial de fábrica com 2 serviços (Geral priority=1, Preferencial priority=2), 2 guichês, 3 slides de mídia, filas vazias e `currentCall: null`.

### Modelos de Mock para Testes de Integração

```typescript
// Mock de BrowserWindow para testes IPC
interface MockBrowserWindow {
  isDestroyed: () => boolean;
  loadURL: (url: string) => void;
  webContents: {
    once: (event: string, cb: Function) => void;
    executeJavaScript: (code: string) => Promise<number>;
    print: (options: object, cb: (success: boolean, errorType: string) => void) => void;
    send: (channel: string, ...args: any[]) => void;
  };
  on: (event: string, cb: Function) => void;
}

// Mock de SerialPort para testes de polling
interface MockSerialPort {
  isOpen: boolean;
  open: (cb: (err?: Error) => void) => void;
  write: (data: Buffer, cb?: (err?: Error) => void) => void;
  on: (event: string, cb: Function) => void;
  list: () => Promise<PortInfo[]>;
}
```

---

## Correctness Properties

*Uma propriedade é uma característica ou comportamento que deve ser verdadeiro em todas as execuções válidas de um sistema — essencialmente, uma declaração formal sobre o que o sistema deve fazer. Propriedades servem como ponte entre especificações legíveis por humanos e garantias de correção verificáveis por máquinas.*

A biblioteca de property-based testing escolhida é **fast-check** (JavaScript/TypeScript), que gera automaticamente centenas de casos de entrada aleatórios para cada propriedade. Cada teste de propriedade deve executar no mínimo 100 iterações.

---

### Property 1: Formato de ticket sempre 3 dígitos com zero-padding

*Para qualquer* serviço ativo em `APP_STATE.services`, chamar `generateTicket` com seu `serviceId` deve sempre retornar uma string que corresponde ao padrão `/^\d{3}$/` (exatamente 3 dígitos decimais).

**Validates: Requirements 2.1, 2.8**

---

### Property 2: Sequência de tickets é incremental e cíclica

*Para qualquer* número N de chamadas consecutivas a `generateTicket` para o mesmo serviço (com contador inicial em 0), o k-ésimo ticket gerado deve ser `String(k).padStart(3, '0')` para k de 1 a min(N, 999), e após 999 o ciclo reinicia em `"001"`.

**Validates: Requirements 2.2, 2.3, 2.8**

---

### Property 3: Serviço inativo ou inexistente retorna null sem modificar estado

*Para qualquer* `serviceId` que corresponda a um serviço com `active: false`, ou para qualquer string que não corresponda a nenhum serviço, `generateTicket` deve retornar `null` e `APP_STATE.queue` deve permanecer inalterado (mesmo comprimento e mesmos elementos).

**Validates: Requirements 2.4, 2.5**

---

### Property 4: Item adicionado à fila tem estrutura correta

*Para qualquer* serviço ativo, após chamar `generateTicket`, o último item adicionado a `APP_STATE.queue` deve conter os campos `ticket` (string `/^\d{3}$/`), `serviceId` (string igual ao argumento), `time` (número inteiro positivo) e `id` (string UUID não vazia).

**Validates: Requirements 2.6**

---

### Property 5: generateTicket invoca dispatchUpdate exatamente uma vez por chamada válida

*Para qualquer* serviço ativo, chamar `generateTicket` uma vez deve resultar em exatamente uma invocação de `window.dispatchUpdate`. Chamadas com serviços inválidos ou inativos não devem invocar `dispatchUpdate`.

**Validates: Requirements 2.7**

---

### Property 6: callNext respeita ordenação por prioridade e tempo

*Para qualquer* fila com tickets de serviços com prioridades distintas, `callNext` deve sempre selecionar o ticket do serviço com maior `priority`. Em caso de empate de prioridade, deve selecionar o ticket com menor `time` (mais antigo). Esta propriedade deve ser verificada para todas as permutações possíveis de inserção na fila.

**Validates: Requirements 3.1, 3.2, 3.10**

---

### Property 7: callNext com filtro de serviço respeita o filtro

*Para qualquer* fila com tickets de múltiplos serviços e qualquer `serviceId` válido presente na fila, chamar `callNext(stationId, serviceId)` deve selecionar apenas tickets cujo `serviceId` corresponde ao filtro, independentemente das prioridades dos outros serviços.

**Validates: Requirements 3.3**

---

### Property 8: callNext transfere ticket de queue para called

*Para qualquer* fila não vazia, após uma chamada bem-sucedida a `callNext`, o ticket selecionado deve: (a) não estar mais presente em `APP_STATE.queue`, e (b) estar presente como o último elemento de `APP_STATE.called` com os campos `ticket`, `serviceId`, `stationId` e `time` corretos.

**Validates: Requirements 3.4, 3.5, 3.6**

---

### Property 9: callNext com guichê inativo não modifica estado

*Para qualquer* guichê com `active: false`, chamar `callNext` com seu `stationId` não deve modificar `APP_STATE.queue`, `APP_STATE.called` ou `APP_STATE.currentCall`.

**Validates: Requirements 3.8**

---

### Property 10: repeatCall preserva currentCall e isola queue/called

*Para qualquer* `APP_STATE.currentCall` não nulo (com campos `ticket`, `serviceId`, `stationId` arbitrários), chamar `repeatCall` deve: (a) invocar `window.dispatchUpdate` exatamente uma vez, (b) deixar `currentCall` com os mesmos valores, e (c) não modificar `APP_STATE.queue` nem `APP_STATE.called`.

**Validates: Requirements 4.1, 4.2, 4.4**

---

### Property 11: dailyReset limpa operações e preserva configurações

*Para qualquer* estado de `APP_STATE` com filas, chamadas e contadores arbitrários, após `dailyReset`: `queue` deve ser `[]`, `called` deve ser `[]`, `currentCall` deve ser `null`, todos os `service.counter` devem ser `0`, e os campos `config`, `services[].label/color/active/priority`, `stations` e `mediaItems` devem permanecer inalterados.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

---

### Property 12: fullReset restaura estado idêntico ao FACTORY_STATE

*Para qualquer* sequência de mutações aplicadas a `APP_STATE` (geração de tickets, chamadas, alterações de configuração), após `fullReset`, `JSON.parse(JSON.stringify(APP_STATE))` deve ser profundamente igual a `FACTORY_STATE`.

**Validates: Requirements 5.6, 5.7, 5.10**

---

### Property 13: Exportação preserva completude e fidelidade dos dados

*Para qualquer* array `APP_STATE.called` com N registros arbitrários (cada um com `ticket`, `serviceId`, `stationId`, `time`), `exportHistory` deve produzir um JSON válido onde: (a) o array exportado tem exatamente N elementos, e (b) cada elemento tem exatamente os campos `ticket`, `serviceId`, `stationId` e `time` com valores idênticos aos originais.

**Validates: Requirements 6.2, 6.3, 6.5, 6.6**

---

### Property 14: Renderização do TotemModule reflete serviços ativos

*Para qualquer* configuração de `APP_STATE.services` com k serviços ativos (k ≥ 0), `TotemModule` deve renderizar exatamente k botões de serviço. Se k = 0, deve exibir a mensagem de indisponibilidade.

**Validates: Requirements 7.1, 7.2**

---

### Property 15: Clique em botão de serviço chama generateTicket com serviceId correto

*Para qualquer* serviço ativo em `APP_STATE.services`, clicar no botão correspondente no `TotemModule` deve invocar `generateTicket` com o `serviceId` exato daquele serviço, e o `TicketModal` deve exibir o ticket retornado.

**Validates: Requirements 7.3, 7.4**

---

### Property 16: TicketModal exibe todas as informações obrigatórias

*Para qualquer* combinação de ticket (string 3 dígitos) e serviço (com `label` e `color` arbitrários), o `TicketModal` deve exibir o número do ticket, o nome do serviço, a data/hora atual e a quantidade de senhas à frente na fila.

**Validates: Requirements 7.5**

---

### Property 17: PainelModule exibe contadores de fila corretos

*Para qualquer* estado de `APP_STATE.queue` com distribuição arbitrária de tickets por serviço, `PainelModule` deve exibir para cada serviço ativo um contador igual a `queue.filter(q => q.serviceId === svc.id).length`.

**Validates: Requirements 8.2, 8.4**

---

### Property 18: PainelModule exibe no máximo 5 chamadas recentes

*Para qualquer* `APP_STATE.called` com N registros (N ≥ 0), `PainelModule` deve exibir `min(N, 5)` itens na lista de chamadas recentes, sendo os N mais recentes (em ordem reversa de inserção).

**Validates: Requirements 8.5**

---

### Property 19: Invariante de conservação de tickets

*Para qualquer* sequência de chamadas a `generateTicket` e `callNext` (sem resets), a soma `APP_STATE.queue.length + APP_STATE.called.length` deve ser sempre igual ao número total de tickets gerados com sucesso desde o último reset.

**Validates: Requirements 15.1**

---

### Property 20: Invariante de consistência de transferência

*Para qualquer* chamada bem-sucedida a `callNext`, o objeto `ticket` removido de `APP_STATE.queue` deve ser o mesmo (por valor de `ticket` e `serviceId`) adicionado como último elemento de `APP_STATE.called`.

**Validates: Requirements 15.2**

---

### Property 21: Invariante de estrutura de currentCall

*Para qualquer* sequência de operações sobre `APP_STATE`, `currentCall` deve ser sempre `null` ou um objeto com exatamente os campos `ticket` (string `/^\d{3}$/`), `serviceId` (string não vazia) e `stationId` (número inteiro positivo).

**Validates: Requirements 15.3**

---

### Property 22: Invariante de range do contador de serviço

*Para qualquer* número de chamadas a `generateTicket` para um serviço válido (incluindo wrap-around em 999), o campo `service.counter` deve sempre ser um inteiro no intervalo `[1, 999]` após cada chamada.

**Validates: Requirements 15.4**

---

### Property 23: Invariante de reinício do contador após dailyReset

*Para qualquer* estado de `APP_STATE` com contadores arbitrários, após `dailyReset`, a primeira chamada a `generateTicket` para qualquer serviço ativo deve retornar `"001"`.

**Validates: Requirements 15.5**

---

## Error Handling

### Erros em Funções de Negócio

| Situação | Comportamento Esperado |
|---|---|
| `generateTicket` com `serviceId` inativo | Retorna `null`, não modifica estado |
| `generateTicket` com `serviceId` inexistente | Retorna `null`, não modifica estado |
| `callNext` com fila vazia | Retorna sem modificar estado |
| `callNext` com guichê inativo | Retorna sem modificar estado |
| `repeatCall` com `currentCall === null` | Retorna sem invocar `dispatchUpdate` |

### Erros em Integração Electron

| Situação | Comportamento Esperado |
|---|---|
| `print-ticket` com `printWindow` destruída | Recria `printWindow` antes de imprimir |
| `webContents.print` retorna `success: false` | Resolve com `{ success: false, errorType }` |
| `SerialPort` não disponível | `get-printer-ports` retorna `[]` |
| Porta serial fecha inesperadamente | Reagenda `connectPrinter` em 5s |
| Porta serial emite erro | Reagenda `connectPrinter` em 10s |
| `findPrinterPort` não encontra porta | Reagenda `connectPrinter` em 10s |

### Erros em Testes de Componentes

Os componentes React não lançam exceções para estados inválidos — eles renderizam estados de fallback (ex.: "Aguardando chamada...", "Nenhuma chamada ainda"). Os testes devem verificar esses estados de fallback explicitamente.

---

## Testing Strategy

### Abordagem Dual

A suite usa duas abordagens complementares:

1. **Testes de exemplo** (Vitest + @testing-library/react): verificam comportamentos específicos com entradas concretas, estados de borda e interações de UI.
2. **Testes de propriedade** (fast-check): verificam invariantes universais com centenas de entradas geradas aleatoriamente.

Os testes de propriedade não substituem os de exemplo — eles se complementam. Testes de exemplo cobrem casos específicos e integração de UI; testes de propriedade cobrem o espaço de entradas de forma abrangente.

### Configuração de Property-Based Testing

- **Biblioteca**: `fast-check` (madura, amplamente usada, suporte nativo a TypeScript)
- **Iterações mínimas**: 100 por propriedade (padrão do fast-check)
- **Tag de rastreabilidade**: cada teste de propriedade deve incluir um comentário no formato:
  ```
  // Feature: balcao-test-suite, Property N: <texto da propriedade>
  ```

### Testes de Lógica de Negócio (tests/logic/)

Usam Vitest puro (sem jsdom). Cada função é importada do módulo extraído. O setup global garante `window.APP_STATE` e `window.dispatchUpdate` disponíveis.

**Padrão de teste de propriedade:**
```js
import fc from 'fast-check';
import { generateTicket } from '../../src/logic/generateTicket.js';

// Feature: balcao-test-suite, Property 1: Formato de ticket sempre 3 dígitos
test('Property 1: ticket format is always 3 digits', () => {
  fc.assert(
    fc.property(
      fc.constantFrom('general', 'priority'),
      (serviceId) => {
        window.APP_STATE = JSON.parse(JSON.stringify(FACTORY_STATE));
        const ticket = generateTicket(serviceId);
        return ticket !== null && /^\d{3}$/.test(ticket);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Testes de Componentes React (tests/components/)

Usam Vitest + jsdom + @testing-library/react. Os componentes são importados dos arquivos `.jsx` extraídos. O setup global garante todas as globais necessárias.

**Considerações especiais:**
- Componentes usam `window.APP_STATE` diretamente (sem props) — o estado é mutado antes de renderizar
- `window.dispatchUpdate` é mockado como `vi.fn()` para verificar chamadas
- Timers (auto-close do modal, pausa de mídia) são controlados com `vi.useFakeTimers()`
- `@testing-library/user-event` é usado para simular cliques e interações

**Padrão de teste de componente:**
```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TotemModule } from '../../src/components/TotemModule.jsx';

test('renders service buttons for active services', () => {
  // APP_STATE já tem 2 serviços ativos (setup global)
  render(<TotemModule />);
  expect(screen.getAllByRole('button', { name: /Geral|Preferencial/ })).toHaveLength(2);
});
```

### Testes de Integração Electron (tests/integration/)

Usam Vitest puro com mocks de módulos Node.js. Testam os handlers IPC em `main.js` e a lógica de polling serial.

**Estratégia de mock:**
- `electron` é mockado com `vi.mock('electron')` — `ipcMain.handle`, `BrowserWindow`, `app`
- `serialport` é mockado com `vi.mock('serialport')` — `SerialPort.list`, instância com eventos
- Os handlers IPC são extraídos para funções testáveis em `src/ipc/` ou testados via importação direta de `main.js` com mocks

**Padrão de teste de integração:**
```js
import { vi } from 'vitest';

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  BrowserWindow: vi.fn().mockImplementation(() => mockWindow),
  app: { whenReady: vi.fn(), on: vi.fn() },
}));

vi.mock('serialport', () => ({
  SerialPort: Object.assign(vi.fn(), {
    list: vi.fn().mockResolvedValue([]),
  }),
}));
```

### Testes de Firebase (tests/integration/firebase-sync.test.js)

Firebase é mockado completamente — nenhuma chamada de rede real é feita. O mock simula `firebase.database().ref().set()` e `firebase.database().ref().on()`.

### Cobertura de Código

- **Meta**: ≥ 80% de cobertura de linhas em `src/logic/**`
- **Ferramenta**: `@vitest/coverage-v8`
- **Comando**: `npm run test:coverage`
- **Relatório**: gerado em `coverage/` (HTML + JSON)

### Scripts npm

```json
{
  "test": "vitest --run",
  "test:watch": "vitest",
  "test:coverage": "vitest --run --coverage"
}
```

### Ordem de Implementação Recomendada

1. Instalar dependências e criar `vitest.config.js` + `tests/setup.js`
2. Extrair `src/logic/state.js` e `src/logic/generateTicket.js`, escrever testes (Req 2)
3. Extrair e testar `callNext.js` (Req 3)
4. Extrair e testar `repeatCall.js` (Req 4)
5. Extrair e testar `resetExport.js` (Req 5 + 6)
6. Escrever testes de invariantes de estado com fast-check (Req 15)
7. Extrair componentes React e escrever testes de componentes (Req 7–10)
8. Escrever testes de integração IPC e serial (Req 11–13)
9. Escrever testes de Firebase (Req 14)
10. Verificar cobertura e ajustar
