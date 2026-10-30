# Feature Specification: Navegação de cinco destinos

**Feature Branch**: `009-navegacao-5-botoes`

**Created**: 2026-10-30

**Status**: Draft (Fase 0 do plano UX v2: só histórias e critérios de aceitação; sem requisitos técnicos, plano nem tarefas). Clarificada em 2026-10-30.

**Input**: Especificação Funcional v1.4 §8, RF-15, RF-16; `Documentation/Super Mercado_—_Plano_de_Implementação_UX_v2.md` (Fase 1, D2, D3); `Documentation/design-ux-v2/NavBar.dc.html`. Backend: `../basketIQ-backend/specs/013-perfil-utilizador` (US8, opção da lista em `GET /v1/config`).

**Convenção de rastreabilidade**: cada critério cita o RF ou a secção da Especificação Funcional. Os testes do frontend levam o identificador no nome (`F-xx: …`); o F-xx atribui-se na Fase 8, na faixa da experiência v2 (F-86 a F-125). Teste de cada critério: por criar.

## Clarifications

### Session 2026-10-30

Respostas recomendadas pela skill, confirmadas como definitivas pela Liz em 2026-10-30.

- Q: Como fica a barra com quatro destinos (opção da lista desligada), já que o Adicionar deixa de ficar ao centro? → A: ordem Início · Talões · Adicionar · Definições, com o Adicionar em destaque (botão primário) mas sem o centrar. Sem layout especial.
- Q: O que acontece enquanto a opção da lista não chegou, ou se falta? → A: a barra desenha-se com quatro destinos e passa a cinco quando `smart_list_enabled` for verdadeiro. Campo em falta ou pedido falhado = desligado.
- Q: O que mostra `/` nesta fase, antes da spec 011? → A: um Início provisório com o título, o botão «Adicionar talão» e a ligação «Ver resumo» para `/compras/resumo`; a spec 011 substitui-o.
- Q: Ligações antigas do Resumo (`/` com período, supermercado ou produto no URL)? → A: se o URL tiver parâmetros do Resumo, redireciona para `/compras/resumo` com os mesmos parâmetros; sem parâmetros, mostra o Início.
- Q: `/lista` com a opção desligada? → A: comporta-se como qualquer rota inexistente («não encontrado»).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Barra inferior de cinco destinos (Priority: P1)

A barra passa de Resumo · Compras · Adicionar · Definições para **Início · Talões · ＋ Adicionar · Lista · Definições**.

**Why this priority**: todas as outras specs v2 vivem dentro desta navegação.

**Independent Test**: componente `AppShell` com a opção da lista ligada e desligada.

**Acceptance Scenarios**:

1. **Given** a opção da lista ligada, **When** a barra é desenhada, **Then** mostra Início, Talões, Adicionar (ao centro, em destaque), Lista e Definições, por esta ordem. — §8
2. **Given** a opção da lista desligada (omissão), **When** a barra é desenhada, **Then** mostra Início, Talões, Adicionar (em destaque) e Definições, e não mostra Lista nem a deixa na ordem de tabulação. — §8, RF-16
3. **Given** a opção vinda de `GET /v1/config`, **When** o campo falta, ainda não chegou ou o pedido falha, **Then** a barra tem quatro destinos e a Lista fica escondida. — RF-16
4. **Given** a barra já desenhada com quatro destinos enquanto a configuração não chegou, **When** a configuração chega com a opção verdadeira no primeiro carregamento, **Then** a Lista aparece sem nova ação da pessoa. Uma mudança da opção no backend depois desse carregamento só se vê quando a configuração for lida de novo (novo carregamento da aplicação ou fim da validade da cache, 1 h). — RF-16
5. **Given** o destino ativo, **When** a barra é lida por leitor de ecrã, **Then** o ativo é anunciado por texto (`aria-current`) e não só por cor. — §8
6. **Given** os botões, **When** medidos, **Then** cada alvo de toque tem pelo menos 44 px e não há scroll horizontal a 320 px. — §8
7. **Given** o rótulo, **When** se refere a talões, **Then** a interface usa «Talões». — §8

---

### User Story 2 - Rotas (Priority: P1)

**Acceptance Scenarios**:

1. **Given** `/` sem parâmetros do Resumo, **When** é aberta, **Then** mostra o Início provisório (título, «Adicionar talão» e «Ver resumo») até a spec 011 o substituir. — RF-15
2. **Given** o Resumo atual, **When** a pessoa abre `/compras/resumo`, **Then** vê o mesmo ecrã com a mesma lógica, filtros e tabela alternativa. — RF-09, RF-11, F-18, F-19
3. **Given** um endereço antigo do Resumo com período, supermercado ou produto no URL, **When** é aberto em `/`, **Then** a pessoa é redirecionada para `/compras/resumo` com os mesmos parâmetros. — RF-11
4. **Given** `/compras`, `/compras/:id`, `/produtos`, `/produtos/:id`, **When** são abertas, **Then** continuam a funcionar e o destino ativo é Talões. — D2
5. **Given** `/compras/resumo`, **When** é aberta, **Then** «resumo» nunca é tratado como o identificador de uma compra. — D2
6. **Given** `/adicionar`, `/definicoes`, `/operador`, `/login`, `/privacidade`, **When** são abertas, **Then** não mudam. — D2
7. **Given** a opção da lista desligada, **When** a pessoa abre `/lista`, **Then** vê «não encontrado», como em qualquer rota inexistente. — RF-16
8. **Given** o botão Voltar, **When** a pessoa navega entre destinos e abas, **Then** regressa ao ecrã anterior. — §8

---

### User Story 3 - Abas reutilizáveis (Priority: P1)

Um componente de abas segmentadas (Compras · Resumo · Produtos), reutilizável nas Definições (Perfil · Privacidade · Conta).

**Acceptance Scenarios**:

1. **Given** as abas, **When** a pessoa usa o teclado, **Then** as setas movem entre abas, só a ativa está na ordem de tabulação e o papel é `tablist`. — §8
2. **Given** uma aba ativa, **When** é lida por leitor de ecrã, **Then** o estado selecionado é anunciado e não depende só do fundo. — §8
3. **Given** uma aba, **When** é escolhida, **Then** o URL reflete-a e o botão Voltar volta à anterior. — RF-11
4. **Given** as Definições, **When** reutilizam o componente, **Then** o comportamento é o mesmo sem código duplicado. — plano Fase 1

---

### User Story 4 - Qualidade (Priority: P1)

**Acceptance Scenarios**:

1. **Given** cada destino e aba, **When** corre o axe em claro e escuro de 320 a 820 px, **Then** não há violações. — §8, §10
2. **Given** os testes existentes de navegação, Resumo, Compras e Produtos, **When** correm adaptados, **Then** passam sem alterar a lógica do Resumo. — plano Fase 1
3. **Given** a opção da lista desligada, **When** correm os percursos e2e, **Then** a Lista não aparece em nenhum. — plano Fase 1
4. **Given** o service worker, **When** a navegação muda, **Then** continua a não guardar respostas da API. — constituição IV

### Edge Cases

- Falha de rede ao ler a configuração: a barra mostra quatro destinos e a aplicação continua utilizável.
- A constituição do frontend (V) foi emendada a 2026-10-30 (PATCH 1.0.1) para cinco destinos, com a Lista só visível com a opção ligada; esta spec deixa de estar em conflito com ela.

## Identificadores de teste (constituição VII)

Atribuídos a 2026-10-30 dentro da faixa da experiência v2 (F-86 a F-125), por ordem de tarefa. Os testes do frontend levam o identificador no nome (`F-86: …`). Os testes já existentes que só se adaptam (F-01, F-21, RF-09, RF-11) mantêm o nome.

| ID | O que verifica | Critérios | Tarefa |
|---|---|---|---|
| F-86 | Opção da lista lida da configuração pública: verdadeira, falsa, em falta, pendente e erro | US1.3 | T003 |
| F-87 | Barra com cinco destinos, por ordem, com a opção ligada | US1.1, US1.7 | T005 |
| F-88 | Barra com quatro destinos com a opção desligada, em falta, pendente ou com erro; Lista fora da ordem de tabulação | US1.2, US1.3 | T005 |
| F-89 | A Lista aparece quando a configuração chega com a opção verdadeira (de pendente a verdadeira) | US1.4 | T005 |
| F-90 | Destino ativo anunciado por `aria-current`, incluindo Talões ativo em `/produtos` e `/compras/…` | US1.5, US2.4 | T005 |
| F-91 | e2e: barra de quatro e de cinco destinos, alvos ≥ 44 px, ancorada em baixo, sem scroll horizontal a 320 px | US1.6 | T007 |
| F-92 | Abas: `tablist`/`tab`, `aria-selected`, só a ativa na ordem de tabulação, marca além do fundo | US3.1, US3.2 | T008 |
| F-93 | Abas: setas, `Home` e `End` movem o foco sem ativar; `Enter` e `Espaço` ativam | US3.1 | T008 |
| F-94 | Talões: três abas, a ativa segue o caminho, ativar navega e Voltar regressa; o detalhe não tem abas | US3.3 | T010 |
| F-95 | Início provisório: título, «Adicionar talão» e «Ver resumo» | US2.1 | T012 |
| F-96 | Endereços antigos do Resumo redirecionam para `/compras/resumo` com os mesmos parâmetros e sem deixar `/` no histórico | US2.3 | T012 |
| F-97 | Tabela de rotas: `/compras/resumo` é o Resumo, `/compras/r1` é a compra, «resumo» nunca é identificador, `/produtos/p1` fora das abas | US2.2, US2.4, US2.5 | T015 |
| F-98 | `/lista` e rotas inexistentes mostram «não encontrado»; as outras rotas não mudam; Voltar entre destinos | US2.6, US2.7, US2.8 | T015 |
| F-99 | e2e: axe sem violações em Início, Resumo, Compras, Produtos, Adicionar e Definições, em claro e escuro, a 320 e 820 px | US4.1 | T018 |

## Requirements *(mandatory)*

*Por escrever em `/speckit-plan`; a Fase 0 cobre só histórias e critérios.*

## Success Criteria *(mandatory)*

*Por escrever. O plano pede: navegação completa com ecrãs antigos, e2e e axe verdes, Lista escondida.*

## Assumptions

- Os tokens atuais bastam; só se criam novos se faltarem.
