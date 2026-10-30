# Textos do onboarding (português europeu) e estilo

Origem: `Documentation/design-ux-v2/Onb1.dc.html` (layout e estados) com a tabela de substituições do `README.md` dessa pasta e as decisões de 2026-10-30. Decisões P2 e P4 da Liz (2026-10-30) aplicadas.

## Textos

| Onde | Texto |
|---|---|
| Voltar (botão só com ícone) | nome acessível «Voltar» |
| Saltar | «Saltar» |
| Progresso | «Passo N de 4» (visível) e barra a 25 %, 50 %, 75 %, 100 % |
| Ação | «Avançar» nos passos 1 a 3; «Concluir» no passo 4 |
| Passo 1: título | «Qual é o seu objetivo com a aplicação?» |
| Passo 1: apoio | «Escolha quantos quiser.» |
| Passo 1: opções | «Organizar as minhas finanças» / «Ver quanto gasto e onde»; «Ajuda com a lista de compras» / «Saber o que costumo comprar»; «Gastar menos nas compras» / «Acompanhar o que gasto ao longo do tempo»; «Todas as anteriores» / «Quero tudo isso» |
| Passo 2: título | «Quantas pessoas vivem em sua casa?» |
| Passo 2: apoio | «Pode alterar este número mais tarde, no Perfil.» |
| Passo 2: rótulo | «pessoa» (1) / «pessoas» (2 a 12) |
| Passo 2: botões | «Menos uma pessoa», «Mais uma pessoa» |
| Passo 3: título | «Onde costuma fazer compras?» |
| Passo 3: apoio | «Escolha todos os mercados que usa.» |
| Passo 3: cartões | inicial (1.ª letra; «EC» para El Corte Inglés) + nome vindo da API, sempre visível |
| Passo 4: título | «Qual é a sua meta pessoal por mês?» |
| Passo 4: apoio | «Por mês. Pode mudá-la quando quiser.» |
| Passo 4: valor | «300 €» (euros inteiros) com a legenda «por mês»; extremos «50 €» e «800 €» |
| Passo 4: «Ainda não sei» | botão «Ainda não sei» / «Definir um valor»; valor mostrado «Ainda não sei»; legenda «Pode definir a sua meta pessoal mais tarde, nas Definições.» |
| Concluído | título «Tudo pronto»; texto «Pode editar estas respostas no Perfil a qualquer momento.»; botão «Ir para o início» |
| Erros | ver `profile-api.md` |

## Textos aprovados pela Liz em 2026-10-30

Estes três textos não vêm da tabela do README; foram propostos na implementação e **aprovados pela Liz em 2026-10-30**:

- «Saber o que costumo comprar» (descrição de «Ajuda com a lista de compras»);
- «Acompanhar o que gasto ao longo do tempo» (descrição de «Gastar menos nas compras»);
- «Pode alterar este número mais tarde, no Perfil.» (apoio do passo 2).

Não aparecem: «Calculamos pela sua média depois», «orçamento», «poupar», «poupou», «economizar», «economia», «você», «Pular», «moram», nem promessas da Lista ou de comparação de preços.

## Estilo: protótipo → tokens

| Protótipo | Produto |
|---|---|
| Botão preto 56 px, cantos redondos | `Button` primário (`bg-brand`), `min-h-12`, `rounded-control`, largura total |
| Cartão branco, borda 1,5 px | `bg-paper` com `border border-line`, `rounded-surface` |
| Cartão escolhido, borda 2 px na cor de destaque | `border-2 border-brand` **e** marca de verificação em círculo `bg-brand text-white` (nunca só a moldura) |
| Fraunces nos títulos e números | Nunito Sans 800 (`font-extrabold`), `tabular-nums` nos números |
| Números 120 px (pessoas) e 80 px (meta) | `clamp()` para caber a 320 px |
| Barra de progresso `#141413` sobre `#E4DED3` | `bg-brand` sobre `bg-line`, `role="progressbar"` |
| Círculo menta com marca de verificação (Tudo pronto) | `bg-brand-soft` com ícone `text-brand` |
| Texto secundário `#5A564F` | `text-ink-soft` |

Mercados sem logótipos (marcas por confirmar). Contraste ≥ 4,5:1 no texto e alvos ≥ 44 px, em claro e escuro.
