# Data Model: Talões (012)

Sem armazenamento local. Os tipos vêm de `src/api/schema.d.ts` (regenerado na T001); abaixo só o que a interface deriva.

## Entidades da API (consumidas)

| Entidade (`Schemas[...]`) | Campos usados | Notas |
|---|---|---|
| `MonthTotalOut` | `month` («AAAA-MM»), `confirmed_count`, `total_cents` | só meses com confirmadas e `purchase_at`; mais recente primeiro |
| `ReceiptSummaryOut` | `id`, `status`, `merchant`, `merchant_name`, `store_label`, `purchase_at`, `total_cents`, `line_count`, `created_at` | `needs_action` existe mas **não** decide o selo (R5) |
| `ProductSearchItem` | `id`, `name`, `unit_type`, `lines`, `spent_cents`, `last_purchase_at`, `avg_price_cents`, `price_basis` («un», «kg», «l»), `purchases`, `merchants` | `avg_price_cents` pode ser nulo |
| `ProductAnalyticsOut` | `product`, `price_basis`, `mixed_units`, `total_quantity`, `avg_price_cents`, `min_price_cents`, `max_price_cents`, `purchases`, `history[]`, `by_merchant[]`, `insufficient_data` | sem janela de dias |
| `PricePoint` | `receipt_id`, `date`, `merchant`, `quantity`, `unit`, `unit_price_cents`, `price_basis`, `net_cents`, `raw_description` | um por linha comprada |
| `MerchantPrice` | `merchant`, `purchases`, `avg_price_cents`, `min_price_cents`, `max_price_cents`, `last_price_cents`, `last_date` | ordenado por código do mercado |
| `SummaryOut`, `ConsumptionOut` | como hoje | o Resumo não muda de pedidos |

## Tipos derivados (só apresentação, em `features/receipts/months.ts` e `features/products/`)

### `RowState` (estado visual de uma compra)

`"attention" | "progress" | "error" | "confirmed"`, derivado do `status`:

| `status` | `RowState` | Selo | Texto da linha | Total |
|---|---|---|---|---|
| `REVIEW_REQUIRED`, `COMPLETED` | `attention` | «!» dourado | «N itens · rever valores» | `formatCents` |
| `RECEIVED`, `VALIDATING`, `EXTRACTING` | `progress` | «…» | «a ler o talão…» | «—» |
| `INVALID_FORMAT`, `UNREADABLE`, `UNSUPPORTED_MERCHANT`, `TEMPORARY_FAILURE`, `PERMANENT_FAILURE` | `error` | ícone de alerta | o rótulo do estado (`STATUS[status].label`) | `formatCents` ou «—» se nulo |
| `CONFIRMED` | `confirmed` | nenhum | «N itens» | `formatCents` |

### `MonthGroup`

`{ key: "AAAA-MM", label: "Outubro 2026", rows: ReceiptSummaryOut[] }`: `key` pelo mês de Lisboa da data da compra (`purchase_at`) ou, se faltar, da data de envio (`created_at`); `rows` ordenadas pela mesma data, decrescente.

### Cabeçalho do mês

`headerText(group, totals, filtro)`:

- `filtro` «Todas» ou «Confirmadas» e `totals` tem `group.key`: «`label` · `confirmed_count` confirmado(s) · `formatCents(total_cents)`».
- Caso contrário (sem confirmadas no mês, filtro «Requer ação», totais em falta ou com erro): só `label`.

### `YearFilter`

`{ year: number }` lido de `?ano=` (inteiro de 4 dígitos, 2000 a 2099; inválido ignora-se). Opções: `{ ano corrente } ∪ { ano de cada month em months }`, decrescentes, sem repetidos. Ano por defeito: D-T14 (proposta: o corrente; se `months` não tiver o corrente mas tiver outros, o mais recente).

Regras:

- Ano de uma compra = `year(purchase_at ?? created_at)` em Lisboa.
- A vista mostra as compras do ano escolhido, **exceto** no filtro «Requer ação» (D-T15).
- «Carregar até ao ano»: enquanto `hasNextPage` e `year(created_at do último item carregado) >= ano escolhido`, pede a página seguinte; para quando o último item foi enviado antes do ano ou não há mais páginas.

### `ProductSort`

`"compras" | "gasto" | "az"` de `?ordem=` (omisso = `compras`):

| Ordem | Critério |
|---|---|
| `compras` | `purchases` decrescente; empate por nome |
| `gasto` | `spent_cents` decrescente; empate por nome |
| `az` | `name.localeCompare("pt-PT")` |

### Contador «Requer ação»

`N = items.length` do pedido `status=<estados do filtro>&limit=100`; mostra `N` se < 100, senão «99+».

## Chaves da cache

| Chave | Pedido | Invalida em |
|---|---|---|
| `["months"]` | `GET /v1/analytics/months` | apagar compra, duplicado, confirmar/editar, fim do envio (R8) |
| `["receipts", filtro]` | `GET /v1/receipts` (cursor) | como hoje |
| `["receipts","action-count"]` | `GET /v1/receipts?status=…&limit=100` | prefixo `["receipts"]` |
| `["products", q]`, `["product", id]` | como hoje | como hoje |
| `["summary", …]`, `["consumption", …]` | como hoje | como hoje |

## Estados de ecrã

| Ecrã | Carregamento | Vazio | Erro |
|---|---|---|---|
| Compras | spinner | «Ainda não há compras» + «Adicionar a primeira nota»; filtro ou ano sem itens: «Nada nesta lista» | aviso de erro com a mensagem; falha de `months`: sem totais, sem aviso |
| Resumo | spinner | «Sem compras neste período» ou «Comece pela primeira nota» | aviso de erro |
| Produtos | spinner | «Os produtos aparecem aqui depois de confirmar compras.» ou «Nenhum produto com “q”…» | aviso de erro |
| Detalhe | spinner | `insufficient_data`: «É preciso comprar este produto mais vezes para ver a evolução do preço.» | aviso de erro |
