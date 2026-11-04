# Quickstart: validar o Início

> **Atualizado a 04/11/2026.** O desenho aprovado a 03/11 mudou as cores do anel (verde, dourado e dourado; vermelho só acima de 100 %), o texto acima da meta («Acima da meta · X € além da meta»), o rótulo do anel («Gasto no mês») e trocou o token laranja `--color-warn` (D-P3) pelo ouro `#b8860b`. As palavras «Tranquilo / Quase lá / Reta final» mantêm-se (o canvas `HomeG` tem-nas) e vêm da banda da API. Onde o texto abaixo diverge, vale esta nota; o histórico das decisões não se apaga.

Pré-requisitos: Node 24+, dependências instaladas, `corepack pnpm@9` (não há `pnpm` no PATH nem WSL). **O backend tem de ter `GET /v1/analytics/overview` publicado (com o `status` das últimas compras) e o `schema.d.ts` regenerado** (`corepack pnpm@9 gen:api`); sem isso não há o que validar (R1 do `research.md`).

## Verificações automáticas

```powershell
corepack pnpm@9 lint
corepack pnpm@9 typecheck
corepack pnpm@9 exec vitest run --maxWorkers=4
corepack pnpm@9 e2e:mock        # Playwright, projeto mock (axe, larguras, claro e escuro)
```

Resultado esperado: tudo verde; os testes que abrem `/` passam a receber um `overview` simulado por omissão (R11).

## Cenários manuais (com `corepack pnpm@9 dev` e o backend a correr; dados de teste sintéticos)

**Pré-requisitos:** migrações do perfil aplicadas (e a das contas existentes), imagem da API reconstruída com `overview`, e contas de teste com compras confirmadas em meses diferentes. Uma conta anterior ao onboarding não tem meta; para ver o anel com meta, definir a meta por `PATCH /v1/me/profile` com `monthly_goal_cents` (até o Perfil existir).

| # | Passos | Esperado |
|---|---|---|
| 1 | Conta com meta de 400 € e gasto de 152 € no mês | 38 %, anel verde, «Tranquilo · saldo da meta: 248,00 €», nota fixa visível |
| 2 | Gasto de 248 € | 62 %, dourado, «Quase lá · saldo da meta: 152,00 €» |
| 3 | Gasto de 352 € | 88 %, dourado, «Reta final · saldo da meta: 48,00 €» |
| 4 | Gasto de 452 € | anel cheio, vermelho, «Acima da meta · 52,00 € além da meta», sem saldo negativo |
| 5 | Conta sem meta (por exemplo anterior ao onboarding) | anel vazio, «—», «Sem meta pessoal definida», botão «Definir a minha meta pessoal» que vai a `/definicoes/perfil?editar=meta` (Perfil em edição, com o foco na meta) |
| 6 | Gastos de 200,00, 201,60, 202,00, 300,00, 301,60 e 302,00 € para 400 € | 50 %, 50 %, 51 %, 75 %, 75 %, 76 % e as faixas da US1.10 |
| 7 | Conta com 3 ou mais meses completos de compras | cartão da média com valor, tendência, fundo suave e texto (palavra e tom de `average_trend`) |
| 7b | Conta com exatamente 2 meses completos | valor da média e «A tendência aparece com mais um mês completo de compras.», sem fundo colorido |
| 8 | Conta com menos meses do que `average_min_months` | «— €» e «Aparece com 2 meses de histórico» (o 2 vem da resposta), sem fundo colorido |
| 9 | Conta sem nenhuma compra confirmada | cartões tracejados, «A aguardar o seu primeiro talão», «Adicionar talão» leva a `/adicionar` |
| 10 | Conta com compras e um mês sem compras | zeros, não o estado vazio |
| 11 | «Mês anterior» / «Mês seguinte» | muda o mês e `?mes=`; «Mês seguinte» desativado no mês corrente; «Voltar» do navegador regressa ao mês anterior |
| 11b | Ver um mês passado | a meta aparece com a nota «Meta atual»; «Mês anterior: N» nas compras; o cartão da média igual ao do mês corrente |
| 11c | Uma compra a requerer revisão e outra em processamento entre as últimas | cada uma com texto e ícone de estado; total «—» se nulo; o gasto e as semanas não as contam |
| 12 | `?mes=lixo` | mês corrente |
| 13 | Parar o backend e abrir o Início | erro com «Tentar de novo»; nenhum valor antigo |
| 14 | Resposta lenta | indicador de carregamento, nenhum valor |
| 15 | `/?periodo=mes&de=2026-09-01` | vai para `/compras/resumo` com os mesmos parâmetros (F-96) |
| 16 | Ferramentas do navegador › Armazenamento | nada em `localStorage` nem `sessionStorage`; um só pedido a `overview` por mês |
| 16b | Confirmar ou apagar uma compra e abrir o Início logo a seguir; mudar a meta no Perfil e voltar | valores novos, não os de há segundos (a cache `["overview"]` é invalidada) |
| 17 | Larguras 320, 375, 430 e 820 px, claro e escuro | sem scroll horizontal, alvos ≥ 44 px, axe sem violações, cor nunca sozinha |
| 18 | Só teclado e leitor de ecrã | o anel anuncia faixa e percentagem; os botões do mês têm nome; a tabela alternativa do gasto por semana abre |

Referências: [contrato](./contracts/overview-api.md), [rota](./contracts/routes.md), [textos](./contracts/copy.md), [modelo](./data-model.md).
