# Documentação do Projeto: Sistema de Senhas (Foco: Totem)

Este documento descreve o funcionamento técnico e as funcionalidades do **Totem de Autoatendimento**, parte integrante do sistema de gerenciamento de senhas para o setor BALCÃO.

---

## 🏗️ Arquitetura do Totem

O Totem é uma aplicação **Electron** que roda o `index.html` em modo **Kiosk** (tela cheia, sem molduras). Ele se comunica com o hardware (impressora térmica) através de uma ponte IPC (*Inter-Process Communication*) definida no `preload.js`.

### Fluxo de Funcionamento:
1. **Interface:** Apresenta botões para geração de senhas (Geral e Preferencial).
2. **Lógica de Geração:** Ao clicar, o sistema gera um número sequencial (001-999) e salva no estado global.
3. **Hardware:** O front-end solicita a impressão via `window.electronAPI.printTicket(html)`.
4. **Segurança:** Caso a impressora falhe (sem papel ou offline), o totem é bloqueado automaticamente por um card de erro que exige senha do funcionário.

---

## 📂 Funcionalidades Principais

### 1. Geração de Senhas
- **Sequencial:** As senhas seguem um ciclo contínuo de 001 a 999.
- **Tipos:** Configurado inicialmente com "Geral" (Azul) e "Preferencial" (Verde).
- **Feedback:** Exibe um modal de confirmação com a senha e uma barra de temporizador (6 segundos) antes de voltar à tela inicial.

### 2. Impressão Inteligente (K80 Tornado)
- **Cálculo de Altura:** O sistema mede o tamanho do cupom dinamicamente para evitar desperdício de papel.
- **Comando de Corte:** Após a impressão, o Electron envia um comando ESC/POS (`GS V 0`) para a guilhotina da impressora.
- **Destaque Visual:** O cupom contém o nome da unidade, setor, número da senha em destaque, data/hora e mensagem de boas-vindas.

### 3. Gerenciamento de Erros e Papel
- **Detecção de Papel:**
    - **Modo 'Near' (Papel Acabando):** Exibe um aviso amarelo discreto no topo, mas permite continuar operando.
    - **Modo 'Out' (Sem Papel):** Bloqueia a tela com um aviso vermelho crítico ("SEM PAPEL").
- **Bloqueio de Segurança:** Qualquer erro crítico exige uma senha administrativa (`staffUnlockCode`) para ser liberado, garantindo que o cliente não tente usar o totem quebrado.

---

## 🛠️ Configurações Relacionadas (No Administrador)

O comportamento do Totem pode ser ajustado na aba **Administrador**:
- **Slogan da Empresa:** Texto que aparece no topo do totem e no cupom impresso.
- **Mensagem de Boas-vindas:** Texto exibido no rodapé do cupom.
- **Senha de Desbloqueio:** Código necessário para liberar o totem após um erro.
- **Cores dos Serviços:** É possível mudar a cor dos botões (Geral/Preferencial) diretamente no painel.

---

## 💻 Comandos e Execução

Para rodar apenas o módulo Totem em tela cheia:

```bash
npm start -- --mode=totem
```

Para rodar em modo desenvolvimento (com ferramentas de inspeção):

```bash
npm start -- --mode=totem --dev
```

---

## 📝 Próximos Ajustes Planejados
- [ ] Refino do fallback local para funcionamento 100% offline sem Firebase.
- [ ] Adição de campo para seleção manual de porta COM na interface de Admin.
- [ ] Implementação de salvamento automático do contador de senhas em arquivo `db.json`.

> [!NOTE]
> O sistema foi projetado para ser resiliente. Mesmo em caso de queda de energia ou fechamento do app, o último número de senha gerado é preservado pelo armazenamento de estado.
