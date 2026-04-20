# Sistema de Senha do Funcionário para Troca de Papel

## Visão Geral

Sistema de bloqueio e desbloqueio quando a impressora fica sem papel, exigindo código do funcionário para liberar o totem após a troca do papel.

---

## Como Funciona

### 1. Detecção de Papel Acabado

Quando a impressora detecta que o papel acabou:
- ✅ Totem é **bloqueado completamente**
- ✅ Card vermelho em tela cheia aparece
- ✅ Mensagem: **"SEM PAPEL - Chame um funcionário para trocar o papel"**
- ✅ Cliente **não consegue** imprimir novas senhas

### 2. Fluxo de Desbloqueio

#### Passo 1: Cliente chama funcionário
- Card vermelho exibe: **"📞 Funcionário Chegou — Desbloquear"**
- Cliente clica no botão quando funcionário chegar

#### Passo 2: Funcionário troca o papel
- Funcionário remove papel velho
- Coloca papel novo na impressora
- Verifica que está funcionando

#### Passo 3: Funcionário digita código
- Tela exibe campo de senha
- Funcionário digita o código configurado (padrão: `1234`)
- Pressiona **Enter** ou clica em **✓ Confirmar**

#### Passo 4: Desbloqueio
- ✅ Se código correto: Totem é desbloqueado, cliente pode continuar
- ❌ Se código errado: Mensagem de erro, funcionário tenta novamente

---

## Configuração do Código

### Onde configurar
**Administrador** → **Configurações** → **Código de Desbloqueio do Funcionário**

### Código padrão
`1234`

### Como alterar
1. Vá para **Administrador** → **Configurações**
2. Localize o campo **"Código de Desbloqueio do Funcionário (para trocar papel)"**
3. Digite o novo código (ex: `5678`, `admin`, `senha123`)
4. Clique em **Salvar Configurações**

### Recomendações de código
- ✅ Use algo fácil de lembrar para os funcionários
- ✅ Pode ser numérico (`1234`) ou alfanumérico (`admin`)
- ✅ Não precisa ser super seguro (é apenas para evitar que clientes desbloqueiem sozinhos)
- ⚠️ Evite códigos muito longos (funcionário precisa digitar rápido)

---

## Interface do Card de Erro

### Estado 1: Papel Acabou (Inicial)
```
┌─────────────────────────────────────┐
│              🚨                      │
│          SEM PAPEL                   │
│                                      │
│  Chame um funcionário para trocar   │
│           o papel                    │
│                                      │
│  Impressora sem papel                │
│                                      │
│  [📞 Funcionário Chegou — Desbloquear]│
└─────────────────────────────────────┘
```

### Estado 2: Digitando Código
```
┌─────────────────────────────────────┐
│              🚨                      │
│          SEM PAPEL                   │
│                                      │
│  Digite o código de desbloqueio:    │
│                                      │
│  [    ••••    ]  (campo de senha)   │
│                                      │
│  [✓ Confirmar]  [✕ Cancelar]        │
└─────────────────────────────────────┘
```

### Estado 3: Código Incorreto
```
┌─────────────────────────────────────┐
│              🚨                      │
│          SEM PAPEL                   │
│                                      │
│  Digite o código de desbloqueio:    │
│                                      │
│  [          ]  (campo limpo)        │
│                                      │
│  ⚠️ Código incorreto! Tente novamente.│
│                                      │
│  [✓ Confirmar]  [✕ Cancelar]        │
└─────────────────────────────────────┘
```

---

## Características de Segurança

### Bloqueio Total
- ✅ Cliente **não pode** clicar em nenhum botão de serviço
- ✅ Cliente **não pode** imprimir senha
- ✅ Card vermelho cobre toda a tela (z-index: 4000)
- ✅ Backdrop escuro impede interação com elementos atrás

### Campo de Senha
- ✅ Tipo `password` (mostra `••••` em vez do texto)
- ✅ AutoFocus (cursor já fica no campo)
- ✅ Enter para confirmar (funcionário não precisa clicar)
- ✅ Código é limpo após erro (segurança)

### Validação
- ✅ Compara com `APP_STATE.config.staffUnlockCode`
- ✅ Validação exata (case-sensitive)
- ✅ Mensagem de erro clara
- ✅ Permite múltiplas tentativas

---

## Casos de Uso

### Caso 1: Papel Acabou Durante Atendimento
1. Cliente está no totem
2. Clica em "Geral" para tirar senha
3. Impressora detecta papel acabado
4. Card vermelho aparece: **"SEM PAPEL"**
5. Cliente chama funcionário
6. Funcionário troca papel
7. Cliente clica em **"Funcionário Chegou"**
8. Funcionário digita código `1234`
9. Totem desbloqueia
10. Cliente tira sua senha normalmente

### Caso 2: Código Errado
1. Papel acabou, card vermelho aparece
2. Cliente tenta desbloquear sozinho
3. Clica em **"Funcionário Chegou"**
4. Tenta adivinhar código: `0000`
5. Mensagem: **"Código incorreto! Tente novamente."**
6. Campo é limpo
7. Cliente desiste e chama funcionário
8. Funcionário digita código correto
9. Totem desbloqueia

### Caso 3: Funcionário Cancela
1. Papel acabou, card vermelho aparece
2. Cliente clica em **"Funcionário Chegou"**
3. Funcionário percebe que esqueceu o papel
4. Clica em **✕ Cancelar**
5. Volta para tela inicial do card
6. Funcionário busca papel
7. Volta e clica em **"Funcionário Chegou"** novamente
8. Digita código e desbloqueia

---

## Diferença entre PaperOutCard e ErrorCard

### PaperOutCard (Aviso Leve)
- **Quando**: Papel está **acabando** (near)
- **Cor**: Amarelo/Laranja
- **Ação**: Cliente pode dispensar o aviso
- **Bloqueio**: Não bloqueia o totem
- **Objetivo**: Avisar para chamar funcionário preventivamente

### ErrorCard (Erro Crítico)
- **Quando**: Papel **acabou completamente** (out)
- **Cor**: Vermelho
- **Ação**: Requer código do funcionário
- **Bloqueio**: Bloqueia totem completamente
- **Objetivo**: Impedir impressão até trocar papel

---

## Integração com Electron

### Detecção de Papel
O sistema detecta papel acabado via:
1. **Electron API**: `window.electronAPI.getPaperStatus()`
2. **WebUSB**: Leitura direta da impressora (fallback)
3. **Callback de impressão**: `onPaperOut('out')`

### Fluxo de Detecção
```javascript
// Electron detecta papel acabado
window.electronAPI.getPaperStatus() // retorna 'out'

// TotemModule atualiza estado
setErrorReason('paper-out')

// ErrorCard é renderizado
<ErrorCard reason="paper-out" onDismiss={...} />

// Funcionário digita código correto
setErrorReason(null) // Remove o card
```

---

## Testes

### Teste Manual 1: Papel Acabou
1. Abra: `npm start`
2. Vá para módulo **Totem**
3. Simule papel acabado (desconecte impressora ou use mock)
4. Verifique que card vermelho aparece
5. Clique em **"Funcionário Chegou"**
6. Digite código `1234`
7. Verifique que totem desbloqueia

### Teste Manual 2: Código Errado
1. Papel acabou, card vermelho aparece
2. Clique em **"Funcionário Chegou"**
3. Digite código errado: `0000`
4. Verifique mensagem de erro
5. Digite código correto: `1234`
6. Verifique que desbloqueia

### Teste Manual 3: Alterar Código
1. Vá para **Administrador** → **Configurações**
2. Altere código para `5678`
3. Clique em **Salvar Configurações**
4. Simule papel acabado
5. Tente desbloquear com `1234` (deve falhar)
6. Tente desbloquear com `5678` (deve funcionar)

### Testes Automatizados
✅ Todos os 72 testes passam
✅ Nenhuma funcionalidade foi quebrada

---

## Arquivos Modificados

- `index.html`:
  - Adicionado campo `staffUnlockCode` em `AdminSettings`
  - Modificado `ErrorCard` com sistema de senha
  - Adicionado estado `unlockCode`, `error`, `showInput`
  - Adicionada validação de código
  - Adicionada interface de desbloqueio

---

## Configuração Salva

O código é salvo em:
```javascript
APP_STATE.config.staffUnlockCode = '1234' // padrão
```

E sincronizado via Firebase automaticamente.

---

## Melhorias Futuras Sugeridas

1. **Histórico de desbloqueios**: Registrar quando e quem desbloqueou
2. **Múltiplos códigos**: Código diferente para cada funcionário
3. **Timeout**: Bloquear após 3 tentativas erradas
4. **Notificação**: Enviar SMS/email quando papel acabar
5. **Biometria**: Usar impressão digital em vez de código
6. **QR Code**: Funcionário escaneia QR code para desbloquear
