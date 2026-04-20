# Implementation Plan: balcao-test-suite

## Overview

Implementação incremental da suite de testes automatizados para o sistema BALCÃO. A estratégia central é extrair a lógica de negócio e os componentes React de `index.html` para arquivos `.js`/`.jsx` testáveis, sem modificar o arquivo de produção. Os testes são organizados em três camadas: lógica de negócio (Vitest puro), componentes React (Vitest + jsdom + @testing-library/react) e integração Electron (Vitest + mocks).

## Tasks

- [x] 1. Configurar ambiente de testes e infraestrutura base
  - Instalar dependências de desenvolvimento: `vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitejs/plugin-react fast-check`
  - Criar `vitest.config.js` com ambiente jsdom, globals, setupFiles e thresholds de cobertura (≥ 80% linhas em `src/logic/**`)
  - Adicionar scripts `test`, `test:watch` e `test:coverage` ao `package.json`
  - Criar estrutura de diretórios: `src/logic/`, `src/components/`, `src/ipc/`, `tests/logic/`, `tests/components/`, `tests/integration/`
  - Criar `tests/setup.js` com `beforeEach` que reseta `window.APP_STATE`, `window.dispatchUpdate` (vi.fn()), `window.electronAPI` (todos os métodos mockados), `window.STATION_MODE`, `window.FB_READY`, `window.fbPush` e `window.fbListen`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Extrair lógica de estado e implementar testes de `generateTicket`
  - [x] 2.1 Extrair `src/logic/state.js` com `FACTORY_STATE` copiado de `index.html`
    - Exportar `FACTORY_STATE` com os 2 serviços (Geral priority=1, Preferencial priority=2), 2 guichês, 3 slides de mídia, filas vazias e `currentCall: null`
    - Não inicializar `window.APP_STATE` neste módulo (responsabilidade do setup de testes)
    - _Requirements: 1.5, 1.6_

  - [x] 2.2 Extrair `src/logic/generateTicket.js` de `index.html`
    - Copiar a implementação de `generateTicket` para o módulo com `export function generateTicket(serviceId)`
    - A função deve operar sobre `window.APP_STATE` e invocar `window.dispatchUpdate` exatamente como no original
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 2.3 Criar `tests/logic/generateTicket.test.js` com testes de exemplo
    - Verificar formato de 3 dígitos com zero-padding para serviço ativo
    - Verificar sequência incremental em N chamadas consecutivas
    - Verificar ciclo reiniciado após contador atingir 999 (retorna "001")
    - Verificar retorno `null` para serviço inativo (`active: false`) sem modificar `APP_STATE.queue`
    - Verificar retorno `null` para `serviceId` inexistente sem modificar `APP_STATE.queue`
    - Verificar estrutura do item adicionado à fila (`ticket`, `serviceId`, `time`, `id`)
    - Verificar que `window.dispatchUpdate` é invocado exatamente uma vez por chamada válida
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 2.4 Escrever property tests para `generateTicket` em `tests/logic/generateTicket.test.js`
    - **Property 1: Formato de ticket sempre 3 dígitos com zero-padding**
    - **Validates: Requirements 2.1, 2.8**
    - **Property 2: Sequência de tickets é incremental e cíclica**
    - **Validates: Requirements 2.2, 2.3, 2.8**
    - **Property 3: Serviço inativo ou inexistente retorna null sem modificar estado**
    - **Validates: Requirements 2.4, 2.5**
    - **Property 4: Item adicionado à fila tem estrutura correta**
    - **Validates: Requirements 2.6**
    - **Property 5: generateTicket invoca dispatchUpdate exatamente uma vez por chamada válida**
    - **Validates: Requirements 2.7**

- [x] 3. Extrair e testar `callNext`
  - [x] 3.1 Extrair `src/logic/callNext.js` de `index.html`
    - Copiar a implementação de `callNext` com `export function callNext(stationId, serviceId)`
    - A função deve operar sobre `window.APP_STATE` e invocar `window.dispatchUpdate`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [x] 3.2 Criar `tests/logic/callNext.test.js` com testes de exemplo
    - Verificar que ticket do serviço com maior `priority` é chamado primeiro
    - Verificar que em empate de prioridade o ticket com menor `time` (mais antigo) é chamado
    - Verificar que filtro por `serviceId` específico ignora outros serviços
    - Verificar que ticket chamado é removido de `APP_STATE.queue`
    - Verificar que registro é adicionado a `APP_STATE.called` com `ticket`, `serviceId`, `stationId` e `time`
    - Verificar que `APP_STATE.currentCall` é atualizado corretamente
    - Verificar que fila vazia não modifica `currentCall` nem `called`
    - Verificar que guichê inativo (`active: false`) não modifica estado
    - Verificar que `window.dispatchUpdate` é invocado exatamente uma vez por chamada bem-sucedida
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [ ]* 3.3 Escrever property tests para `callNext` em `tests/logic/callNext.test.js`
    - **Property 6: callNext respeita ordenação por prioridade e tempo**
    - **Validates: Requirements 3.1, 3.2, 3.10**
    - **Property 7: callNext com filtro de serviço respeita o filtro**
    - **Validates: Requirements 3.3**
    - **Property 8: callNext transfere ticket de queue para called**
    - **Validates: Requirements 3.4, 3.5, 3.6**
    - **Property 9: callNext com guichê inativo não modifica estado**
    - **Validates: Requirements 3.8**

- [x] 4. Checkpoint — Verificar testes de lógica de geração e chamada
  - Garantir que todos os testes de `generateTicket` e `callNext` passam com `npm test`
  - Verificar cobertura parcial com `npm run test:coverage`
  - Perguntar ao usuário se há dúvidas antes de continuar.

- [x] 5. Extrair e testar `repeatCall`, `dailyReset`, `fullReset` e `exportHistory`
  - [x] 5.1 Extrair `src/logic/repeatCall.js` de `index.html`
    - Copiar a implementação de `repeatCall` com `export function repeatCall()`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 5.2 Criar `tests/logic/repeatCall.test.js` com testes de exemplo
    - Verificar que `dispatchUpdate` é invocado exatamente uma vez quando `currentCall` não é null
    - Verificar que `currentCall` permanece inalterado após `repeatCall`
    - Verificar que `dispatchUpdate` não é invocado quando `currentCall` é null
    - Verificar que `queue` e `called` não são modificados
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 5.3 Escrever property test para `repeatCall` em `tests/logic/repeatCall.test.js`
    - **Property 10: repeatCall preserva currentCall e isola queue/called**
    - **Validates: Requirements 4.1, 4.2, 4.4**

  - [x] 5.4 Extrair `src/logic/resetExport.js` de `index.html`
    - Copiar as implementações de `dailyReset`, `fullReset` e `exportHistory` com exports nomeados
    - `fullReset` deve importar `FACTORY_STATE` de `src/logic/state.js`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 6.1, 6.2, 6.3, 6.4_

  - [x] 5.5 Criar `tests/logic/resetExport.test.js` com testes de exemplo
    - Verificar que `dailyReset` limpa `queue`, `called`, `currentCall` e zera todos os `counter`
    - Verificar que `dailyReset` preserva `config`, `services` (exceto `counter`), `stations` e `mediaItems`
    - Verificar que `dailyReset` invoca `dispatchUpdate` exatamente uma vez
    - Verificar que `fullReset` restaura `APP_STATE` para deep equality com `FACTORY_STATE`
    - Verificar que `fullReset` restaura `config` modificado para valores de fábrica
    - Verificar que `fullReset` invoca `dispatchUpdate` exatamente uma vez
    - Verificar que `exportHistory` cria elemento `<a>` com atributo `download` contendo data no formato `YYYY-MM-DD`
    - Verificar que o conteúdo do blob é JSON válido e parseável
    - Verificar que cada item exportado contém exatamente `ticket`, `serviceId`, `stationId` e `time`
    - Verificar que `exportHistory` com `called` vazio exporta array vazio `[]`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 5.6 Escrever property tests para reset e exportação em `tests/logic/resetExport.test.js`
    - **Property 11: dailyReset limpa operações e preserva configurações**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
    - **Property 12: fullReset restaura estado idêntico ao FACTORY_STATE**
    - **Validates: Requirements 5.6, 5.7, 5.10**
    - **Property 13: Exportação preserva completude e fidelidade dos dados**
    - **Validates: Requirements 6.2, 6.3, 6.5, 6.6**

- [ ] 6. Escrever testes de invariantes de estado com property-based testing
  - [ ] 6.1 Criar `tests/logic/stateInvariants.test.js`
    - Importar `generateTicket`, `callNext`, `repeatCall`, `dailyReset`, `fullReset` dos módulos extraídos
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ]* 6.2 Implementar property tests de invariantes em `tests/logic/stateInvariants.test.js`
    - **Property 19: Invariante de conservação de tickets** — `queue.length + called.length === total gerado`
    - **Validates: Requirements 15.1**
    - **Property 20: Invariante de consistência de transferência** — ticket removido de queue é o mesmo adicionado a called
    - **Validates: Requirements 15.2**
    - **Property 21: Invariante de estrutura de currentCall** — sempre null ou objeto com `ticket`/`serviceId`/`stationId` válidos
    - **Validates: Requirements 15.3**
    - **Property 22: Invariante de range do contador de serviço** — `counter` sempre em [1, 999] após generateTicket
    - **Validates: Requirements 15.4**
    - **Property 23: Invariante de reinício do contador após dailyReset** — primeiro ticket após reset é "001"
    - **Validates: Requirements 15.5**

- [x] 7. Checkpoint — Verificar toda a camada de lógica de negócio
  - Garantir que todos os testes de lógica passam com `npm test`
  - Verificar que cobertura de `src/logic/**` atinge ≥ 80% com `npm run test:coverage`
  - Perguntar ao usuário se há dúvidas antes de continuar.

- [x] 8. Extrair componentes React e implementar testes de TotemModule e PainelModule
  - [x] 8.1 Extrair `src/components/TotemModule.jsx` de `index.html`
    - Copiar o componente `TotemModule` (incluindo `TicketModal` e `PaperOutCard`) para o arquivo JSX
    - Adicionar `export` ao componente principal
    - O componente deve continuar operando sobre `window.APP_STATE` e `window.electronAPI`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11_

  - [x] 8.2 Criar `tests/components/TotemModule.test.jsx`
    - Verificar que botões de serviço são renderizados apenas para serviços com `active: true`
    - Verificar que mensagem de indisponibilidade é exibida quando nenhum serviço está ativo
    - Verificar que clique em botão de serviço chama `generateTicket` com `serviceId` correto
    - Verificar que `TicketModal` é exibido com o número do ticket após clique bem-sucedido
    - Verificar que `TicketModal` exibe ticket, nome do serviço, data/hora e quantidade à frente
    - Verificar que botão "Fechar" do `TicketModal` fecha o modal
    - Verificar que `TicketModal` fecha automaticamente após 6 segundos (usar `vi.useFakeTimers()`)
    - Verificar que `PaperOutCard` é exibido com mensagem correta para status `'out'` e `'near'`
    - Verificar que `TicketModal` não é exibido quando `PaperOutCard` está visível com status `'out'`
    - Verificar que botão de dispensar do `PaperOutCard` remove o card da tela
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11_

  - [ ]* 8.3 Escrever property tests para `TotemModule` em `tests/components/TotemModule.test.jsx`
    - **Property 14: Renderização do TotemModule reflete serviços ativos**
    - **Validates: Requirements 7.1, 7.2**
    - **Property 15: Clique em botão de serviço chama generateTicket com serviceId correto**
    - **Validates: Requirements 7.3, 7.4**
    - **Property 16: TicketModal exibe todas as informações obrigatórias**
    - **Validates: Requirements 7.5**

  - [x] 8.4 Extrair `src/components/PainelModule.jsx` de `index.html`
    - Copiar o componente `PainelModule` (incluindo `MediaCarousel`) para o arquivo JSX com `export`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [x] 8.5 Criar `tests/components/PainelModule.test.jsx`
    - Verificar que "Aguardando chamada..." é exibido quando `currentCall` é null
    - Verificar que ticket, label do serviço e label do guichê são exibidos quando `currentCall` está preenchido
    - Verificar que o número do ticket exibido é atualizado quando `currentCall` muda
    - Verificar que contadores de fila exibem quantidade correta por serviço ativo
    - Verificar que as últimas 5 chamadas são exibidas na lista de chamadas recentes
    - Verificar que "Nenhuma chamada ainda" é exibido quando `called` está vazio
    - Verificar que `MediaCarousel` é renderizado quando `mediaItems` contém slides ativos
    - Verificar que carrossel é pausado por 3 segundos quando `pauseMediaOnCall` é true e nova chamada é detectada
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [ ]* 8.6 Escrever property tests para `PainelModule` em `tests/components/PainelModule.test.jsx`
    - **Property 17: PainelModule exibe contadores de fila corretos**
    - **Validates: Requirements 8.2, 8.4**
    - **Property 18: PainelModule exibe no máximo 5 chamadas recentes**
    - **Validates: Requirements 8.5**

- [x] 9. Extrair e testar OperadorModule e AdminModule
  - [x] 9.1 Extrair `src/components/OperadorModule.jsx` de `index.html`
    - Copiar o componente `OperadorModule` para o arquivo JSX com `export`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10_

  - [x] 9.2 Criar `tests/components/OperadorModule.test.jsx`
    - Verificar que seletor de guichê exibe todos os guichês ativos
    - Verificar que botão "Chamar Próxima Senha" está desabilitado com fila vazia
    - Verificar que botão "Chamar Próxima Senha" está habilitado com tickets na fila
    - Verificar que clique em "Chamar Próxima Senha" chama `callNext` com `stationId` do guichê selecionado
    - Verificar que botão "Repetir Chamada" está desabilitado quando `currentCall` é null
    - Verificar que clique em "Repetir Chamada" invoca `repeatCall` quando `currentCall` está preenchido
    - Verificar que botão de chamada específica é exibido para cada serviço ativo
    - Verificar que clique em botão de serviço específico chama `callNext` com `stationId` e `serviceId` corretos
    - Verificar que tabela de histórico exibe ticket, tipo, guichê e horário em ordem decrescente de tempo
    - Verificar que "Nenhuma chamada realizada" é exibido quando `called` está vazio
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10_

  - [x] 9.3 Extrair `src/components/AdminModule.jsx` de `index.html`
    - Copiar o componente `AdminModule` para o arquivo JSX com `export`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

  - [x] 9.4 Criar `tests/components/AdminModule.test.jsx`
    - Verificar que as abas Dashboard, Tipos de Senha, Mídia Indoor, Guichês e Configurações são exibidas
    - Verificar que métricas da aba Dashboard (total chamadas, total na fila, total por serviço) correspondem ao `APP_STATE`
    - Verificar que aba "Tipos de Senha" lista cada serviço com nome, cor e estado de ativação
    - Verificar que toggle de ativação de serviço atualiza `APP_STATE.services[i].active`
    - Verificar que aba "Guichês" lista cada guichê com nome e estado de ativação
    - Verificar que aba "Configurações" exibe valores atuais de `APP_STATE.config`
    - Verificar que botão "Reset Diário" invoca `dailyReset`
    - Verificar que botão "Reset de Fábrica" invoca `fullReset`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

- [x] 10. Checkpoint — Verificar toda a camada de componentes React
  - Garantir que todos os testes de componentes passam com `npm test`
  - Perguntar ao usuário se há dúvidas antes de continuar.

- [ ] 11. Implementar testes de integração IPC — `print-ticket`
  - [ ] 11.1 Criar `tests/integration/ipc-print.test.js`
    - Configurar mocks de `electron` (`ipcMain.handle`, `BrowserWindow`, `app`) e `serialport` com `vi.mock`
    - Importar `main.js` após os mocks para registrar os handlers IPC
    - Extrair o handler `print-ticket` para teste isolado
    - Verificar que `printWindow.webContents.print` é chamado com `silent: true`
    - Verificar que `pageSize.width` é `80000` (micrômetros para 80mm)
    - Verificar que `margins.marginType` é `'none'`
    - Verificar que handler resolve com `{ success: false, errorType: <string> }` quando print falha
    - Verificar que handler resolve com `{ success: true, errorType: null }` quando print tem sucesso
    - Verificar que nova janela de impressão é criada quando `printWindow` está destruído
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [ ] 12. Implementar testes de integração IPC — `get-paper-status` e `get-printer-ports`
  - [ ] 12.1 Criar `tests/integration/ipc-status-ports.test.js`
    - Configurar mocks de `electron` e `serialport`
    - Verificar que `get-paper-status` retorna o valor atual de `paperStatus` (`'ok'`, `'near'` ou `'out'`)
    - Verificar que `get-printer-ports` retorna array de objetos com `path`, `manufacturer` e `vendorId` quando `SerialPort` está disponível
    - Verificar que `get-printer-ports` retorna `[]` quando `SerialPort` não está disponível
    - Verificar que `window.electronAPI.getPaperStatus` retorna um dos três estados válidos
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 13. Implementar testes de integração — Polling ESC/POS e reconexão serial
  - [ ] 13.1 Criar `tests/integration/serial-polling.test.js`
    - Configurar mock de `serialport` com instância que emite eventos `data`, `close` e `error`
    - Verificar que byte com bit 3 (`0x08`) ativo atualiza `paperStatus` para `'out'`
    - Verificar que byte com bit 2 (`0x04`) ativo e bit 3 inativo atualiza para `'near'`
    - Verificar que byte sem bits 2 e 3 ativos atualiza para `'ok'`
    - Verificar que mudança de `paperStatus` envia evento `'printer-paper-status'` para `mainWindow.webContents`
    - Verificar que `paperStatus` sem mudança não envia evento desnecessariamente
    - Verificar que evento `'close'` na porta serial reagenda `connectPrinter` em 5 segundos (usar `vi.useFakeTimers()`)
    - Verificar que evento `'error'` na porta serial reagenda `connectPrinter` em 10 segundos
    - Verificar que `findPrinterPort` sem porta válida reagenda `connectPrinter` em 10 segundos
    - Verificar que `SerialPort` é instanciado com `path` correto e `baudRate: 9600` quando porta válida é encontrada
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9_

- [ ] 14. Implementar testes de integração — Firebase Sync
  - [ ] 14.1 Criar `tests/integration/firebase-sync.test.js`
    - Configurar mock completo do Firebase SDK (sem chamadas de rede reais)
    - Verificar que `fbPush` chama `FB_DB.ref('balcao/state').set` com o estado fornecido quando `FB_READY === true`
    - Verificar que `fbListen` chama `Object.assign(window.APP_STATE, data)` ao receber atualização remota
    - Verificar que `fbPush` não realiza chamadas de rede quando `FB_READY === false`
    - Verificar que `fbListen` não registra listener quando `FB_READY === false`
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [ ] 15. Checkpoint final — Verificar suite completa e cobertura
  - Garantir que todos os testes passam com `npm test`
  - Verificar que cobertura de `src/logic/**` atinge ≥ 80% com `npm run test:coverage`
  - Corrigir quaisquer falhas de teste ou gaps de cobertura identificados
  - Perguntar ao usuário se há dúvidas ou ajustes necessários.

## Notes

- Tarefas marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada tarefa referencia requisitos específicos para rastreabilidade
- Os checkpoints garantem validação incremental a cada camada
- Os property tests validam invariantes universais com 100+ iterações via fast-check
- Os testes de exemplo cobrem casos específicos, bordas e interações de UI
- O arquivo `index.html` de produção **não deve ser modificado** — os arquivos em `src/` são cópias exclusivas para testes
- Timers (auto-close do modal, pausa de mídia, reconexão serial) devem ser controlados com `vi.useFakeTimers()` nos testes
