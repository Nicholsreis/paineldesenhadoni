# Bugfix Requirements Document

## Introduction

Este documento descreve os requisitos para corrigir dois bugs críticos no sistema de impressão do BALCÃO:

1. **Bug de Detecção de Papel**: A verificação de status da impressora não está funcionando, permitindo que usuários selecionem múltiplas senhas mesmo quando a impressora está sem papel ou com a tampa aberta.

2. **Bug de Papel em Branco**: Após imprimir o conteúdo da senha, a impressora continua ejetando papel em branco antes do corte.

Ambos os bugs afetam a experiência do usuário e causam desperdício de papel, além de gerar frustração quando senhas não são impressas corretamente.

## Bug Analysis

### Bug 1: Detecção de Papel Não Funciona

#### Current Behavior (Defect)

1.1 WHEN a impressora está sem papel THEN o sistema permite que o usuário selecione e tente imprimir múltiplas senhas sem bloqueio

1.2 WHEN a impressora está com a tampa aberta THEN o sistema permite que o usuário selecione e tente imprimir senhas sem bloqueio

1.3 WHEN `ServiceButton.handleClick()` é executado THEN o sistema chama apenas `getPaperStatus()` que retorna sempre 'ok' porque o polling serial não funciona com impressora USB

1.4 WHEN a função `checkPrinterStatusWMI()` existe em `main.js` e o IPC handler `check-printer-wmi` está implementado THEN o `preload.js` não expõe `checkPrinterWMI()` para o renderer, tornando-a inacessível

1.5 WHEN o usuário tenta imprimir THEN o `ServiceButton` não verifica o status WMI da impressora antes de chamar `printTicket()`

#### Expected Behavior (Correct)

2.1 WHEN a impressora está sem papel THEN o sistema SHALL bloquear imediatamente a impressão e mostrar ErrorCard com status 'out-of-paper'

2.2 WHEN a impressora está com a tampa aberta THEN o sistema SHALL bloquear imediatamente a impressão e mostrar ErrorCard com status apropriado

2.3 WHEN `ServiceButton.handleClick()` é executado THEN o sistema SHALL chamar `checkPrinterWMI()` antes de tentar imprimir

2.4 WHEN a função `checkPrinterStatusWMI()` existe em `main.js` THEN o `preload.js` SHALL expor `checkPrinterWMI()` através do `contextBridge` para o renderer

2.5 WHEN `checkPrinterWMI()` retorna 'out-of-paper', 'offline' ou 'error' THEN o sistema SHALL bloquear a impressão e chamar `onPaperOut()` ou `onPrintError()` apropriadamente

#### Unchanged Behavior (Regression Prevention)

3.1 WHEN a impressora está funcionando normalmente com papel suficiente THEN o sistema SHALL CONTINUE TO permitir impressão de senhas

3.2 WHEN `checkPrinterStatusWMI()` retorna 'ok' THEN o sistema SHALL CONTINUE TO processar a impressão normalmente através de `printTicket()`

3.3 WHEN o sistema não está rodando no Electron (modo web) THEN o sistema SHALL CONTINUE TO funcionar sem verificação de impressora

3.4 WHEN o polling de status via `getPaperStatus()` detecta mudanças THEN o sistema SHALL CONTINUE TO enviar notificações via `printer-paper-status` event

### Bug 2: Papel em Branco Após Impressão

#### Current Behavior (Defect)

1.6 WHEN o conteúdo da senha é impresso com sucesso THEN a impressora ejeta papel em branco adicional antes do corte

1.7 WHEN `sendCutCommand()` é chamado 800ms após impressão bem-sucedida THEN o comando de corte ESC/POS `GS V 0` (0x1D 0x56 0x00) pode não estar sendo executado corretamente

1.8 WHEN o comando de corte é enviado via porta serial e `printerPort.isOpen` é false (impressora é USB) THEN o comando tenta fallback para `copy /b` via wmic mas pode falhar silenciosamente

1.9 WHEN o delay de 800ms é usado antes do corte THEN este timing pode ser inadequado (muito curto ou muito longo) para a impressora Epson USB

#### Expected Behavior (Correct)

2.6 WHEN o conteúdo da senha é impresso com sucesso THEN a impressora SHALL cortar o papel imediatamente após o conteúdo sem ejetar papel em branco adicional

2.7 WHEN `sendCutCommand()` é chamado THEN o comando de corte ESC/POS SHALL ser enviado e executado corretamente pela impressora

2.8 WHEN a impressora é USB (não serial) THEN o sistema SHALL usar o método correto de envio de comando raw para porta USB via `copy /b`

2.9 WHEN o comando de corte é enviado THEN o timing SHALL ser adequado para garantir que o conteúdo foi totalmente impresso antes do corte

#### Unchanged Behavior (Regression Prevention)

3.5 WHEN a impressão é bem-sucedida THEN o sistema SHALL CONTINUE TO retornar `{ success: true }` do IPC handler `print-ticket`

3.6 WHEN a impressão falha THEN o sistema SHALL CONTINUE TO atualizar `paperStatus` para 'out' e notificar o renderer

3.7 WHEN a porta da impressora é detectada via wmic THEN o sistema SHALL CONTINUE TO usar `copy /b` para portas USB e LPT

3.8 WHEN o conteúdo da senha é renderizado THEN o sistema SHALL CONTINUE TO calcular a altura dinâmica corretamente usando `offsetHeight`
