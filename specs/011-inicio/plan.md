# Implementation Plan: Início

**Branch**: `011-inicio` (sem ramo git criado; o trabalho fica no ramo atual e os commits são da Liz) | **Date**: 2026-10-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-inicio/spec.md`

## Summary

Substituir a página provisória de `/` pelo **Início** de `HomeF`/`HomeG` (`Documentation/design-ux-v2`): anel da meta pessoal com três faixas e estado sem meta, cartão da média mensal, compras no mês, gasto por semana, «Onde gasta mais», últimas compras, estados vazios e navegação entre meses. Os dados vêm de **um só** `GET /v1/analytics/overview?month=YYYY-MM`, com os campos que a **spec 014 do backend** nomeia; o cliente mostra `goal_pct` e `band` tal como vêm e só traduz a faixa em texto e estilo. Textos em português europeu (tabela do `README.md`), tokens do repositório, axe em claro e escuro.

**Bloqueada pelo backend:** o endpoint ainda não existe e `src/api/schema.d.ts` não o tem. Pela constituição VI não se escreve código antes de o OpenAPI do backend ter `overview` e de se correr `gen:api`. O contrato existe como texto (backend 014, `contracts/api.md`, que responde a C1 a C9 e C11); o que falta está em `contracts/overview-api.md` (C10, C12 a C16: o `status` das últimas compras, a média por semana e o texto da tendência nula). Não se inventam campos. Só frontend, sem dependências novas.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19

**Primary Dependencies**: react-router 7 (`useSearchParams` para o mês), TanStack Query 5, openapi-fetch (cliente tipado), lucide-react, Tailwind CSS 4 (tokens de `src/styles.css`). O anel é um SVG próprio (como o protótipo); não se usa Recharts para ele. Nenhuma biblioteca nova.

**Storage**: N/A. Resposta na cache do TanStack Query (`["overview", month]`); mês no URL (`mes=YYYY-MM`). Nada em `localStorage`; o service worker não guarda `/v1/**` (já assim).

**Testing**: Vitest + Testing Library + msw (handlers com respostas **sintéticas** tipadas pelo `schema.d.ts` regenerado); Playwright projeto `mock` com axe (`e2e/mock`); capturas a 390 px em `Documentation/capturas-inicio/` (fora do git). O projeto `stack` só depois de o backend ter `overview` (mesma regra da T024 da spec 010).

**Target Platform**: PWA mobile-first, 320–820 px, claro e escuro

**Project Type**: web-app (frontend; backend noutro repositório)

**Performance Goals**: um único pedido de visão geral por mês mostrado (US5.6); `staleTime` curto (30 s) e releitura ao focar a janela; o p95 < 2 s com 5 000 linhas é do backend. O Início é a rota mais usada: fica no pacote principal (como hoje), sem *lazy*.

**Constraints**: alvos de toque ≥ 44 px; sem scroll horizontal a 320 px; WCAG 2.2 AA (axe claro e escuro); a cor nunca é o único sinal; gráficos ≥ 3:1 e com tabela alternativa; `prefers-reduced-motion` no anel; dinheiro em cêntimos inteiros; texto em português europeu; nenhum valor inventado enquanto carrega ou em erro.

**Scale/Scope**: 1 rota existente reescrita (`/`), 1 hook, 1 módulo de apresentação puro (faixa → texto), 1 módulo de meses, ~7 componentes, 1 token de cor possível (laranja), handlers de teste em `src/test/server.ts` e `e2e/mock/api.ts`, ~6 ficheiros de teste.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.* Constituição do frontend v1.0.2.

| Princípio | Avaliação |
|---|---|
| I. Processamento local | N/A (sem documentos) |
| II. Dinheiro exato | Passa: valores em cêntimos como a API os devolve; só `formatCents` para mostrar; o saldo da meta é `goal_cents − spent_cents` em inteiros; percentagens e faixa vêm da API, não se recalculam em `number` |
| III. Nunca inventar valores | Passa: `null` aparece como «—» e como o que falta; zero euros só quando a API os devolve; nada de médias, metas ou percentagens calculadas no cliente; carregamento e erro não mostram valores |
| IV. Privacidade no cliente | Passa: nada em `localStorage`; `qc.clear()` no *logout* apaga a cache; o service worker não guarda a API |
| V. Mobile-first e acessível | Passa com verificação: alvos ≥ 44 px, cor nunca sozinha (texto em todas as faixas), anel com `role="img"` e `aria-label`, tabela alternativa do gasto por semana e dos mercados, `prefers-reduced-motion`. O token laranja `--color-warn` (D-P3, aprovado) resolve o contraste do traço; o par escuro mede-se na implementação |
| VI. Contrato tipado | **Bloqueio até ao backend:** os tipos têm de vir de `gen:api` com `overview`; não se escrevem tipos à mão (R1) |
| VII. Rastreabilidade | Passa: F-183 a F-188, um por história (aprovados pela Liz a 2026-10-31; o backend 014 usa F-176 a F-182); cenários de cálculo «Verificado no Backend» |
| VIII. Simplicidade | Passa: sem estado global novo (cache de servidor e URL), sem biblioteca de gráficos para o anel, sem lista de mercados nova |

Resultado: **sem violações**; um bloqueio de dependência (VI), registado.

## Decisões de produto

Decididas pela Liz a 2026-10-31 (as recomendações do plano foram aceites, salvo indicação). Detalhe em `research.md`.

| # | Decisão | Resultado | Onde |
|---|---|---|---|
| D-P1 | Texto acima da meta | «Acima da meta pessoal este mês · 52,00 € além da meta» | R5 |
| D-P2 | Fundo vermelho do cartão da média quando está acima | mantido, texto neutro | R6 |
| D-P3 | Token laranja | aprovado: `--color-warn` (laranja do protótipo) com par escuro e `--color-warn-soft` | R4 |
| D-P4 | Valores em euros | com cêntimos, `formatCents` | R7 |
| D-P5 | «Mês seguinte» no mês corrente | desativado | R8 |
| D-P6 | Identificadores | **F-183 a F-188** (o backend 014 usa F-176 a F-182) | spec |
| D-P7 | Meta nos meses passados | mostrar a meta de hoje com a nota «Meta atual» | R9 |
| D-P8 | «Definir a minha meta pessoal» | `/definicoes` até existir o Perfil; depois, a edição da meta (spec 014 do frontend) | R10 |
| D-P9 | Ordem dos cartões | anel, média + compras, gasto por semana, «Onde gasta mais», últimas compras | R3 |
| D-P10 | «Mês passado» vs «Mês anterior» | «Mês anterior: N» nos meses que não são o corrente | copy |
| D-P11 | Navegação entre meses | mantida (P2, separável) | spec |
| D-P12 | Intervalo de «na média» | do backend (`average_trend`, ±5 %) | R6 |

## Decisões novas por confirmar pela Liz

Surgiram ao aplicar o contrato escrito do backend; não foram decididas pelo plano.

| # | Decisão | Recomendação | Onde |
|---|---|---|---|
| D-P13 | Média presente e tendência nula (só 2 meses de dados): que texto? | valor da média e «Tendência: ainda sem meses suficientes» (sem número, porque a API não o expõe; pedir o mínimo da tendência ao backend, C16) | copy, C16 |
| D-P14 | Média por semana: a API não a devolve | não mostrar (o cliente não a calcula); alternativa: pedir `weekly_average_cents` ao backend | copy, C15 |
| D-P15 | Rótulos dos estados das últimas compras («Requer revisão», «Em processamento») | alinhar com os da lista de Compras, quando C12 definir os valores de `status` | copy, C12 |

## Project Structure

### Documentation (this feature)

```text
specs/011-inicio/
├── plan.md              # este ficheiro
├── research.md          # Phase 0 (R1–R12)
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── overview-api.md  # contrato escrito da 014 e o que falta (C10, C12–C16)
│   ├── routes.md        # rota, URL e redirecionamentos
│   └── copy.md          # textos em português europeu
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── month.ts                       # NOVO: mês corrente de Lisboa, validar/avançar/recuar, rótulo e intervalo
│   └── month.test.ts
├── features/home/
│   ├── HomeRoute.tsx                  # mantém o redirecionamento do Resumo; renderiza HomePage
│   ├── HomePage.tsx                   # NOVO: mês no URL, pedido, estados, composição
│   ├── useOverview.ts                 # NOVO: useQuery(["overview", month])
│   ├── ringView.ts                    # NOVO: puro. band + cêntimos → texto, tom, traço do anel, aria-label
│   ├── GoalRing.tsx                   # NOVO: SVG, texto, nota fixa, botão «Definir…»
│   ├── MonthStepper.tsx               # NOVO: «Mês anterior» / «Este mês» / «Mês seguinte»
│   ├── AverageCard.tsx                # NOVO: média, tendência, fundo suave, estado sem média
│   ├── SpendCards.tsx                 # NOVO: compras no mês, gasto por semana, mercados, últimas compras
│   ├── HomeEmpty.tsx                  # NOVO: conta vazia (cartões tracejados)
│   └── *.test.ts(x)                   # testes (F-183 a F-188)
├── App.tsx                            # inalterado (a rota `/` já aponta para HomeRoute)
├── styles.css                         # D-P3 aprovada: --color-warn e --color-warn-soft (claro e escuro)
└── test/server.ts                     # handler por omissão de `overview` (senão os testes que abrem `/` falham)
e2e/mock/
├── api.ts                             # handler de `overview` e estados (com meta, sem meta, vazio, erro, atraso)
└── ui.spec.ts                         # axe, larguras, claro e escuro (F-187)
```

**Structure Decision**: aplicação única já existente. O Início é a pasta `features/home` (já existe); o módulo `lib/month.ts` é novo porque o Resumo usa períodos arbitrários (`lib/period.ts`) e o Início só meses. Os cartões partilham ficheiros pequenos em vez de um por cartão, para não esconder a composição (VIII). Reutiliza-se `Surface`, `Spinner`, `Notice`, `LinkButton`, `DataTable`, `formatCents`, `formatMonth` e `lisbonToday`.

## Complexity Tracking

| Item | Porquê | Alternativa mais simples rejeitada |
|---|---|---|
| Módulo `ringView.ts` puro | A regra «faixa → texto, tom e traço» tem de ser testável sem DOM e é a parte com mais risco de tom | Lógica dentro do componente: obriga a testes por DOM para cada texto |
| `lib/month.ts` novo | Mês corrente de Lisboa, validação do URL e deslocamento são lógica de datas com bordas (virada de ano, fuso) | Reutilizar `lib/period.ts`: modela períodos genéricos e traz parâmetros (`de`, `ate`) que o Início não usa |
| Token laranja (D-P3, aprovado) | Contraste de gráficos ≥ 3:1 (constituição V) | Usar `--color-marker`: amarelo sobre creme, razão de contraste baixa |

## Post-Design Constitution Re-check

Depois do desenho: sem violações novas. Fica aberto o bloqueio do contrato (VI): o OpenAPI ainda não tem `overview`. Nenhum campo foi inventado: tudo o que o contrato escrito da 014 não define está em `contracts/overview-api.md` como pergunta.
