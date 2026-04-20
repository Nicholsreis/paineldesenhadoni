# Requirements Document

## Introduction

Este documento especifica os requisitos para a suite de testes completa do sistema **BALCÃO — Gerenciamento de Senhas**, um aplicativo Electron 30 com React 18 (via CDN + Babel standalone) para gerenciamento de filas de atendimento.

A suite cobre três camadas:
1. **Lógica de negócio** — funções puras em `index.html` que operam sobre `window.APP_STATE`
2. **Componentes React** — módulos TotemModule, PainelModule, OperadorModule e AdminModule
3. **Integração Electron** — canais IPC, impressão silenciosa, polling ESC/POS e reconexão serial

O framework de testes a ser configurado é **Vitest** (com `jsdom` para testes de componentes) e **@testing-library/react** para renderização de componentes. Mocks de `window.electronAPI` e `serialport` serão usados para isolar dependências externas.

---

## Glossary

- **APP_STATE**: Objeto global `window.APP_STATE` que contém o estado completo da aplicação (filas, chamadas, configurações, serviços, guichês, mídia).
- **FACTORY_STATE**: Estado inicial de fábrica; `APP_STATE` é uma cópia profunda deste objeto na inicialização.
- **Ticket**: Número de senha formatado com 3 dígitos (ex.: `001`, `042`, `999`), gerado sequencialmente por serviço.
- **Queue**: Array `APP_STATE.queue` contendo tickets aguardando atendimento.
- **Called**: Array `APP_STATE.called` contendo o histórico de chamadas realizadas.
- **CurrentCall**: Objeto `APP_STATE.currentCall` representando a senha atualmente chamada no painel.
- **Service**: Tipo de atendimento (ex.: Geral, Preferencial) com `id`, `label`, `color`, `active`, `counter` e `priority`.
- **Station**: Guichê de atendimento com `id`, `label` e `active`.
- **IPC**: Inter-Process Communication do Electron entre o processo principal (`main.js`) e o renderer (`index.html`).
- **ESC/POS**: Protocolo de comunicação com impressoras térmicas via porta serial.
- **Test_Suite**: O conjunto de testes automatizados sendo especificado neste documento.
- **Vitest**: Framework de testes unitários e de integração a ser configurado no projeto.
- **JSDOM**: Ambiente DOM simulado usado pelo Vitest para testes de componentes React sem Electron.
- **Mock**: Substituto controlado de uma dependência externa (ex.: `window.electronAPI`, `serialport`) usado em testes.

---

## Requirements

### Requirement 1: Configuração do Ambiente de Testes

**User Story:** Como desenvolvedor, quero um ambiente de testes configurado e funcional, para que eu possa executar todos os testes com um único comando sem precisar do Electron instalado.

#### Acceptance Criteria

1. THE Test_Suite SHALL executar com o comando `npm test` (mapeado para `vitest --run`).
2. THE Test_Suite SHALL executar com o comando `npm run test:watch` (mapeado para `vitest`) para modo de observação.
3. THE Test_Suite SHALL executar com o comando `npm run test:coverage` para gerar relatório de cobertura de código.
4. WHEN o ambiente de testes é inicializado, THE Test_Suite SHALL configurar `jsdom` como ambiente DOM padrão para testes de componentes React.
5. THE Test_Suite SHALL incluir um arquivo de setup global que define `window.APP_STATE`, `window.dispatchUpdate`, `window.electronAPI` e `window.STATION_MODE` antes de cada teste.
6. THE Test_Suite SHALL isolar cada teste com um reset completo de `window.APP_STATE` para o `FACTORY_STATE` antes de cada execução, garantindo que testes não compartilhem estado.
7. WHERE a cobertura de código é gerada, THE Test_Suite SHALL atingir no mínimo 80% de cobertura de linhas nas funções de lógica de negócio (`generateTicket`, `callNext`, `repeatCall`, `dailyReset`, `fullReset`, `exportHistory`).

---

### Requirement 2: Testes de `generateTicket`

**User Story:** Como operador, quero que a geração de tickets seja confiável e sequencial, para que cada senha emitida seja única e rastreável.

#### Acceptance Criteria

1. WHEN `generateTicket` é chamado com um `serviceId` de serviço ativo, THE Test_Suite SHALL verificar que o ticket retornado é uma string de exatamente 3 dígitos com zero-padding (ex.: `"001"`, `"042"`, `"999"`).
2. WHEN `generateTicket` é chamado N vezes consecutivas para o mesmo serviço, THE Test_Suite SHALL verificar que os tickets retornados são sequenciais e incrementais (ex.: `"001"`, `"002"`, ..., `"00N"`).
3. WHEN `generateTicket` é chamado após o contador atingir `999`, THE Test_Suite SHALL verificar que o próximo ticket gerado é `"001"` (ciclo reiniciado).
4. WHEN `generateTicket` é chamado com um `serviceId` de serviço inativo (`active: false`), THE Test_Suite SHALL verificar que a função retorna `null` e não modifica `APP_STATE.queue`.
5. WHEN `generateTicket` é chamado com um `serviceId` inexistente, THE Test_Suite SHALL verificar que a função retorna `null` e não modifica `APP_STATE.queue`.
6. WHEN `generateTicket` é chamado com um `serviceId` válido, THE Test_Suite SHALL verificar que um item é adicionado a `APP_STATE.queue` contendo `ticket`, `serviceId`, `time` (timestamp numérico) e `id` (UUID).
7. WHEN `generateTicket` é chamado com um `serviceId` válido, THE Test_Suite SHALL verificar que `window.dispatchUpdate` é invocado exatamente uma vez.
8. FOR ALL valores de N entre 1 e 999, THE Test_Suite SHALL verificar que `generateTicket` chamado N vezes produz tickets com formato `String(N).padStart(3, '0')` (propriedade de round-trip do contador).

---

### Requirement 3: Testes de `callNext`

**User Story:** Como operador, quero que a chamada de próxima senha respeite a prioridade dos serviços, para que senhas preferenciais sejam atendidas antes das gerais.

#### Acceptance Criteria

1. WHEN `callNext` é chamado com um `stationId` válido e a fila contém tickets de múltiplos serviços, THE Test_Suite SHALL verificar que o ticket do serviço com maior `priority` é chamado primeiro.
2. WHEN `callNext` é chamado com um `stationId` válido e dois serviços têm a mesma `priority`, THE Test_Suite SHALL verificar que o ticket com menor `time` (mais antigo) é chamado primeiro.
3. WHEN `callNext` é chamado com um `stationId` e um `serviceId` específico, THE Test_Suite SHALL verificar que apenas tickets daquele serviço são considerados, independentemente da prioridade de outros serviços.
4. WHEN `callNext` é chamado com sucesso, THE Test_Suite SHALL verificar que o ticket chamado é removido de `APP_STATE.queue`.
5. WHEN `callNext` é chamado com sucesso, THE Test_Suite SHALL verificar que um registro é adicionado a `APP_STATE.called` contendo `ticket`, `serviceId`, `stationId` e `time`.
6. WHEN `callNext` é chamado com sucesso, THE Test_Suite SHALL verificar que `APP_STATE.currentCall` é atualizado com `ticket`, `serviceId` e `stationId` corretos.
7. WHEN `callNext` é chamado com a fila vazia, THE Test_Suite SHALL verificar que `APP_STATE.currentCall` não é modificado e `APP_STATE.called` não recebe novos registros.
8. WHEN `callNext` é chamado com um `stationId` de guichê inativo (`active: false`), THE Test_Suite SHALL verificar que a função retorna sem modificar o estado.
9. WHEN `callNext` é chamado com sucesso, THE Test_Suite SHALL verificar que `window.dispatchUpdate` é invocado exatamente uma vez.
10. FOR ALL sequências de tickets inseridos na fila com prioridades distintas, THE Test_Suite SHALL verificar que a ordem de chamada por `callNext` é sempre decrescente por `priority` e, em caso de empate, crescente por `time` (propriedade de ordenação estável).

---

### Requirement 4: Testes de `repeatCall`

**User Story:** Como operador, quero repetir a chamada da senha atual, para que clientes que não ouviram possam ser notificados novamente.

#### Acceptance Criteria

1. WHEN `repeatCall` é chamado e `APP_STATE.currentCall` não é `null`, THE Test_Suite SHALL verificar que `window.dispatchUpdate` é invocado exatamente uma vez.
2. WHEN `repeatCall` é chamado e `APP_STATE.currentCall` não é `null`, THE Test_Suite SHALL verificar que `APP_STATE.currentCall` permanece inalterado (mesmos valores de `ticket`, `serviceId` e `stationId`).
3. WHEN `repeatCall` é chamado e `APP_STATE.currentCall` é `null`, THE Test_Suite SHALL verificar que `window.dispatchUpdate` não é invocado.
4. WHEN `repeatCall` é chamado e `APP_STATE.currentCall` não é `null`, THE Test_Suite SHALL verificar que `APP_STATE.queue` e `APP_STATE.called` não são modificados.

---

### Requirement 5: Testes de `dailyReset` e `fullReset`

**User Story:** Como administrador, quero resetar o sistema ao início do dia ou restaurar as configurações de fábrica, para que o sistema comece cada dia sem dados residuais.

#### Acceptance Criteria

1. WHEN `dailyReset` é chamado, THE Test_Suite SHALL verificar que `APP_STATE.queue` é um array vazio.
2. WHEN `dailyReset` é chamado, THE Test_Suite SHALL verificar que `APP_STATE.called` é um array vazio.
3. WHEN `dailyReset` é chamado, THE Test_Suite SHALL verificar que `APP_STATE.currentCall` é `null`.
4. WHEN `dailyReset` é chamado, THE Test_Suite SHALL verificar que o `counter` de todos os serviços é `0`.
5. WHEN `dailyReset` é chamado, THE Test_Suite SHALL verificar que `APP_STATE.config`, `APP_STATE.services` (exceto `counter`), `APP_STATE.stations` e `APP_STATE.mediaItems` permanecem inalterados.
6. WHEN `fullReset` é chamado, THE Test_Suite SHALL verificar que `APP_STATE` é estruturalmente idêntico ao `FACTORY_STATE` (deep equality).
7. WHEN `fullReset` é chamado após modificações em `APP_STATE.config`, THE Test_Suite SHALL verificar que `APP_STATE.config` é restaurado para os valores de fábrica.
8. WHEN `fullReset` é chamado, THE Test_Suite SHALL verificar que `window.dispatchUpdate` é invocado exatamente uma vez.
9. WHEN `dailyReset` é chamado, THE Test_Suite SHALL verificar que `window.dispatchUpdate` é invocado exatamente uma vez.
10. WHILE `APP_STATE` contém dados de múltiplos dias simulados, WHEN `fullReset` é chamado seguido de `JSON.parse(JSON.stringify(APP_STATE))`, THE Test_Suite SHALL verificar que o resultado é igual ao `FACTORY_STATE` (propriedade de idempotência do reset).

---

### Requirement 6: Testes de `exportHistory`

**User Story:** Como administrador, quero exportar o histórico de chamadas em JSON, para que eu possa auditar o atendimento do dia.

#### Acceptance Criteria

1. WHEN `exportHistory` é chamado com `APP_STATE.called` contendo registros, THE Test_Suite SHALL verificar que um elemento `<a>` com atributo `download` contendo a data atual no formato `YYYY-MM-DD` é criado e clicado programaticamente.
2. WHEN `exportHistory` é chamado, THE Test_Suite SHALL verificar que o conteúdo do blob gerado é um JSON válido e parseável.
3. WHEN `exportHistory` é chamado, THE Test_Suite SHALL verificar que cada item do JSON exportado contém exatamente os campos `ticket`, `serviceId`, `stationId` e `time`.
4. WHEN `exportHistory` é chamado com `APP_STATE.called` vazio, THE Test_Suite SHALL verificar que o JSON exportado é um array vazio (`[]`).
5. FOR ALL conjuntos de registros em `APP_STATE.called`, THE Test_Suite SHALL verificar que `JSON.parse(exportedJson).length === APP_STATE.called.length` (propriedade de completude da exportação).
6. FOR ALL registros em `APP_STATE.called`, THE Test_Suite SHALL verificar que os campos `ticket`, `serviceId`, `stationId` e `time` no JSON exportado são idênticos aos valores originais (propriedade de fidelidade dos dados).

---

### Requirement 7: Testes do Componente TotemModule

**User Story:** Como usuário do totem, quero que a interface de emissão de senhas funcione corretamente, para que eu possa retirar minha senha sem dificuldades.

#### Acceptance Criteria

1. WHEN `TotemModule` é renderizado com serviços ativos, THE Test_Suite SHALL verificar que um botão de serviço é exibido para cada serviço com `active: true`.
2. WHEN `TotemModule` é renderizado sem nenhum serviço ativo, THE Test_Suite SHALL verificar que a mensagem de indisponibilidade é exibida e nenhum botão de serviço é renderizado.
3. WHEN um botão de serviço é clicado, THE Test_Suite SHALL verificar que `generateTicket` é chamado com o `serviceId` correto.
4. WHEN um botão de serviço é clicado com sucesso, THE Test_Suite SHALL verificar que o `TicketModal` é exibido com o número do ticket gerado.
5. WHEN o `TicketModal` está aberto, THE Test_Suite SHALL verificar que ele exibe o número do ticket, o nome do serviço, a data/hora atual e a quantidade de senhas à frente.
6. WHEN o botão "Fechar" do `TicketModal` é clicado, THE Test_Suite SHALL verificar que o modal é fechado.
7. WHEN o `TicketModal` permanece aberto por 6 segundos sem interação, THE Test_Suite SHALL verificar que o modal é fechado automaticamente.
8. WHEN `window.electronAPI.getPaperStatus` retorna `'out'`, THE Test_Suite SHALL verificar que o `PaperOutCard` é exibido com a mensagem de sem papel.
9. WHEN `window.electronAPI.getPaperStatus` retorna `'near'`, THE Test_Suite SHALL verificar que o `PaperOutCard` é exibido com a mensagem de papel acabando.
10. WHEN o `PaperOutCard` está visível com status `'out'` e um botão de serviço é clicado, THE Test_Suite SHALL verificar que o `TicketModal` não é exibido.
11. WHEN o botão de dispensar do `PaperOutCard` é clicado, THE Test_Suite SHALL verificar que o `PaperOutCard` é removido da tela.

---

### Requirement 8: Testes do Componente PainelModule

**User Story:** Como cliente na sala de espera, quero ver claramente a senha atual sendo chamada e as senhas na fila, para que eu saiba quando serei atendido.

#### Acceptance Criteria

1. WHEN `PainelModule` é renderizado com `APP_STATE.currentCall` nulo, THE Test_Suite SHALL verificar que a mensagem "Aguardando chamada..." é exibida.
2. WHEN `PainelModule` é renderizado com `APP_STATE.currentCall` preenchido, THE Test_Suite SHALL verificar que o número do ticket, o label do serviço e o label do guichê são exibidos.
3. WHEN `APP_STATE.currentCall` é atualizado para um novo valor, THE Test_Suite SHALL verificar que o número do ticket exibido é atualizado na tela.
4. WHEN `PainelModule` é renderizado, THE Test_Suite SHALL verificar que os contadores de fila exibem a quantidade correta de tickets aguardando para cada serviço ativo.
5. WHEN `PainelModule` é renderizado com `APP_STATE.called` contendo registros, THE Test_Suite SHALL verificar que as últimas 5 chamadas são exibidas na lista de chamadas recentes.
6. WHEN `PainelModule` é renderizado com `APP_STATE.called` vazio, THE Test_Suite SHALL verificar que a mensagem "Nenhuma chamada ainda" é exibida na lista de chamadas recentes.
7. WHEN `PainelModule` é renderizado com `APP_STATE.mediaItems` contendo slides ativos, THE Test_Suite SHALL verificar que o `MediaCarousel` é renderizado.
8. WHEN `APP_STATE.config.pauseMediaOnCall` é `true` e uma nova chamada é detectada, THE Test_Suite SHALL verificar que o carrossel de mídia é pausado por 3 segundos.

---

### Requirement 9: Testes do Componente OperadorModule

**User Story:** Como operador de guichê, quero controlar as chamadas de senha pela interface do operador, para que eu possa atender os clientes de forma organizada.

#### Acceptance Criteria

1. WHEN `OperadorModule` é renderizado, THE Test_Suite SHALL verificar que um seletor de guichê é exibido com todos os guichês ativos.
2. WHEN `OperadorModule` é renderizado com a fila vazia, THE Test_Suite SHALL verificar que o botão "Chamar Próxima Senha" está desabilitado.
3. WHEN `OperadorModule` é renderizado com tickets na fila, THE Test_Suite SHALL verificar que o botão "Chamar Próxima Senha" está habilitado.
4. WHEN o botão "Chamar Próxima Senha" é clicado, THE Test_Suite SHALL verificar que `callNext` é chamado com o `stationId` do guichê selecionado.
5. WHEN `OperadorModule` é renderizado com `APP_STATE.currentCall` nulo, THE Test_Suite SHALL verificar que o botão "Repetir Chamada" está desabilitado.
6. WHEN o botão "Repetir Chamada" é clicado com `APP_STATE.currentCall` preenchido, THE Test_Suite SHALL verificar que `repeatCall` é invocado.
7. WHEN `OperadorModule` é renderizado, THE Test_Suite SHALL verificar que um botão de chamada específica é exibido para cada serviço ativo.
8. WHEN um botão de chamada específica de serviço é clicado, THE Test_Suite SHALL verificar que `callNext` é chamado com o `stationId` e o `serviceId` corretos.
9. WHEN `OperadorModule` é renderizado com registros em `APP_STATE.called`, THE Test_Suite SHALL verificar que a tabela de histórico exibe ticket, tipo, guichê e horário de cada chamada em ordem decrescente de tempo.
10. WHEN `OperadorModule` é renderizado com `APP_STATE.called` vazio, THE Test_Suite SHALL verificar que a mensagem "Nenhuma chamada realizada" é exibida na tabela.

---

### Requirement 10: Testes do Componente AdminModule

**User Story:** Como administrador, quero que o painel administrativo exiba métricas corretas e permita configurar o sistema, para que eu possa monitorar e ajustar o atendimento.

#### Acceptance Criteria

1. WHEN `AdminModule` é renderizado, THE Test_Suite SHALL verificar que as abas Dashboard, Tipos de Senha, Mídia Indoor, Guichês e Configurações são exibidas.
2. WHEN a aba "Dashboard" está ativa, THE Test_Suite SHALL verificar que as métricas exibidas (total de chamadas, total na fila, total por serviço) correspondem aos valores em `APP_STATE`.
3. WHEN a aba "Tipos de Senha" está ativa, THE Test_Suite SHALL verificar que cada serviço em `APP_STATE.services` é listado com seu nome, cor e estado de ativação.
4. WHEN o toggle de ativação de um serviço é alterado na aba "Tipos de Senha", THE Test_Suite SHALL verificar que `APP_STATE.services[i].active` é atualizado para o novo valor.
5. WHEN a aba "Guichês" está ativa, THE Test_Suite SHALL verificar que cada guichê em `APP_STATE.stations` é listado com seu nome e estado de ativação.
6. WHEN a aba "Configurações" está ativa, THE Test_Suite SHALL verificar que os campos de configuração exibem os valores atuais de `APP_STATE.config`.
7. WHEN o botão "Reset Diário" é clicado na aba "Configurações", THE Test_Suite SHALL verificar que `dailyReset` é invocado.
8. WHEN o botão "Reset de Fábrica" é clicado na aba "Configurações", THE Test_Suite SHALL verificar que `fullReset` é invocado.

---

### Requirement 11: Testes de Integração IPC — `print-ticket`

**User Story:** Como operador do totem, quero que a impressão do comprovante ocorra silenciosamente, para que o cliente receba sua senha sem interrupções na interface.

#### Acceptance Criteria

1. WHEN o handler IPC `print-ticket` recebe um HTML válido, THE Test_Suite SHALL verificar que `printWindow.webContents.print` é chamado com `silent: true`.
2. WHEN o handler IPC `print-ticket` recebe um HTML válido, THE Test_Suite SHALL verificar que `printWindow.webContents.print` é chamado com `pageSize.width` igual a `80000` (micrômetros para 80mm).
3. WHEN o handler IPC `print-ticket` recebe um HTML válido, THE Test_Suite SHALL verificar que `printWindow.webContents.print` é chamado com `margins.marginType` igual a `'none'`.
4. WHEN `printWindow.webContents.print` retorna `success: false`, THE Test_Suite SHALL verificar que o handler resolve a Promise com `{ success: false, errorType: <string> }`.
5. WHEN `printWindow.webContents.print` retorna `success: true`, THE Test_Suite SHALL verificar que o handler resolve a Promise com `{ success: true, errorType: null }`.
6. WHEN `printWindow` está destruído no momento da chamada, THE Test_Suite SHALL verificar que uma nova janela de impressão é criada antes de prosseguir.

---

### Requirement 12: Testes de Integração IPC — `get-paper-status` e `get-printer-ports`

**User Story:** Como administrador, quero consultar o status do papel e as portas seriais disponíveis via IPC, para que eu possa diagnosticar problemas de impressão.

#### Acceptance Criteria

1. WHEN o handler IPC `get-paper-status` é invocado, THE Test_Suite SHALL verificar que retorna o valor atual da variável `paperStatus` do processo principal (`'ok'`, `'near'` ou `'out'`).
2. WHEN o handler IPC `get-printer-ports` é invocado e `SerialPort` está disponível, THE Test_Suite SHALL verificar que retorna um array de objetos com os campos `path`, `manufacturer` e `vendorId`.
3. WHEN o handler IPC `get-printer-ports` é invocado e `SerialPort` não está disponível (módulo ausente), THE Test_Suite SHALL verificar que retorna um array vazio (`[]`).
4. WHEN `window.electronAPI.getPaperStatus` é chamado no renderer, THE Test_Suite SHALL verificar que o valor retornado é um dos três estados válidos: `'ok'`, `'near'` ou `'out'`.

---

### Requirement 13: Testes de Integração — Polling ESC/POS e Reconexão Serial

**User Story:** Como administrador, quero que o sistema detecte automaticamente o status do papel e reconecte a impressora em caso de falha, para que o serviço de impressão seja resiliente.

#### Acceptance Criteria

1. WHEN a impressora serial envia um byte com o bit 3 (`0x08`) ativo, THE Test_Suite SHALL verificar que `paperStatus` é atualizado para `'out'`.
2. WHEN a impressora serial envia um byte com o bit 2 (`0x04`) ativo e o bit 3 inativo, THE Test_Suite SHALL verificar que `paperStatus` é atualizado para `'near'`.
3. WHEN a impressora serial envia um byte sem os bits 2 e 3 ativos, THE Test_Suite SHALL verificar que `paperStatus` é atualizado para `'ok'`.
4. WHEN `paperStatus` muda de valor, THE Test_Suite SHALL verificar que o evento `'printer-paper-status'` é enviado para `mainWindow.webContents` com o novo status.
5. WHEN `paperStatus` não muda de valor entre dois polls consecutivos, THE Test_Suite SHALL verificar que o evento `'printer-paper-status'` não é enviado desnecessariamente.
6. WHEN a porta serial é fechada inesperadamente (evento `'close'`), THE Test_Suite SHALL verificar que `connectPrinter` é reagendado para executar em 5 segundos.
7. WHEN a porta serial emite um erro (evento `'error'`), THE Test_Suite SHALL verificar que `connectPrinter` é reagendado para executar em 10 segundos.
8. WHEN `findPrinterPort` não encontra nenhuma porta com `vendorId === '0dd4'` ou `manufacturer` contendo `'custom'`, THE Test_Suite SHALL verificar que `connectPrinter` é reagendado para executar em 10 segundos.
9. WHEN `findPrinterPort` encontra uma porta válida, THE Test_Suite SHALL verificar que `SerialPort` é instanciado com o `path` correto e `baudRate` igual a `9600`.

---

### Requirement 14: Testes de Integração — Firebase Sync (Opcional)

**User Story:** Como administrador de múltiplos terminais, quero que o estado seja sincronizado via Firebase, para que todos os módulos (totem, painel, operador) reflitam o mesmo estado em tempo real.

#### Acceptance Criteria

1. WHERE Firebase está configurado (`FB_READY === true`), WHEN `window.fbPush` é chamado com um estado, THE Test_Suite SHALL verificar que `FB_DB.ref('balcao/state').set` é chamado com o estado fornecido.
2. WHERE Firebase está configurado, WHEN `window.fbListen` recebe uma atualização remota, THE Test_Suite SHALL verificar que `Object.assign(window.APP_STATE, data)` é chamado com os dados recebidos.
3. WHERE Firebase não está configurado (`FB_READY === false`), WHEN `window.fbPush` é chamado, THE Test_Suite SHALL verificar que nenhuma chamada de rede é realizada.
4. WHERE Firebase não está configurado, WHEN `window.fbListen` é chamado, THE Test_Suite SHALL verificar que nenhum listener é registrado.

---

### Requirement 15: Propriedades de Invariância do Estado

**User Story:** Como desenvolvedor, quero garantir que as operações sobre o estado global preservem invariantes fundamentais, para que o sistema nunca entre em estado inconsistente.

#### Acceptance Criteria

1. FOR ALL sequências de chamadas a `generateTicket` e `callNext`, THE Test_Suite SHALL verificar que `APP_STATE.queue.length + APP_STATE.called.length` é sempre igual ao total de tickets gerados desde o último reset (invariante de conservação de tickets).
2. FOR ALL chamadas a `callNext` com sucesso, THE Test_Suite SHALL verificar que o ticket removido de `APP_STATE.queue` é o mesmo adicionado a `APP_STATE.called` (invariante de consistência de transferência).
3. FOR ALL estados de `APP_STATE`, THE Test_Suite SHALL verificar que `APP_STATE.currentCall` é sempre `null` ou um objeto com os campos `ticket` (string de 3 dígitos), `serviceId` (string) e `stationId` (número) (invariante de estrutura de currentCall).
4. FOR ALL chamadas a `generateTicket` com serviço válido, THE Test_Suite SHALL verificar que o `counter` do serviço após a chamada é sempre um inteiro entre 1 e 999 inclusive (invariante de range do contador).
5. FOR ALL chamadas a `dailyReset` seguidas de qualquer número de chamadas a `generateTicket`, THE Test_Suite SHALL verificar que os tickets gerados começam em `"001"` (invariante de reinício do contador após reset).
