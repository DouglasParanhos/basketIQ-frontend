# Textos: Talões (012), português europeu

Fonte: `Documentation/design-ux-v2/TaloesV2.dc.html` com a tabela «protótipo → produto» do `README.md` aplicada. Sem «você», «a gente», «mais barato», «ranking», «poupou», «orçamento». Valores em euros com `formatCents` («€ 248» no desenho; o produto usa o formato pt-PT já existente, por exemplo «248,00 €»).

## Layout

| Onde | Texto |
|---|---|
| Título | Talões |
| Abas (`aria-label` do grupo «Talões») | Compras · Resumo · Produtos |
| Seletor de ano (`aria-label`) | Ano |

## Compras

| Onde | Texto |
|---|---|
| Filtros (grupo «Filtrar compras») | Todas · Requer ação · N · Confirmadas (com N ≥ 100: «99+») |
| Cabeçalho do mês, com confirmadas | `Outubro 2026 · 7 confirmados · 248,00 €` (singular: «1 confirmado») |
| Cabeçalho do mês, sem confirmadas | `Outubro 2026` |
| Linha de atenção | `28 out. · 11 itens · rever valores` (data a negrito) |
| Linha em processamento | `29 out. · a ler o talão…`, total «—» |
| Linha confirmada | `27 out. · 14 itens` (singular: «1 item») |
| Linha com erro | rótulo do estado de `status.ts` (por exemplo «Documento ilegível») com ícone |
| Sem mercado lido | «Nota em processamento» (como hoje) |
| Texto lido só por leitor de ecrã (atenção) | «Requer ação: rever valores» |
| Texto lido só por leitor de ecrã (processamento) | «A ler o talão» |
| Vazio, «Todas» | «Ainda não há compras» / «Fotografe uma nota ou envie o PDF da fatura para começar.» / ação «Adicionar a primeira nota» |
| Vazio, filtro ou ano | «Nada nesta lista» / «Não há compras com este estado.» (ano: «Não há compras neste ano.») |
| Carregar mais | «Carregar mais»; ao carregar até ao ano: «A carregar…» |

## Resumo

Mantém os textos atuais, com estas mudanças de apresentação:

| Onde | Texto |
|---|---|
| Cartão do total | «GASTO EM MERCADO · 7 TALÕES» (rótulo em versaletes via CSS; texto `Gasto em mercado · 7 talões`) |
| Variação | «23 % abaixo de setembro» (etiqueta; texto atual «… face a …» mantém-se para leitores de ecrã) |
| Tabela alternativa | «Ver como tabela» (já existe, recolhida; abre «Gasto por período») |
| Períodos (grupo «Período») | Mês · Trimestre · Ano · Intervalo |
| Setas do período | «Período anterior» · «Período seguinte» |
| Filtros | «Todos os mercados» (hoje «Todos» em «Supermercado») · chip do produto com «Remover filtro do produto …» |
| Blocos | «Por mercado» (hoje «Por supermercado») · «Mais gasto» · «Mais comprados» · «Consumo habitual» |
| Rodapé | «Só entram no resumo as compras confirmadas. Produtos vendidos ao peso contam como uma unidade.» |

## Produtos

| Onde | Texto |
|---|---|
| Pesquisa (`label`) | Pesquisar produto |
| Ordem (grupo «Ordenar produtos») | Mais comprados · Mais gastos · A–Z |
| Linha | `Peito de frango` / `4 compras · 3 mercados` (singular: «1 compra», «1 mercado») / `5,52 € /kg` + «preço médio» |
| Base do preço | `/kg` · `/l` · `/un.` |
| Sem preço médio | travessão «—» com texto só para leitores de ecrã «sem preço médio» |
| Vazio | «Os produtos aparecem aqui depois de confirmar compras.» / «Nenhum produto com “q” nas compras confirmadas.» |

## Detalhe do produto

| Onde | Texto |
|---|---|
| Botão | «Voltar aos produtos» |
| Rótulo | «Preço médio por kg» (ou «por litro», «por unidade») |
| Nota | «Média ponderada pelas quantidades que comprou» |
| Valores | Mínimo · Máximo · Comprou (`total_quantity` com unidade) |
| Evolução | «Evolução do preço» / «Ver como tabela» / tabela «Histórico de compras» com «Data · Supermercado · Descrição original · Quantidade · Preço · Pago» |
| Pouco histórico | «É preciso comprar este produto mais vezes para ver a evolução do preço.» |
| Por mercado | «Por mercado, nos seus talões» / `Lidl` `4,99 €` «· último 4,99 €» / «3 compras» |
| Várias unidades | «Algumas compras usam outra unidade e não entram no preço médio.» |

**Não aparece:** «mais barato», qualquer etiqueta ou ordem por preço entre mercados, «A descrição original de cada compra fica guardada no histórico» (D-T3), «últimos 90 dias» (D-T2).

## Seletor de ano

| Onde | Texto |
|---|---|
| Botão | `2026` com seta; lista de anos disponíveis |
| Ano sem compras | «Não há compras neste ano.» |
