# Printer Detection and Cut Fix - Bugfix Design

## Overview

Este documento detalha a estratégia técnica para corrigir dois bugs críticos no sistema de impressão do BALCÃO:

**Bug 1 - Detecção de Papel Não Funciona**: A verificação de status da impressora via polling serial não funciona com impressoras USB, permitindo que usuários tentem imprimir múltiplas senhas mesmo quando a impressora está sem papel ou com a tampa aberta. A solução é expor e utilizar a função WMI existente (`checkPrinterStatusWMI`) que já está implementada no `main.js` mas não está acessível ao renderer.

**Bug 2 - Papel em Branco Após Impressão**: Após imprimir o conteúdo da senha, a impressora ejeta papel em branco adicional antes do corte. A solução envolve ajustar o timing do comando de corte e garantir que o comando ESC/POS seja enviado corretamente para impressoras USB.

A abordagem de correção é **mínima e cirúrgica**: expor a API WMI existente, adicionar verificação pré-impressão no `ServiceButton`, e ajustar o timing/método de envio do comando de corte.

## Glossary

- **Bug_Condition_1 (C1)**: A condição que desencadeia o bug de detecção - quando a impressora está sem papel ou com tampa aberta mas o sistema permite impressão
- **Bug_Condition_2 (C2)**: A condição que desencadeia o bug de papel em branco - quando o comando de corte não é executado corretamente após impressão
- **Property_1 (P1)**: O comportamento desejado para C1 - bloquear impressão imediatamente quando impressora não está pronta
- **Property_2 (P2)**: O comportamento desejado para C2 - cortar papel imediatamente após conteúdo sem ejetar papel em branco
- **Preservation**: Comportamentos existentes que devem permanecer inalterados (impressão normal, polling de status, modo web)
- **WMI (Windows Management Instrumentation)**: API do Windows para consultar status de hardware, incluindo impressoras
- **ESC/POS**: Linguagem de comandos para impressoras térmicas (GS V 0 = comando de corte parcial)
- **checkPrinterStatusWMI()**: Função em `main.js` que consulta status da impressora via WMI (já implementada mas não exposta)
- **ServiceButton**: Componente React em `TotemModule.jsx` e inline em `index.html` que renderiza botões de serviço
- **printTicket()**: Função que envia HTML para impressão via IPC `print-ticket`
- **sendCutCommand()**: Função em `main.js` que envia comando ESC/POS de corte para impressora

## Bug Details

### Bug 1: Detecção de Papel Não Funciona

#### Bug Condition

O bug manifesta quando a impressora está em estado problemático (sem papel, tampa aberta, offline) mas o sistema permite que o usuário selecione e tente imprimir senhas. O `ServiceButton.handleClick()` verifica apenas `getPaperStatus()` que retorna sempre 'ok' porque o polling serial não funciona com impressoras USB. A função `checkPrinterStatusWMI()` existe e funciona corretamente, mas não está exposta no `preload.js` para o renderer.

**Formal Specification:**
```
FUNCTION isBugCondition1(input)
  INPUT: input of type { printerState: string, userAction: 'click-service-button' }
  OUTPUT: boolean
  
  RETURN input.printerState IN ['out-of-paper', 'offline', 'error', 'paper-jam']
         AND input.userAction == 'click-service-button'
         AND checkPrinterWMI_not_exposed_to_renderer()
         AND ServiceButton_only_checks_getPaperStatus()
         AND getPaperStatus_returns_ok_for_USB_printers()
END FUNCTION
```

#### Examples

- **Exemplo 1**: Impressora USB sem papel → usuário clica em "Atendimento Normal" → `getPaperStatus()` retorna 'ok' → `printTicket()` é chamado → impressão falha → múltiplas senhas são geradas sem impressão
- **Exemplo 2**: Impressora com tampa aberta → usuário clica em "Atendimento Prioritário" → `getPaperStatus()` retorna 'ok' → `printTicket()` é chamado → impressão falha → ErrorCard aparece apenas após falha
- **Exemplo 3**: Impressora offline → usuário clica em serviço → sistema tenta imprimir → falha silenciosa → usuário clica novamente → múltiplas senhas geradas
- **Edge Case**: Impressora serial funcionando corretamente → polling detecta 'out' → sistema bloqueia corretamente (comportamento esperado que deve ser preservado)

### Bug 2: Papel em Branco Após Impressão

#### Bug Condition

O bug manifesta quando o conteúdo da senha é impresso com sucesso mas a impressora ejeta papel em branco adicional antes do corte. O `sendCutCommand()` é chamado 800ms após impressão bem-sucedida, mas o comando ESC/POS `GS V 0` (0x1D 0x56 0x00) pode não estar sendo executado corretamente. Para impressoras USB, o fallback via `copy /b` pode falhar silenciosamente ou o timing pode ser inadequado.

**Formal Specification:**
```
FUNCTION isBugCondition2(input)
  INPUT: input of type { printSuccess: boolean, printerType: 'USB' | 'Serial', cutCommandSent: boolean }
  OUTPUT: boolean
  
  RETURN input.printSuccess == true
         AND input.printerType == 'USB'
         AND (input.cutCommandSent == false 
              OR cutCommand_timing_inadequate()
              OR cutCommand_not_executed_by_printer())
         AND blank_paper_ejected_before_cut()
END FUNCTION
```

#### Examples

- **Exemplo 1**: Impressão bem-sucedida em impressora USB → delay de 800ms → `sendCutCommand()` chamado → `printerPort.isOpen` é false → fallback para `copy /b` → comando pode falhar → papel em branco ejetado
- **Exemplo 2**: Impressão bem-sucedida → comando de corte enviado muito cedo (antes do conteúdo ser totalmente impresso) → corte ocorre no meio do conteúdo → papel em branco adicional ejetado
- **Exemplo 3**: Comando de corte enviado via wmic → porta USB001 detectada → `copy /b` executado mas comando não chega à impressora → papel continua sendo ejetado
- **Edge Case**: Impressora serial com porta aberta → comando enviado via serial → corte funciona corretamente (comportamento esperado que deve ser preservado)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Impressão normal quando impressora está funcionando corretamente deve continuar funcionando
- Polling de status via `getPaperStatus()` e eventos `printer-paper-status` devem continuar funcionando para impressoras seriais
- Modo web (não-Electron) deve continuar funcionando sem verificação de impressora
- Cálculo de altura dinâmica do conteúdo via `offsetHeight` deve permanecer inalterado
- Retorno de `{ success: true/false }` do IPC handler `print-ticket` deve permanecer consistente
- Uso de `copy /b` para portas USB e LPT deve continuar sendo o método de envio de comandos raw

**Scope:**
Todas as entradas que NÃO envolvem impressoras USB em estado problemático ou comandos de corte devem ser completamente não afetadas por esta correção. Isso inclui:
- Impressoras seriais com polling funcionando
- Impressões bem-sucedidas em impressoras saudáveis
- Modo web sem Electron
- Outros comandos IPC não relacionados a impressão

## Hypothesized Root Cause

### Bug 1: Detecção de Papel

Baseado na análise do código, as causas mais prováveis são:

1. **API WMI Não Exposta**: A função `checkPrinterStatusWMI()` existe em `main.js` e o IPC handler `check-printer-wmi` está implementado, mas o `preload.js` não expõe `checkPrinterWMI()` através do `contextBridge`, tornando-a inacessível ao renderer.

2. **Verificação Inadequada no ServiceButton**: O `ServiceButton.handleClick()` (tanto em `TotemModule.jsx` quanto inline em `index.html`) verifica apenas `getPaperStatus()` que depende de polling serial, não funcionando para impressoras USB.

3. **Polling Serial Não Funciona com USB**: O polling via comando ESC/POS `0x10 0x04 0x04` requer porta serial aberta (`printerPort.isOpen`), mas impressoras USB não usam `SerialPort`, então `getPaperStatus()` sempre retorna 'ok'.

### Bug 2: Papel em Branco

Baseado na análise do código, as causas mais prováveis são:

1. **Timing Inadequado**: O delay de 800ms antes do corte pode ser muito curto para impressoras USB, causando o comando de corte ser enviado antes do conteúdo ser totalmente impresso.

2. **Comando de Corte Não Executado**: O fallback via `copy /b` para impressoras USB pode falhar silenciosamente se:
   - A porta USB não for detectada corretamente via wmic
   - O comando `copy /b` não tiver permissões adequadas
   - O driver da impressora não processar comandos raw corretamente

3. **Método de Envio Incorreto**: O comando ESC/POS pode não estar sendo enviado no formato correto para impressoras USB, ou o driver pode estar ignorando comandos raw enviados via `copy /b`.

4. **Configuração da Impressora**: A impressora pode estar configurada para ejetar papel adicional após impressão (configuração de "paper feed" ou "line feed" no driver).

## Correctness Properties

Property 1: Bug Condition 1 - Detecção de Papel via WMI

_For any_ user action where the user clicks a service button and the printer is in a problematic state (out-of-paper, offline, error, paper-jam), the fixed ServiceButton SHALL call `checkPrinterWMI()` before attempting to print, and SHALL block the print operation immediately if the status is not 'ok', displaying the appropriate error card to the user.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Preservation 1 - Normal Printing Behavior

_For any_ user action where the user clicks a service button and the printer status is 'ok' (healthy), the fixed code SHALL produce exactly the same behavior as the original code, proceeding with `printTicket()` and generating the ticket normally.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

Property 3: Bug Condition 2 - Corte Sem Papel em Branco

_For any_ successful print operation on a USB printer, the fixed `sendCutCommand()` SHALL execute the ESC/POS cut command correctly with adequate timing, causing the printer to cut the paper immediately after the content without ejecting additional blank paper.

**Validates: Requirements 2.6, 2.7, 2.8, 2.9**

Property 4: Preservation 2 - Print Success/Failure Handling

_For any_ print operation (successful or failed), the fixed code SHALL produce exactly the same IPC response format and error handling behavior as the original code, including updating `paperStatus` and sending `printer-paper-status` events.

**Validates: Requirements 3.5, 3.6, 3.7, 3.8**

## Fix Implementation

### Changes Required

Assumindo que nossa análise de causa raiz está correta:

#### Bug 1: Detecção de Papel

**File**: `preload.js`

**Changes**:
1. **Expor checkPrinterWMI via contextBridge**: Adicionar `checkPrinterWMI: () => ipcRenderer.invoke('check-printer-wmi')` ao objeto `electronAPI` exposto pelo `contextBridge`.

**File**: `src/components/TotemModule.jsx`

**Function**: `ServiceButton` component

**Changes**:
2. **Adicionar verificação WMI pré-impressão**: No `onClick` handler, antes de chamar `generateTicket()`, verificar se está no Electron e chamar `window.electronAPI.checkPrinterWMI()`. Se o status retornado for diferente de 'ok', chamar `onPaperOut()` com o status apropriado e retornar sem imprimir.

**File**: `index.html` (inline ServiceButton)

**Function**: `ServiceButton.handleClick()`

**Changes**:
3. **Adicionar verificação WMI pré-impressão (inline)**: Substituir a verificação atual de `getPaperStatus()` por `checkPrinterWMI()`. Se o status retornado for 'out-of-paper', chamar `onPaperOut('out')` e retornar. Se for 'offline' ou 'error', chamar `onPrintError()` com o status apropriado e retornar.

4. **Mapear status WMI para callbacks**: Criar lógica para mapear os status retornados por WMI ('ok', 'out-of-paper', 'offline', 'error') para os callbacks apropriados (`onPaperOut` vs `onPrintError`).

#### Bug 2: Papel em Branco

**File**: `main.js`

**Function**: `ipcMain.handle('print-ticket', ...)`

**Changes**:
5. **Aumentar delay do comando de corte**: Aumentar o delay de 800ms para 1200ms antes de chamar `sendCutCommand()` para garantir que o conteúdo foi totalmente impresso pela impressora USB.

**Function**: `sendCutCommand()`

**Changes**:
6. **Melhorar detecção de porta USB**: Adicionar logging mais detalhado para diagnosticar falhas no envio do comando de corte via `copy /b`.

7. **Adicionar retry para comando de corte**: Se o primeiro `copy /b` falhar, tentar novamente após 500ms (máximo 2 tentativas).

8. **Verificar execução do comando**: Capturar stderr do `exec()` para detectar falhas no `copy /b` e logar para diagnóstico.

## Testing Strategy

### Validation Approach

A estratégia de teste segue uma abordagem de duas fases: primeiro, demonstrar os bugs no código não corrigido através de testes exploratórios, depois verificar que a correção funciona corretamente e preserva o comportamento existente.

### Exploratory Bug Condition Checking

**Goal**: Demonstrar os bugs ANTES de implementar a correção. Confirmar ou refutar a análise de causa raiz. Se refutarmos, precisaremos re-hipotetisar.

#### Bug 1: Detecção de Papel

**Test Plan**: Escrever testes que simulam cliques em `ServiceButton` quando a impressora está em estado problemático. Mockar `window.electronAPI.getPaperStatus()` para retornar 'ok' (simulando polling serial não funcionando) e mockar `window.electronAPI.checkPrinterWMI()` para retornar 'out-of-paper'. Executar no código NÃO CORRIGIDO para observar falhas.

**Test Cases**:
1. **Impressora Sem Papel (USB)**: Simular clique em ServiceButton quando `checkPrinterWMI()` retorna 'out-of-paper' mas `getPaperStatus()` retorna 'ok' → **Esperado no código não corrigido**: `printTicket()` é chamado (falha)
2. **Impressora Offline**: Simular clique quando `checkPrinterWMI()` retorna 'offline' → **Esperado no código não corrigido**: `printTicket()` é chamado (falha)
3. **Impressora com Tampa Aberta**: Simular clique quando `checkPrinterWMI()` retorna 'error' → **Esperado no código não corrigido**: `printTicket()` é chamado (falha)
4. **API WMI Não Exposta**: Verificar que `window.electronAPI.checkPrinterWMI` é `undefined` no código não corrigido → **Esperado**: API não está disponível

**Expected Counterexamples**:
- `printTicket()` é chamado mesmo quando impressora está sem papel
- Múltiplas senhas são geradas sem bloqueio
- Possíveis causas: API WMI não exposta, verificação inadequada no ServiceButton

#### Bug 2: Papel em Branco

**Test Plan**: Escrever testes de integração que simulam impressão bem-sucedida e verificam se `sendCutCommand()` é chamado com timing adequado. Mockar `printerPort.isOpen` como false (impressora USB) e verificar se o fallback via `copy /b` é executado. Executar no código NÃO CORRIGIDO para observar falhas.

**Test Cases**:
1. **Timing do Comando de Corte**: Verificar que `sendCutCommand()` é chamado exatamente 800ms após impressão bem-sucedida → **Esperado no código não corrigido**: Delay pode ser inadequado
2. **Fallback para copy /b**: Simular impressora USB (`printerPort.isOpen` = false) e verificar que `exec('copy /b ...')` é chamado → **Esperado no código não corrigido**: Comando pode falhar silenciosamente
3. **Detecção de Porta USB**: Mockar saída do wmic para retornar 'USB001' e verificar que `copy /b` usa a porta correta → **Esperado no código não corrigido**: Detecção pode falhar
4. **Comando ESC/POS Correto**: Verificar que o buffer enviado é `[0x1D, 0x56, 0x00]` → **Esperado no código não corrigido**: Comando está correto mas execução falha

**Expected Counterexamples**:
- Comando de corte não é executado pela impressora
- Papel em branco é ejetado antes do corte
- Possíveis causas: timing inadequado, fallback via `copy /b` falhando, driver não processando comandos raw

### Fix Checking

**Goal**: Verificar que para todas as entradas onde as condições de bug se aplicam, as funções corrigidas produzem o comportamento esperado.

#### Bug 1: Detecção de Papel

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition1(input) DO
  // input = { printerState: 'out-of-paper' | 'offline' | 'error', userAction: 'click-service-button' }
  
  // Simular clique no ServiceButton
  result := ServiceButton_fixed.handleClick(input)
  
  // Verificar que checkPrinterWMI foi chamado
  ASSERT checkPrinterWMI_was_called()
  
  // Verificar que printTicket NÃO foi chamado
  ASSERT NOT printTicket_was_called()
  
  // Verificar que callback apropriado foi chamado
  IF input.printerState == 'out-of-paper' THEN
    ASSERT onPaperOut_was_called_with('out')
  ELSE IF input.printerState IN ['offline', 'error'] THEN
    ASSERT onPrintError_was_called()
  END IF
END FOR
```

#### Bug 2: Papel em Branco

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition2(input) DO
  // input = { printSuccess: true, printerType: 'USB' }
  
  // Simular impressão bem-sucedida
  result := printTicket_fixed(input)
  
  // Verificar que sendCutCommand foi chamado com timing adequado
  ASSERT sendCutCommand_was_called_after_delay(1200) // ms
  
  // Verificar que comando ESC/POS foi enviado corretamente
  ASSERT cut_command_buffer == [0x1D, 0x56, 0x00]
  
  // Verificar que fallback via copy /b foi executado para USB
  IF input.printerType == 'USB' THEN
    ASSERT copy_b_command_was_executed()
  END IF
END FOR
```

### Preservation Checking

**Goal**: Verificar que para todas as entradas onde as condições de bug NÃO se aplicam, as funções corrigidas produzem exatamente o mesmo resultado que as funções originais.

#### Bug 1: Detecção de Papel

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition1(input) DO
  // input = { printerState: 'ok', userAction: 'click-service-button' }
  //      OR { printerState: any, userAction: 'other' }
  //      OR { isElectron: false }
  
  result_original := ServiceButton_original.handleClick(input)
  result_fixed    := ServiceButton_fixed.handleClick(input)
  
  ASSERT result_original == result_fixed
  
  // Verificar que printTicket foi chamado normalmente quando impressora está ok
  IF input.printerState == 'ok' AND input.userAction == 'click-service-button' THEN
    ASSERT printTicket_was_called()
  END IF
END FOR
```

**Testing Approach**: Property-based testing é recomendado para preservation checking porque:
- Gera muitos casos de teste automaticamente através do domínio de entrada
- Captura edge cases que testes unitários manuais podem perder
- Fornece garantias fortes de que o comportamento permanece inalterado para todas as entradas não-buggy

**Test Plan**: Observar comportamento no código NÃO CORRIGIDO primeiro para impressões normais e outros cenários, depois escrever testes baseados em propriedades capturando esse comportamento.

**Test Cases**:
1. **Impressão Normal**: Observar que quando `checkPrinterWMI()` retorna 'ok', `printTicket()` é chamado normalmente → Escrever teste para verificar isso continua após correção
2. **Modo Web**: Observar que no modo web (não-Electron), impressão funciona sem verificação de impressora → Escrever teste para verificar isso continua
3. **Polling de Status**: Observar que eventos `printer-paper-status` continuam sendo enviados → Escrever teste para verificar isso continua
4. **Impressoras Seriais**: Observar que impressoras seriais com polling funcionando continuam operando normalmente → Escrever teste para verificar isso continua

#### Bug 2: Papel em Branco

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition2(input) DO
  // input = { printSuccess: false }
  //      OR { printerType: 'Serial' }
  //      OR { isElectron: false }
  
  result_original := printTicket_original(input)
  result_fixed    := printTicket_fixed(input)
  
  ASSERT result_original == result_fixed
  
  // Verificar que resposta IPC permanece consistente
  ASSERT result_original.success == result_fixed.success
  ASSERT result_original.errorType == result_fixed.errorType
END FOR
```

**Test Plan**: Observar comportamento no código NÃO CORRIGIDO primeiro para impressões falhadas e impressoras seriais, depois escrever testes baseados em propriedades capturando esse comportamento.

**Test Cases**:
1. **Impressão Falhada**: Observar que quando impressão falha, `paperStatus` é atualizado para 'out' → Escrever teste para verificar isso continua
2. **Impressora Serial**: Observar que comando de corte via porta serial funciona corretamente → Escrever teste para verificar isso continua
3. **Cálculo de Altura**: Observar que altura dinâmica via `offsetHeight` é calculada corretamente → Escrever teste para verificar isso continua
4. **Resposta IPC**: Observar formato de resposta `{ success, errorType }` → Escrever teste para verificar isso continua

### Unit Tests

#### Bug 1: Detecção de Papel

- Testar que `preload.js` expõe `checkPrinterWMI()` via `contextBridge`
- Testar que `ServiceButton.handleClick()` chama `checkPrinterWMI()` antes de `printTicket()`
- Testar que quando `checkPrinterWMI()` retorna 'out-of-paper', `onPaperOut('out')` é chamado
- Testar que quando `checkPrinterWMI()` retorna 'offline', `onPrintError()` é chamado
- Testar que quando `checkPrinterWMI()` retorna 'ok', `printTicket()` é chamado normalmente
- Testar edge case: modo web (não-Electron) continua funcionando sem verificação

#### Bug 2: Papel em Branco

- Testar que `sendCutCommand()` é chamado 1200ms após impressão bem-sucedida
- Testar que comando ESC/POS correto `[0x1D, 0x56, 0x00]` é enviado
- Testar que fallback via `copy /b` é usado quando `printerPort.isOpen` é false
- Testar que detecção de porta USB via wmic funciona corretamente
- Testar edge case: impressora serial com porta aberta usa envio via serial
- Testar edge case: retry de comando de corte quando primeiro `copy /b` falha

### Property-Based Tests

#### Bug 1: Detecção de Papel

- Gerar estados aleatórios de impressora ('ok', 'out-of-paper', 'offline', 'error') e verificar que comportamento correto ocorre para cada estado
- Gerar configurações aleatórias de serviços e verificar que verificação WMI ocorre para todos os botões
- Testar que para todos os estados não-problemáticos ('ok'), impressão procede normalmente

#### Bug 2: Papel em Branco

- Gerar resultados aleatórios de impressão (sucesso/falha) e verificar que comando de corte é enviado apenas para sucessos
- Gerar tipos aleatórios de impressora (USB/Serial) e verificar que método correto de envio é usado
- Testar que para todas as impressões bem-sucedidas, timing de corte é adequado (>= 1200ms)

### Integration Tests

#### Bug 1: Detecção de Papel

- Testar fluxo completo: usuário clica em botão → verificação WMI → bloqueio quando sem papel → ErrorCard exibido
- Testar fluxo completo: usuário clica em botão → verificação WMI retorna 'ok' → impressão procede → senha gerada
- Testar switching entre estados: impressora sem papel → papel reposto → verificação WMI detecta mudança → impressão permitida

#### Bug 2: Papel em Branco

- Testar fluxo completo: impressão bem-sucedida → delay de 1200ms → comando de corte enviado → papel cortado sem branco adicional
- Testar fluxo completo com impressora USB: impressão → detecção de porta via wmic → `copy /b` executado → corte bem-sucedido
- Testar fluxo completo com impressora serial: impressão → comando enviado via porta serial → corte bem-sucedido
