# Feature Specification: Talões (Compras, Resumo e Produtos)

**Feature Branch**: `012-taloes`

**Created**: 2026-10-30

**Status**: Especificada em 2026-10-31 (Fase 4 do plano UX v2). **Sem bloqueio de contrato:** o backend 014 já publica `GET /v1/analytics/months` e o `GET /v1/products` enriquecido (verificado no OpenAPI da API em execução a 2026-10-31); o `src/api/schema.d.ts` foi regenerado na spec 011. **Implementada a 2026-10-31** (US1, US2, US3, US5); a US4 (papel de talão) foi implementada a 2026-11-01, com o interruptor «Ver como papel de talão» em Compras (D-T11 decidida).

**Input**: Especificação Funcional v1.4 §8, RF-07, RF-09, RF-10, RF-11, RF-12; `Documentation/Super Mercado_—_Plano_de_Implementação_UX_v2.md` (Fase 4, D2); `Documentation/design-ux-v2/TaloesV2.dc.html` (layout) e `README.md` (textos pt-PT e o que não se implementa). Backend: `../basketIQ-backend/specs/014-visao-geral-inicio` (US4 totais por mês, US5 produtos; `contracts/api.md`). Specs relacionadas: `004-resumo-analises`, `005-produtos`, `006-definicoes-dados` (eliminar compra e original, reestilizadas aqui), `009-navegacao-5-botoes` (`TaloesLayout`, `SegmentedTabs`).

**Convenção de rastreabilidade**: cada critério cita o RF da Especificação Funcional. Os testes do frontend levam o identificador no nome (`F-xx: …`). Identificadores **F-195 a F-199**, um por história (o backend 014 usa F-176 a F-182, o frontend 011 usa F-183 a F-188 e o 014 usa F-189 a F-194; a 013 usa F-200 a F-205). Os cenários dos totais por mês e do preço médio ponderado são «Verificado no Backend»; aqui verifica-se o que o ecrã mostra, pede e envia.

**Fora desta spec:** o cartão «Mesmo produto, mercados diferentes», a etiqueta «mais barato» e qualquer ordenação ou ranking de mercados (README: «não se implementa»; só depois do passo C, spec 015); a lista inteligente; os preços de outros sites; o gráfico semanal do Início (spec 011). Os mercados mostram-se por texto e inicial, sem logótipos.

## Clarifications

### Session 2026-10-31

Respostas deduzidas dos documentos (plano UX v2, README de design, spec 014 do backend, código atual) e dos factos do OpenAPI da API em execução, dadas sem supervisão. **Todas as D-T são decisões de produto «por confirmar pela Liz»**; vão para `Documentation/ANALISE_spec012_frontend_2026-10-31.md`. Fecham os 3 marcadores de clarificação da especificação (D-T1, D-T2, D-T3).

- Q: Onde aparece o seletor de ano «2026» e o que faz? → A: **D-T1 (por confirmar pela Liz)**: só na aba Compras, no cabeçalho de «Talões», porque só aí tem efeito; o Resumo tem o seu próprio período e os Produtos não são datados, e um controlo que não faz nada não se mostra (FR-006). As opções são os anos de `GET /v1/analytics/months` mais o ano corrente; por defeito, o ano corrente. Filtra no cliente: a lista mostra as compras desse ano (pela data da compra, ou de envio se faltar) e, se a página carregada ainda não chegou ao ano, pede mais páginas até chegar a uma compra mais antiga ou ao fim, com «A carregar…». Alternativa: retirar o seletor na v1 (cada cabeçalho tem o ano); mais simples, mas perde-se o salto a anos antigos. O ideal, que é do backend, seria um parâmetro de ano em `GET /v1/receipts`.
- Q: O bloco «Por mercado» escreve «janela de 90 dias»? → A: **D-T2 (por confirmar pela Liz)**: não. `by_merchant` não traz janela e o `GET /v1/products/{id}/analytics` usa todo o histórico; escrever «90 dias» seria inventar (constituição III). Cada mercado mostra «preço médio que pagou», último preço e «N compras». A janela de 90 dias e o mínimo de 3 compras (D12) chegam com a spec 015, se o contrato os publicar.
- Q: A frase «A descrição original de cada compra fica guardada no histórico» aparece? → A: **D-T3 (por confirmar pela Liz)**: não, por agora. O backend aceita editar `raw_description` numa linha, por isso a frase pode ser falsa. A tabela do histórico ganha a coluna «Descrição original» (o campo existe e a constituição III manda mostrá-lo); a frase só entra se o backend garantir que a original se conserva.
- Q: Como se ordenam os produtos e quantos se pedem? → A: **D-T4 (por confirmar pela Liz)**: no cliente, sobre os produtos devolvidos, sem novo pedido: «Mais comprados» (por defeito, `purchases` decrescente, depois nome), «Mais gastos» (`spent_cents` decrescente) e «A–Z» (nome, ordem do português). O pedido passa de 50 para 100 produtos (máximo da API); com mais de 100, a ordenação é parcial, e a pesquisa por texto continua a ser do servidor e encontra os restantes.
- Q: Que acontece à ligação «Produtos» do cabeçalho de Compras? → A: **D-T5 (por confirmar pela Liz)**: sai. As abas já levam a Produtos (spec 009) e o desenho não a tem.
- Q: Como se mostram os estados de erro e o que conta o filtro «Requer ação»? → A: **D-T6 (por confirmar pela Liz)**: o emblema «!» e «rever valores» são dos estados `REVIEW_REQUIRED` e `COMPLETED` (o campo `needs_action` é verdadeiro também nos erros, por isso não decide o selo); os estados de erro (`INVALID_FORMAT`, `UNREADABLE`, `UNSUPPORTED_MERCHANT`, `TEMPORARY_FAILURE`, `PERMANENT_FAILURE`) mantêm o texto do estado atual (por exemplo «Documento ilegível») com ícone, sem emblema novo; «em processamento» é `RECEIVED`, `VALIDATING` ou `EXTRACTING`. O filtro «Requer ação» mantém os estados de hoje (inclui `RECEIVED` e os erros) e «Confirmadas» só `CONFIRMED`, sem mudar a lógica.
- Q: Que mostra o cabeçalho do mês em cada filtro? → A: **D-T7 (por confirmar pela Liz)**: em «Todas» e «Confirmadas», «Mês Ano · N confirmados · € total» do endpoint de totais quando o mês tem confirmadas; só o nome do mês quando não tem. Em «Requer ação», só o nome do mês (um total de confirmadas por cima de linhas que não o são engana). Se o endpoint falhar, só o nome do mês.
- Q: A evolução do preço é por mês ou por compra? → A: **D-T8 (por confirmar pela Liz)**: por compra, como o gráfico atual (`history`). Agrupar por mês obrigaria a médias no cliente (constituição II e III); os meses do desenho são ilustrativos.
- Q: O Resumo muda o gráfico e o filtro de produto? → A: **D-T9 (por confirmar pela Liz)**: não: mantém o gasto por dia ou por mês da API (as barras semanais do desenho são ilustrativas) e o filtro de produto só a partir dos rankings («Filtrar resumo»), com o chip para o retirar; o «Todos os produtos» do desenho não é um seletor novo.
- Q: A saudação «Olá, nome.» do Resumo fica? → A: **D-T10 (por confirmar pela Liz)**: sai; o desenho não a tem e o título «Talões» é do layout. O Resumo mantém um título de página para leitores de ecrã.
- Q: A lista em papel de talão entra? → A: **D-T11 (por confirmar pela Liz)**: adiada. O desenho mostra-a sem ponto de entrada (sem botão nem aba), e o plano diz que se adia se apertar. Fica US4 (P3) por implementar até a Liz dizer onde se abre (por exemplo, um interruptor «Ver como papel de talão» na aba Compras).
- Q: O ano do seletor e o período do Resumo estão ligados? → A: **D-T12 (por confirmar pela Liz)**: não. O ano só filtra a lista de Compras; o Resumo guarda o período no URL (`periodo`, `de`, `ate`).
- Q: De onde vem o N de «Requer ação · N»? → A: **D-T13 (por confirmar pela Liz)**: a API não tem um contador (nem `needs_action` serve: não cobre `RECEIVED`). Pede-se `GET /v1/receipts?status=…` com os estados do filtro e `limit=100` e conta-se o que vem (sem ano); com mais de 100 mostra «99+». É um pedido a mais na aba, atualizado com a sondagem da lista. Alternativa: tirar o N do chip (só «Requer ação»); mais simples, mas perde-se o aviso do desenho. O ideal, do backend, seria um contador.
- Q: Que ano abre por defeito, e o filtro por ano vale em «Requer ação»? → A: **D-T14 e D-T15 (por confirmar pela Liz, propostas do plano)**: o ano corrente, ou o mais recente com compras se o corrente não tiver nenhuma; em «Requer ação» o ano não se aplica (o N do chip é de todos os anos). A API ordena a lista por data de **envio**, por isso a vista reordena por data da compra e carrega páginas até o último item ter sido enviado antes do ano escolhido (`plan.md`, R3).
- Q: Como se invalida a cache dos totais? → A: **D-T16 (por confirmar pela Liz)**: um auxiliar `invalidateReceiptData(qc)` (`receipts`, `months`, `overview`) nos quatro pontos da spec 011 (apagar compra, decidir duplicado, editar e confirmar, fim do envio) em vez de repetir chamadas; eliminar só o original não altera totais e fica de fora.
- Q: `RECEIVED` fica em «Requer ação»? → A: **D-T17 (por confirmar pela Liz)**: sim, como hoje; aparece com «…» e conta no N.

### Emendas de 2026-10-31 (decisões da Liz e correções do analyze)

A Liz decidiu a 2026-10-31, ao pedir a implementação: **D-T14**: o ano por defeito é o do talão enviado mais recentemente (o primeiro da lista, que a API ordena por envio; o ano de um talão é o da data da compra, ou o do envio se faltar); sem talões, o ano corrente. **D-T15, D-T16 e D-T17 aceites** (D-T16: o auxiliar `invalidateReceiptData` invalida `receipts`, `months` e `overview`; eliminar só o original fica de fora). **A1**: o ano carrega por páginas com «Carregar mais», **sem** carregamento automático (substitui a regra «pedir páginas até chegar ao ano» de D-T1). **D-T1 a D-T13**: adotadas as recomendações desta spec; ficam listadas, com o que se escolheu, em `Documentation/DECISOES_012_para_rever_2026-10-31.md` para a Liz rever. Correções do analyze: o seletor é um `<select>` nativo com a etiqueta «Ano» (B1); o contador do chip refaz-se com a lista (B3); o chip «Requer ação» sem «· 0» quando N é 0 (F1); o rótulo do filtro de mercado do Resumo é «Mercado» com a opção «Todos os mercados» (F2); as datas curtas («28 out.») vêm de `formatDayMonth` (B2).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Aba Compras (Priority: P1)

**Why this priority**: é a lista de trabalho de todos os dias e o sítio onde se vê o que requer ação.

**Independent Test**: componente da lista com API simulada e estados mistos.

**Acceptance Scenarios**:

1. **Given** compras de vários meses, **When** abre a aba, **Then** a lista tem um cabeçalho por mês, por exemplo «Outubro 2026 · 7 confirmados · € 248», com a contagem e o total vindos de `GET /v1/analytics/months`; sem confirmadas no mês, ou no filtro «Requer ação», só o nome do mês. — §8, RF-12, D-T7
2. **Given** os filtros, **When** abre, **Then** vê «Todas», «Requer ação · N» e «Confirmadas», e cada um filtra como hoje (`?filtro=`); o N conta as compras com estado de «Requer ação» (até 99, depois «99+»). — RF-12, D-T6, D-T13
3. **Given** uma compra que requer ação (estado `REVIEW_REQUIRED` ou `COMPLETED`), **When** é listada, **Then** leva o emblema «!» dourado no canto da inicial do mercado e o texto «rever valores», e a data a negrito. — RF-07, §8
4. **Given** uma compra em processamento, **When** é listada, **Then** leva o emblema «…», o texto «a ler o talão…» e o total «—». — §9, §8
5. **Given** os dois estados, **When** são lidos por leitor de ecrã, **Then** o estado é dito por texto e ícone, nunca só por cor. — §8
6. **Given** uma compra confirmada, **When** é tocada, **Then** abre o detalhe `/compras/:id` como hoje. — RF-12
7. **Given** a lista paginada ou filtrada, **When** muda, **Then** a contagem e o total de cada mês vêm de `GET /v1/analytics/months`, nunca do que está carregado; só contam compras confirmadas. — §8, RF-12
8. **Given** o seletor de ano «2026» no cabeçalho de Talões (só nesta aba), **When** é alterado, **Then** a lista mostra as compras já carregadas desse ano (a API não tem parâmetro de ano) e, se ainda não chegou a esse ano, diz-o e oferece «Carregar mais»; as opções são os anos com compras confirmadas, o ano corrente e o ano por defeito. — §8, D-T1, D-T12, A1
9. **Given** eliminar uma compra ou só o original, **When** a pessoa o faz, **Then** continua a funcionar como na spec 006 (`F-22`, `F-22a`), e as caches da lista e dos totais invalidam-se. — F-22, F-22a
10. **Given** compras em processamento, **When** a lista está aberta, **Then** continua a atualizar-se (sondagem de 3 s) e, ao confirmar-se uma, o total do mês atualiza-se. — RF-12

---

### User Story 2 - Aba Resumo (Priority: P1)

O `DashboardPage` atual, reestilizado, sem alterar a lógica nem os pedidos.

**Acceptance Scenarios**:

1. **Given** compras confirmadas, **When** abre a aba, **Then** vê o período (Mês, Trimestre, Ano, Intervalo), os filtros de supermercado e produto, o total com a variação face ao período anterior («23 % abaixo de setembro») e «Ver como tabela». — RF-09, RF-11
2. **Given** o mês de setembro de 2026, **When** é escolhido, **Then** só as compras desse mês entram no total. — F-18
3. **Given** o filtro de supermercado, **When** é alterado, **Then** todos os cartões e gráficos refletem-no. — F-19
4. **Given** uma conta ou período sem dados, **When** abre, **Then** vê o estado vazio com a ação. — F-21, RF-11
5. **Given** o gráfico, **When** usado por leitor de ecrã, **Then** existe a tabela «Gasto por período». — RF-11, §8
6. **Given** os filtros e o período, **When** mudam, **Then** vivem no URL e Voltar funciona. — RF-11
7. **Given** os testes atuais do Resumo, **When** correm adaptados ao novo desenho, **Then** passam sem mudar a lógica. — plano Fase 4
8. **Given** o ecrã, **When** abre, **Then** mantém os blocos que já existem e o desenho também mostra (por supermercado, mais gasto, mais comprados) e o «Consumo habitual», que o desenho não mostra mas não se retira. — RF-09

---

### User Story 3 - Aba Produtos e detalhe (Priority: P1)

**Acceptance Scenarios**:

1. **Given** a aba, **When** abre, **Then** vê a pesquisa «Pesquisar produto» e a lista com, por produto, o preço médio e a base (/kg, /l, /un.), o número de compras e o de mercados («4 compras · 3 mercados»). — RF-10
2. **Given** um produto sem preço médio conhecido (`avg_price_cents` nulo), **When** é listado, **Then** não mostra preço por kg ou l, nem o inventa. — §12.4, constituição III
3. **Given** a lista, **When** a pessoa escolhe «Mais comprados», «Mais gastos» ou «A–Z», **Then** a lista reordena-se no cliente; por defeito, «Mais comprados». — RF-10, D-T4
4. **Given** o detalhe de «Peito de frango», **When** abre, **Then** vê o preço médio por kg, a nota «Média ponderada pelas quantidades que comprou», mínimo, máximo e quantidade comprada. — RF-10, constituição II
5. **Given** o detalhe, **When** abre, **Then** vê a evolução do preço com «Ver como tabela». — RF-10, RF-11, §8
6. **Given** o detalhe, **When** abre, **Then** vê «Por mercado, nos seus talões» com a média e o último preço de cada mercado. — RF-10
7. **Given** esse bloco, **When** abre, **Then** cada mercado mostra o «preço médio que pagou», o último preço e o número de compras, sem assinalar um mercado como «mais barato», sem os ordenar por preço (a ordem é a da API, por código do mercado) e sem escrever uma janela de dias, que a API não fornece. — RF-10, §8, D12, D-T2
8. **Given** o detalhe, **When** abre, **Then** a tabela do histórico mostra a descrição original de cada compra (`raw_description`) e a frase «A descrição original de cada compra fica guardada no histórico» **não** aparece, porque editar uma linha de um talão pode alterar esse campo. — RF-10, constituição III, D-T3
9. **Given** os testes atuais de Produtos, **When** correm adaptados, **Then** passam. — plano Fase 4

---

### User Story 4 - Lista em papel de talão (Priority: P3, opcional)

*Implementada a 2026-11-01 (D-T11): o ponto de entrada é o interruptor «Ver como papel de talão» na aba Compras, guardado no URL (`?vista=papel`).*

**Acceptance Scenarios**:

1. **Given** «Os seus talões», **When** abre, **Then** os talões de um mês aparecem em papel de talão (`.receipt-paper`, Martian Mono) com a mesma informação e os mesmos estados da aba Compras, sem depender da cor («REVER» marcado a amarelo). — §8
2. **Given** essa vista, **When** corre o axe em claro e escuro, **Then** o contraste de texto é pelo menos 4,5:1. — §8, §10
3. **Given** a vista, **When** acaba o mês, **Then** mostra a linha «TOTAL CONFIRMADO» com o total do endpoint de totais. — §8

---

### User Story 5 - Qualidade (Priority: P1)

**Acceptance Scenarios**:

1. **Given** cada aba e o detalhe do produto, **When** corre o axe em claro e escuro de 320 a 820 px, **Then** não há violações. — §8, §10
2. **Given** o selo de atenção, **When** corre o teste novo, **Then** verifica emblema, texto «rever valores» e anúncio por leitor de ecrã. — RF-07, §8
3. **Given** os testes existentes de Compras, Resumo e Produtos, **When** correm, **Then** passam adaptados. — plano Fase 4
4. **Given** os mercados, **When** são mostrados, **Then** usam texto e inicial, sem logótipos. — design-ux-v2/README
5. **Given** o texto da interface, **When** é revisto, **Then** está em português europeu conforme a tabela do `README.md` e não tem «mais barato», «ranking», «poupou» nem «você». — §8
6. **Given** os controlos, **When** são medidos, **Then** têm pelo menos 44 px e não há scroll horizontal a 320 px. — §8
7. **Given** qualquer aba, **When** a pessoa usa só o teclado, **Then** chega a todos os controlos pela ordem visual e o foco é visível. — §8

### Edge Cases

- Mês sem compras confirmadas: o endpoint não o devolve; se tiver talões por rever ou em processamento, o cabeçalho mostra só o nome do mês, sem contagem nem total.
- Compra «só com total»: aparece na lista e fora dos preços por produto.
- Compra de outra conta responde «Compra não encontrada» (SEC).
- Compra sem data de compra (`purchase_at` nulo, ainda em leitura): aparece no mês da data de envio, com o texto «a ler o talão…».
- Falha do endpoint de totais: a lista aparece sem totais nos cabeçalhos (só o nome do mês) e sem erro bloqueante.
- Ano escolhido sem compras: a lista mostra o estado vazio «Nada nesta lista» e o seletor mantém-se.
- Seletor de ano com muitas páginas por carregar: mostra «A carregar…» e permite mudar de ano ou voltar ao corrente sem esperar.
- Produto com várias unidades (`mixed_units`): mantém a nota atual de que algumas compras não entram no preço médio.
- Pesquisa de produtos sem resultados: mantém a mensagem atual.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A aba Compras MUST agrupar as compras por mês (hora de Lisboa, pela data da compra; sem ela, pela data de envio) com o cabeçalho «Mês Ano · N confirmados · € total» a partir de `GET /v1/analytics/months`; os valores MUST ser os do endpoint, em cêntimos inteiros formatados só na apresentação. — US1.1, US1.7, constituição II
- **FR-002**: Os filtros MUST manter-se («Todas», «Requer ação · N», «Confirmadas») e o seu comportamento e o URL `?filtro=` MUST ficar como hoje. — US1.2
- **FR-003**: Cada linha MUST mostrar a inicial do mercado, o nome (ou «Nota em processamento» sem mercado), a data, o número de itens (`line_count`) e o total; uma compra em `REVIEW_REQUIRED` ou `COMPLETED` MUST levar o emblema «!» e o texto «rever valores»; uma compra em processamento (`RECEIVED`, `VALIDATING`, `EXTRACTING`) MUST levar «…», «a ler o talão…» e o total «—». Estados de erro mantêm o texto do estado atual. — US1.3 a US1.5
- **FR-004**: Os estados MUST ser transmitidos por texto e ícone, com o emblema `aria-hidden` e o texto lido pelo leitor de ecrã; nunca só por cor. — US1.5, US5.2
- **FR-005**: A lista MUST continuar a paginar por cursor e a atualizar-se enquanto houver compras em processamento; eliminar uma compra ou o original MUST invalidar as caches de compras e de totais por mês. — US1.9, US1.10
- **FR-006**: O seletor de ano MUST aparecer só na aba Compras, com os anos de `GET /v1/analytics/months`, o ano corrente e o ano por defeito (o do talão enviado mais recentemente), e MUST filtrar no cliente os itens carregados, sem carregamento automático de páginas («Carregar mais»); MUST NOT aparecer onde não tem efeito. — US1.8, D-T1, D-T14, A1
- **FR-007**: A aba Resumo MUST manter os pedidos, o URL (`periodo`, `de`, `ate`, `mercado`, `produto`) e a lógica atuais, mudando só a apresentação segundo o desenho; MUST manter «Consumo habitual», o filtro por produto a partir dos rankings e a tabela alternativa «Gasto por período». — US2
- **FR-008**: A aba Produtos MUST mostrar, por produto, o nome, «N compras · M mercados» e o preço médio com a base (`/kg`, `/l`, `/un.`) a partir de `avg_price_cents` e `price_basis`; com `avg_price_cents` nulo MUST NOT mostrar preço. — US3.1, US3.2
- **FR-009**: A lista de produtos MUST pedir até 100 produtos e poder ordenar-se por «Mais comprados» (por defeito), «Mais gastos» e «A–Z» sem novo pedido à API, sobre os produtos devolvidos. — US3.3, D-T4
- **FR-010**: O detalhe do produto MUST mostrar o preço médio ponderado com a base, a nota «Média ponderada pelas quantidades que comprou», mínimo, máximo e quantidade comprada (`total_quantity`), a evolução do preço com alternativa em tabela e o bloco «Por mercado, nos seus talões». — US3.4 a US3.6
- **FR-011**: O bloco por mercado MUST mostrar «preço médio que pagou», último preço e número de compras de cada mercado, na ordem da API, sem etiqueta nem ordenação por preço; MUST NOT escrever uma janela de dias que a API não fornece. — US3.7
- **FR-012**: O histórico do produto MUST mostrar a descrição original de cada compra (`raw_description`) e MUST NOT afirmar que a original se conserva enquanto o backend o não garantir. — US3.8, constituição III, D-T3
- **FR-013**: As rotas MUST manter-se (`/compras`, `/compras/resumo`, `/produtos`, `/compras/:id`, `/produtos/:id`); o título «Talões» e a barra de abas MUST ser do layout; a ligação «Produtos» do cabeçalho da lista de compras MUST sair (as abas substituem-na). — plano D2, D-T5
- **FR-017**: O chip «Requer ação» MUST mostrar o N pedido a `GET /v1/receipts` com os estados do filtro e `limit=100`, «99+» se houver mais, e atualizar-se com a sondagem da lista. — US1.2, D-T13
- **FR-018**: Os estados de erro MUST manter o texto do estado atual com ícone e MUST NOT levar o emblema «!» nem «rever valores»; o selo deriva do `status`, porque `needs_action` é verdadeiro também nos erros. — US1.3, D-T6
- **FR-014**: Todo o texto MUST estar em português europeu conforme a tabela do `README.md`; os mercados MUST aparecer por texto e inicial; alvos ≥ 44 px; sem scroll horizontal a 320 px. — US5
- **FR-015**: O cliente MUST usar só os campos que o contrato publica e MUST NOT calcular totais, médias nem preços em `number`. — constituição II, III, VI
- **FR-016**: Nada de compras nem de produtos MUST ficar em `localStorage` nem `sessionStorage`. — constituição IV

### Key Entities

- **Total do mês** (`MonthTotalOut`): `month` («AAAA-MM»), `confirmed_count`, `total_cents`; só meses com compras confirmadas, do mais recente para o mais antigo.
- **Compra na lista** (`ReceiptSummaryOut`): `id`, `status`, `merchant`, `merchant_name`, `store_label`, `purchase_at`, `total_cents`, `line_count`, `needs_action` (não decide o selo), `created_at`.
- **Produto na lista** (`ProductSearchItem`): `id`, `name`, `unit_type`, `lines`, `spent_cents`, `last_purchase_at`, `avg_price_cents`, `price_basis`, `purchases`, `merchants`.
- **Produto em detalhe** (`ProductAnalyticsOut`): preço médio, mínimo, máximo, quantidade, `history` (`PricePoint` com `raw_description`), `by_merchant` (`MerchantPrice`: `purchases`, `avg_price_cents`, `min_price_cents`, `max_price_cents`, `last_price_cents`, `last_date`), `mixed_units`, `insufficient_data`.
- **Estado visual da compra**: atenção (`REVIEW_REQUIRED`, `COMPLETED`), em processamento (`RECEIVED`, `VALIDATING`, `EXTRACTING`), confirmada, erro; deriva do `status` da API, sem estado novo no cliente.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100 % das compras listadas, o estado «requer ação» ou «em processamento» é dito por texto e ícone, sem depender da cor (F-195).
- **SC-002**: O total e a contagem de cada mês são os do endpoint de totais mesmo com a lista a meio da paginação ou filtrada (F-195).
- **SC-003**: Uma pessoa encontra a compra que requer ação e abre-a em no máximo 2 toques a partir de Talões («Requer ação», compra) (F-195).
- **SC-004**: O Resumo conserva os resultados atuais: os testes de F-18, F-19 e F-21 passam adaptados ao novo desenho sem alterar as asserções de valores (F-196).
- **SC-005**: Nenhum produto sem preço médio conhecido mostra preço por kg ou l; nenhum mercado aparece com «mais barato» nem ordenado por preço (F-197).
- **SC-006**: Zero violações do axe em cada aba e no detalhe do produto, em claro e escuro, a 320, 375, 430 e 820 px, sem scroll horizontal a 320 px (F-199).
- **SC-007**: Os testes existentes de Compras, Resumo, Produtos, eliminar compra (F-22) e original (F-22a) passam adaptados; `lint`, `typecheck`, Vitest e `e2e:mock` passam (F-199).

## Assumptions

- Depende da spec 009 (rotas e abas, `TaloesLayout`) e da spec 014 do backend (totais por mês e produtos enriquecidos), **já enviada**; os tipos entram com `gen:api` (primeira tarefa).
- As escolhas de produto estão em Clarifications (D-T1 a D-T13), todas por confirmar pela Liz; esta lista só resume o que delas depende. A lista de produtos pede 100 produtos e ordena no cliente (D-T4); a evolução do preço mantém um ponto por compra (D-T8); o gráfico do Resumo mantém o gasto por dia ou mês da API e o filtro de produto vem dos rankings (D-T9); a saudação «Olá, nome.» sai (D-T10); a lista em papel de talão não se implementa (D-T11).
- O desenho mostra o seletor de ano nas três abas e barras semanais no Resumo; aqui só se segue o que a API e a lógica atuais suportam (D-T1, D-T9).
- Os pedidos novos desta spec são `GET /v1/analytics/months` (totais) e, no chip «Requer ação», um `GET /v1/receipts` com `limit=100` (D-T13); o resto reutiliza os pedidos atuais.
- **Identificadores de teste:** F-195 a F-199; F-200 a F-205 são da spec 013; `traceability.py` do backend não muda.

## Identificadores de teste (constituição VII)

| ID | O que verifica | Critérios | Tarefas |
|---|---|---|---|
| F-195 | Compras: cabeçalho por mês com totais do endpoint, filtros, selos «!» e «…», estados por texto e ícone, eliminar | US1.1 a US1.10 | por definir em `/speckit-tasks` |
| F-196 | Resumo: reestilizado, mesmos valores, URL, tabela alternativa, estado vazio | US2.1 a US2.8 | por definir |
| F-197 | Produtos: lista com preço médio e contagens, ordenação, detalhe, por mercado sem ranking, descrição original | US3.1 a US3.9 | por definir |
| F-198 | Lista em papel de talão (interruptor em Compras) | US4.1 a US4.3 | `ReceiptPaper.test.tsx` e axe em `e2e/mock` |
| F-199 | Qualidade: axe, larguras, texto pt-PT, mercados sem logótipos, alvos, teclado | US5.1 a US5.7 | por definir |
