# Textos do Início (português europeu)

> **Atualizado a 04/11/2026.** O desenho aprovado a 03/11 mudou as cores do anel (verde, dourado e dourado; vermelho só acima de 100 %), o texto acima da meta («Acima da meta · X € além da meta»), o rótulo do anel («Gasto no mês») e trocou o token laranja `--color-warn` (D-P3) pelo ouro `#b8860b`. As palavras «Quase lá / Reta final» mantêm-se (o canvas `HomeG` tem-nas) e vêm da banda da API; **a 10/11 «Tranquilo» passou a «Dentro da meta · saldo: X €»** (o resto deste ficheiro ainda diz «Tranquilo»). Onde o texto abaixo diverge, vale esta nota; o histórico das decisões não se apaga.

Fonte: tabela do `Documentation/design-ux-v2/README.md` aplicada ao `HomeF` e ao `HomeG`. Valores em euros pelo `formatCents` («248,00 €»; decisão D-P4 da Liz, 2026-10-31). Os textos de produto da primeira versão foram aprovados a 2026-10-31 (D-P1, D-P2, D-P10); todos os textos estão decididos (D-P13 e D-P14 incluídos).

| Elemento | Texto | Notas |
|---|---|---|
| Título | Início | `<h1>` |
| Mês | Este mês · «1 – 31 out. 2026»; nos outros, «setembro de 2026» | botões «Mês anterior» e «Mês seguinte» |
| Anel, legenda | da meta | por baixo da percentagem |
| Anel, rótulo | Gasto no mês | por cima do valor (D7, 03/11; antes «Gasto em mercado no mês») |
| Meta | A sua meta pessoal: 400,00 € | protótipo: «Sua meta pessoal» |
| Meta, mês passado | A sua meta pessoal: 400,00 € · **Meta atual** | só quando o mês mostrado não é o corrente: a API devolve sempre a meta de hoje (D-P7, C8) |
| Faixa verde | Dentro da meta · saldo: 248,00 € | antes «Tranquilo» (10/11) |
| Faixa dourada (Quase lá) | Quase lá · saldo da meta: 152,00 € | antes laranja (03/11); protótipo: «Chegando lá» |
| Faixa dourada (Reta final) | Reta final · saldo da meta: 48,00 € | também dourada: o vermelho é só para acima da meta (03/11) |
| Igual à meta | Reta final · saldo da meta: 0,00 € | |
| Acima da meta | Acima da meta · 52,00 € além da meta | D-P1, revisto a 03/11 (antes «Acima da meta pessoal este mês»); anel completo e vermelho |
| Sem meta | Sem meta pessoal definida · botão «Definir a minha meta pessoal» | o anel mostra «—» |
| Alternativa em texto do anel | «Anel verde, 38 % da meta usada»; «Anel dourado, 62 % …»; «Anel dourado, 88 % …»; «Anel completo e vermelho, meta ultrapassada, 113 % da meta»; «Anel sem meta definida» | `role="img"`; num mês passado, «… da meta atual usada» |
| Nota fixa | A meta pessoal é um objetivo seu, não um limite. Pode mudá-la quando quiser. | README; a primeira frase é a da spec, a segunda a do protótipo |
| Média, título | Média mensal | |
| Média, com tendência | «Últimos 2 meses: 7 % abaixo da média» (`average_trend` `below`) / «12 % acima da média» (`above`) / «na média» (`on_average`) | o número é o valor absoluto de `recent_vs_average_pct`; a palavra e o tom vêm de `average_trend`, não de um limiar do cliente (D-P12) |
| Média, sem tendência | valor da média e «A tendência aparece com mais um mês completo de compras.» | média presente e `average_trend` nulo (2 meses; C16). Sem fundo colorido (D-P13, decidido) |
| Média, sem média | «— €» e «Aparece com 2 meses de histórico» | o «2» é `average_min_months`; «0/2 meses» usa `average_months` |
| Média, meses passados | igual ao mês corrente | a média e a tendência não dependem do mês mostrado (C11) |
| Compras | Compras no mês · «Mês passado: 11» | |
| Compras, mês que não é o corrente | Compras no mês · «Mês anterior: 11» | o «anterior» é o mês civil antes do mostrado (D-P10) |
| Compras, sem dados | 0 · «A aguardar dados» | protótipo: «Aguardando dados» |
| Semanas | Gasto por semana · «Sem. 1» … «Sem. 5», cada uma com o intervalo («1–7 out.») e o valor · «Ver como tabela» | tabela alternativa obrigatória; a 5.ª semana pode ter 1 a 3 dias. **Sem «média por semana»** enquanto a API não a devolver (C15, D-P14) |
| Mercados | Onde gasta mais | `name` da API; inicial + nome + valor + percentagem (`share_pct`) em texto |
| Últimas | Últimas compras · «Ver todas» | até 5; mercado (`name`), data e total; total nulo → «—» |
| Últimas, estado | `StatusBadge` com o rótulo de `STATUS`: confirmada sem selo; «Revisão necessária», «Pronta a confirmar», «A aguardar», «A validar», «A extrair» com selo | os mesmos da lista de Compras (`src/lib/status.ts`); texto, não só cor |
| Vazio, título | A aguardar o seu primeiro talão | |
| Vazio, texto | Quanto mais talões registar, mais aprendemos sobre as suas compras. | |
| Vazio, botão | Adicionar talão | |
| Vazio, cartão da média | «— €» · Aparece com 2 meses de histórico | o «2» é `average_min_months` quando a resposta o trouxer |
| Erro | Não foi possível carregar o Início. · «Tentar de novo» | |
| Carregamento | A carregar… | `Spinner` |

## Texto proibido

«poupou», «poupar», «economizar», «orçamento», «você», «limite» como obrigação, «Chegando lá», «Aguardando», «Sua meta», «Definir minha meta», «mais barato», «saldo negativo», «excedeu», «perdeu». Os testes de texto (F-187) verificam a lista.

## Fora do ecrã (não se implementa)

Cartão «Lista inteligente», «Gerar lista de hoje», cartão «Mesmo produto, mercados diferentes» e «0/3 meses» do protótipo (spec 015, depois do passo C).
