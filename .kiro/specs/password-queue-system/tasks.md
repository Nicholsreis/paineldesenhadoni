# Implementation Plan: Password Queue System

## Overview

Implementação de um sistema de gerenciamento de senhas para o setor BALCÃO como um único arquivo HTML auto-contido, usando React 18 + Babel Standalone via CDN. O estado vive em `window.APP_STATE` em memória, sem backend ou persistência externa.

## Tasks

- [x] 1. Estrutura base do arquivo HTML e estado global
  - Criar o arquivo `index.html` com a estrutura base: `<head>` com CDNs (React 18, ReactDOM, Babel Standalone via unpkg.com), Google Fonts (Barlow Condensed, Rajdhani, Oswald) e `<script type="text/babel">`
  - Definir `FACTORY_STATE` com todas as entidades: `config`, `services`, `stations`, `queue`, `called`, `currentCall`, `mediaItems`
  - Inicializar `window.APP_STATE` como cópia profunda de `FACTORY_STATE`
  - Implementar `window.dispatchUpdate` como função que chama o setter do `useState` raiz
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.9_

- [x] 2. Variáveis CSS de dark theme e estilos globais
  - Definir variáveis CSS globais (`--bg-primary`, `--bg-secondary`, `--text-primary`, `--accent`, etc.) para dark theme
  - Aplicar reset CSS e estilos base (body, font-family, box-sizing)
  - Garantir responsividade para resoluções ≥ 1280px
  - _Requirements: 2.6, 2.7, 12.1_

- [x] 3. Componente `App` e `NavBar`
  - Implementar componente `App` com `useState` para forçar re-render global e registrar `dispatchUpdate`
  - Implementar `NavBar` com os quatro módulos: Totem, Painel, Operador, Administrador
  - Controlar módulo ativo via estado local em `App`; exibir apenas o módulo selecionado
  - _Requirements: 2.4, 2.5_

- [x] 4. Funções de lógica de negócio core
  - [x] 4.1 Implementar `generateTicket(serviceId)`
    - Incrementar `counter` do service com ciclo `(counter % 999) + 1`
    - Retornar string com `padStart(3, '0')`; retornar `null` se serviceId inválido ou service inativo
    - Adicionar entrada em `queue` com `id` (UUID via `crypto.randomUUID()`), `ticket`, `serviceId`, `time`
    - _Requirements: 3.4, 3.5_

  - [ ]* 4.2 Escrever property test para `generateTicket` — Property 1: Ticket format
    - **Property 1: Para qualquer counter (0–999), ticket gerado tem exatamente 3 dígitos numéricos com zero-padding e após 999 o próximo é "001"**
    - **Validates: Requirements 3.4**

  - [ ]* 4.3 Escrever property test para `generateTicket` — Property 2: Geração aumenta a fila
    - **Property 2: Para qualquer serviceId ativo, `generateTicket` aumenta `queue.length` em 1 com serviceId correto**
    - **Validates: Requirements 3.5**

  - [x] 4.4 Implementar `callNext(stationId, serviceId?)`
    - Filtrar services ativos com fila não vazia; ordenar por `priority` DESC; desempatar por menor `time`
    - Se `serviceId` fornecido, chamar apenas daquele tipo
    - Remover da `queue`, adicionar em `called`, atualizar `currentCall`; bloquear se stationId inativo
    - _Requirements: 5.3, 5.4, 5.5, 11.1, 11.2, 11.3, 11.4_

  - [ ]* 4.5 Escrever property test para `callNext` — Property 5: Respeita prioridade e atualiza estado
    - **Property 5: Para qualquer fila com pelo menos um tipo ativo, `callNext` seleciona maior priority, reduz queue em 1, aumenta called em 1, atualiza currentCall**
    - **Validates: Requirements 5.3, 5.4, 11.1, 11.3**

  - [ ]* 4.6 Escrever property test para `callNext` — Property 6: Fila vazia é operação nula
    - **Property 6: Com todas as filas vazias, `callNext` não altera queue, called ou currentCall**
    - **Validates: Requirements 5.5**

  - [ ]* 4.7 Escrever property test para `callNext` — Property 7: Desempate por tempo de emissão
    - **Property 7: Dois tickets com mesma priority, `callNext` seleciona o de menor `time`**
    - **Validates: Requirements 11.2**

  - [ ]* 4.8 Escrever property test para `callNext` — Property 8: Nenhum ticket chamado mais de uma vez
    - **Property 8: Para N chamadas consecutivas com N tickets distintos, nenhum ticket aparece mais de uma vez em `called`**
    - **Validates: Requirements 11.4**

  - [x] 4.9 Implementar `repeatCall()`
    - Reemitir `currentCall` sem alterar `queue` ou `called`
    - _Requirements: 5.6_

  - [x] 4.10 Implementar `exportHistory()`
    - Gerar JSON com array de `called` (campos: `ticket`, `serviceId`, `stationId`, `time`)
    - Disparar download via `Blob` + `URL.createObjectURL`; array vazio gera `[]`
    - _Requirements: 10.5, 10.6_

  - [ ]* 4.11 Escrever property test para `exportHistory` — Property 11: Campos obrigatórios
    - **Property 11: Para qualquer array `called` com N entradas, JSON exportado é array de N objetos com exatamente os campos ticket, serviceId, stationId, time**
    - **Validates: Requirements 10.5, 10.6**

  - [x] 4.12 Implementar `dailyReset()` e `fullReset()`
    - `dailyReset`: zerar `queue` e todos os `counter` dos services; preservar `config`, labels, cores, `stations`, `mediaItems`
    - `fullReset`: substituir `APP_STATE` por cópia profunda de `FACTORY_STATE`
    - _Requirements: 10.3, 10.4_

  - [ ]* 4.13 Escrever property test para `dailyReset` — Property 9: Zera fila e contadores, preserva config
    - **Property 9: Para qualquer estado, após dailyReset: queue vazia, todos counters = 0, config/labels/cores/active/stations/mediaItems inalterados**
    - **Validates: Requirements 10.3**

  - [ ]* 4.14 Escrever property test para `fullReset` — Property 10: Restaura estado de fábrica
    - **Property 10: Para qualquer estado, após fullReset, APP_STATE é estruturalmente igual a FACTORY_STATE**
    - **Validates: Requirements 10.4**

- [x] 5. Checkpoint — Verificar lógica core
  - Garantir que todas as funções core passam nos testes. Perguntar ao usuário se há dúvidas antes de prosseguir.

- [x] 6. Módulo Totem
  - [x] 6.1 Implementar componente `TotemModule`
    - Exibir cabeçalho com `sectorName` e instrução "Toque para retirar sua senha"
    - Renderizar `ServiceButton` para cada service com `active: true`; exibir aviso de indisponível se nenhum ativo
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 6.2 Implementar componente `ServiceButton`
    - Botão grande e tátil com cor do service (`service.color`), label e tipografia ≥ 24px
    - Ao clicar: chamar `generateTicket(serviceId)`, abrir `TicketModal` com dados da senha gerada
    - _Requirements: 3.2, 3.4, 3.5, 3.10, 3.11, 12.2_

  - [x] 6.3 Implementar componente `TicketModal`
    - Exibir: nome do setor, número da senha, label do tipo, data/hora de emissão, estimativa de espera, `welcomeMessage`
    - Calcular estimativa de espera pela quantidade de senhas à frente na fila do mesmo tipo
    - Fechar automaticamente após 6 segundos (`setTimeout`) e ao clicar no botão de fechar
    - _Requirements: 3.6, 3.7, 3.8, 3.9_

  - [ ]* 6.4 Escrever property test para estimativa de espera — Property 3
    - **Property 3: Para qualquer fila com N senhas do mesmo tipo, adicionar mais uma resulta em estimativa ≥ anterior**
    - **Validates: Requirements 3.9**

- [x] 7. Módulo Painel
  - [x] 7.1 Implementar componente `PainelModule` e `CurrentCallDisplay`
    - Cabeçalho com `sectorName`; exibir senha atual em destaque com número (≥ 96px), label do tipo e número do guichê
    - Quando `currentCall` é null, exibir estado de aguardo
    - _Requirements: 4.1, 4.2, 12.3_

  - [x] 7.2 Implementar animação de destaque em nova chamada
    - Detectar mudança em `currentCall` via `useEffect`; aplicar classe CSS com animação ≥ 1 segundo
    - _Requirements: 4.3, 12.4_

  - [x] 7.3 Implementar `RecentCallsList` e `QueueCounters`
    - Exibir últimas 5 entradas de `called` (excluindo `currentCall`)
    - Exibir contadores de pessoas aguardando separados por tipo de senha
    - _Requirements: 4.4, 4.5_

  - [ ]* 7.4 Escrever property test para histórico recente — Property 4
    - **Property 4: Para qualquer sequência de N chamadas, lista de recentes exibe no máximo 5 itens**
    - **Validates: Requirements 4.4**

  - [x] 7.5 Implementar componente `MediaCarousel` e `Slide`
    - Rotação automática entre slides ativos com `setInterval` baseado em `duration` de cada slide
    - Exibir imagem de fundo se `url` válida; capturar `onError` e usar `fallbackColor`
    - Exibir `title` e `caption` sobrepostos; renderizar dots de posição
    - _Requirements: 4.6, 4.7, 4.8, 4.9, 4.10_

  - [x] 7.6 Implementar lógica `pauseMediaOnCall` no carrossel
    - Pausar rotação automática quando `pauseMediaOnCall: true` e nova chamada ocorre; retomar após destaque
    - _Requirements: 4.11_

  - [x] 7.7 Implementar rodapé do Painel
    - Exibir data/hora em tempo real via `setInterval` (1s) e `unitName`
    - _Requirements: 4.12_

- [x] 8. Módulo Operador
  - [x] 8.1 Implementar componente `OperadorModule` e `ServiceSummaryCard`
    - Cabeçalho identificando setor BALCÃO
    - Cards por tipo com quantidade na fila e última senha chamada daquele tipo; indicador visual de fila vazia
    - _Requirements: 5.1, 5.2, 5.11, 12.6_

  - [x] 8.2 Implementar `CallControls` e `StationSelector`
    - Botão "Chamar Próxima Senha" chamando `callNext(stationId)`; indicação de fila vazia quando todas vazias
    - Botão "Repetir Chamada" chamando `repeatCall()`
    - Botões "Chamar Geral" e "Chamar Preferencial" chamando `callNext(stationId, serviceId)`
    - Seletor de guichê listando apenas guichês com `active: true`
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [x] 8.3 Implementar `CallHistoryTable`
    - Tabela com colunas: Senha, Tipo, Guichê, Horário; alimentada por `called` em ordem reversa
    - _Requirements: 5.10_

- [x] 9. Checkpoint — Verificar módulos Totem, Painel e Operador
  - Garantir que todos os testes passam e o fluxo de emissão → chamada → exibição funciona. Perguntar ao usuário se há dúvidas.

- [x] 10. Módulo Administrador — Dashboard e Tipos de Senha
  - [x] 10.1 Implementar `AdminModule` com abas e `DashboardTab`
    - Estrutura de abas: Dashboard, Tipos de Senha, Mídia, Guichês, Configurações
    - Métricas em tempo real: total emitidas, total chamadas, em espera por tipo, tempo médio de espera, guichês ativos
    - Status geral do sistema baseado em services ativos
    - _Requirements: 6.1, 6.3, 6.4_

  - [x] 10.2 Implementar `HourlyChart` no Dashboard
    - Gráfico de emissão por hora do dia atual usando dados de `called` (implementação CSS/SVG puro, sem biblioteca)
    - _Requirements: 6.2_

  - [x] 10.3 Implementar `ServicesTab` e `ServiceEditor`
    - Lista de tipos com toggle `active`, edição de `label`, `color` e `priority`
    - Botão "Resetar Contador" por tipo zerando `counter` no `APP_STATE`
    - Salvar edição reflete imediatamente em Totem e Painel via `dispatchUpdate`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ]* 10.4 Escrever property test para toggle de active — Property 12
    - **Property 12: Para qualquer service, alternar active true→false→true resulta no mesmo estado original**
    - **Validates: Requirements 7.2**

- [x] 11. Módulo Administrador — Mídia, Guichês e Configurações
  - [x] 11.1 Implementar `MediaTab` e `SlideEditor`
    - Lista de slides com preview visual (cor de fallback ou imagem), toggle individual, edição de todos os campos
    - Botão excluir com confirmação; botão adicionar novo slide; controles mover para cima/baixo
    - Toggle global `pauseMediaOnCall`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [x] 11.2 Implementar `StationsTab` e `StationEditor`
    - Seletor numérico (1–20) para total de guichês; criar/remover guichês ao alterar (remover os de maior id)
    - Toggle e edição de label por guichê
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 11.3 Escrever property test para contagem de guichês — Property 13
    - **Property 13: Para qualquer N entre 1 e 20, após definir total de guichês como N, `stations.length` é exatamente N**
    - **Validates: Requirements 9.2**

  - [x] 11.4 Implementar `SettingsTab` e `ResetControls`
    - Campos editáveis para `unitName`, `sectorName`, `welcomeMessage`, `footerMessage`, `workingHours`
    - Salvar atualiza `APP_STATE.config` e chama `dispatchUpdate`
    - Botão "Reset Diário" com confirmação única chamando `dailyReset()`
    - Botão "Reset Completo" com confirmação dupla chamando `fullReset()`
    - Botão "Exportar Histórico" chamando `exportHistory()`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 12. Diferenciação visual por tipo de senha e feedback global
  - Aplicar `service.color` consistentemente em todos os módulos (botões do Totem, cards do Operador, badges do Painel e Admin)
  - Garantir indicadores visuais de fila vazia (ícone + texto) no Operador e Admin
  - _Requirements: 12.5, 12.6_

- [x] 13. Checkpoint final — Garantir que todos os testes passam
  - Executar todos os testes unitários e de propriedade. Perguntar ao usuário se há dúvidas antes de considerar a implementação concluída.

## Notes

- Tarefas marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada tarefa referencia os requisitos específicos para rastreabilidade
- Os property tests usam **fast-check** com mínimo de 100 iterações (`numRuns: 100`)
- Cada property test deve incluir o comentário: `// Feature: password-queue-system, Property N: <texto>`
- O arquivo final é um único `index.html` — todas as tarefas produzem conteúdo desse arquivo
