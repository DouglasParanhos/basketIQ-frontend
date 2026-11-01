---

description: "Tarefas da spec 010: onboarding"
---

# Tasks: Onboarding

**Input**: `/specs/010-onboarding/` — [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: pedidos (constituição VII; testes antes do código). Identificadores **atribuídos** (decisão P5, 2026-10-30), um por história, na faixa F-86 a F-125 (F-176 a F-205 reservados à continuação da UX v2): `F-113` US1, `F-114` US2, `F-115` US3, `F-116` US4, `F-117` US5. O nome de cada teste novo começa por `F-113:` … `F-117:`. Os identificadores F-100 a F-112 do perfil e dos mercados são do backend («Verificado no Backend») e não se repetem aqui.

**Comandos**: `corepack pnpm@9 <script>` no PowerShell ou Git Bash (não há `pnpm` no PATH nem WSL). Se o Vitest falhar com `Channel closed` por falta de memória, usar `corepack pnpm@9 exec vitest run --maxWorkers=4`. Só dados sintéticos. Não há commits nesta lista: o commit é da Liz, depois de `/simplify` (T027).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode correr em paralelo (ficheiros diferentes, sem dependência de tarefa por acabar)
- **[Story]**: US1 percurso de quatro passos · US2 saltar sem gravar · US3 guarda de rota · US4 refazer, falhas e privacidade · US5 acessibilidade

## Phase 1: Setup

- [X] T001 Confirmar a linha de base sem alterar ficheiros: `lint`, `typecheck`, `test` e `e2e:mock`; registar o resultado. (A 2026-10-30, depois do `gen:api` e da T023 da 009: `lint` e `typecheck` verdes; `test` 9 ficheiros e 96 testes verdes com `--maxWorkers=4`; `e2e:mock` 42 passados em 2,5 min, com um atalho `pnpm.cmd` no PATH porque o servidor do Playwright chama `pnpm`)

---

## Phase 2: Foundational (bloqueia as histórias)

- [X] T002 [P] Acrescentar a `src/test/fixtures.ts`, tipados com `Schemas["ProfileOut"]` e `Schemas["MerchantOut"]`: `profile` (concluído: `onboarding_completed_at` "2026-10-02T10:00:00Z", `household_size` 2, `merchants` ["LIDL"], `goals` ["finances"], `monthly_goal_cents` 30000), `emptyProfile()` (`household_size` e `monthly_goal_cents` nulos, `merchants` e `goals` `[]`, `onboarding_completed_at` nulo) e `merchants` (7 itens sintéticos: `CONTINENTE` Continente, `PINGO_DOCE` Pingo Doce, `LIDL` Lidl, `AUCHAN` Auchan, `ALDI` Aldi, `MERCADONA` Mercadona, `EL_CORTE_INGLES` El Corte Inglés)
- [X] T003 Em `src/test/server.ts`, servir por omissão `GET /v1/me/profile` com o perfil **concluído** e `GET /v1/merchants` com os 7 mercados (sem isto, os testes que usam a tabela real de rotas passam a ser redirecionados para `/boas-vindas`, R11). Depende de T002
- [X] T004 [P] Em `e2e/mock/api.ts`: `FakeState.onboarded?: boolean` (por omissão **verdadeiro**), `FakeState.profilePatches: unknown[]` (corpos recebidos), `GET /v1/me/profile` (concluído ou vazio conforme `onboarded`), `PATCH /v1/me/profile` (regista o corpo, devolve o perfil com `onboarding_completed_at` preenchido e passa `onboarded` a verdadeiro) e `GET /v1/merchants` (7 itens). Contrato em `contracts/profile-api.md`
- [X] T005 [P] Escrever em `src/lib/lib.test.ts` o teste de `formatWholeEuros` (euros inteiros, pt-PT, sem casas decimais): 300 → «300 €», 50 → «50 €», 800 → «800 €» (normalizar o espaço não separável antes de comparar)
- [X] T006 Acrescentar `formatWholeEuros(euros: number): string` a `src/lib/format.ts` (`Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })`; R6). Depende de T005
- [X] T007 [P] Escrever `src/features/onboarding/state.test.ts` (novo) para as funções puras do `data-model.md`. `F-113:` `toggleGoal` e `toggleAll` («Todas as anteriores» marca os três; marcar os três marca-a; desmarcar um desmarca-a; só existem os três valores da API `finances`, `shopping_list` e `savings`, «Todas as anteriores» nunca é um valor); pessoas: inicial 2, mínimo 1 e máximo 12 («pessoa» no singular, «pessoas» no plural); `initialsOf("Pingo Doce")` = `P`, `initialsOf("Lidl")` = `L`, `initialsOf("El Corte Inglés")` = `EC` (artigo seguido de segunda palavra: duas letras); progresso 25, 50, 75, 100 %. `F-114:` `buildPatch` com: tudo saltado → só `{ onboarding_completed: true }`; 3 pessoas confirmadas e meta saltada → só `household_size: 3`; passo 1 ou 3 confirmado sem nada escolhido → não leva `goals` nem `merchants`; «Ainda não sei» confirmado → sem `monthly_goal_cents`; meta 300 € confirmada → `monthly_goal_cents: 30000`; nunca `null` nem `[]`; corpo sempre com `onboarding_completed: true`
- [X] T008 Criar `src/features/onboarding/state.ts` (reducer + funções puras de T007): estado e transições do `data-model.md` (`step` 0 a 3, `phase`, `goals`, `householdSize` 1 a 12, `merchants` sem repetidos, `goalEuros` 50 a 800 em passos de 10, `goalUnknown`, `confirmed`, `saved`), `buildPatch`, `toggleGoal`, `toggleAll`, `initialsOf`. Sem React. Depende de T007
- [X] T009 Criar `src/features/profile/useProfile.ts`: `useProfile()` (`GET /v1/me/profile`, chave `["profile"]`, `staleTime` 60 s, `retry: false`), `useSaveProfile()` (mutação `PATCH /v1/me/profile` com `Schemas["ProfilePatch"]`; o `onSuccess` atualiza a cache; R3) e `useMerchants()` (`GET /v1/merchants`, chave `["merchants"]`, `staleTime` longo). Tudo pelo cliente tipado `api` e `unwrap`

**Checkpoint**: `corepack pnpm@9 lint && corepack pnpm@9 typecheck && corepack pnpm@9 test` verdes; o estado puro está testado; os testes existentes continuam verdes com o perfil concluído por omissão.

---

## Phase 3: User Story 1 — Percurso de quatro passos (P1) 🎯 MVP

**Goal**: os quatro passos do Onb1, com progresso, «Voltar», envio num único `PATCH` e «Tudo pronto».

**Independent Test**: `OnboardingPage` numa tabela de rotas simulada, com a API simulada (msw).

- [X] T010 [P] [US1] Escrever `src/features/onboarding/OnboardingPage.test.tsx` (novo; `F-113:`) com `renderRoutes` e msw: passo 1 com «Organizar as minhas finanças», «Ajuda com a lista de compras», «Gastar menos nas compras» e «Todas as anteriores», sem as palavras «poupar» e «economizar» e sem prometer a Lista nem a comparação (US1.1); passo 2 mostra «2» e «pessoas», «Menos uma pessoa» desativado em 1, «Mais uma pessoa» desativado em 12, «pessoa» no singular (US1.2); passo 3 mostra os 7 nomes e iniciais vindos de `GET /v1/merchants` (um mercado novo servido pelo teste aparece sem alterar código; «El Corte Inglés» mostra «EC» e o nome; US1.3); com `GET /v1/merchants` a falhar (500) o passo mostra «Tentar de novo» e pode ser saltado (Edge Cases); passo 4 mostra «300 €», «por mês», extremos «50 €» e «800 €», e o termo «meta pessoal» (US1.4); «Ainda não sei» desativa a barra, muda o botão para «Definir um valor» e mostra «Pode definir a sua meta pessoal mais tarde, nas Definições.» (US1.5); «Passo N de 4» e a barra a 25, 50, 75 e 100 % (US1.6); sem «Voltar» no passo 1 e «Voltar» mantém as respostas (US1.7); «Concluir» envia **um** `PATCH` e mostra «Tudo pronto», «Pode editar estas respostas no Perfil a qualquer momento.» e «Ir para o início», que leva a `/` sem regressar ao percurso (US1.8, R3)
- [X] T011 [P] [US1] Criar `src/features/onboarding/steps.tsx`: `GoalsStep`, `PeopleStep`, `MerchantsStep` e `GoalAmountStep` conforme `contracts/copy.md` e `research.md` (R5, R6, R7, R9, R10): objetivos e mercados como `<input type="checkbox">` em `<label>` com marca de verificação visível, pessoas com botões e `<output aria-live="polite">`, meta com `<input type="range" min=50 max=800 step=10>`, `aria-label` e `aria-valuetext`, botão «Ainda não sei» com `aria-pressed`. Tokens do repositório, sem logótipos, alvos ≥ 44 px
- [X] T012 [US1] Criar `src/features/onboarding/OnboardingPage.tsx` (export por omissão, para `lazy`): cabeçalho com «Voltar», barra `role="progressbar"`, «Passo N de 4» e «Saltar»; o passo atual de `steps.tsx`; botão «Avançar»/«Concluir» fixo em baixo; `useMerchants()` com `Spinner` e erro com «Tentar de novo» (R7); ao concluir, `useSaveProfile()` com `buildPatch(state)`; ecrã «Tudo pronto» com `phase = "done"`; «Ir para o início» faz `navigate("/", { replace: true })` (R3); o foco vai para o `<h1>` do passo ao mudar (R9). Depende de T008, T009, T011
- [X] T013 [US1] Em `src/App.tsx`, acrescentar à tabela um ramo `Protected` (sessão e consentimento, sem shell, com `errorElement`) com a rota `/boas-vindas` → `lazy(() => import("./features/onboarding/OnboardingPage"))`. As restantes rotas ficam como estão até à T018. Depende de T012

**Checkpoint**: um percurso completo com sessão simulada funciona e T010 passa.

---

## Phase 4: User Story 2 — Saltar sem gravar (P1)

**Goal**: só se grava o que a pessoa confirmou.

**Independent Test**: o corpo do `PATCH` capturado em msw para cada combinação de «Avançar», «Saltar» e «Ainda não sei».

- [X] T014 [US2] Em `src/features/onboarding/OnboardingPage.test.tsx` (`F-114:`) capturar o corpo do `PATCH`: saltar os quatro passos → só `{ onboarding_completed: true }` (US2.1, US2.3); «Saltar» no passo 4 termina como concluído sem meta (US2.2); 3 pessoas confirmadas com «Avançar» e meta saltada → só `household_size: 3` (US2.4); passo 2 com «2» e «Avançar» sem alterar → grava 2 (US2.5); passos 1 e 3 sem nada escolhido e «Avançar» → sem `goals` nem `merchants` (US2.6); «Ainda não sei» e «Concluir» → sem `monthly_goal_cents`; voltar a um passo confirmado (3 pessoas) e tocar «Saltar» mantém o 3 (US2.7); nenhum corpo leva `null`, `[]`, 2 pessoas ou 300 € que a pessoa não confirmou
- [X] T015 [US2] Ligar em `src/features/onboarding/OnboardingPage.tsx` o `Avançar` (marca `confirmed[passo]` e avança) e o `Saltar` (avança sem marcar; no passo 4 envia). Ajustar `state.ts` só se T014 o mostrar necessário. Depende de T014

**Checkpoint**: T014 passa; a regra «só se grava o que a pessoa confirmou» está provada pelo corpo enviado.

---

## Phase 5: User Story 3 — Guarda de rota (P1)

**Goal**: sem conclusão, vai para `/boas-vindas`, depois do consentimento, sem piscar o Início e sem bloquear em falha.

**Independent Test**: a tabela real de rotas (`routes` de `src/App.tsx`) com msw.

- [X] T016 [P] [US3] Escrever `src/features/onboarding/RequireOnboarding.test.tsx` (novo; `F-115:`) com `renderRoutes(routes, …)`: conta sem conclusão abre `/compras` e termina em `/boas-vindas` (US3.1); com a política desatualizada, vai primeiro a `/privacidade` (US3.2); concluído abre `/boas-vindas` e termina em `/` (US3.4); concluído não é interrompido (US3.3); com o perfil pendente (resposta atrasada) não aparece o título «Início» antes do redirecionamento (US3.5); com o perfil a falhar com 500 a página pedida abre (US3.6); `/operador` com papel de operador e sem conclusão não é desviado; com o perfil a carregar não há `navigation` «Navegação principal» no documento, só o indicador de carregamento (US3.8, I3); a barra mantém-se enquanto uma página *lazy* carrega (`/produtos`)
- [X] T017 [US3] Criar `src/features/onboarding/RequireOnboarding.tsx`: `useProfile()`; a carregar → `Spinner`; erro → `<Outlet/>`; `onboarding_completed_at` nulo → `<Navigate to="/boas-vindas" replace />`; concluído → `<Outlet/>` (R1). Depende de T009
- [X] T018 [US3] Em `src/App.tsx`, reestruturar a tabela como em `contracts/routes.md` (R14): `Protected` com `/boas-vindas` e `RequireOnboarding` > `AppShell` > rotas de utilizador; `AppShell` > `Protected admin` > `/operador` e `*` fora da guarda; o `errorElement` do AppShell onde estava. Em `src/components/AppShell.tsx`, envolver o `<Outlet/>` num `<Suspense fallback={<Spinner />}>`. Em `OnboardingPage.tsx`, o primeiro perfil que chega decide uma vez: concluído → `<Navigate to="/" replace />` (US3.4, R3). Depende de T016, T017

- [X] T028 [US3] (acrescentada em 2026-10-30, P6; aprovada pela Liz em 2026-10-30; passou sem alterar código; substitui o teste «conta com compras e sem perfil») Em `src/features/onboarding/RequireOnboarding.test.tsx` (`F-115:`): perfil concluído e vazio (`onboarding_completed_at` preenchido, sem pessoas, meta, mercados nem objetivos; conta anterior ao onboarding) abre `/compras` e fica lá, e `/boas-vindas` leva a `/` (US3.7, US3.4). Espera-se que passe sem alterar código; se falhar, parar e mostrar

**Checkpoint**: T016 passa e os testes existentes de rotas (009) continuam verdes.

---

## Phase 6: User Story 4 — Refazer sem perder dados, falhas e privacidade (P1)

**Goal**: valores guardados à vista, falhas recuperáveis, nada em `localStorage`.

**Independent Test**: `OnboardingPage` com perfil guardado/falha simulados e espiões de armazenamento.

- [X] T019 [US4] Em `src/features/onboarding/OnboardingPage.test.tsx` (`F-116:`): com um perfil guardado **sem** conclusão, os passos aparecem com os valores guardados e saltar não os apaga; com o perfil **concluído**, `/boas-vindas` leva ao Início e as respostas alteram-se no Perfil (spec 014), não aqui (US4.1, P3); desmontar e voltar a montar o percurso regressa ao passo 1, sem respostas intermédias (US4.2); `PATCH` com 500 mostra «Não foi possível guardar. Tente de novo.», mantém as respostas e o passo, e repetir envia o mesmo corpo sem duplicar nada (US4.3); espiar `Storage.prototype.setItem` e confirmar que o percurso não escreve em `localStorage` nem em `sessionStorage` (US4.4); `PATCH` com 403 `privacy_consent_required` mostra «A política de privacidade mudou. Confirme-a para continuar.» e uma ligação para `/privacidade` (US4.5); `PATCH` com 422 mostra a mensagem do campo devolvida pela API
- [X] T020 [US4] Implementar em `src/features/onboarding/OnboardingPage.tsx` o pré-preenchimento a partir de `useProfile()` (inicial: valor guardado, ou 2 pessoas e 300 €; só mercados que existem na lista da API), a mensagem de erro com repetir e a ligação de consentimento (invalida `["me"]`). Depende de T019

**Checkpoint**: T019 passa. O caso «refazer com perfil concluído» fica pendente da decisão P3.

---

## Phase 7: User Story 5 — Acessibilidade e qualidade (P1)

**Goal**: WCAG 2.2 AA em claro e escuro, de 320 a 820 px.

**Independent Test**: axe no projeto `mock` e testes de papéis e foco em Vitest.

- [X] T021 [P] [US5] Escrever `src/features/onboarding/steps.test.tsx` (novo; `F-117:`): objetivos e mercados são `checkbox` com nome acessível e o estado lê-se por `checked`, não só pela moldura (US5.3); o controlo de pessoas tem nomes «Menos uma pessoa» e «Mais uma pessoa» e anuncia o valor em `output` (US5.4); a barra da meta tem `aria-label` e `aria-valuetext` e muda com o teclado (US5.4); a barra de progresso tem `aria-valuenow` 25, 50, 75, 100 (US5.2); ao mudar de passo o foco está no `<h1>` e o texto «Passo N de 4» existe (US5.2); o `<h1>` tem `aria-describedby` para o texto «Passo N de 4»; nenhum texto proibido: «Pular», «moram», «orçamento», «você», «Calculamos pela sua média», «poupar», «economizar», «poupou» (US5.2, US5.6)
- [X] T022 [P] [US5] Em `e2e/mock/ui.spec.ts` (`F-117:`), com `fakeApi(page, { onboarded: false })`: percurso dos quatro passos e «Tudo pronto» com `profilePatches` a confirmar o corpo; axe em cada passo e em «Tudo pronto», em claro e escuro, a 320, 375, 430 e 820 px (como o teste `F-99` existente); sem scroll horizontal a 320 px; alvos de toque ≥ 44 px (`boundingBox`) nos botões e controlos (US5.1, US5.5)
- [X] T023 [US5] Corrigir em `steps.tsx` e `OnboardingPage.tsx` o que T021 e T022 apontarem (nomes, foco, contraste, tamanhos, `prefers-reduced-motion` na barra), sem alterar comportamento. Depende de T021, T022

**Checkpoint**: T021 e T022 verdes; `e2e:mock` 100 %.

---

## Phase 8: Polish & cross-cutting

- [ ] T024 (manual, só com o backend a correr, **depois da T032 do backend** aplicada, da migração das contas existentes (P6) quando existir, e da imagem da API reconstruída; a conta de teste é sempre nova) Em `e2e/stack/journey.spec.ts`, concluir o onboarding (por `PATCH` ou saltando os quatro passos) antes da jornada, porque uma conta de teste nova cai em `/boas-vindas` (R11). Sem backend, registar «não corrido»
- [X] T025 Atualizar a `spec.md` com as decisões da Liz de 2026-10-30 (P1 a P5, C1, I3): *Assumptions*, US4.1, objetivos, tabela «Identificadores de teste», *Requirements* e *Success Criteria*; constituição 1.0.2; Funcional §12.4 (F-176 a F-205 reservados); plano UX Fase 2. Feito antes da implementação
- [X] T026 Correr `corepack pnpm@9 lint`, `typecheck`, `test` e `e2e:mock`; registar o resultado
- [X] T027 Correr `/simplify` e repetir T026; mostrar o `git diff --stat`. O commit é da Liz

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → histórias → Polish. T024 é manual e depende da T032 do backend: fica fora do «pronto».
- **Ordem das histórias:** US1 → US2 → US3 → US4 → US5. A US2 e a US4 editam `OnboardingPage.tsx` e `OnboardingPage.test.tsx` (as mesmas de US1): **não** correr em paralelo T010, T014 e T019, nem T012, T015 e T020. A US3 (T016 a T018) só toca em `RequireOnboarding*` e em `App.tsx` e pode correr em paralelo com a US2 depois de T013. A US5 vem no fim porque corrige o que as anteriores produziram.
- Dentro de cada história, escrever o teste (T007, T010, T014, T016, T019, T021 e T022) antes da implementação e vê-lo falhar.
- `src/App.tsx` é editado por T013 e T018 (por esta ordem). `src/features/onboarding/OnboardingPage.tsx` por T012, T015, T018, T020 e T023 (por esta ordem).
- T003 depende de T002; T006 de T005; T008 de T007; T012 de T008, T009 e T011.

## Parallel opportunities

- Fase 2: T002 ‖ T004 ‖ T005 ‖ T007 (ficheiros diferentes); depois T003, T006, T008 e T009.
- US1: T010 ‖ T011 (teste e componentes de passos).
- US3 (T016 a T018) em paralelo com US2 (T014, T015).
- US5: T021 ‖ T022.

## Implementation strategy

- **MVP**: Phases 1 a 3 (US1) mais US2: o percurso completo e a regra «só se grava o que a pessoa confirmou». Sem a US3 o percurso existe mas ninguém é encaminhado para ele.
- A US3 é o que torna o onboarding obrigatório na primeira utilização; só deve ir para produção com a US2 e a US4 (nunca gravar valores inventados, nem perder respostas numa falha).
- Entrega incremental: validar cada checkpoint com `lint`, `typecheck` e `test` antes de seguir. Não há alterações ao backend nem `gen:api` nesta spec.
- Fora desta lista: substituir `MERCHANT_NAMES`/`merchantName` nos ecrãs existentes (P1, specs 012 e 013), o Perfil editável (spec 014) e o cartão «Definir a minha meta pessoal» do Início (spec 011).
