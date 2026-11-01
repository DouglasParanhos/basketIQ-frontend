# Implementation Plan: Onboarding

**Branch**: `010-onboarding` (sem ramo git criado; o trabalho fica no ramo atual e os commits são da Liz) | **Date**: 2026-10-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-onboarding/spec.md`

## Summary

Percurso de quatro passos (objetivo, pessoas, mercados, meta pessoal) em `/boas-vindas`, seguindo o ecrã **Onb1** de `Documentation/design-ux-v2`, com textos em português europeu e os tokens do repositório. As respostas ficam **em memória** (um `useReducer`), nada em `localStorage`, e enviam-se num **único `PATCH /v1/me/profile`** ao concluir, só com o que a pessoa **confirmou** («Avançar» confirma o que o ecrã mostra; «Saltar» não grava). Uma **guarda de rota** manda para `/boas-vindas` quem ainda não concluiu (`onboarding_completed_at` nulo), depois do consentimento. Os mercados vêm de `GET /v1/merchants`. Só frontend: o contrato (perfil e mercados) já está em `src/api/schema.d.ts` desde o `gen:api` de 2026-10-30. Sem backend novo, sem dependências novas.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19

**Primary Dependencies**: react-router 7, TanStack Query 5, openapi-fetch (cliente tipado em `src/api/client.ts`), lucide-react, Tailwind CSS 4 (tokens em `src/styles.css`). Nenhuma biblioteca nova.

**Storage**: N/A. Estado do percurso em memória (`useReducer`); perfil e mercados na cache do TanStack Query (`["profile"]`, `["merchants"]`). Nada em `localStorage`; o service worker não guarda `/v1/**` (já assim).

**Testing**: Vitest + Testing Library + msw (`src/**/*.test.tsx`); Playwright projeto `mock` com axe (`e2e/mock`); projeto `stack` só para confirmar que o percurso da jornada continua a passar com uma conta nova (`e2e/stack/journey.spec.ts`).

**Target Platform**: PWA mobile-first, 320–820 px, modo claro e escuro

**Project Type**: web-app (frontend; o backend é outro repositório e a spec 013 já está enviada)

**Performance Goals**: uma leitura do perfil por sessão (cache de 60 s; volta a ler ao focar a janela depois disso), um pedido de mercados por percurso, um `PATCH` no fim. O ecrã de onboarding carrega em *lazy* (fora do pacote principal), como `ProductsPage`.

**Constraints**: alvos de toque ≥ 44 px; sem scroll horizontal a 320 px; WCAG 2.2 AA (axe claro e escuro); a cor nunca é o único sinal; foco para o título do passo ao mudar; texto em português europeu; dinheiro em cêntimos inteiros.

**Scale/Scope**: 1 rota nova, 1 guarda, 1 ecrã com 4 passos mais «Tudo pronto», 1 módulo de estado puro, 3 hooks (perfil, gravar perfil, mercados), ~6 ficheiros de teste novos ou ajustados.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.* Constituição do frontend v1.0.1.

| Princípio | Avaliação |
|---|---|
| I. Processamento local | N/A (sem documentos) |
| II. Dinheiro exato | Passa: a meta circula em cêntimos inteiros (`euros * 100` com `euros` inteiro de 50 a 800); o ecrã mostra euros inteiros por formatação, sem cálculo decimal |
| III. Nunca inventar valores | Passa, é o centro desta spec (constituição 1.0.2: «confirmou ou alterou»): o `PATCH` leva só o que a pessoa confirmou; valores sugeridos (2 pessoas, 300 €) só se gravam se ela tocar «Avançar» nesse passo; «Saltar» e «Ainda não sei» não enviam nada |
| IV. Privacidade no cliente | Passa: respostas só em memória; perfil em cache de servidor; nada em `localStorage`; `qc.clear()` no *logout* já existente apaga-o; sem registos no cliente com os valores |
| V. Mobile-first e acessível | Passa com verificação: caixas de seleção com nome, alvos ≥ 44 px, foco no título, «Passo N de 4» como texto, estado nunca só por cor (marca de verificação); axe em 320–820 px claro e escuro |
| VI. Contrato tipado | Passa: `ProfileOut`, `ProfilePatch`, `MerchantOut` vêm de `schema.d.ts` (gerado a 2026-10-30), todas as chamadas por `api` |
| VII. Rastreabilidade | Passa: F-113 a F-117, um por história (tabela na `spec.md`); F-176 a F-205 reservados à continuação da UX v2 (Plano de Testes §5.1) |
| VIII. Simplicidade | Passa: sem estado global novo (reducer local + cache de servidor), sem biblioteca de formulários, sem lista local de mercados |

Resultado: **sem violações**. A leitura de III («Avançar» confirma) foi decidida pela Liz e a constituição passou à 1.0.2.

## Decisões da Liz (2026-10-30)

Aplicadas à `spec.md`, a este plano, ao `research.md`, aos contratos e às tarefas.

| # | Decisão |
|---|---|
| P1 | Só o onboarding usa os nomes de `GET /v1/merchants`. `src/lib/format.ts` (`merchantName`, `MERCHANT_NAMES`, `MERCHANT_OPTIONS`) mantém-se até às specs 012 e 013 |
| P2 | Objetivo «Gastar menos nas compras» (nunca «poupar» nem «economizar»); descrições que não prometem a Lista nem a comparação; «Quero tudo isso» |
| P3 | `/boas-vindas` só para quem não concluiu; «refazer» é do Perfil (spec 014). US4.1 e o critério «pronto quando» da Fase 2 do plano UX reescritos |
| P4 | Inicial = primeira letra; «EC» para El Corte Inglés (regra do artigo, sem nomes escritos à mão); o nome fica sempre visível |
| P5 | F-113 a F-117, um por história; F-176 a F-205 reservados à continuação da UX v2 (Plano de Testes §5.1); `traceability.py` não muda agora |
| C1 | «Avançar» confirma o que o ecrã mostra; constituição do frontend 1.0.2, princípio III: «envia apenas os campos que a pessoa confirmou ou alterou» |
| I3 | A guarda fica **acima** do AppShell: enquanto decide não aparece a barra de navegação (R14) |
| E1 | «T032 aplicada e imagem da API reconstruída» é pré-requisito dos cenários manuais e da T024 (não se executa nesta ronda) |
| P6 | Onboarding só para contas novas (abordagem A, 2026-10-30): o backend marca as contas existentes como concluídas numa migração de dados; o frontend não muda de lógica (R16) |

Assumidos (por confirmar na revisão): o ecrã de onboarding não mostra a barra de navegação; `/operador` fica fora da guarda; o percurso não passa pelo URL (um recarregamento volta ao passo 1, US4.2).

## Project Structure

### Documentation (this feature)

```text
specs/010-onboarding/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── routes.md          # /boas-vindas, ordem das guardas, redirecionamentos
│   ├── profile-api.md     # o que o frontend consome (perfil, mercados) e o PATCH
│   └── copy.md            # textos em português europeu e mapa protótipo → tokens
└── tasks.md               # gerado por /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── App.tsx                                  # rota /boas-vindas e a guarda, ambas acima do AppShell (R14)
├── components/AppShell.tsx                  # + Suspense à volta do <Outlet/> (R14)
├── api/schema.d.ts                          # já regenerado (perfil, mercados)
├── lib/format.ts                            # + formatação de euros inteiros ("300 €")
├── features/
│   ├── profile/
│   │   └── useProfile.ts                    # NOVO: useProfile, useSaveProfile, useMerchants (partilhado com 011 e 014)
│   └── onboarding/
│       ├── state.ts                         # NOVO: tipos, reducer, buildPatch, mapa de objetivos (puro, testado primeiro)
│       ├── OnboardingPage.tsx               # NOVO: contentor (lazy): passos, envio, «Tudo pronto»
│       ├── steps.tsx                        # NOVO: GoalsStep, PeopleStep, MerchantsStep, GoalAmountStep
│       └── RequireOnboarding.tsx            # NOVO: guarda (sem conclusão → /boas-vindas)
└── test/
    ├── server.ts                            # handlers por omissão: perfil concluído e mercados
    └── fixtures.ts                          # perfil e mercados de exemplo (sintéticos)

e2e/
├── mock/api.ts                              # FakeState.profile, GET/PATCH perfil, GET mercados
├── mock/ui.spec.ts                          # percurso, axe, larguras, claro/escuro
└── stack/journey.spec.ts                    # conta nova: concluir o onboarding antes da jornada
```

**Structure Decision**: aplicação única já existente. O onboarding é uma pasta de *feature* (`features/onboarding`) e os hooks de perfil ficam em `features/profile` porque o Início (011) e as Definições (014) vão usá-los. As páginas existentes **não se alteram**; só `App.tsx` ganha a rota e a guarda.

## Complexity Tracking

Sem violações a justificar.

## Post-Design Constitution Re-check

Sem alterações às conclusões acima: o desenho final (reducer local, três hooks sobre a cache de servidor, uma guarda, uma rota *lazy*) não acrescenta estado global, dependências nem armazenamento no cliente.
