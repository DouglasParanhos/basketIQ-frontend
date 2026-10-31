# Research: Talões (012)

Fonte dos factos de contrato: `../basketIQ-backend/openapi.json` (commit `4e327d4`) e o OpenAPI da API em execução a 2026-10-31; código do backend lido só para confirmar comportamento (`src/basketiq/api/routers/receipts.py`, `services/analytics.py`). Nada foi alterado no backend.

## R1. Onde vive o título e o seletor de ano

- **Decision**: `TaloesLayout` passa a desenhar o `<h1>Talões</h1>` e, só quando o caminho é `/compras`, o `YearSelect` à direita do título; as abas ficam por baixo. Cada página de aba usa um `<h2>` (visível ou só para leitores de ecrã) em vez do `<h1>` atual (`PageHeader` em Compras e Produtos, `sr-only` no Resumo).
- **Rationale**: o desenho tem o título e o ano numa só linha e partilhada pelas três abas; o layout já conhece o caminho. Uma página com dois `h1` falharia o axe e confundiria a navegação por títulos.
- **Alternatives**: o seletor dentro da página de Compras (muda o sítio do desenho; evita acoplar o layout ao caminho); portal do React (complexidade sem ganho).
- **Impacto em testes**: `TaloesLayout.test.tsx` e `routes.test.tsx` (F-97) passam a verificar o `h1`; ver R10.

## R2. Totais por mês

- **Decision**: `useMonths()` faz `GET /v1/analytics/months` com a chave `["months"]`. Devolve `MonthTotalOut[]` (`month` «AAAA-MM», `confirmed_count`, `total_cents`), só meses com compras confirmadas e com data de compra, do mais recente para o mais antigo (confirmado em `services/analytics.py: month_totals`: estado `CONFIRMED`, `purchase_at` não nulo, mês de Lisboa).
- **Rationale**: é o que o plano e a spec 014 do backend pedem; evita somar a lista carregada (paginada).
- **Consequência**: uma compra confirmada sem `purchase_at` não entra em nenhum total (não deve existir) e uma compra em processamento nunca entra.
- **Falha do pedido**: a lista aparece sem totais (só o nome do mês); sem erro bloqueante (Edge Cases).

> **Emenda de 2026-10-31:** o carregamento automático até ao ano (A1) foi **retirado** e o ano por defeito é o do primeiro item da lista (D-T14, decidido pela Liz); ver as «Emendas» em `spec.md` e em `tasks.md`.

## R3. Ano: a API ordena por data de envio, não por data da compra

- **Facto verificado**: `GET /v1/receipts` ordena por `created_at` decrescente (`order_by(Receipt.created_at.desc(), Receipt.id.desc())`), tem cursor, `status`, `merchant` e `limit` (máx. 100), e **nenhum** parâmetro de mês ou ano.
- **Decision (D-T1, implementação)**: o ano é um filtro de **vista**: a chave da cache fica `["receipts", filtro]` (o ano não entra) e a página filtra os itens carregados pelo ano da compra (`purchase_at`, ou `created_at` se faltar). Para chegar a um ano antigo, um efeito pede a página seguinte enquanto `hasNextPage` e o **ano de envio** do último item carregado for ≥ ao ano escolhido.
- **Rationale**: um talão enviado em 2026 pode ser de 2025, mas nunca ao contrário; por isso, enquanto o último item carregado foi enviado em ano ≥ ao escolhido, ainda pode haver itens desse ano por carregar. Parar quando o último foi enviado antes do ano escolhido é seguro. Uma cache por ano repetiria pedidos.
- **Alternatives**: parâmetro de ano em `GET /v1/receipts` (a solução certa; é do backend e não se toca); retirar o seletor (D-T1, alternativa).
- **Consequência para a ordem**: como a API ordena por envio, a página reordena os itens carregados pela data da compra antes de agrupar por mês; ao carregar mais, uma compra de um mês já mostrado pode aparecer num grupo anterior (a posição das linhas muda). É inerente a ordenar no cliente uma lista paginada por outro critério.
- **Por confirmar (D-T14)**: ano por defeito. Proposta: o ano corrente; se `months` não tem esse ano mas tem outros, o mais recente com compras (evita a primeira vista vazia). O ano por defeito não se escreve no URL; `?ano=2025` sim.
- **Por confirmar (D-T15)**: em «Requer ação» o ano **não** se aplica (lista de todos os anos), porque o N do chip é global e a lista tem de bater com ele.

## R4. Cabeçalho do mês e agrupamento

- **Decision**: módulo puro `months.ts`: `monthKey(receipt)` («AAAA-MM» em Lisboa, pela data da compra ou de envio), `groupByMonth(items)` (itens ordenados por data decrescente, grupos por mês) e `headerText(group, totals, filtro)` conforme D-T7: com o filtro «Todas» ou «Confirmadas» e o mês em `months` → «Outubro 2026 · 7 confirmados · € 248» (`1 confirmado` no singular); caso contrário só o nome do mês.
- **Rationale**: lógica pura testável com datas de fronteira (compra às 00:30 de 1 de novembro conta em novembro, F-18 e regra 2 do contrato); o texto do contador respeita o singular.
- **Alternatives**: agrupar na API (não existe).

## R5. Estados da compra: `needs_action` não chega

- **Facto verificado**: `needs_action` é verdadeiro para `REVIEW_REQUIRED`, `COMPLETED` **e todos os estados de erro** (`needs_action=r.processing_status in (*EDITABLE_STATUSES, *ERROR_STATUSES)`); é falso para `RECEIVED`, `VALIDATING`, `EXTRACTING` e `CONFIRMED`.
- **Decision**: o estado visual da linha deriva do `status` (já tipado): `ATTENTION` = `REVIEW_REQUIRED` e `COMPLETED` → emblema «!» dourado e «rever valores»; `IN_PROGRESS` = `RECEIVED`, `VALIDATING`, `EXTRACTING` → emblema «…», «a ler o talão…» e total «—»; os cinco estados de erro → o texto do estado atual (`STATUS[status].label`) com ícone de alerta, sem «rever valores»; `CONFIRMED` → sem selo. `needs_action` não é usado para escolher o selo; **corrige** a premissa da D-T6 e do FR-018 da spec (ver «Correções à spec»).
- **Rationale**: «rever valores» num talão ilegível seria falso; os estados já têm rótulos em `status.ts`.
- **Por confirmar (D-T17)**: o filtro «Requer ação» de hoje inclui `RECEIVED` (que é «em processamento»); mantém-se (a spec pede «como hoje») e esse talão aparece com «…» e conta no N.
- **Contador (D-T13)**: `useQuery` com `GET /v1/receipts?status=<estados do filtro>&limit=100`, chave `["receipts","action-count"]`, N = nº de itens (≤ 99 mostra-se, ≥ 100 «99+»). Atualiza-se com a mesma sondagem de 3 s enquanto houver itens em processamento e quando as compras se invalidam (prefixo `["receipts"]`).

## R6. Compras: emblema, inicial e texto da linha

- **Decision**: `ReceiptRow` mostra o azulejo com a inicial do mercado (`merchantName(...)[0]`, «?» sem mercado) e o emblema por cima (`aria-hidden`); o estado é texto na segunda linha: «29 out. · a ler o talão…», «28 out. · 11 itens · rever valores» (data a negrito e cor de atenção só no estado de atenção), «27 out. · 14 itens»; o total `formatCents` ou «—» em processamento. Mantém `store_label` como hoje (segunda linha pequena) se existir. O nome do mercado vem de `merchantName(code, name)` como hoje.
- **Rationale**: o desenho; sem logótipos (README); o estado nunca só por cor (constituição V).
- **Contagem de itens**: `line_count` (campo existente); «1 item» no singular; sem `line_count` útil (0) omite-se.

## R7. Produtos: lista, ordem, detalhe

- **Decision (lista)**: `GET /v1/products?q=&limit=100`; cada linha: nome, «N compras · M mercados» (`purchases`, `merchants`) e, à direita, o preço médio com a base (`formatCents(avg_price_cents)` + «/kg», «/l» ou «/un.») e «preço médio»; `avg_price_cents` nulo → sem preço (um travessão acessível), nunca inventado. Ordem no cliente (D-T4) por parâmetro `?ordem=` (`compras` por defeito sem escrever, `gasto`, `az`); «A–Z» com `localeCompare("pt-PT")`.
- **Decision (detalhe)**: mantém `GET /v1/products/{id}/analytics`; blocos: preço médio com base e a nota «Média ponderada pelas quantidades que comprou», três valores (Mínimo, Máximo, Comprou = `total_quantity` formatada), evolução do preço por compra com «Ver como tabela» (a tabela do histórico ganha a coluna «Descrição original», D-T3), «Por mercado, nos seus talões» (`by_merchant`: média e «último», «N compras»; ordem da API; sem etiqueta). Mantém a nota de `mixed_units` e de `insufficient_data`.
- **Facto verificado**: `by_merchant` vem ordenado por código do mercado (`sorted(per_merchant.items())`), sem janela; `avg_price_cents` por mercado é média ponderada calculada pelo backend.
- **Rationale**: constituição II e III; sem ranking (README, D12).

## R8. Invalidação de totais e partilha com a spec 011

- **Facto**: os quatro pontos onde uma compra muda de estado ou desaparece são os da T035 a T037 da spec 011: apagar a compra (`ReceiptPage`), decidir um duplicado (`DuplicateChoice`), editar e confirmar (`ReviewEditor.refresh`) e terminar o envio (`useUpload`). Eliminar **só o original** não muda totais nem estados e já invalida `["receipts"]`; fica fora (a pergunta mencionava-o: ver nota na T-tarefa).
- **Decision (D-T16, por confirmar)**: em vez de repetir três `invalidateQueries` em quatro sítios (e a spec 011 a repetir outras), um auxiliar `invalidateReceiptData(qc)` em `features/receipts/cache.ts` invalida `["receipts"]`, `["months"]` e `["overview"]` (invalidar uma chave sem consultas é inofensivo). Quem implementar primeiro cria o auxiliar; a T035 a T037 da 011 reduzem-se a verificar o teste.
- **Alternativa**: cada spec acrescenta a sua chave nos mesmos quatro sítios (mais duplicação, nenhuma dependência entre specs).
- **O que muda no `useUpload`**: só o fim do envio: depois de `process`, em vez de `invalidateQueries(["receipts"])`, chama o auxiliar (linha 109 hoje). Mais nada: o fluxo, o idempotency key e a retoma mantêm-se.

## R9. Resumo: o que muda

- **Decision**: só apresentação: o título do ecrã passa a `h2` só para leitores de ecrã; a saudação sai (D-T10); o cartão «GASTO EM MERCADO · N TALÕES» junta o total, a variação em etiqueta (`formatVariation` + «face a …», texto atual) e «Ver como tabela» (o `DataTable` existente, já recolhido); o gráfico mantém o gasto por dia ou mês (D-T9); «Por mercado» mantém barras com a percentagem em texto; «Mais gasto» e «Mais comprados» lado a lado ≥ 640 px (hoje `md`); «Consumo habitual» mantém-se. O `PeriodPicker` mantém os quatro tipos e o intervalo; só o desenho muda (pílulas de 44 px).
- **Rationale**: «sem alterar a lógica» (plano Fase 4); os pedidos, o URL e as chaves de cache ficam iguais, por isso os testes F-18, F-19 e F-21 passam com mudanças de seletores, não de valores.
- **«Ver como tabela»**: já existe e já está recolhido (`DataTable` usa `<details>`); não muda.

## R10. Testes existentes e lacunas

- **Existentes a adaptar**: `features.test.tsx` (`dashboard`: F-21, F-19, totais e tabela, consumo, gráfico com poucos dados; e `F-22a`); `routes.test.tsx` (F-97 a F-98: títulos e abas); `TaloesLayout.test.tsx`; `e2e/mock/ui.spec.ts` (`F-99` para `/compras`, `/compras/resumo`, `/produtos`; `F-21`; «chart has a textual alternative»; revisão `/compras/r1`); `e2e/stack/journey.spec.ts` (F-18, F-19, F-20, F-22).
- **Lacuna verificada**: não há testes Vitest da lista de Compras, de Produtos nem do detalhe do produto; o plano diz «passam adaptados» mas aqui são **testes novos** (F-195, F-197), escritos primeiro e vistos falhar.
- **F-22** (apagar compra) só existe no `stack`; a invalidação de `months` testa-se em Vitest (F-195).

## R11. Mocks

- **Decision**: `src/test/server.ts` e `fixtures.ts` ganham `GET /v1/analytics/months`, `ProductSearchItem` com `avg_price_cents`, `price_basis`, `purchases`, `merchants`, e itens de `GET /v1/receipts` com `merchant_name`, `store_label`, `needs_action` por estado; `e2e/mock/api.ts` ganha o mesmo, com compras de meses diferentes, uma em processamento e uma a rever, e um produto sem preço médio. Só dados sintéticos.

## R12. Qualidade

- **Decision**: o axe corre nas três abas e no detalhe, em claro e escuro, a 320 e 820 px (`F-99` existente) e a 375 e 430 px nos novos; o teste de alvos de 44 px cobre os chips, o seletor de ano, as pílulas de período, as linhas e a pesquisa; texto proibido (`mais barato`, `ranking`, `poupou`, `você`) verifica-se como na 014.
- **Alternatives**: só o axe (não apanha o encolher dos botões que a 014 revelou: o teste de 44 px é necessário).

## Correções à spec (encontradas ao planear)

1. **FR-003, FR-018 e D-T6** diziam que o emblema «!» é de `needs_action` e que os estados de erro não o levam. O backend põe `needs_action` verdadeiro também nos erros, por isso a regra passa a ser pelo **estado** (R5). A spec foi corrigida no mesmo passo.
2. A spec dizia que a lista é «cronológica»; é por **data de envio** (R3): o agrupamento por mês reordena no cliente.
