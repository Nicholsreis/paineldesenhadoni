# Requirements Document

## Introduction

Sistema de Gerenciamento de Senhas para o setor BALCÃO — aplicação web single-page em arquivo HTML único, sem backend, com estado compartilhado em memória. A aplicação é dividida em quatro módulos (Totem, Painel, Operador, Administrador) acessíveis por barra de navegação. Suporta dois tipos de senha: Geral (G) e Preferencial (P), com regras de prioridade, configuração dinâmica e exibição de mídia indoor.

---

## Glossary

- **Sistema**: A aplicação web de gerenciamento de senhas como um todo.
- **Totem**: Módulo de autoatendimento onde o usuário retira sua senha.
- **Painel**: Módulo de exibição pública das senhas chamadas e mídia indoor.
- **Operador**: Módulo de uso interno para chamar senhas e gerenciar atendimento.
- **Administrador**: Módulo de configuração e gestão do sistema.
- **Senha**: Identificador único gerado no formato `[NÚMERO]` com zero-padding de 3 dígitos (ex.: 001, 002, 003). Como o sistema possui apenas o setor BALCÃO, não há prefixo de setor na senha.
- **Tipo_de_Senha**: Categoria de atendimento (Geral ou Preferencial), com prefixo, cor e prioridade configuráveis.
- **Fila**: Conjunto ordenado de senhas aguardando atendimento, separado por Tipo_de_Senha.
- **Guichê**: Estação de atendimento identificada por número e label, podendo estar ativa ou inativa.
- **Chamada**: Evento de convocação de uma Senha para um Guichê específico.
- **Estado_Global**: Objeto em memória compartilhado entre todos os módulos, sem persistência externa.
- **Slide**: Item de mídia indoor com título, legenda, URL de imagem ou cor de fallback e duração.
- **Carrossel**: Componente do Painel que exibe Slides em rotação automática.
- **Contador**: Número sequencial por Tipo_de_Senha, usado para gerar o número da Senha.
- **Reset_Diário**: Operação que zera filas e contadores mantendo configurações.
- **Reset_Completo**: Operação que restaura o Estado_Global ao estado inicial de fábrica.

---

## Requirements

### Requirement 1: Estado Global Compartilhado

**User Story:** Como desenvolvedor, quero um Estado_Global em memória compartilhado entre todos os módulos, para que qualquer alteração seja refletida imediatamente em toda a aplicação sem necessidade de backend.

#### Acceptance Criteria

1. THE Sistema SHALL manter o Estado_Global em memória JavaScript, sem uso de localStorage, sessionStorage, banco de dados ou chamadas de rede.
2. THE Estado_Global SHALL conter as seguintes entidades: `config`, `services`, `stations`, `queue`, `called`, `currentCall` e `mediaItems`.
3. THE Estado_Global SHALL ser inicializado com dados de exemplo ao carregar a aplicação.
4. WHEN qualquer módulo altera o Estado_Global, THE Sistema SHALL refletir a mudança em todos os módulos ativos sem recarregar a página.
5. THE `config` SHALL conter os campos: `unitName`, `sectorName`, `welcomeMessage`, `footerMessage`, `workingHours` e `pauseMediaOnCall`.
6. THE `services` SHALL conter os campos: `id`, `label`, `color`, `active`, `counter` e `priority`. O campo `prefix` é removido pois o sistema opera em setor único (BALCÃO) e as senhas não utilizam prefixo.
7. THE `stations` SHALL conter os campos: `id`, `label` e `active`.
8. THE `queue` SHALL conter os campos: `id`, `ticket`, `serviceId` e `time`.
9. THE `called` SHALL conter os campos: `ticket`, `serviceId`, `stationId` e `time`.
10. THE `currentCall` SHALL conter os campos: `ticket`, `serviceId` e `stationId`, ou ser `null` quando não houver chamada ativa.
11. THE `mediaItems` SHALL conter os campos: `id`, `title`, `caption`, `url`, `fallbackColor`, `duration`, `active` e `order`.

---

### Requirement 2: Estrutura da Aplicação e Navegação

**User Story:** Como usuário, quero acessar os quatro módulos do sistema por uma barra de navegação, para que eu possa alternar entre Totem, Painel, Operador e Administrador sem recarregar a página.

#### Acceptance Criteria

1. THE Sistema SHALL ser entregue como um único arquivo `.html` com todo o código React, CSS e lógica embutidos.
2. THE Sistema SHALL utilizar React 18 com Babel Standalone carregado via CDN.
3. THE Sistema SHALL utilizar apenas CDNs dos domínios `unpkg.com`, `cdn.jsdelivr.net` ou `cdnjs.cloudflare.com`.
4. THE Sistema SHALL exibir uma barra de navegação com os quatro módulos: Totem, Painel, Operador e Administrador.
5. WHEN o usuário clica em um item da barra de navegação, THE Sistema SHALL exibir o módulo correspondente e ocultar os demais.
6. THE Sistema SHALL aplicar dark theme em todos os módulos.
7. THE Sistema SHALL ser responsivo para resoluções de tela iguais ou superiores a 1280px de largura.
8. THE Sistema SHALL carregar as fontes Barlow Condensed, Rajdhani e Oswald via Google Fonts.
9. THE Sistema SHALL funcionar sem Redux, Zustand ou qualquer biblioteca externa de gerenciamento de estado.

---

### Requirement 3: Módulo Totem — Emissão de Senhas

**User Story:** Como usuário do balcão, quero retirar minha senha tocando em um botão no Totem, para que eu entre na fila de atendimento do setor BALCÃO.

#### Acceptance Criteria

1. THE Totem SHALL exibir uma tela de boas-vindas com o nome do setor (`sectorName`) e a instrução "Toque para retirar sua senha".
2. WHEN pelo menos um Tipo_de_Senha estiver ativo, THE Totem SHALL exibir um botão grande e tátil para cada Tipo_de_Senha ativo.
3. WHEN nenhum Tipo_de_Senha estiver ativo, THE Totem SHALL exibir aviso de sistema indisponível no lugar dos botões.
4. WHEN o usuário toca em um botão de Tipo_de_Senha, THE Totem SHALL gerar uma Senha no formato `[NÚMERO]` com zero-padding de 3 dígitos (ex.: 001, 002, 003), sem prefixo de setor ou tipo. WHEN o Contador atingir 999, THE Sistema SHALL reiniciá-lo para 1 na próxima emissão, garantindo sequência contínua sem interrupção (ciclo 001–999).
5. WHEN uma Senha é gerada, THE Totem SHALL adicionar a Senha à Fila interna do Estado_Global com `serviceId`, `ticket` e `time` preenchidos.
6. WHEN uma Senha é gerada, THE Totem SHALL exibir um modal de comprovante contendo: nome do setor, número da Senha, label do Tipo_de_Senha, data e hora da emissão, estimativa de espera e `welcomeMessage` configurável.
7. WHEN o modal de comprovante está aberto, THE Totem SHALL fechá-lo automaticamente após 6 segundos.
8. WHEN o modal de comprovante está aberto e o usuário clica no botão de fechar, THE Totem SHALL fechar o modal imediatamente.
9. THE Totem SHALL calcular a estimativa de espera com base na quantidade de senhas à frente na Fila do mesmo Tipo_de_Senha.
10. THE Totem SHALL exibir os botões com a cor configurada para cada Tipo_de_Senha.
11. THE Totem SHALL utilizar tipografia grande e layout otimizado para interação por toque.

---

### Requirement 4: Módulo Painel — Exibição Pública

**User Story:** Como pessoa aguardando atendimento, quero visualizar no Painel a senha atual sendo chamada e o histórico recente, para que eu saiba quando é minha vez.

#### Acceptance Criteria

1. THE Painel SHALL exibir um cabeçalho com o nome do setor (`sectorName`).
2. WHEN `currentCall` não for `null`, THE Painel SHALL exibir a Senha atual em destaque absoluto, com o número da Senha, label do Tipo_de_Senha e número do Guichê.
3. WHEN uma nova Chamada ocorre, THE Painel SHALL exibir uma animação de destaque na área da Senha atual.
4. THE Painel SHALL exibir o histórico das últimas 5 Senhas chamadas anteriores à atual.
5. THE Painel SHALL exibir contadores de pessoas aguardando separados por Tipo_de_Senha.
6. THE Painel SHALL exibir um Carrossel de Slides com transição automática entre os Slides ativos.
7. WHEN um Slide possui URL de imagem válida, THE Painel SHALL exibir a imagem como fundo do Slide.
8. IF a URL de imagem de um Slide for inválida ou ausente, THEN THE Painel SHALL exibir a `fallbackColor` como fundo do Slide.
9. THE Painel SHALL exibir `title` e `caption` sobrepostos ao fundo de cada Slide.
10. THE Carrossel SHALL exibir indicadores de posição (dots) correspondentes ao número de Slides ativos.
11. WHEN `pauseMediaOnCall` estiver habilitado e uma nova Chamada ocorrer, THE Carrossel SHALL pausar a rotação automática durante a exibição do destaque da Senha.
12. THE Painel SHALL exibir no rodapé a data e hora em tempo real e o `unitName`.

---

### Requirement 5: Módulo Operador — Gerenciamento de Atendimento

**User Story:** Como operador de atendimento, quero chamar senhas e gerenciar o fluxo de atendimento do setor BALCÃO, para que os usuários sejam atendidos na ordem correta.

#### Acceptance Criteria

1. THE Operador SHALL exibir um cabeçalho identificando o setor BALCÃO.
2. THE Operador SHALL exibir cards de resumo por Tipo_de_Senha com a quantidade de senhas na Fila e a última Senha chamada daquele tipo.
3. THE Operador SHALL exibir um botão "Chamar Próxima Senha" que respeita a prioridade: Preferencial antes de Geral.
4. WHEN o botão "Chamar Próxima Senha" é acionado e a Fila não está vazia, THE Operador SHALL remover a primeira Senha da Fila de maior prioridade, registrar a Chamada no Estado_Global e atualizar `currentCall`.
5. WHEN o botão "Chamar Próxima Senha" é acionado e todas as Filas estão vazias, THE Operador SHALL exibir indicação de fila vazia sem alterar o Estado_Global.
6. THE Operador SHALL exibir um botão "Repetir Chamada" que reemite a `currentCall` sem alterar a Fila.
7. THE Operador SHALL exibir botões "Chamar Geral" e "Chamar Preferencial" para chamada manual por Tipo_de_Senha específico.
8. WHEN o botão "Chamar Geral" ou "Chamar Preferencial" é acionado e a Fila do tipo correspondente não está vazia, THE Operador SHALL chamar a próxima Senha daquele tipo específico.
9. THE Operador SHALL exibir um seletor do Guichê ativo, listando apenas os Guichês com `active = true`.
10. THE Operador SHALL exibir um histórico de Chamadas em tabela com as colunas: Senha, Tipo, Guichê e Horário.
11. WHEN a Fila de um Tipo_de_Senha estiver vazia, THE Operador SHALL exibir indicador visual de fila vazia no card correspondente.

---

### Requirement 6: Módulo Administrador — Dashboard

**User Story:** Como administrador, quero visualizar métricas em tempo real do sistema, para que eu possa monitorar o desempenho do atendimento.

#### Acceptance Criteria

1. THE Administrador SHALL exibir um Dashboard com as seguintes métricas em tempo real: total de senhas emitidas, total de senhas chamadas, quantidade em espera por Tipo_de_Senha, tempo médio de espera e quantidade de Guichês ativos.
2. THE Dashboard SHALL exibir um gráfico de emissão de senhas por hora do dia atual.
3. THE Dashboard SHALL exibir o status geral do sistema (operacional, parcialmente ativo ou indisponível) com base nos Tipos_de_Senha ativos.
4. WHEN o Estado_Global é atualizado, THE Dashboard SHALL recalcular e exibir as métricas atualizadas sem recarregar a página.

---

### Requirement 7: Módulo Administrador — Gerenciamento de Tipos de Senha

**User Story:** Como administrador, quero configurar os Tipos_de_Senha disponíveis no sistema, para que o Totem exiba apenas as opções relevantes ao contexto de atendimento.

#### Acceptance Criteria

1. THE Administrador SHALL exibir a lista de Tipos_de_Senha com toggle para ativar ou desativar cada um.
2. WHEN o administrador altera o estado de um toggle, THE Sistema SHALL atualizar o campo `active` do Tipo_de_Senha correspondente no Estado_Global imediatamente.
3. THE Administrador SHALL permitir editar o `label` e `color` de cada Tipo_de_Senha.
4. WHEN o administrador salva a edição de um Tipo_de_Senha, THE Sistema SHALL atualizar os campos correspondentes no Estado_Global e refletir as mudanças no Totem e no Painel.
5. THE Administrador SHALL exibir um botão "Resetar Contador" por Tipo_de_Senha que zera o `counter` daquele tipo.
6. WHEN o administrador clica em "Resetar Contador", THE Sistema SHALL zerar o `counter` do Tipo_de_Senha correspondente no Estado_Global.
7. THE Administrador SHALL permitir configurar a `priority` de cada Tipo_de_Senha para definir a ordem de chamada.

---

### Requirement 8: Módulo Administrador — Gerenciamento de Mídia Indoor

**User Story:** Como administrador, quero gerenciar os Slides do Carrossel do Painel, para que o conteúdo de mídia indoor seja atualizado sem necessidade de acesso técnico ao código.

#### Acceptance Criteria

1. THE Administrador SHALL exibir a lista de Slides com preview visual, título, legenda, URL, cor de fallback e duração.
2. THE Administrador SHALL exibir toggle para ativar ou desativar cada Slide individualmente.
3. THE Administrador SHALL permitir editar `title`, `caption`, `url`, `fallbackColor` e `duration` de cada Slide.
4. THE Administrador SHALL exibir botão para excluir um Slide, com confirmação antes da exclusão.
5. THE Administrador SHALL exibir botão para adicionar um novo Slide ao final da lista.
6. THE Administrador SHALL permitir reordenar os Slides por meio de controles de mover para cima e mover para baixo.
7. THE Administrador SHALL exibir toggle global "Pausar mídia ao chamar senha" que altera o campo `pauseMediaOnCall` no Estado_Global.
8. WHEN `pauseMediaOnCall` é alterado, THE Carrossel SHALL respeitar a nova configuração na próxima Chamada.

---

### Requirement 9: Módulo Administrador — Gerenciamento de Guichês

**User Story:** Como administrador, quero configurar os Guichês disponíveis no sistema, para que os operadores possam selecionar o guichê correto ao realizar chamadas.

#### Acceptance Criteria

1. THE Administrador SHALL exibir um seletor numérico para definir o número total de Guichês, com valor mínimo de 1 e máximo de 20.
2. WHEN o número total de Guichês é alterado, THE Sistema SHALL criar ou remover Guichês no Estado_Global para corresponder ao novo total.
3. THE Administrador SHALL exibir toggle para ativar ou desativar cada Guichê individualmente.
4. THE Administrador SHALL permitir editar o `label` de cada Guichê.
5. THE Administrador SHALL exibir, para cada Guichê ativo, a informação do operador ativo naquele Guichê, quando disponível.

---

### Requirement 10: Módulo Administrador — Configurações Gerais e Reset

**User Story:** Como administrador, quero configurar parâmetros gerais do sistema e executar operações de reset, para que o sistema reflita as informações corretas da unidade e possa ser reiniciado ao início de cada dia.

#### Acceptance Criteria

1. THE Administrador SHALL exibir campos editáveis para: `unitName`, `sectorName`, `welcomeMessage`, `footerMessage` e `workingHours`.
2. WHEN o administrador salva as Configurações Gerais, THE Sistema SHALL atualizar os campos correspondentes no Estado_Global e refletir as mudanças em todos os módulos.
3. THE Administrador SHALL exibir botão "Reset Diário" que, após confirmação única, zera as Filas e os Contadores de todos os Tipos_de_Senha, mantendo todas as configurações.
4. THE Administrador SHALL exibir botão "Reset Completo" que, após confirmação dupla, restaura o Estado_Global ao estado inicial de fábrica.
5. THE Administrador SHALL exibir botão "Exportar Histórico" que gera e faz download de um arquivo JSON contendo o histórico de Chamadas registradas no Estado_Global.
6. WHEN o arquivo JSON é exportado, THE Sistema SHALL incluir no arquivo os campos: `ticket`, `serviceId`, `stationId` e `time` de cada entrada do histórico `called`.

---

### Requirement 11: Regras de Prioridade e Chamada

**User Story:** Como operador, quero que o sistema respeite automaticamente a prioridade entre os Tipos_de_Senha ao chamar a próxima senha, para que usuários preferenciais sejam atendidos antes dos demais.

#### Acceptance Criteria

1. WHEN o operador aciona "Chamar Próxima Senha", THE Sistema SHALL selecionar a próxima Senha da Fila do Tipo_de_Senha com maior `priority` que possua senhas aguardando.
2. WHEN dois Tipos_de_Senha possuem a mesma `priority`, THE Sistema SHALL selecionar a Senha mais antiga (menor `time`) entre eles.
3. WHEN uma Senha é chamada, THE Sistema SHALL registrar a Chamada em `called`, atualizar `currentCall` e remover a Senha da `queue`.
4. THE Sistema SHALL garantir que a mesma Senha não seja chamada mais de uma vez a partir da Fila.

---

### Requirement 12: Feedback Visual e Acessibilidade

**User Story:** Como usuário de qualquer módulo, quero receber feedback visual claro sobre as ações realizadas, para que eu possa operar o sistema com confiança.

#### Acceptance Criteria

1. THE Sistema SHALL aplicar dark theme consistente com fundo escuro em todos os módulos.
2. THE Totem SHALL utilizar tipografia com tamanho mínimo de 24px nos botões de Tipo_de_Senha.
3. THE Painel SHALL exibir a Senha atual com tipografia de destaque absoluto, com tamanho mínimo de 96px para o número da Senha.
4. WHEN uma nova Chamada ocorre, THE Painel SHALL exibir animação CSS de destaque com duração mínima de 1 segundo.
5. THE Sistema SHALL utilizar as cores configuradas em cada Tipo_de_Senha para diferenciar visualmente Geral (azul) e Preferencial (verde) em todos os módulos.
6. THE Sistema SHALL exibir estados de fila vazia com indicadores visuais distintos (ícone ou texto) nos módulos Operador e Administrador.
