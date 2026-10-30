---

description: "Tarefas da spec 009: navegação de cinco destinos"
---

# Tasks: Navegação de cinco destinos

**Input**: `/specs/009-navegacao-5-botoes/` — [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: pedidos (constituição VII). Os identificadores F-86 a F-99 estão atribuídos na tabela «Identificadores de teste» da `spec.md`; o nome de cada teste novo começa por `F-86:` … `F-99:`.

**Comandos**: `corepack pnpm@9 <script>` no PowerShell (não há `pnpm` no PATH nem WSL). Não há commits nesta lista: o commit é da Liz, depois de `/simplify` (T021).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode correr em paralelo (ficheiros diferentes, sem dependência de tarefa por acabar)
- **[Story]**: US1 barra de cinco destinos · US2 rotas · US3 abas reutilizáveis · US4 qualidade

## Phase 1: Setup

- [X] T001 Confirmar a linha de base verde sem alterar ficheiros: `lint`, `typecheck` e `test` passaram a 2026-10-30 (4 ficheiros, 51 testes). **`e2e:mock`: 22/22 passaram** (1,2 min). A primeira tentativa falhou 22/22 só porque faltava o Chromium da versão instalada do Playwright (`chromium_headless_shell-1248`); instalado com `pnpm exec playwright install chromium` (cache do utilizador, sem alterações no repositório) e repetido

---

## Phase 2: Foundational (bloqueia as histórias)

- [X] T002 Acrescentar `useSmartListEnabled()` a `src/config/appConfig.tsx` sobre `useAppConfig()`, com o tipo local `{ smart_list_enabled?: boolean }` e `=== true` (campo em falta, pedido em curso ou falhado = `false`); comentário a apontar para T023 (R1 do research)
- [X] T003 [P] Testar o hook em `src/config/appConfig.test.tsx` (`F-86:`): verdadeiro, falso, campo em falta, pendente e erro 500 (msw `server.use` com `GET /v1/config`)
- [X] T004 [P] Acrescentar `smartList?: boolean` ao `FakeState` de `e2e/mock/api.ts` e servir `smart_list_enabled` em `GET /v1/config` (contrato `public-config.md`)

**Checkpoint**: a opção da lista é legível em Vitest e no Playwright simulado.

---

## Phase 3: User Story 1 — Barra inferior de cinco destinos (P1)

**Goal**: Início · Talões · Adicionar · Lista · Definições; Lista só com a opção ligada.

**Independent Test**: `AppShell` renderizado com a opção ligada e desligada.

- [X] T005 [P] [US1] Escrever `src/components/AppShell.test.tsx` (novo): `F-87` cinco destinos por ordem com a opção ligada; `F-88` quatro (sem Lista, nem na ordem de tabulação) desligada, em falta, pendente e com erro; `F-89` a Lista aparece quando a configuração chega com a opção verdadeira (de pendente a verdadeira); `F-90` `aria-current` só no destino ativo para `/`, `/compras`, `/compras/resumo`, `/compras/r1`, `/produtos`, `/adicionar`, `/definicoes`; «Talões» ativo em `/produtos`
- [X] T006 [US1] Reescrever `ITEMS` e o ativo em `src/components/AppShell.tsx` conforme `data-model.md` (`match(pathname)`, `requiresSmartList`, ícones `House`, `ReceiptText`, `Plus`, `ListChecks`, `Settings`, etiquetas «Início», «Talões», «Adicionar», «Lista», «Definições»), mantendo o desenho atual, o destaque do Adicionar e a lateral `md`
- [X] T007 [US1] Em `e2e/mock/ui.spec.ts` (`F-91:`), trocar o teste «bottom navigation … 4 items» por dois: quatro destinos `["Início", "Talões", "Adicionar", "Definições"]` e, com `smartList: true`, cinco destinos com «Lista»; ambos com alvos ≥ 44 px e ancorados em baixo; repetir a 320 px sem scroll horizontal

**Checkpoint**: a barra funciona; os destinos ainda apontam para as rotas atuais.

---

## Phase 4: User Story 3 — Abas reutilizáveis (P1)

*Executada antes da US2, porque o layout de Talões (US2) usa este componente.*

**Goal**: componente controlado de abas, usado em Talões e reutilizável nas Definições.

**Independent Test**: `SegmentedTabs` isolado e `TaloesLayout` em rotas simuladas.

- [X] T008 [P] [US3] Escrever `src/components/SegmentedTabs.test.tsx` (novo; `F-92` papéis e estado, `F-93` teclado): `role="tablist"` com nome; `role="tab"` e `aria-selected`; só a aba ativa na ordem de tabulação; setas, `Home` e `End` movem o foco sem chamar `onChange`; `Enter` e `Espaço` chamam `onChange`; estado selecionado com marca além do fundo (R6)
- [X] T009 [US3] Criar `src/components/SegmentedTabs.tsx` com as props de `data-model.md` (`label`, `tabs`, `value`, `onChange`), *roving tabindex*, ativação manual, alvos ≥ 44 px, tokens do repositório
- [X] T010 [P] [US3] Escrever `src/features/taloes/TaloesLayout.test.tsx` (novo; `F-94`): as três abas Compras · Resumo · Produtos; a ativa segue o caminho; ativar uma aba navega para o caminho simples (`/compras`, `/compras/resumo`, `/produtos`) e Voltar regressa à anterior; as páginas de detalhe, fora do layout, não mostram abas
- [X] T011 [US3] Criar `src/features/taloes/TaloesLayout.tsx`: `SegmentedTabs` com `value` calculado pelo caminho e `onChange` a navegar, mais `<Outlet />`

**Checkpoint**: abas funcionam isoladas; ainda não estão ligadas às rotas reais.

---

## Phase 5: User Story 2 — Rotas (P1)

**Goal**: `/` é o Início provisório; o Resumo vive em `/compras/resumo` sem mudar a lógica; endereços antigos continuam a servir.

**Independent Test**: tabela de rotas real renderizada com `createMemoryRouter`.

- [X] T012 [P] [US2] Escrever `src/features/home/HomeRoute.test.tsx` (novo): `F-95` `/` sem parâmetros mostra «Início», «Adicionar talão» e «Ver resumo»; `/?de=2026-09-01&ate=2026-09-30&mercado=PINGO_DOCE` `F-96` redireciona para `/compras/resumo` com a mesma `search`; cada parâmetro (`periodo`, `de`, `ate`, `mercado`, `produto`, `produto_nome`) dispara o redirecionamento; o redirecionamento não deixa `/` no histórico
- [X] T013 [US2] Criar `src/features/home/HomeRoute.tsx` com `HomePage` provisório (sem consultas à API) e a regra de redirecionamento do `research.md` R4
- [X] T014 [US2] Atualizar a tabela de rotas de `src/App.tsx` conforme `contracts/routes.md`: `/` → `HomeRoute`; layout `TaloesLayout` com `/compras`, `/compras/resumo` (`DashboardPage` sem alterações) e `/produtos`; `/compras/:id` e `/produtos/:id` fora do layout; sem rota `/lista`; «Voltar ao resumo» passa a «Voltar ao início»; exportar a tabela (`routes`) para os testes
- [X] T015 [US2] Escrever `src/routes.test.tsx` (novo) sobre a tabela exportada: `F-97` `/compras/resumo` mostra o Resumo e nunca `ReceiptPage`; `/compras/r1` mostra `ReceiptPage`; `/produtos/p1` fora das abas; `F-98` `/lista` e `/xyz` mostram «Esta página não existe.»; `/adicionar` e `/definicoes` não mudam; Voltar entre destinos regressa ao anterior; usar o handler de `/v1/me` de `src/test/server.ts`
- [X] T016 [US2] Adaptar `src/features/features.test.tsx`: o bloco `dashboard (RF-09, RF-11)` passa a servir `DashboardPage` em `/compras/resumo` e a renderizar nesse caminho; manter o teste do link «Início» → `/`. A lógica e as asserções do Resumo não mudam
- [X] T017 [US2] Adaptar o resto de `e2e/mock/ui.spec.ts` (o axe fica para T018): larguras com `/`, `/compras/resumo`, `/compras/r1`, `/adicionar`; F-01 (após o consentimento chega ao Início) ; F-21 e «chart has a textual alternative» em `/compras/resumo`; o teste de sessão perdida usa a ligação «Início» ou a aba «Resumo» em vez de «Resumo» na barra

**Checkpoint**: navegação completa com os ecrãs antigos.

---

## Phase 6: User Story 4 — Qualidade (P1)

- [X] T018 [US4] Em `e2e/mock/ui.spec.ts` (`F-99:`), substituir o ciclo de axe por página por uma matriz: Início `/`, Resumo `/compras/resumo`, Compras `/compras`, Produtos `/produtos`, Adicionar `/adicionar` e Definições `/definicoes` × esquema claro e escuro (`page.emulateMedia`) × larguras 320 e 820 px (24 casos), sem violações (inclui o contraste das abas). Manter os testes «revisão», «login» e «dark mode» como estão
- [X] T019 [P] [US4] Verificar (sem alterar) que `vite.config.ts` mantém `runtimeCaching: []` e `navigateFallbackDenylist: [/^\/v1\//]` e que nenhuma resposta de `/v1/config` é guardada; registar em `quickstart.md` se algo divergir

---

## Phase 7: Polish & cross-cutting

- [X] T020 [P] Atualizar a tabela de ecrãs do `README.md` (linhas `/` Resumo e `/compras`): Início provisório em `/`, Resumo em `/compras/resumo`, abas de Talões
- [X] T021 Correr `/simplify` e depois `corepack pnpm@9 lint`, `typecheck`, `test` e `e2e:mock`; confirmar que `src/api/schema.d.ts` não mudou; registar o resultado
- [ ] T022 (manual, só com o backend a correr) Correr o projeto `stack` e confirmar que `journey.spec.ts` (`/?de=…&ate=…`) continua verde pelo redirecionamento; sem o backend, registar «não corrido»
- [X] T023 **Só depois da Fase 2** (spec 013 do backend, US8, e `pnpm gen:api`): remover o tipo local de `src/config/appConfig.tsx` e usar o tipo gerado; o hook e os testes não mudam

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → histórias → Polish. T023 fica fora do «pronto» desta spec (depende da Fase 2).
- **Ordem das histórias:** US1 → US3 → US2 → US4. A US3 (componente de abas) precede a US2 porque `TaloesLayout` (T011) é usado em `App.tsx` (T014).
- Dentro de cada história, escrever o teste (T003, T005, T008, T010, T012) antes da implementação e vê-lo falhar.
- `e2e/mock/ui.spec.ts` é editado por T007, T017 e T018: **não** correr estas três em paralelo, por esta ordem.
- `src/App.tsx` só é tocado por T014. `src/config/appConfig.tsx`, por T002 e T023.

## Parallel opportunities

- Fase 2: T003 e T004 depois de T002.
- US1 e US3 em paralelo por duas pessoas: T005 ‖ T008 ‖ T010 (testes novos, ficheiros distintos).
- Fase 6: T019 em paralelo com T018 (T018 só depois de T017).

## Implementation strategy

- **MVP**: Phases 1–3 (US1) mostram os cinco destinos, mas os destinos ainda apontam para as rotas atuais, e `/` continua a ser o Resumo. Para um estado coerente e entregável, o mínimo é **US1 + US3 + US2** (Phases 1–5).
- Entrega incremental: validar cada checkpoint com `corepack pnpm@9 test` antes de seguir.
- Fora desta lista: o conteúdo do Início (spec 011), as abas restilizadas (spec 012), as Definições (spec 014) e a Lista (spec 015).
