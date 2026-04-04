# Sistema BALCÃO — Documentação de Instalação

## Visão Geral

O sistema funciona como um único arquivo `index.html` que pode ser aberto em qualquer browser. Cada estação (Totem, Painel, Operador, Administrador) roda em uma máquina separada e se comunica em tempo real via **Firebase Realtime Database** (gratuito).

---

## Arquitetura

```
[Totem PC]        [Painel TV]       [Operador PC]     [Admin PC]
index.html         index.html        index.html        index.html
?mode=totem        ?mode=painel      ?mode=operador    ?mode=admin
     |                  |                 |                 |
     └──────────────────┴─────────────────┴─────────────────┘
                              │
                    Firebase Realtime DB
                    (LAN + Internet)
```

---

## Requisitos

### Hardware mínimo por estação
| Estação    | CPU        | RAM   | Tela           |
|------------|------------|-------|----------------|
| Totem      | Qualquer   | 2 GB  | Touch 15"–21"  |
| Painel     | Qualquer   | 2 GB  | TV/Monitor 32"+ |
| Operador   | Qualquer   | 2 GB  | Monitor padrão |
| Admin      | Qualquer   | 2 GB  | Monitor padrão |

### Software
- **Browser**: Google Chrome 90+ ou Microsoft Edge 90+ (recomendado Chrome)
- **Conexão**: Wi-Fi ou cabo Ethernet na mesma rede local, ou acesso à internet
- **Impressora** (Totem): Impressora térmica 80mm configurada como padrão no Windows

---

## Passo 1 — Criar projeto Firebase (gratuito)

1. Acesse [https://console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **"Adicionar projeto"**
3. Dê um nome (ex: `balcao-senhas`) e clique em **Continuar**
4. Desative o Google Analytics (opcional) e clique em **Criar projeto**
5. No menu lateral, clique em **Realtime Database**
6. Clique em **"Criar banco de dados"**
7. Escolha a região mais próxima (ex: `us-central1`) e clique em **Próximo**
8. Selecione **"Iniciar no modo de teste"** e clique em **Ativar**

> ⚠️ O modo de teste permite leitura/escrita sem autenticação por 30 dias. Para produção, configure as regras de segurança.

---

## Passo 2 — Obter as credenciais do Firebase

1. No console Firebase, clique no ícone de engrenagem ⚙️ → **Configurações do projeto**
2. Role até **"Seus aplicativos"** e clique em **"</> Web"**
3. Registre o app com um apelido (ex: `balcao-web`) e clique em **Registrar app**
4. Copie o objeto `firebaseConfig` exibido:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "balcao-senhas.firebaseapp.com",
  databaseURL: "https://balcao-senhas-default-rtdb.firebaseio.com",
  projectId: "balcao-senhas",
  storageBucket: "balcao-senhas.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## Passo 3 — Configurar o index.html

Abra o arquivo `index.html` em qualquer editor de texto (Bloco de Notas, VS Code, etc.) e localize o bloco:

```js
const FIREBASE_CONFIG = {
  apiKey:            "COLE_SUA_API_KEY_AQUI",
  authDomain:        "SEU_PROJETO.firebaseapp.com",
  databaseURL:       "https://SEU_PROJETO-default-rtdb.firebaseio.com",
  ...
};
```

Substitua pelos valores copiados no Passo 2. Salve o arquivo.

---

## Passo 4 — Distribuir o arquivo para cada estação

Copie o `index.html` configurado para cada máquina (pen drive, pasta de rede, etc.).

---

## Passo 5 — Abrir cada estação no modo correto

Em cada máquina, abra o Chrome e acesse o arquivo com o parâmetro `?mode=`:

| Estação      | Como abrir                                              |
|--------------|---------------------------------------------------------|
| Totem        | Arraste `index.html` para o Chrome → adicione `?mode=totem` na barra de endereço |
| Painel (TV)  | `?mode=painel`                                          |
| Operador     | `?mode=operador`                                        |
| Administrador| `?mode=admin`                                           |
| Completo     | Sem parâmetro — exibe todos os módulos com NavBar       |

### Exemplo de URL local:
```
file:///C:/balcao/index.html?mode=totem
file:///C:/balcao/index.html?mode=painel
file:///C:/balcao/index.html?mode=operador
file:///C:/balcao/index.html?mode=admin
```

### Dica — Criar atalho direto no Desktop:
1. Clique com botão direito no Desktop → **Novo → Atalho**
2. Local: `"C:\Program Files\Google\Chrome\Application\chrome.exe" --app="file:///C:/balcao/index.html?mode=totem" --start-fullscreen`
3. Nomeie como "Totem BALCÃO"

O parâmetro `--app` abre o Chrome sem barra de endereço (modo kiosk leve). Use `--start-fullscreen` para tela cheia.

---

## Passo 6 — Configurar impressora no Totem

1. Instale o driver da impressora térmica 80mm no PC do Totem
2. Defina-a como **impressora padrão** no Windows:
   - Configurações → Bluetooth e dispositivos → Impressoras e scanners
   - Selecione a impressora → **Definir como padrão**
3. Configure o tamanho do papel:
   - Propriedades da impressora → Preferências → Tamanho do papel: **80mm** (ou "Receipt 80mm")

---

## Modo Offline / Fallback

Se o Firebase não estiver configurado ou a internet cair:
- O sistema continua funcionando **localmente** no mesmo browser
- A sincronização entre máquinas fica suspensa até a conexão ser restaurada
- O Firebase sincroniza automaticamente quando a conexão volta

---

## Regras de Segurança Firebase (Produção)

Para uso em produção, substitua as regras do Realtime Database por:

```json
{
  "rules": {
    "balcao": {
      ".read": true,
      ".write": true
    }
  }
}
```

Para maior segurança, adicione autenticação por IP ou token. Consulte a [documentação Firebase](https://firebase.google.com/docs/database/security).

---

## Solução de Problemas

| Problema | Solução |
|----------|---------|
| Estações não sincronizam | Verifique se o `databaseURL` no `FIREBASE_CONFIG` está correto |
| Janela de impressão não abre | Verifique se o Chrome está bloqueando popups — permita para `file://` |
| Tela em branco | Abra o DevTools (F12) e verifique erros no Console |
| Firebase: "Permission denied" | O período de teste (30 dias) expirou — atualize as regras de segurança |
| Modo kiosk não funciona | Use o parâmetro `--kiosk` no atalho do Chrome para modo kiosk completo |
