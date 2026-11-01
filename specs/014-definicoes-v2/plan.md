# Implementation Plan: Definições v2 (Perfil, Privacidade e Conta)

**Branch**: `014-definicoes-v2` (sem ramo git criado; o trabalho fica no ramo atual) | **Date**: 2026-10-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-definicoes-v2/spec.md`

## Summary

Reestilizar as Definições em três abas (Perfil · Privacidade · Conta) como rotas, com o cabeçalho da conta; acrescentar a leitura e a edição do perfil (pessoas, mercados, meta, objetivos) com «N alterações por guardar», «Guardar alterações» e «Cancelar», enviando só o que mudou; mostrar a política aceite (versão real) e o resumo e o apagar em bloco dos originais; mover a eliminação de conta para um ecrã próprio sem mudar o comportamento. Resolve as contas anteriores ao onboarding: o Perfil é onde definem a meta e as preferências, com a ligação `?editar=meta` do Início. **O lançamento da UX v2 espera por esta spec.**

Sem bloqueio de contrato: `schema.d.ts` já tem o perfil, os mercados e os ficheiros guardados. Só frontend, sem dependências novas.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19

**Primary Dependencies**: react-router 7 (rotas aninhadas, `useSearchParams`), TanStack Query 5, openapi-fetch (cliente tipado), lucide-react, Tailwind CSS 4 (tokens de `src/styles.css`). Nenhuma biblioteca nova.

**Storage**: N/A. Cache do TanStack Query (`["profile"]`, `["merchants"]`, `["stored-files"]`, `["me"]`); o rascunho de edição é estado local e perde-se ao sair. Nada em `localStorage` nem `sessionStorage`.

**Testing**: Vitest + Testing Library + msw; Playwright projeto `mock` com axe e larguras (`e2e/mock`); capturas a 390 px em `Documentation/capturas-definicoes/` (fora do git). O projeto `stack` mantém o F-23 com os nomes novos.

**Target Platform**: PWA mobile-first, 320–820 px, claro e escuro

**Project Type**: web-app (frontend; backend noutro repositório)

**Performance Goals**: sem pedidos novos para além de `stored-files` (só na aba Privacidade); o perfil e os mercados já estão em cache pelo onboarding.

**Constraints**: alvos ≥ 44 px; sem scroll horizontal a 320 px; WCAG 2.2 AA; a cor nunca é o único sinal; dinheiro em cêntimos inteiros (`parseEurToCents`); texto em português europeu; só se envia o que a pessoa alterou.

**Scale/Scope**: 4 rotas novas e 1 redirecionamento, 1 layout, 3 abas, 1 ecrã de eliminar, 1 módulo puro de rascunho, 1 hook de ficheiros guardados, 1 componente partilhado extraído do onboarding, ~8 ficheiros de teste, handlers de mock.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.* Constituição do frontend v1.0.2.

| Princípio | Avaliação |
|---|---|
| I. Processamento local | N/A (sem documentos) |
| II. Dinheiro exato | Passa: a meta lê-se com `parseEurToCents` (inteiros) e mostra-se com `formatCents`; limites 5 000 a 80 000 cêntimos; nada em `number` decimal |
| III. Nunca inventar valores | Passa: o Perfil mostra o guardado e nunca sugestões; só se envia o que a pessoa mudou; o número de ficheiros e a política vêm da API; carregamento e erro não mostram números |
| IV. Privacidade no cliente | Passa: perfil e rascunho só em memória; a cache apaga-se no logout/eliminação (`qc.clear()`); sem `localStorage` |
| V. Mobile-first e acessível | Passa com verificação: alvos ≥ 44 px, `SegmentedTabs` com teclado, vistos além da cor nas escolhas, regiões `status` para a contagem e o guardado, foco gerido, axe claro e escuro |
| VI. Contrato tipado | Passa: tipos de `schema.d.ts`; nenhum à mão |
| VII. Rastreabilidade | Passa: F-189 a F-194, um por história (aprovados, D-Q10); cenários do perfil e dos originais «Verificado no Backend» |
| VIII. Simplicidade | Passa: sem biblioteca de formulários, sem estado global novo, sem diálogos novos; as abas e a ligação da meta no URL |

Resultado: **sem violações**; decisões de produto registadas abaixo.

## Decisões de produto (aceites pela Liz a 2026-10-31)

Cada uma tem a justificação em `research.md` e na secção Clarifications da spec.

| # | Decisão | Resultado | Onde |
|---|---|---|---|
| D-Q1 | Abas como rotas; `/definicoes` redireciona para `/definicoes/perfil` | sim (muda o teste F-98) | R1 |
| D-Q2 | Ligação do Início à meta: `/definicoes/perfil?editar=meta` | sim | rotas |
| D-Q3 | Qualquer «Editar» entra no modo «Editar perfil» (não há edição por bloco) | sim, como o protótipo | R2 |
| D-Q4 | O que conta como alteração (diferença por campo e por item de lista) | sim | R2 |
| D-Q5 | Cancelar com alterações pede confirmação | sim | spec |
| D-Q6 | Meta: campo livre em euros, 50 € a 800 €, vazio = sem meta | sim | R4 |
| D-Q7 | Pessoas: contador com «Não indicar» (envia `null`) | sim | R2 |
| D-Q8 | Consentimento em falta ao guardar: levar à política e perder as alterações | aceite e confirmada | R5 |
| D-Q9 | Apagar originais repete até `remaining` 0 | sim | R6 |
| D-Q10 | Identificadores F-189 a F-194 | aprovados | spec |

## Project Structure

### Documentation (this feature)

```text
specs/014-definicoes-v2/
├── plan.md              # este ficheiro
├── research.md          # Phase 0 (R1–R12)
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── profile-api.md   # perfil, mercados, ficheiros guardados e conta consumidos
│   ├── routes.md        # rotas, URL, foco
│   └── copy.md          # textos em português europeu
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── components/
│   └── Choice.tsx                      # NOVO (extraído do onboarding): Tick e ChoiceCard
├── features/
│   ├── profile/
│   │   └── goals.ts                    # NOVO (extraído): GOAL_OPTIONS
│   ├── onboarding/steps.tsx            # passa a importar Tick, ChoiceCard e GOAL_OPTIONS
│   └── settings/
│       ├── SettingsLayout.tsx          # NOVO: título, cabeçalho da conta, abas, Outlet, rodapé
│       ├── profileDraft.ts             # NOVO: puro. rascunho, contagem, validação, corpo do PATCH
│       ├── ProfileTab.tsx              # NOVO: leitura, modo de edição, guardar, cancelar
│       ├── ProfileEditor.tsx           # NOVO: campos (pessoas, mercados, meta, objetivos)
│       ├── useStoredFiles.ts           # NOVO: contagem e apagar em bloco
│       ├── PrivacyTab.tsx              # NOVO: política, originais, direitos
│       ├── AccountTab.tsx              # NOVO: sessão, operador, eliminar
│       ├── DeleteAccountPage.tsx       # NOVO: ecrã próprio de eliminar conta
│       └── *.test.ts(x)                # testes (F-189 a F-194)
│   (SettingsPage.tsx é removido na T017)
├── App.tsx                             # rotas aninhadas /definicoes/** e o redirecionamento
└── test/server.ts                      # handlers de stored-files
e2e/mock/
├── api.ts                              # stored-files, perfil migrado, contadores
└── ui.spec.ts                          # axe, larguras, fluxos (F-194)
```

**Structure Decision**: aplicação única já existente. O layout das abas copia o padrão da `TaloesLayout`. A lógica de edição fica num módulo puro testável sem DOM. Extrai-se só o que o onboarding e o Perfil usam igual (`Tick`, `ChoiceCard`, `GOAL_OPTIONS`); o resto é próprio do Perfil.

## Complexity Tracking

| Item | Porquê | Alternativa mais simples rejeitada |
|---|---|---|
| Módulo `profileDraft.ts` puro | Contagem de alterações e corpo do `PATCH` com `null`, `[]` e conjuntos têm bordas; testam-se sem DOM | Calcular dentro do componente: obriga a testes de DOM para cada combinação |
| Abas como rotas | «Voltar», ligação `?editar=meta`, barra ativa por caminho | Estado local: perde-se ao recarregar |
| Extrair `Tick`/`ChoiceCard`/`GOAL_OPTIONS` | Evita duplicar o desenho das escolhas e o texto dos objetivos | Copiar para o Perfil: dois sítios a manter |
| Apagar em ciclo | O servidor limita a 500 compras por chamada | Uma chamada e «Apagar mais»: obriga a vários toques |

## Post-Design Constitution Re-check

Sem violações novas. Riscos registados: o 403 por consentimento perde as alterações por guardar (D-Q8, raro) e o F-98 muda (D-Q1). Nenhum campo foi inventado: tudo vem do `contracts/api.md` da spec 013 do backend e do `schema.d.ts`.
