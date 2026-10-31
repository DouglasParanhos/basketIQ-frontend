# Implementation Plan: Talões (Compras, Resumo e Produtos)

**Branch**: `012-taloes` (sem ramo git criado; o trabalho fica no ramo atual) | **Date**: 2026-10-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-taloes/spec.md`

## Summary

Reestilizar os três ecrãs de Talões segundo o desenho aprovado, sem mudar a lógica dos pedidos existentes: a lista de **Compras** ganha cabeçalhos por mês com os totais do novo `GET /v1/analytics/months`, o selo «!» e o «…», o contador de «Requer ação» e o seletor de ano (só nesta aba, filtro no cliente); o **Resumo** muda de apresentação; os **Produtos** ganham preço médio com base, contagens e ordenação no cliente; o detalhe do produto passa a ter os mínimos, máximos e o bloco «Por mercado, nos seus talões» sem ranking nem janela de dias, com a descrição original no histórico. O título «Talões» passa a ser do layout.

**Sem bloqueio de contrato:** o `openapi.json` do backend (commit `4e327d4`) já tem `/v1/analytics/months` e o `ProductSearchItem` enriquecido; a primeira tarefa regenera `src/api/schema.d.ts`. Só frontend, sem dependências novas.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19

**Primary Dependencies**: react-router 7 (`useSearchParams`, rotas aninhadas), TanStack Query 5 (`useInfiniteQuery`, `useQuery`), openapi-fetch (cliente tipado), Recharts 3 (gráficos existentes), lucide-react, Tailwind CSS 4 (tokens de `src/styles.css`). Nenhuma biblioteca nova.

**Storage**: N/A. Cache do TanStack Query: `["receipts", filtro]`, `["receipts","action-count"]` (novo), `["months"]` (novo), `["summary", …]`, `["consumption", …]`, `["products", q]`, `["product", id]`. O ano e a ordem vivem no URL. Nada em `localStorage` nem `sessionStorage`.

**Testing**: Vitest + Testing Library + msw (`src/test/server.ts` ganha `/v1/analytics/months` e os campos novos); Playwright projeto `mock` com axe e larguras (`e2e/mock/api.ts` ganha o mesmo); capturas a 390 px fora do git. O projeto `stack` mantém a jornada (F-18 a F-22) com os nomes novos.

**Target Platform**: PWA mobile-first, 320–820 px, claro e escuro

**Project Type**: web-app (frontend; backend noutro repositório)

**Performance Goals**: um pedido novo por abertura de Compras (`months`) e um para o contador do chip (`limit=100`); o ano obriga a páginas extra só quando é escolhido um ano antigo. Sem outros pedidos novos.

**Constraints**: alvos ≥ 44 px; sem scroll horizontal a 320 px; WCAG 2.2 AA; a cor nunca é o único sinal; dinheiro em cêntimos inteiros (formatação só na apresentação, sem médias nem somas no cliente); texto em português europeu; sem «mais barato» nem ordenação de mercados por preço.

**Scale/Scope**: 1 layout alterado, 1 seletor de ano, 1 hook de totais, 1 módulo puro de meses, 3 páginas reestilizadas, 1 detalhe reestilizado, 4 pontos de invalidação, mocks, ~6 ficheiros de teste novos ou adaptados.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.* Constituição do frontend v1.0.2.

| Princípio | Avaliação |
|---|---|
| I. Processamento local | N/A |
| II. Dinheiro exato | Passa: totais, médias e preços são os cêntimos da API, formatados com `formatCents`; nada de somas nem médias no cliente (por isso a evolução do preço fica por compra, D-T8) |
| III. Nunca inventar valores | Passa: sem preço quando `avg_price_cents` é nulo; sem «90 dias» (D-T2); a descrição original mostra-se e a frase só entra se for verdadeira (D-T3); o total «—» enquanto se lê o talão |
| IV. Privacidade no cliente | Passa: nada em armazenamento do navegador; a cache limpa-se no fim de sessão como hoje |
| V. Mobile-first e acessível | Passa com verificação: estados por texto e ícone, alvos ≥ 44 px, axe claro e escuro de 320 a 820 px, tabela alternativa nos gráficos, teclado |
| VI. Contrato tipado | Passa: `gen:api` primeiro; nenhum tipo à mão |
| VII. Rastreabilidade | Passa: F-195 a F-199, um por história |
| VIII. Simplicidade | Passa: sem estado global novo; o ano e a ordem no URL; sem biblioteca nova |

Resultado: **sem violações**.

## Decisões de produto (todas por confirmar pela Liz)

D-T1 a D-T13 estão na spec (Clarifications). O plano acrescenta quatro pontos que o desenho e o contrato deixam em aberto; **não os decidi** (a proposta vai marcada e justificada em `research.md`):

| # | Ponto | Proposta | Onde |
|---|---|---|---|
| D-T14 | Ano por defeito do seletor | o ano corrente; se não tiver compras e houver outros anos em `months`, o mais recente com compras | R3 |
| D-T15 | O filtro por ano aplica-se em «Requer ação»? | não: mostra todos os anos, para o N bater com a lista | R3 |
| D-T16 | Invalidação partilhada com a spec 011 | um auxiliar único `invalidateReceiptData(qc)` (`receipts`, `months`, `overview`) em vez de três chamadas em quatro sítios | R8 |
| D-T17 | `RECEIVED` no filtro «Requer ação» | manter (como hoje); aparece com «…» e conta no N, sem emblema «!» | R5 |

## Project Structure

### Documentation (this feature)

```text
specs/012-taloes/
├── plan.md              # este ficheiro
├── research.md          # Phase 0 (R1–R12)
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── taloes-api.md    # pedidos consumidos, com os campos reais
│   ├── routes.md        # rotas e parâmetros do URL
│   └── copy.md          # textos em português europeu
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── api/schema.d.ts                         # REGENERADO (T001): MonthTotalOut e os 4 campos de ProductSearchItem
├── components/ui.tsx                       # StatusBadge inalterado; sem componente novo genérico
├── lib/status.ts                           # + ATTENTION (REVIEW_REQUIRED, COMPLETED), ERRORS; sem mudar os existentes
├── features/
│   ├── taloes/
│   │   ├── TaloesLayout.tsx                # h1 «Talões», seletor de ano em /compras, abas
│   │   ├── YearSelect.tsx                  # NOVO: seletor (anos de months + corrente), parâmetro ?ano
│   │   └── useMonths.ts                    # NOVO: ["months"], GET /v1/analytics/months
│   ├── receipts/
│   │   ├── months.ts                       # NOVO, puro: ano e mês da compra, agrupar por mês, texto do cabeçalho, ano a carregar
│   │   ├── ReceiptsPage.tsx                # reestilizada: chips, grupos, contador, carregar até ao ano
│   │   ├── ReceiptRow.tsx                  # NOVO: inicial, selo, data a negrito, estado por texto e ícone
│   │   ├── cache.ts                        # NOVO (D-T16): invalidateReceiptData(qc)
│   │   ├── ReceiptPage.tsx                 # só a invalidação (apagar; DuplicateChoice)
│   │   └── ReviewEditor.tsx                # só a invalidação (refresh)
│   ├── dashboard/                          # DashboardPage.tsx e PeriodPicker.tsx reestilizados, lógica igual
│   ├── products/
│   │   ├── ProductsPage.tsx                # pesquisa, ordem, linhas com preço médio e contagens
│   │   └── ProductPage.tsx                 # detalhe reestilizado, por mercado sem ranking, descrição original
│   └── upload/useUpload.ts                 # só a invalidação
├── App.tsx                                 # sem rotas novas
└── test/{server,fixtures}.ts               # months, products enriquecidos, merchant_name, store_label
e2e/mock/{api,ui.spec}.ts                   # months e produtos; axe e larguras de Compras, Resumo, Produtos, detalhe
```

**Structure Decision**: o título e o seletor de ano vivem no layout (que já conhece as abas); os dados e a lógica ficam em cada feature como hoje. O agrupamento por mês é um módulo puro, testável sem DOM.
