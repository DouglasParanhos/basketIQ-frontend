# Data Model: Início

Só existe estado de apresentação; nada é gravado. Os tipos da resposta vêm de `src/api/schema.d.ts` quando o backend publicar `overview` (R1). Esta tabela segue o contrato escrito do backend 014 (`contracts/api.md`); ver `contracts/overview-api.md` para o que ainda falta (C10, C15, C16).

## Resposta (`OverviewOut`, nome do tipo a confirmar no OpenAPI)

| Campo | Tipo esperado | Quando é nulo/vazio | O que o ecrã faz |
|---|---|---|---|
| `month` | `YYYY-MM` | nunca | o mês devolvido |
| `spent_cents` | inteiro | nunca (0 em mês sem compras) | gasto do mês (`formatCents`) |
| `goal_cents` | inteiro ou nulo | sem meta | anel sem meta; «Sem meta pessoal definida». É sempre a meta atual |
| `goal_pct` | inteiro ou nulo | sem meta | percentagem no anel, tal como vem; pode passar de 100 |
| `band` | `ok` \| `attention` \| `high` \| `none` | `none` = sem meta | faixa e texto; nunca recalculada |
| `monthly_average_cents` | inteiro ou nulo | menos de `average_min_months` meses com dados | cartão da média; nulo → «— €» |
| `recent_vs_average_pct` | inteiro com sinal ou nulo | nulo com menos de 3 meses | número da tendência (valor absoluto); negativo = abaixo |
| `average_trend` | `below` \| `on_average` \| `above` ou nulo | nulo com a tendência | palavra e tom do cartão |
| `average_months` | inteiro | — | progresso «0/2 meses» |
| `average_min_months` | inteiro | — | o «2» do texto |
| `purchases_this_month` | inteiro | nunca | «Compras no mês» |
| `purchases_last_month` | inteiro | nunca | «Mês passado: N» / «Mês anterior: N» |
| `weeks[]` | `{ index, from, to, spent_cents }` | — | gasto por semana e tabela |
| `by_merchant[]` | `{ merchant, name, spent_cents, purchases, share_pct }` | lista vazia com gasto 0 | «Onde gasta mais» |
| `recent_receipts[]` | `{ id, merchant, name, date, total_cents, status }`; `total_cents` pode ser nulo; `status` é `ReceiptStatus` (CONFIRMED, REVIEW_REQUIRED, COMPLETED, RECEIVED, VALIDATING, EXTRACTING) | lista vazia | «Últimas compras» |
| `empty` | booleano | — | `true`: conta sem nenhuma compra confirmada → estado final com cartões tracejados |

## Estado de apresentação (não vem da API)

| Entidade | Campos | Origem |
|---|---|---|
| Mês mostrado | `YYYY-MM` | parâmetro `mes` do URL; por omissão ou inválido, o mês corrente de Lisboa (`lib/month.ts`) |
| Vista do anel (`RingView`) | `tone` (`ok` \| `warn` \| `alert` \| `none`), `label`, `balanceText`, `dash`, `ariaLabel` | função pura de `band`, `goal_cents`, `goal_pct`, `spent_cents` e de o mês ser o corrente ou um passado («Meta atual») |
| Vista da média (`AverageView`) | `tone` (`good` \| `neutral` \| `high` \| `none`), `text` | função pura de `monthly_average_cents`, `recent_vs_average_pct`, `average_trend`, `average_months`, `average_min_months` |

## Regras de apresentação

- `RingView` não decide a faixa: usa `band`. Escolhe o texto «acima da meta» pelo sinal de `goal_cents − spent_cents` (inteiros), não por `goal_pct`.
- Traço do anel: `min(goal_pct, 100)` de 100 do perímetro; sem meta, tracejado fixo.
- Mês que não é o corrente: junta-se a nota «Meta atual» ao valor da meta (a API devolve sempre a meta de hoje).
- `AverageView.tone` vem de `average_trend`: `below` → `good`; `above` → `high`; `on_average` → `neutral`. Média presente e `average_trend` nulo → `neutral` com «Tendência: ainda sem meses suficientes». Sem média → `none`. O cliente não aplica limiares.
- A média e a tendência não dependem de `month`: o cartão é igual em todos os meses.
- Nenhuma percentagem, média, faixa, meta ou média por semana é calculada no cliente. A única conta é o saldo da meta (inteiros).
- Cache de servidor `["overview", month]`; invalidada por `["overview"]` nas mutações (R2); sem `localStorage`.
