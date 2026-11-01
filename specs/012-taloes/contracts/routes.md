# Rotas e URL: Talões (012)

As rotas **não mudam** (plano D2). Já estão em `src/App.tsx`, dentro do layout com a barra de 5 destinos.

| Rota | Ecrã | Layout | Estado na barra |
|---|---|---|---|
| `/compras` | Compras | `TaloesLayout` (título «Talões», seletor de ano, abas) | Talões |
| `/compras/resumo` | Resumo | `TaloesLayout` | Talões |
| `/produtos` | Produtos | `TaloesLayout` | Talões |
| `/compras/:id` | detalhe da compra (revisão) | fora das abas | Talões |
| `/produtos/:id` | detalhe do produto | fora das abas | Talões |

`/compras/resumo` nunca é tomado como `:id` de uma compra (F-97 existente).

## Parâmetros do URL (estado da vista; nada em `localStorage`)

| Rota | Parâmetro | Valores | Omisso | Efeito |
|---|---|---|---|---|
| `/compras` | `filtro` | `acao`, `confirmadas` | todas | filtro da lista (como hoje) |
| `/compras` | `ano` | 2000 a 2099 | ano por defeito (D-T14) | ano da vista; ignorado com `filtro=acao` (D-T15); inválido ignora-se |
| `/compras/resumo` | `periodo`, `de`, `ate`, `mercado`, `produto`, `produto_nome` | como hoje | mês corrente, todos | período e filtros (como hoje) |
| `/produtos` | `q` | texto | sem pesquisa | pesquisa no servidor (como hoje) |
| `/produtos` | `ordem` | `gasto`, `az` | `compras` | ordenação no cliente (D-T4) |

Regras:

- Mudar de filtro, ano ou ordem usa `replace` (não enche o histórico); o botão Voltar sai da aba, como hoje na pesquisa.
- Mudar de aba pelo `SegmentedTabs` leva ao caminho simples da aba (sem os parâmetros da outra); o `ano` não passa para o Resumo (D-T12).
- O seletor de ano só existe em `/compras` (D-T1); nas outras abas o layout não o desenha.
- Voltar do detalhe de uma compra ou de um produto regressa à aba com os parâmetros que tinha (o navegador conserva o URL).

## Títulos e foco

- `<h1>` «Talões» no layout; `<h2>` por aba: «Compras», «Resumo», «Produtos» (visíveis só para leitores de ecrã, porque o desenho mostra as abas e não repete o nome).
- O detalhe do produto tem o seu `<h1>` (nome do produto), como hoje, com o botão «Voltar» de 44 px.
- Ao mudar de aba, o foco fica na aba escolhida (comportamento de `SegmentedTabs` da spec 009).
