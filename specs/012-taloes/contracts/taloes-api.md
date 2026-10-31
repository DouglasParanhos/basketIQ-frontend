# Contrato consumido: Talões (012)

Fonte: `../basketIQ-backend/openapi.json` (commit `4e327d4`, `GET /openapi.json` da API em execução a 2026-10-31) e `../basketIQ-backend/specs/014-visao-geral-inicio/contracts/api.md`. Todos os pedidos exigem sessão e consentimento (401 e 403 `privacy_consent_required` tratados globalmente, como hoje). Dinheiro em cêntimos inteiros.

Tudo o que está abaixo **está publicado**; nada é proposto ao backend nesta spec. O que a spec desejaria e a API não tem está em «Em falta (sem pergunta ao backend)».

## Pedidos

| Pedido | Parâmetros | Resposta | Usado por |
|---|---|---|---|
| `GET /v1/analytics/months` | nenhum | `MonthTotalOut[]` | cabeçalhos do mês (Compras), opções do ano |
| `GET /v1/receipts` | `status[]`, `merchant`, `cursor`, `limit` (1 a 100, defeito 20) | `ReceiptPage { items: ReceiptSummaryOut[], next_cursor }` | lista de Compras; contador «Requer ação» |
| `GET /v1/products` | `q` (≤ 100), `limit` (1 a 100, defeito 30) | `ProductSearchItem[]` | lista de Produtos |
| `GET /v1/products/{product_id}/analytics` | `from`, `to`, `merchant` (todos opcionais) | `ProductAnalyticsOut` | detalhe do produto |
| `GET /v1/analytics/summary` | `from`, `to`, `merchant`, `product_id` | `SummaryOut` | Resumo (sem mudanças) |
| `GET /v1/analytics/consumption` | `from`, `to`, `merchant`, `limit` | `ConsumptionOut` | Resumo, «Consumo habitual» (sem mudanças) |

Pedidos de escrita já usados e que só ganham invalidação de cache: `DELETE /v1/receipts/{id}`, `POST /v1/receipts/{id}/duplicate-decision`, `PATCH`/`POST …/confirm` (revisão) e `POST …/process` (envio).

## Campos

```text
MonthTotalOut        { month: "YYYY-MM", confirmed_count: int, total_cents: int }

ReceiptSummaryOut    { id, status: ReceiptStatus, merchant: str|null, merchant_name: str|null,
                       store_label: str|null, purchase_at: datetime|null, total_cents: int|null,
                       line_count: int, overall_confidence: number|null, needs_action: bool,
                       created_at: datetime }

ProductSearchItem    { id, name, unit_type: str|null, lines: int, spent_cents: int,
                       last_purchase_at: str|null,
                       avg_price_cents: int|null,        # ponderado por quantidade, na base price_basis
                       price_basis: "un"|"kg"|"l",
                       purchases: int,                   # compras distintas
                       merchants: int }                  # mercados distintos

ProductAnalyticsOut  { product: {id, name, unit_type}, price_basis, mixed_units: bool,
                       total_quantity: str, total_spent_cents: int,
                       avg_price_cents: int|null, min_price_cents: int|null, max_price_cents: int|null,
                       purchases: int, history: PricePoint[], by_merchant: MerchantPrice[],
                       insufficient_data: bool }
PricePoint           { receipt_id, date: str|null, merchant: str|null, quantity: str|null, unit: str|null,
                       unit_price_cents: int|null, price_basis, net_cents: int, raw_description: str }
MerchantPrice        { merchant: str, purchases: int, avg_price_cents: int|null, min_price_cents: int|null,
                       max_price_cents: int|null, last_price_cents: int|null, last_date: str|null }
```

## Regras de contrato que o ecrã usa

1. `months`: só meses com compras **confirmadas** e com `purchase_at`, mês de Lisboa (a mesma definição do Início), do mais recente para o mais antigo. Mês sem confirmadas não aparece.
2. `receipts` ordena por **`created_at` decrescente** (data de envio), não por data de compra; o cursor é opaco.
3. `needs_action` é verdadeiro em `REVIEW_REQUIRED`, `COMPLETED` e nos estados de erro; falso em `RECEIVED`, `VALIDATING`, `EXTRACTING` e `CONFIRMED`. O selo da linha deriva do `status`, não deste campo (research R5).
4. `products`: `avg_price_cents` pode ser nulo (sem unidade ou preço conhecidos); o ecrã não mostra preço nesse caso.
5. `by_merchant` vem ordenado por código do mercado e **não traz janela de dias**; usa todo o histórico (a janela de 90 dias e o mínimo de 3 compras do passo C não estão aqui).
6. `PricePoint.raw_description` é a descrição guardada da linha; editar uma linha numa revisão pode alterá-la (campo editável no backend), por isso não se afirma que é «a original» (D-T3).

## Em falta (sem pergunta ao backend)

| O que o ecrã gostaria de ter | Como se resolve no cliente | Pergunta |
|---|---|---|
| Parâmetro de ano ou mês em `GET /v1/receipts` | filtro no cliente com páginas até ao ano (R3) | D-T1 |
| Contador de compras que requerem ação | `GET /v1/receipts` com `limit=100` e contar (D-T13) | D-T13 |
| Janela de dias em `by_merchant` | não se escreve (D-T2) | D-T2 |
| Garantia de que `raw_description` é a original | coluna «Descrição original» sem a frase (D-T3) | D-T3 |
| Ordenação de produtos | no cliente, sobre ≤ 100 (D-T4) | D-T4 |
| Preço por mês no detalhe do produto | um ponto por compra (D-T8) | D-T8 |

Estes pontos são do backend se a Liz os quiser resolvidos na origem; **não se tocou no repositório do backend**.
