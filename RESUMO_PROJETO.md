# Documentação Final — Sistema BALCÃO Senhas (Offline)

Este documento resume todas as implementações, correções e melhorias realizadas para transformar o sistema em uma solução 100% offline, resiliente e profissional.

## 🏗️ 1. Arquitetura e Sincronização
O sistema foi migrado de uma dependência externa (Firebase) para uma infraestrutura de **Servidor Local**.
- **Servidor (server.js)**: Um servidor Node.js centraliza o estado do sistema.
- **Banco de Dados (db.json)**: Persistência local de configurações, filas e histórico, permitindo que o sistema mantenha o estado mesmo após reinicializações.
- **Sincronização por Rede**: Utiliza *polling* (requisições periódicas) via IP local, permitindo que Totens, Painéis e Celulares se comuniquem em tempo real sem internet.

## 🖨️ 2. Motor de Impressão (ESC/POS Raw)
Para solucionar o problema de páginas em branco na impressora **K80 Tornado**, a lógica de impressão foi totalmente reconstruída.
- **Impressão Direta (Raw)**: O sistema agora gera comandos binários ESC/POS e os envia diretamente para as portas USB ou Serial (COM), ignorando o Spooler do Windows.
- **Formatos Suportados**: Senhas em tamanho grande, negrito, centralização e suporte nativo ao comando de **Corte de Papel**.
- **Monitoramento de Papel**: Implementado polling de status (`ESC v`) que detecta em tempo real se a impressora está sem papel ou com a tampa aberta.

## 📱 3. Módulo Operador Mobile (Premium)
Foi criado um interface dedicada para o operador usar no celular ou tablet.
- **Design High-End**: Interface focada em usabilidade com botões grandes e suporte a **Modo Claro** e **Modo Escuro**.
- **Botão Retroceder (Desfazer)**: Lógica inteligente que permite "destruir" uma chamada feita por engano, devolvendo a senha para o topo da fila e restaurando a ordem anterior.
- **Visor Geral**: O operador consegue ver no celular qual senha está sendo exibida no visor principal (TV) da loja.
- **Toasts e Feedback**: Confirmações visuais para cada ação tomada (Repetir, Chamar, Voltar).

## 🏢 4. Personalização e Marca
- **Logo e Slogan**: Adicionado suporte para exibir o logotipo da empresa e um slogan curto em todas as interfaces.
- **Configurações Dinâmicas**: Nome da unidade, horários de funcionamento, mensagens de rodapé e códigos de segurança podem ser alterados sem mexer no código.
- **Diagnóstico Automático**: O servidor agora detecta e exibe automaticamente o endereço IP da máquina para facilitar a conexão de novos dispositivos.

## 🛠️ Detalhes Técnicos (Arquivos Chave)
- `main.js`: Lógica de hardware (impressão Raw e monitoramento de papel).
- `server.js`: API e servidor de arquivos estáticos.
- `index.html`: Core do sistema (Totem, Painel e Admin).
- `mobile.html`: Interface premium do operador para dispositivos móveis.
- `db.json`: Onde seus dados e configurações estão salvos.

---
**Sistema pronto para operação local.**
