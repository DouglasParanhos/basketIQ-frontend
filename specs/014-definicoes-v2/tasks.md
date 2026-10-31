---

description: "Tarefas da spec 014: Definições v2 (Perfil, Privacidade e Conta)"
---

# Tasks: Definições v2 (Perfil, Privacidade e Conta)

**Input**: `/specs/014-definicoes-v2/` — [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Estado:** sem bloqueio de contrato (`schema.d.ts` já tem perfil, mercados e ficheiros guardados). As decisões D-Q1 a D-Q10 do `plan.md` são recomendações por confirmar pela Liz; as tarefas seguem-nas e mudam pouco se a Liz decidir de outra forma (D-Q1 muda T006 a T008; D-Q9 muda T013). **O lançamento da UX v2 espera por esta spec.**

**Tests**: pedidos (constituição VII; testes antes do código). Identificadores propostos (D-Q10), um por história: `F-189` US1, `F-190` US2, `F-191` US3, `F-192` US4, `F-193` US5, `F-194` US6. O nome de cada teste novo começa por `F-189:` … `F-194:`. Os cenários do perfil e dos originais são «Verificado no Backend» (F-100 a F-112). `scripts/traceability.py` do backend não muda.

**Comandos**: `corepack pnpm@9 <script>` no PowerShell ou Git Bash (não há `pnpm` no PATH nem WSL). Vitest: `corepack pnpm@9 exec vitest run --maxWorkers=4` (um ficheiro de cada vez: `… <ficheiro>`). Playwright (`e2e:mock`) precisa de `pnpm` no PATH (atalho `pnpm.cmd` → `corepack pnpm@9`). Só dados sintéticos. O commit só depois de `/simplify` (T028).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode correr em paralelo (ficheiros diferentes, sem dependência de tarefa por acabar)
- **[Story]**: US1 cabeçalho e abas · US2 Perfil · US3 Privacidade e originais · US4 Conta e eliminar · US5 contas anteriores ao onboarding · US6 qualidade

## Phase 1: Setup

- [ ] T001 Confirmar a linha de base sem alterar ficheiros: `lint`, `typecheck`, `exec vitest run --maxWorkers=4` e `e2e:mock`; confirmar que `src/api/schema.d.ts` tem `/v1/me/profile` (GET e PATCH), `/v1/merchants`, `/v1/receipts/stored-files` (GET e DELETE) e os tipos `ProfileOut`, `ProfilePatch`, `MerchantOut`, `StoredFilesOut` e `StoredFilesDeleted`; registar o resultado. Se faltar algum, parar e escrever `Documentation/PENDENTE_…md` (não se editam tipos à mão)
- [ ] T002 Refatorar sem mudar comportamento: mover `Tick` e `ChoiceCard` de `src/features/onboarding/steps.tsx` para `src/components/Choice.tsx` (exportados) e `GOAL_OPTIONS` para `src/features/profile/goals.ts` (exportado); `steps.tsx` passa a importá-los. Correr `steps.test.tsx`, `OnboardingPage.test.tsx` e `RequireOnboarding.test.tsx`: têm de continuar verdes sem alterações

---

## Phase 2: Foundational (bloqueia as histórias)

- [ ] T003 [P] Mocks e fixtures: em `src/test/fixtures.ts`, `migratedProfile = emptyProfile({ onboarding_completed_at: "2026-10-31T00:00:00Z" })`, `adminMe = { ...me, role: "admin" }` e `storedFiles` (`{ files: 9 }`); em `src/test/server.ts`, handlers por omissão de `GET /v1/receipts/stored-files` e `DELETE /v1/receipts/stored-files` e os ajudantes `serveStoredFiles(body)` e `serveStoredFilesDelete(responses)` (a lista de respostas por chamada, para testar o ciclo); em `e2e/mock/api.ts`, `FakeState.storedFiles` (contagem), `storedFilesDeletes` (contador de chamadas), `storedFilesFail`, `FakeState.migrated` (perfil concluído e vazio; hoje `onboarded` só distingue concluído de vazio sem conclusão) e o handler do `DELETE` (apaga até 500 «compras» por chamada e devolve `remaining`). O `PATCH` do mock tem de aceitar `null` e `[]` e devolver o perfil resultante
- [ ] T004 [P] Escrever `src/features/settings/profileDraft.test.ts` (novo; `F-190:`): `initialDraft` copia o guardado (meta «300,00» ou vazia); `countChanges` — nada mudado = 0; pessoas 2→3 = 1; meta 300→450 = 1; esvaziar a meta = 1; acrescentar um mercado e retirar outro = 2; a ordem dos mercados não conta; meta vazia sobre perfil sem meta = 0; `validate` — «30» e «900» e «abc» dão «A meta tem de estar entre 50 € e 800 €.», «50», «800» e «450,50» são válidos, vazio é válido (sem meta); `buildPatch` — sem alterações → `{}`; só a meta → `{ monthly_goal_cents: 35000 }`; meta apagada → `{ monthly_goal_cents: null }`; pessoas retiradas → `{ household_size: null }`; mercados esvaziados → `{ merchants: [] }`; objetivos pela ordem canónica; mercado guardado desconhecido: sem mexer nos mercados o campo não vai; ao mexer, os desconhecidos não vão (`knownMerchants`); nunca `onboarding_completed` (SC-002)
- [ ] T005 Criar `src/features/settings/profileDraft.ts` com `ProfileDraft`, `initialDraft`, `goalCents`, `validate`, `countChanges` e `buildPatch` conforme `data-model.md`, reaproveitando `parseEurToCents` e `centsToInput` de `src/lib/format.ts`, `GOAL_MIN_EUROS`/`GOAL_MAX_EUROS` e o tipo `Goal` de `src/features/onboarding/state.ts`; sem React. Depende de T004

**Checkpoint**: `lint`, `typecheck` e Vitest completos verdes; os testes existentes continuam verdes com os handlers novos.

---

## Phase 3: User Story 1 — Cabeçalho e abas (P1) 🎯 MVP

**Goal**: título, cabeçalho da conta, abas como rotas, redirecionamento e rodapé.

**Independent Test**: `renderRoutes` da tabela real de rotas com msw.

- [ ] T006 [P] [US1] Escrever `src/features/settings/SettingsLayout.test.tsx` (novo; `F-189:`) com `renderRoutes(routes, "/definicoes")`: o redirecionamento acaba em `/definicoes/perfil` (`router.state.location.pathname`) e o histórico fica sem a entrada de `/definicoes` (`navigate(-1)` não volta a ela); `<h1>` «Definições» único; cabeçalho com a inicial, «Conta Google» e o e-mail; `tablist` com «Perfil», «Privacidade» e «Conta», a ativa conforme o caminho; clicar em «Privacidade» vai a `/definicoes/privacidade`; setas e Fim movem o foco e Enter ativa (como `SegmentedTabs.test.tsx`); nenhum «Lembretes»; «Definições» ativo na barra em `/definicoes/conta`; o rodapé mostra o nome e a versão da aplicação em qualquer aba (US1.1 a US1.6)
- [ ] T007 [US1] Criar `src/features/settings/SettingsLayout.tsx` (título, cabeçalho com `useMe`, `SegmentedTabs` cujos `id` são os caminhos, `Outlet` dentro de `Suspense`, rodapé com `useAppName` e `__APP_VERSION__`) e, em `src/App.tsx`, as rotas aninhadas: `/definicoes` com `index` → `<Navigate to="/definicoes/perfil" replace />`, `perfil`, `privacidade`, `conta` sob o layout, e `/definicoes/conta/eliminar` fora dele. As abas ainda mostram um marcador provisório até às T010, T014 e T016. Depende de T006
- [ ] T008 [US1] Adaptar os testes existentes ao redirecionamento: `src/routes.test.tsx` (F-98: `/definicoes` acaba em `/definicoes/perfil` e continua com `["Definições"]` ativo); `src/config/appConfig.test.tsx` (o teste do nome e da versão abre `/definicoes` pelo layout); `e2e/mock/ui.spec.ts` («default name is Super Mercado»). Correr cada ficheiro isolado. Depende de T007

**Checkpoint**: T006 e T008 verdes.

---

## Phase 4: User Story 2 — Perfil (P1)

**Goal**: ler, editar e guardar o perfil, só com o alterado.

**Independent Test**: `ProfileTab` com respostas sintéticas.

- [ ] T009 [P] [US2] Escrever `src/features/settings/ProfileTab.test.tsx` (novo; `F-190:`) com `renderRoutes(routes, "/definicoes/perfil")`, `serveProfile` e `servePatch` (de `src/test/server.ts`): leitura com os quatro blocos e os nomes dos mercados (US2.1); perfil vazio com «Ainda não definiu.» e «Definir» (US2.2); «Editar» entra em «Editar perfil» com o foco no bloco, «Guardar alterações» desativado e «Sem alterações» (US2.3); a contagem «1 alteração por guardar», «3 alterações por guardar» ao mudar pessoas, um mercado e a meta (US2.4); «Cancelar» sem alterações volta de imediato; com alterações mostra «Descartar as 3 alterações?» e «Continuar a editar» mantém e «Descartar» restaura o guardado (US2.5); guardar envia um único `PATCH` só com os campos alterados, mostra «Perfil guardado.» e invalida `["overview"]` (US2.6); erro 500 e erro de rede: fica em edição com «Não foi possível guardar. Tente de novo.» e as alterações, e repetir envia o mesmo corpo (US2.7); meta 30 e 900: «A meta tem de estar entre 50 € e 800 €.» e nenhum pedido; os botões de pessoas param em 1 e 12 (US2.8); meta esvaziada envia `monthly_goal_cents: null` (US2.9); 403 `privacy_consent_required` não mostra «Perfil guardado.» e `["me"]` fica invalidada (US2.10); `?editar=meta` abre em edição com o foco na meta e o parâmetro sai do URL ao guardar e ao cancelar (US2.11); mercados em erro: aviso com «Tentar de novo», os outros campos editáveis e os mercados guardados intactos (US2.12); mercado desconhecido: não vai no corpo se não se mexe nos mercados, e deixa de ir se se mexe (US2.13); nada em `localStorage` nem `sessionStorage` (US2.14)
- [ ] T010 [US2] Criar `src/features/settings/ProfileTab.tsx` (leitura dos quatro blocos com `useProfile` e `useMerchants`, «Editar»/«Definir» com nome acessível por bloco, estados de carregamento e erro com «Tentar de novo», região `status` «Perfil guardado.», `useSearchParams` para `editar`) e ligá-la à rota `perfil` em `src/App.tsx`. Depende de T007, T009
- [ ] T011 [US2] Criar `src/features/settings/ProfileEditor.tsx` (modo de edição: contador de pessoas com «Menos uma pessoa», «Mais uma pessoa» e «Não indicar»; mercados com `ChoiceCard` e `Tick` de `src/components/Choice.tsx`, inicial por `initialsOf`; campo da meta com `Field`, `inputMode="decimal"` e dica; objetivos com `GOAL_OPTIONS`; contagem em região `status`; «Guardar alterações» desativado sem alterações ou com erro; confirmação inline ao cancelar; foco para o bloco; `useSaveProfile` com `buildPatch`; ao guardar, `["overview"]` invalidada pelo `useSaveProfile` — ver T037 da spec 011 — ou, se ainda não existir, nesta tarefa). Depende de T005, T010

**Checkpoint**: T009 verde; o Perfil edita e guarda só o alterado.

---

## Phase 5: User Story 3 — Privacidade e originais (P1)

**Goal**: política real, retenção, contagem e apagar em bloco com confirmação.

**Independent Test**: `PrivacyTab` com `serveStoredFiles` e `serveStoredFilesDelete`.

- [ ] T012 [P] [US3] Escrever `src/features/settings/PrivacyTab.test.tsx` (novo; `F-191:`): «Aceite a <data> · versão 2026-10-15» com a versão e a data de `useMe` e a ligação «Ler a política» para `/privacidade` (US3.1); a retenção de 30 dias e «Os valores ficam nas suas contas.» (US3.2); «9 ficheiros guardados agora», «1 ficheiro guardado agora» e «Apagar agora» (US3.3); «Apagar agora» só abre a confirmação e não envia nada; a confirmação diz que as compras e os valores ficam e que fotos e PDF não se recuperam (US3.4); confirmar envia `DELETE`, repete enquanto `remaining` > 0 (duas respostas, 500 e depois 0) e termina com «Nenhum ficheiro guardado» e `["stored-files"]`, `["receipts"]` e `["receipt"]` invalidadas (US3.5, SC-007); `files` 0 → «Nenhum ficheiro guardado» e botão desativado (US3.6); erro a meio: «Não foi possível apagar tudo. Faltam N compras.» e «Tentar de novo» que continua; resposta sem progresso (`receipts` 0 com `remaining` > 0) não repete indefinidamente (US3.7); «Os seus direitos» (US3.8); a contagem a carregar mostra o indicador e em erro «Não foi possível carregar os ficheiros guardados.» com «Tentar de novo», nenhum número (US3.9)
- [ ] T013 [US3] Criar `src/features/settings/useStoredFiles.ts`: `useStoredFiles()` (`useQuery` em `["stored-files"]` pelo cliente tipado) e `useDeleteStoredFiles()` (mutação que repete `DELETE` até `remaining` ser 0 ou não haver progresso, devolve o total apagado, e no fim invalida `["stored-files"]`, `["receipts"]` e `["receipt"]`). Depende de T012
- [ ] T014 [US3] Criar `src/features/settings/PrivacyTab.tsx` (política com `useMe`, originais, confirmação em bloco no próprio ecrã com o foco no título, estados de erro, «Os seus direitos») e ligá-la à rota `privacidade`. Depende de T007, T013

**Checkpoint**: T012 verde.

---

## Phase 6: User Story 4 — Conta (P1)

**Goal**: terminar sessão e eliminar conta, sem mudar o comportamento.

**Independent Test**: `AccountTab` e `DeleteAccountPage` com msw.

- [ ] T015 [P] [US4] Escrever `src/features/settings/AccountTab.test.tsx` e `src/features/settings/DeleteAccountPage.test.tsx` (novos; `F-192:`) e **retirar** o F-23 antigo de `src/features/features.test.tsx` (passa para aqui): «Entrou com Google · e-mail», «Terminar sessão» (faz `POST /v1/auth/logout`), «Conta criada a …», a ligação ao painel só para `role` `admin` (`adminMe`), «Eliminar conta…» leva a `/definicoes/conta/eliminar` (US4.1, US4.2); o ecrã mostra o `<h1>` «Eliminar conta», «Isto não pode ser desfeito» e a lista dos quatro itens (US4.2, US4.3); o botão «Eliminar a minha conta» está desativado até marcar a caixa (F-23, US4.4); confirmar envia `DELETE /v1/me` uma vez, limpa a cache e vai a `/login` (US4.5, US4.7); «Cancelar» volta a `/definicoes/conta` sem pedido (US4.6); erro do servidor: mensagem, fica no ecrã, sem redirecionar (US4.8)
- [ ] T016 [US4] Criar `src/features/settings/AccountTab.tsx` (sessão, operador, bloco «Eliminar conta» com «Eliminar conta…» como `LinkButton`) e ligá-la à rota `conta`. Depende de T007, T015
- [ ] T017 [US4] Criar `src/features/settings/DeleteAccountPage.tsx` (rota `/definicoes/conta/eliminar`: `<h1>`, `Notice`, lista, caixa, botões; o mesmo `DELETE /v1/me`, `qc.clear()` e `window.location.assign("/login")` do `SettingsPage`) e remover `src/features/settings/SettingsPage.tsx`, corrigindo os imports em `src/App.tsx`. Correr `lint`, `typecheck` e Vitest completo. Depende de T015, T016

**Checkpoint**: T015 verde; o `SettingsPage` antigo desapareceu.

---

## Phase 7: User Story 5 — Contas anteriores ao onboarding (P1)

**Goal**: quem chegou antes do onboarding define a meta e as preferências no Perfil.

**Independent Test**: `ProfileTab` com `migratedProfile`, a guarda e a ligação do Início.

- [ ] T018 [P] [US5] Escrever `src/features/settings/ProfileTab.migrated.test.tsx` (novo; `F-193:`) e acrescentar um caso a `src/features/onboarding/RequireOnboarding.test.tsx`: com `migratedProfile`, `/definicoes/perfil` não redireciona e mostra os quatro blocos por definir (US5.1); `/definicoes/perfil?editar=meta` abre em edição com o foco na meta (US5.2); definir só a meta 350 e guardar envia exatamente `{ "monthly_goal_cents": 35000 }` — sem `onboarding_completed`, sem `null`, sem listas vazias — e a leitura mostra «350,00 €» (US5.3, SC-002); definir pessoas, um mercado e um objetivo no mesmo guardar envia um só pedido com esses quatro campos (US5.4); com um perfil sem `onboarding_completed_at`, `/definicoes/perfil` acaba em `/boas-vindas` (US5.5); depois de guardar a meta, `["overview"]` está invalidada (US5.6)
- [ ] T019 [US5] Garantir o que a T018 pedir que as T010 e T011 não tenham dado (sem lógica nova esperada) e, nos documentos, alinhar a spec 011: `specs/011-inicio/contracts/routes.md`, `research.md` (R10) e `tasks.md` (T012) passam a apontar «Definir a minha meta pessoal» para `/definicoes/perfil?editar=meta` (uma constante com um teste, na implementação da 011). Depende de T011, T018

**Checkpoint**: T018 verde.

---

## Phase 8: User Story 6 — Qualidade (P1)

**Goal**: texto, armazenamento, axe, larguras e alvos.

**Independent Test**: Vitest de texto e armazenamento; Playwright `mock` com axe.

- [ ] T020 [P] [US6] Escrever `src/features/settings/SettingsQuality.test.tsx` (novo; `F-194:`): nenhum texto proibido de `contracts/copy.md` («você», «dá para», «Lembretes», «Ajusta as comparações», «versão 1.0») em nenhuma aba nem no ecrã de eliminar (US6.3); nada em `localStorage` nem `sessionStorage` depois de editar e guardar (US6.4); escolhas de mercado e objetivo com visto e texto, além do `aria-checked`/`checked` (US6.6)
- [ ] T021 [P] [US6] Em `e2e/mock/ui.spec.ts` (`F-194:`), com `fakeApi(page, …)`: axe sem violações em claro e escuro, a 320, 375, 430 e 820 px, para cada aba (Perfil em leitura, vazio e em edição com erro de meta; Privacidade com e sem ficheiros e com a confirmação aberta; Conta) e para o ecrã de eliminar; sem scroll horizontal a 320 px; alvos ≥ 44 px (`boundingBox`) nos botões, caixas e abas (US6.1, US6.5). Seguir o padrão do axe do onboarding
- [ ] T022 [P] [US6] Em `e2e/mock/ui.spec.ts` (`F-194:`): fluxo editar → guardar (a meta persiste ao recarregar), editar → cancelar com confirmação, apagar originais com 1 200 «compras» (3 chamadas) e eliminar conta até ao login; só teclado nas abas (US6.2)
- [ ] T023 [US6] Corrigir nas abas e no ecrã o que T020 a T022 apontarem (nomes, contraste, tamanhos, foco), sem alterar comportamento. Depende de T020, T021, T022

**Checkpoint**: T020 a T022 verdes; `e2e:mock` 100 %.

---

## Phase 9: Polish & cross-cutting

- [ ] T024 Em `e2e/stack/journey.spec.ts`, atualizar o F-23 para os nomes e a rota novos (`/definicoes/conta`, «Eliminar conta…», «Eliminar a minha conta»); **manual**, só com a stack a correr e a jornada ainda desatualizada por outra causa (HANDOFF, commit `0a2856f` do backend): registar «não corrido» se não houver backend
- [ ] T025 Documentos fora do git e da spec: registar F-189 a F-194 na Especificação Funcional §12.4 e uma nota na spec 006 (`specs/006-definicoes-dados/spec.md`: reestilizada pela 014, comportamento igual); atualizar o HANDOFF: spec 014 implementada, o Perfil existe, o lançamento pode avançar
- [ ] T026 Capturas a 390 px em `Documentation/capturas-definicoes/` (fora do git): Perfil em leitura, vazio, em edição com alterações e com erro de meta; Privacidade com e sem ficheiros e com a confirmação; Conta; eliminar; claro e escuro nos três primeiros
- [ ] T027 Correr `corepack pnpm@9 lint`, `typecheck`, `exec vitest run --maxWorkers=4` e `e2e:mock`; registar o resultado
- [ ] T028 Correr `/simplify` e repetir T027; mostrar o `git diff --stat`. O commit é da Liz (ou autorizado por ela)

---

## Dependencies & Execution Order

- **Sem bloqueio externo.** Phase 1 → Phase 2 → histórias → Polish.
- **Ordem das histórias:** US1 → US2 → US3 → US4 → US5 → US6. `src/App.tsx` é editado nas T007, T010, T014, T016 e T017 (por esta ordem); `ProfileTab.tsx` nas T010 e T011 (a T011 cria o `ProfileEditor` e liga-o); não correr em paralelo tarefas que editam o mesmo ficheiro.
- Dentro de cada história, escrever o teste (T004, T006, T009, T012, T015, T018, T020 a T022) antes da implementação e vê-lo falhar.
- T005 depende de T004; T007 de T006; T008 de T007; T010 de T007 e T009; T011 de T005 e T010; T013 de T012; T014 de T007 e T013; T016 de T007 e T015; T017 de T015 e T016; T019 de T011 e T018; T023 de T020 a T022.
- A T017 remove o `SettingsPage.tsx`: antes disso, as T007 a T016 convivem com ele (a rota `/definicoes` do layout substitui a antiga na T007).
- O `useSaveProfile` invalida `["overview"]` na T037 da spec 011; se a 011 ainda não estiver implementada, a T011 acrescenta essa linha (uma só vez).

## Parallel opportunities

- Fase 2: T003 ‖ T004.
- Testes de histórias diferentes: T006 ‖ T009 ‖ T012 ‖ T015 (ficheiros diferentes) depois da Fase 2.
- US6: T020 ‖ T021 ‖ T022.

## Implementation strategy

- **MVP**: Fases 1 a 4 (US1 e US2) mais a US5: com isto uma conta anterior ao onboarding já define a meta, que é o que o lançamento espera. A US3 e a US4 reestilizam o que já existe (privacidade e eliminação) e a US6 fecha.
- Entrega incremental: validar cada checkpoint com `lint`, `typecheck` e `exec vitest run --maxWorkers=4` antes de seguir.
- Fora desta lista: a lista inteligente na eliminação (spec 015), os totais por mês de Talões (spec 012), o Início (spec 011), a migração das contas existentes (backend 013).
