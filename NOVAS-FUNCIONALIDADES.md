# Novas Funcionalidades Implementadas

## 1. ✅ Correção: Renomear Guichê

### Problema
Não era possível renomear os guichês no painel de administrador.

### Causa
O código estava chamando `refresh()` em vez de `window.dispatchUpdate()`, então as mudanças não eram salvas no Firebase.

### Solução
Substituído `refresh()` por `window.dispatchUpdate()` nos campos de:
- Nome do guichê (input text)
- Status ativo/inativo (checkbox)

### Como usar
1. Vá para **Administrador** → **Guichês**
2. Digite o novo nome no campo de texto
3. As mudanças são salvas automaticamente

---

## 2. ✅ Campo de Slogan da Empresa

### Descrição
Adicionado campo para configurar o slogan da empresa nas configurações gerais.

### Localização
**Administrador** → **Configurações** → **Slogan da Empresa**

### Onde aparece
O slogan fica salvo em `APP_STATE.config.companySlogan` e pode ser usado em:
- Totem (mensagem de boas-vindas)
- Painel (rodapé ou cabeçalho)
- Impressão de senhas

### Como usar
1. Vá para **Administrador** → **Configurações**
2. Preencha o campo **Slogan da Empresa**
3. Clique em **Salvar Configurações**

---

## 3. ✅ Backup e Restauração Completa

### Descrição
Sistema completo de backup e restauração de todas as configurações do sistema via arquivo JSON local.

### O que é incluído no backup
- ✅ Configurações gerais (nome da unidade, setor, slogan, horários, etc.)
- ✅ Tipos de senha (serviços) com cores e contadores
- ✅ Guichês (estações) com nomes e status
- ✅ Mídia indoor (slides, vídeos, imagens)
- ✅ Histórico de chamadas
- ✅ Fila atual
- ✅ Chamada atual

### Localização
**Administrador** → **Configurações** → **Backup e Restauração**

### Como fazer backup

1. Vá para **Administrador** → **Configurações**
2. Role até a seção **Backup e Restauração**
3. Clique em **💾 Fazer Backup Completo**
4. Um arquivo JSON será baixado: `backup-balcao-YYYY-MM-DD.json`
5. Guarde este arquivo em local seguro

### Como restaurar backup

1. Vá para **Administrador** → **Configurações**
2. Role até a seção **Backup e Restauração**
3. Clique em **📂 Restaurar Backup**
4. Selecione o arquivo JSON do backup
5. Confirme a restauração (⚠️ **ATENÇÃO**: Isso irá substituir TODAS as configurações atuais)
6. O sistema será recarregado automaticamente

### Formato do arquivo de backup

```json
{
  "version": "1.0",
  "exportDate": "2026-04-18T11:43:00.000Z",
  "config": {
    "unitName": "Frutas Secas",
    "sectorName": "Atendimento",
    "companySlogan": "Qualidade e Sabor",
    "welcomeMessage": "Bem-vindo!",
    "footerMessage": "Obrigado pela preferência",
    "workingHours": { "start": "08:00", "end": "18:00" },
    "overlayDuration": 5,
    "callSoundMode": "both",
    "soundVolume": 0.8
  },
  "services": [...],
  "stations": [...],
  "mediaItems": [...],
  "called": [...],
  "queue": [...],
  "currentCall": null
}
```

### Casos de uso

#### 1. Manutenção preventiva
- Faça backup antes de fazer mudanças grandes
- Se algo der errado, restaure o backup

#### 2. Migração de sistema
- Faça backup no sistema antigo
- Restaure no sistema novo
- Todas as configurações são transferidas

#### 3. Múltiplas unidades
- Configure uma unidade completamente
- Faça backup
- Restaure em outras unidades
- Ajuste apenas o que for diferente (nome da unidade, etc.)

#### 4. Backup periódico
- Faça backup semanal/mensal
- Guarde em local seguro (nuvem, HD externo)
- Em caso de problema, restaure o último backup

### Validação de backup

O sistema valida se o arquivo é um backup válido verificando:
- ✅ Presença do campo `version`
- ✅ Presença do campo `config`
- ✅ Presença do campo `services`
- ✅ Presença do campo `stations`

Se o arquivo for inválido, uma mensagem de erro será exibida.

### Segurança

⚠️ **IMPORTANTE**: 
- O backup contém TODAS as configurações do sistema
- Guarde o arquivo em local seguro
- Não compartilhe o backup com pessoas não autorizadas
- Faça backups regulares

---

## Testes

✅ Todos os 72 testes passam
✅ Nenhuma funcionalidade foi quebrada
✅ Novas funcionalidades testadas manualmente

---

## Arquivos Modificados

- `index.html`:
  - Corrigido `refresh()` → `window.dispatchUpdate()` em AdminStations
  - Adicionado campo `companySlogan` em AdminSettings
  - Adicionadas funções `exportBackup()` e `importBackup()`
  - Adicionada seção "Backup e Restauração" no AdminSettings

---

## Próximos Passos Sugeridos

1. **Exibir slogan no Totem**: Adicionar o slogan abaixo do nome da unidade
2. **Exibir slogan no Painel**: Adicionar o slogan no rodapé ou cabeçalho
3. **Backup automático**: Agendar backup automático diário/semanal
4. **Backup na nuvem**: Integrar com Google Drive, Dropbox, etc.
5. **Histórico de backups**: Manter lista dos últimos backups feitos
