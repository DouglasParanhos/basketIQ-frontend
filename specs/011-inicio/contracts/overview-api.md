# Contrato consumido: visão geral do mês

Fontes: `../basketIQ-backend/specs/014-visao-geral-inicio/spec.md` e, desde a tarde de 2026-10-31, `contracts/api.md` e `research.md` da mesma pasta (commit `ff3a090` do backend), mais a decisão da Liz de 2026-10-31 sobre a Q7. **Continua a não haver OpenAPI nem `schema.d.ts` para esta chamada** (verificado: `src/api/schema.d.ts` só tem `summary`, `consumption` e a análise por produto). O que está abaixo é o contrato **escrito** do backend, não os tipos gerados: a T001 continua a ser o portão. Nada do que falta foi inventado.

## Chamada

| | |
|---|---|
| Pedido | `GET /v1/analytics/overview?month=YYYY-MM` |
| `month` | `YYYY-MM`; inválido → 422 `validation_error` com `field_errors` em `month`; ausente → mês corrente de Lisboa; futuro → 200 com zeros. O cliente envia sempre `month` |
| Autenticação | sessão; 401 tratado globalmente (`sessionLost`); só os dados da própria conta |
| Consentimento | 403 `privacy_consent_required` como nos outros endpoints |
| Cache no cliente | `["overview", month]`, `staleTime` 30 s; invalidada pelas mutações (R2); nada em `localStorage`; o service worker não guarda `/v1/**` |

## Esquema (backend 014, `contracts/api.md`)

Valores monetários em cêntimos inteiros; percentagens inteiras. Só entram compras confirmadas do próprio utilizador no gasto.

| Campo | Tipo | Nulo/vazio quando | Uso no Início |
|---|---|---|---|
| `month` | `YYYY-MM` | nunca | o mês devolvido (o cliente já o conhece) |
| `spent_cents` | inteiro | nunca (0 em mês sem compras) | gasto do mês |
| `goal_cents` | inteiro ou nulo | sem meta. **É a meta atual do perfil**: um mês passado usa a meta de hoje (C8) | «A sua meta pessoal: …» |
| `goal_pct` | inteiro ou nulo | sem meta; pode passar de 100 | número no anel, tal como vem |
| `band` | `ok` \| `attention` \| `high` \| `none` | `none` = sem meta | faixa e texto; nunca recalculada |
| `monthly_average_cents` | inteiro ou nulo | menos de `average_min_months` meses completos com compras | cartão da média |
| `recent_vs_average_pct` | inteiro com sinal ou nulo | negativo = abaixo da média; **nulo com menos de 3 meses**, mesmo havendo média | número da tendência (valor absoluto no texto) |
| `average_trend` | `below` \| `on_average` \| `above` ou nulo | nulo quando a tendência é nula | tom e palavra do cartão («abaixo», «na média», «acima») |
| `average_months` | inteiro | — | meses com dados («0/2 meses») |
| `average_min_months` | inteiro | — | o «2» de «Aparece com 2 meses de histórico» |
| `purchases_this_month`, `purchases_last_month` | inteiros | — | «Compras no mês» e «Mês anterior» (compras confirmadas do mês pedido e do mês civil anterior) |
| `weeks[]` | `WeekOut` | — | gasto por semana |
| `by_merchant[]` | `MerchantShareOut` | lista vazia com gasto 0 | «Onde gasta mais» |
| `recent_receipts[]` | `RecentReceiptOut` + `status` (ver abaixo) | — | «Últimas compras» |
| `empty` | booleano | — | `true`: a conta não tem nenhuma compra confirmada em qualquer mês |

Itens:

| Tipo | Campos | Notas |
|---|---|---|
| `WeekOut` | `index` (1 a 5), `from`, `to` (datas de Lisboa, inclusivas), `spent_cents` | blocos de 7 dias desde o dia 1 (1–7, 8–14, 15–21, 22–28, 29–fim); mês de 28 dias tem 4; soma = `spent_cents`; semanas sem compras a 0; a última pode ter 1 a 3 dias |
| `MerchantShareOut` | `merchant` (código ou nulo), `name`, `spent_cents`, `purchases`, `share_pct` | ordem do gasto decrescente (desempate pelo nome); `share_pct` soma 100 (maior resto); `merchant` nulo = loja sem leitor próprio, com `name` da compra ou «Outros» |
| `RecentReceiptOut` | `id` (uuid), `merchant`, `name`, `date`, `total_cents` (inteiro ou nulo) + **`status`** | até 5, da mais recente. Ver a Q7 abaixo |

O gasto do Início usa o total da compra (ou a soma líquida das linhas se o total faltar); pode diferir em cêntimos do Resumo, que soma linhas (backend R1). O saldo da meta não vem da API: `goal_cents − spent_cents` no cliente (C4).

## Q7: últimas compras com estado (decisão de 2026-10-31)

A Liz decidiu que as últimas compras trazem também as que **requerem revisão** ou **estão em processamento**, com um campo `status`. O `contracts/api.md` e o `research.md` (R9) do backend ainda dizem «só confirmadas, sem estado»: estão desatualizados em relação a esta decisão. Até o backend o atualizar e o OpenAPI o publicar, **não se assumem** os valores de `status`.

| # | Pergunta | Bloqueia |
|---|---|---|
| C12 | Valores de `status` (nomes e significado: confirmada, requer revisão, em processamento, ...) e se vem como enum no OpenAPI | texto e ícone do estado (US4.6), tipos |
| C13 | As cinco são as mais recentes **do mês pedido** ou as mais recentes da conta? As não confirmadas têm `date` e `total_cents` (podem ser nulos)? | US4.4, «—» no total |
| C14 | Para onde leva uma compra não confirmada: `/compras/:id` serve todos os estados, ou as que requerem revisão vão à revisão? | ligação (`routes.md`) |

Regra do cliente enquanto isto não está fechado: uma compra não confirmada **nunca** entra em valores do ecrã além da sua linha («—» no total se for nulo); o gasto, as semanas e os mercados são só de confirmadas (backend US1.14).

## Respostas do backend e o que sobra

| # | Pergunta original | Resposta (backend 014, `contracts/api.md`) | Estado |
|---|---|---|---|
| C1 | meses com dados e mínimo | `average_months` e `average_min_months` | respondida |
| C2 | sinal de `recent_vs_average_pct` | negativo = abaixo; inteiro, meio para cima | respondida |
| C3 | quem decide «na média» | `average_trend`, limiar `AVERAGE_ON_TARGET_PCT` (5) | respondida (D-P12) |
| C4 | saldo da meta | não vem da API: subtração no cliente | respondida |
| C5 | forma de `weeks[]` | `WeekOut` (blocos de 7 dias) | respondida; **a média por semana não vem na API** (C15) |
| C6 | forma de `by_merchant[]` | `MerchantShareOut` | respondida |
| C7 | forma de `recent_receipts[]` | `RecentReceiptOut`; a Q7 mudou: com `status` | **parcial** (C12 a C14) |
| C8 | meta de meses passados | a meta atual, sempre | respondida; o ecrã diz «Meta atual» nos meses passados (D-P7) |
| C9 | `month` explícito | aceite e devolvido | respondida |
| C10 | nomes e nulos finais no OpenAPI | — | **aberta**: confirmar com `gen:api` (T001) |
| C11 | média e tendência dependem de `month`? | **não**: são sobre os meses completos anteriores ao mês corrente de Lisboa, seja qual for o `month` (R4) | respondida; o cartão é igual em todos os meses |
| C15 | média por semana | não vem; o cliente não a calcula (constituição III) | **aberta**: pedir `weekly_average_cents` ou aceitar que o ecrã não a mostra (D-P14) |
| C16 | tendência nula com média presente (2 meses) | `recent_vs_average_pct` e `average_trend` nulos, `average_months` = 2; a regra «3 meses» não está exposta | **aberta**: o texto do cartão não pode citar o número (D-P13) |

**Estado de bloqueio:** a implementação só começa com `overview` publicado no OpenAPI (T001), C10 confirmada com os tipos gerados e C12 a C14 respondidas. C15 e C16 têm resposta provisória (copy.md).

## Erros

| Resposta | O que a pessoa vê | O que acontece |
|---|---|---|
| rede ou 5xx | «Não foi possível carregar o Início.» + «Tentar de novo» | sem valores antigos; repetir lê de novo |
| 401 | tratado globalmente | — |
| 403 `privacy_consent_required` | o consentimento trata-o antes (RequireSession) | — |
| 422 (`month` inválido) | não acontece: o cliente valida o URL e envia sempre um mês válido | — |

## Identificadores de teste do backend

O backend 014 usa **F-176 a F-182**. Os cenários de cálculo das faixas, da média, das semanas, dos mercados e do isolamento são «Verificado no Backend». Os testes desta spec (F-183 a F-188) verificam o que o ecrã mostra com respostas simuladas.
