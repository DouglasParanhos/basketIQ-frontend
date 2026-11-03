# Relatório da noite, 03/11/2026 (só frontend)

Ramo de trabalho: `feat/design-ux-v2`. Backend e ramos do Douglas: não tocados.
As capturas estão em `Documentation/noite-2026-11-03/passo-N/`, na pasta `Documentation` do projeto (ao lado dos dois
repositórios; não é um repositório git, e o `.gitignore` deste repositório ignora `Documentation/`: por isso as imagens
não estão commitadas). Este relatório vive em `specs/` (versionado) e tem uma cópia em `Documentation/NOITE_2026-11-03_relatorio.md`.

**Não comparei nenhuma captura lado a lado com o canvas** (só renderiza no claude.ai). Comparei pelos valores lidos dos
ficheiros `Documentation/design-ux-v2/*.dc.html` (atualizados hoje; relidos do disco).

## Ponto de partida

- `git fetch origin`: a `origin/main` tem **0** commits que o HEAD não tenha.
- **A exceção ao «ramo a partir da main» deixou de ser necessária.** O prompt previa criar o ramo a partir do `5ca901c`
  porque o PR #6 estava em rascunho. O PR #6 foi fundido na `main` às 21:07 UTC (a `main` é `ec0a375`, com a árvore
  idêntica à do `5ca901c`: 0 ficheiros de diferença). O ramo foi por isso criado a partir da `main` atualizada, como manda
  o CLAUDE.md. Consequência: a nota final do PR («branched from the head of PR #6, not merged yet») não se aplica.
- Fontes do canvas: a pasta tem a versão de hoje (`Login` e `HomeF` de 19:19, as restantes de 15:46).

## Tarefa A (testes instáveis): feita, **não descartada**

Com o `act()` do Douglas já na `main`, `routes.test.tsx` isolado com 64 processos a ocupar CPU, 38 min de teto:

| Corrida | Resultado |
|---|---|
| 1 | não correu testes (`Timeout calling "fetch"` do worker do vitest, ver abaixo) |
| 2, 3, 5, 6 | 1 falha cada: `Unable to find role="heading" and name "Produtos"` (`findBy` de 1 s) |
| 4 | 7/7 |
| 7 | 2 falhas: `"Resumo"` e `"Produtos"` |

5 de 6 corridas válidas falharam, todas pelo `findBy` de 1 s. Aplicados `asyncUtilTimeout: 4000` e `testTimeout: 15000`
(commit `2c147ca`, bateria completa 439/439 sem carga). **Não repeti as 12 corridas com a correção** (o teto de tempo já
tinha passado): a correção não está medida sob carga.

O `Timeout calling "fetch"` do worker (processo principal do vitest sem responder sob carga extrema) é outro limite,
interno ao vitest, e não é coberto por estes valores. Está comentado em `vitest.config.ts`.

## Estado dos passos

| Passo | Estado | Commit |
|---|---|---|
| 4 Login e Política | feito | `22822fd` |
| 5 Onboarding | feito, **sem** a meta acima de € 800 (backend) | `a6f2fd0` |
| 6 Início | feito | `9d5ba36` |
| 7 Talões | feito (Compras completo; Resumo e Produtos só nos pontos do canvas que o código já cobria) | `2d58c0d` |
| 8 Rever talão | **parcial**: só o aspeto, a estrutura do canvas não foi adotada | `aaecb5d` |
| 9 Adicionar | feito (câmara do Douglas intocada) | (ver `git log`) |
| 10 Definições | não feito | |

### Passo 4: Login e Política

Login (`LoginPage.tsx`): fundo creme; ranhura preta; talão branco com logo, «SUPER MERCADO» (o nome vem do backend, em
maiúsculas por CSS), «CADA TALÃO CONTA» com marcador amarelo que «pinta», 4 linhas em Martian Mono, «TOTAL … CONTROLO»,
borda de baixo em dentes (`.torn`); duas colunas de talões a rolar (26 s e 32 s); botão «Entrar com Google» (56 px,
raio 28, verde, círculo branco com o G); texto legal com ligação à política; faixa de erro `role="status"` com os
textos que o código já tinha. Sem botão de e-mail e sem «ou». Animações desligadas com `prefers-reduced-motion`
(`animation: none`, não uma duração curta: um ciclo infinito de 0,01 ms tremeria).

Política (`PrivacyPage.tsx`): título em Fraunces 30 px; cartão «EM RESUMO» com vistos; 5 secções em acordeão
(`<button aria-expanded aria-controls>`, teclado nativo, texto escondido com `hidden`); rodapé fixo de 164 px com
«Li a política e continuar» (56 px) e «Sair» (48 px). «Sair» chama `useLogout` e não regista consentimento;
nada vem pré-aceite. A lógica de consentimento e de reaceitação por versão não mudou.

Fluxo conta nova / existente (confirmado, sem alterações): login → `/` → `RequireSession` manda para `/privacidade` quem
não aceitou a versão atual (conta nova ou política mudada) → depois do consentimento vai para o destino guardado
(`/` por defeito) → `RequireOnboarding` manda para `/boas-vindas` quem não fez o onboarding. Conta existente que já
aceitou a versão atual e fez o onboarding vai direta ao Início.

**Frases da política confirmadas contra o backend** (`services/accounts.py`, `workers/scheduler.py`,
`services/receipts.py`, `pipeline/external.py`, `config.py`):

| Frase do canvas | Estado |
|---|---|
| «Guardamos o seu nome, o e-mail e os dados dos seus talões.» | confirmada (`upsert_from_claims`, `Receipt`) |
| «Usamos só para lhe mostrar as suas compras. Não vendemos nem partilhamos.» | confirmada hoje: `external_fallback` está `disabled` por defeito e só existe um `MockExternalExtractor` |
| «Os ficheiros originais são apagados ao fim de 30 dias.» | **NÃO mostrada: não é verdade para todos os talões.** O original só ganha data de expiração (`original_expires_at`) ao **confirmar** o talão (`mark_confirmed`); um talão que nunca é confirmado mantém o original sem prazo. |
| «Pode apagar tudo quando quiser.» | verdadeira (`DELETE /v1/me`, `delete_account`), mas vai na frase omitida |

**Frase alternativa verdadeira, proposta:** «Os ficheiros originais são apagados 30 dias depois de confirmar o talão.
Pode apagar tudo quando quiser.» (É o que a secção «Durante quanto tempo» e o ecrã Privacidade das Definições já dizem.)
Basta acrescentá-la a `SUMMARY` em `PrivacyPage.tsx` se a aprovar; o cartão tem agora 2 vistos em vez de 3.

### Passo 5: Onboarding

Nada pré-escolhido: o estado começa vazio (`householdSize` e `goalEuros` passam a `number | null`; apagadas as constantes
`PEOPLE_SUGGESTED` e `GOAL_SUGGESTED_EUROS`). Pessoas: «—» e o primeiro «+» diz 1. Meta: «— €» e a barra só conta quando
a pessoa a mexe. «Avançar» fica `aria-disabled` (continua na ordem de tabulação) com a razão por baixo
(`aria-describedby`, textos do canvas) e não faz nada ao clique nem ao Enter (`canAdvance`); «Saltar» nunca guarda (já era assim,
com os testes de `buildPatch`). «Ainda não sei» conta como resposta no último passo. Títulos e números grandes em Fraunces.
«Tudo pronto» com «Adicionar o meu primeiro talão» (primário, vai a `/adicionar`) e «Ver o início» (contorno verde).
Os passos de mercados já usavam o `MarketTile` do passo 2.

**Não aplicado: «Precisa de mais de € 800? Escreva o valor» (campo até € 5 000).** O backend rejeita metas acima de € 800
(`MONTHLY_GOAL_CENTS_RANGE = (5_000, 80_000)` em `domain/status.py`, validador com 422 `out_of_range` e `CHECK`
`ck_user_profiles_monthly_goal` na tabela). Mostrar o campo daria um erro ao concluir. Escondido; ver «Dependências do backend».

### Passo 6: Início

- **Anel:** verde (faixa `ok`), dourado (`attention` e `high`) e vermelho **só quando o gasto passa a meta** (decidido pelo
  sinal de `goal − spent`, não pela faixa). Textos do canvas: «Acima da meta · € X além da meta»; aria-label «Anel
  dourado, 62 % da meta usada» e «Anel completo e vermelho, meta ultrapassada, 113 % da meta». A faixa do backend só escolhe
  as palavras («Tranquilo», «Quase lá», «Reta final»). Percentagem e valor em Fraunces; rótulo «Gasto no mês» (D7).
- **Média mensal:** cartão sempre neutro (sem fundo verde/vermelho; o texto diz «abaixo»/«acima»). Retirado o teste F-184 dos fundos.
- **Novo «Por pessoa no mês»:** gasto ÷ pessoas do perfil (divisão no cliente, em cêntimos arredondados); escondido sem
  `household_size`. Com 152,00 € e 2 pessoas mostra 76,00 €.
- **«Gasto por semana»** (a API tem as semanas): barras das outras semanas em `muted-bar` e o valor a negrito por cima.
- **«O que mudou de preço»:** escondido no Início real (sem endpoint); só aparece no exemplo.
- **Estado vazio:** o Início fantasma (cartões tracejados, mês incluído) fica `inert` por baixo de uma folha translúcida
  (`bg-ground/80`) com «A aguardar o seu primeiro talão», «Adicionar o meu primeiro talão» e «Ver com dados de exemplo». A folha
  cobre o conteúdo e não a barra de navegação.
- **Modo exemplo** (`/?exemplo=1`): componente à parte, **sem nenhum hook de dados** (nenhum pedido ao backend, nenhuma
  escrita; testado por pedidos observados no msw e no Playwright). Banner «Dados de exemplo · loja fictícia» e «Sair do exemplo»
  (ligação de 44 px). Dados inventados só em `exampleData.ts`, com Continente e Auchan lado a lado. As compras do exemplo
  não são ligações (os talões não existem) e «Ver todas» não aparece.
- **Defeito apanhado pelos testes e corrigido:** o Início passou a ler o perfil (para o «Por pessoa»); com o perfil a falhar,
  o segundo leitor da mesma query repunha-a em «a carregar» e o `RequireOnboarding` desmontava o Início em ciclo (a pessoa
  ficava presa no indicador). `useProfile` passa a ter `retryOnMount: false`: um perfil que falhou não é pedido outra vez por cada
  ecrã que monta; os botões «Tentar de novo» fazem `refetch`.

### Passo 7: Talões

- **Compras:** mesa (`bg-table`) atrás do ecrã inteiro, só neste separador; uma **folha de papel rasgado por mês**
  (`.torn`, dentes de 10 px) com «OS SEUS TALÕES» em Martian Mono (decorativo, `aria-hidden`), o mês (Fraunces) e o resumo em cima,
  na mesa. Linhas tracejadas (`muted-bar`), tile do mercado, selo `!` / `…` / erro, data em Martian Mono, total, chevron, 64 px.
  Chips «Todas / Requer ação · N / Confirmadas» brancos com contorno; separadores sobre `line` (antes menta); título em Fraunces 28.
- **Removido:** o interruptor «Ver como papel de talão», `ReceiptPaper.tsx` e o seu teste, e `dayMonthSlashOf`. O endereço antigo
  `/compras?vista=papel` passa a abrir a lista sem o parâmetro (`<Navigate replace>`; os outros parâmetros mantêm-se).
- **Resumo e Produtos:** o código já tinha a estrutura do canvas (cartão do gasto com variação, barras por mercado com a cor da borda
  de cada mercado, mais gasto / mais comprados, preço médio, evolução). Aplicado: valores grandes e título do produto em Fraunces,
  cartões com contorno, pista das barras em `line`.
- **Defeito apanhado nas capturas e corrigido:** a mesa estava escondida (um `-z-10` fica por trás do fundo do contentor da
  aplicação). Agora a mesa é um elemento posicionado e o conteúdo vem por cima; o teste e2e verifica o que está realmente à vista
  (`elementFromPoint`), não só a cor computada.

### Passo 8: Rever talão (parcial)

O canvas `ReviewTalao` é uma estrutura **diferente** da tela atual: cartão de resumo (Mercado / Data / Total, com o total a Fraunces
sobre o marcador), lista de produtos em cartão com painel de edição por linha, aviso «Preço alterado… Desfazer» e rodapé fixo
(«Confirmar talão», «Guardar e rever depois», «Eliminar talão»). A tela atual é a vista de talão impresso (`.receipt-paper`, Martian
Mono, marcador nos valores a rever) com a lógica toda: editar/acrescentar/remover/dividir linhas, diferença de totais, conflito de
versão, duplicado, mercado desconhecido. Regra da noite (o código ganha em lógica e a11y, o canvas em cor, fonte e texto): **não
refiz a estrutura**; apliquei o aspeto:

- o aviso «Reveja antes de confirmar» (e todos os avisos `warning` da app) passa ao dourado dos chips (`warn-soft` / `warn-ink`),
  em vez de uma mancha do amarelo do marcador;
- os botões de baixo passam a pílulas de 56 px com a frase «Ao confirmar, os valores entram nos seus gastos.» por cima;
- o título da compra em Fraunces.

**Não aplicado e porquê:** o rodapé «Confirmar talão / Guardar e rever depois / Eliminar talão» (os textos mudariam o comportamento:
«Guardar e rever depois» sai do ecrã, «Guardar» não), o cartão de resumo com edição por ícone, o aviso «Desfazer» (não há
desfazer na lógica), o total sobre o marcador a Fraunces e a frase «A descrição original fica guardada» (só depois de B-10, plano §6.3).

### Passo 9: Adicionar

O ecrã já tinha a estrutura do canvas (título, chips de mercado, três botões grandes, aviso do talão comprido, ecrã das partes).
Aplicado: título em Fraunces 30; **cada mercado é a sua pílula** (`MarketPill`): escolhido, com as cores do mercado e «✓»; não
escolhido, branco com a borda e o tile do mercado; «Detetar sozinho» fica verde (escolhido) ou branco. Os títulos dos ecrãs
sem barra (`FullScreen`: «Confirme as partes», «Editar perfil») passam a Fraunces 20. O aviso do talão comprido ficou dourado
pela mudança global dos avisos (passo 8).

**Câmara do Douglas:** não toquei em `features/capture/`, nem na lógica ou no fluxo da câmara. Nenhum conflito com o canvas
(o canvas desenha um ecrã de câmara com «Captura automática» e várias partes; o da câmara existente fica como está, sem
alterações de aspeto nesta noite).

## Decisões a rever

1. **Colunas de talões do login em conteúdo gerado por CSS.** O axe mediu 1,21:1 no texto decorativo a 10 % de
   opacidade (nenhuma tonalidade chega a 4,5:1 com essa opacidade, e o desenho pede-a). Em vez de desligar o axe ou
   subir a opacidade, o texto passou a `::before { content: attr(data-lines) }` num contentor `aria-hidden`: é decoração,
   não texto do documento. Se preferir outra solução (por exemplo, opacidade maior), diga.
2. **Talão no esquema escuro.** Ficou claro (papel branco com tinta escura) sobre o fundo escuro, com as cores do
   papel fixas (`.ticket-paper` repõe os valores claros de `paper`, `ink`, `brand` e `marker`). **A ranhura preta quase
   não se vê sobre o fundo escuro** (`#1B1B1A` sobre `#121A15`). Alternativas: ranhura com contorno claro, ou talão escuro
   derivado dos tokens. Captura: `passo-4/login-dark-390.png`.
3. **Texto da faixa de erro.** O canvas usa `#3F2C00`; usei os tokens `warn-soft` (`#FFF1BF`) e `warn-ink` (`#5C3F00`),
   que passam o contraste e mudam com o esquema (escuro). Diferença de tom: `#5C3F00` é um castanho mais claro.
4. **Rótulos «EM RESUMO» e «POLÍTICA COMPLETA».** O canvas usa `#3F5247` no resumo; usei `ink-soft`. Contraste medido
   em `contrast.test.ts` (novos pares com `brand-soft`).
5. **A faixa de erro tapa a ranhura e parte do logo** quando aparece (é `absolute` no topo, como no canvas).
6. **Hexadecimais soltos no talão** (decoração): `#8A857B` (linhas tracejadas), `#E4DED3` (sombra do papel) e
   `rgb(27 27 26 / .15)` (sombra da ranhura).
7. **O parágrafo descritivo do login desapareceu** («Fotografe ou envie a nota de qualquer loja: Continente, Pingo
   Doce, …»), porque o canvas não o tem. Os testes que o procuravam passaram a procurar o título (`h1`) com o nome.
8. **Os textos das 6 razões de erro do login** são os que o código já tinha (o canvas só traz `cancelled` e
   `session_expired`, que coincidem). Não inventei nenhum.
9. **Corpo da política ainda diz «notas»** (as secções são o texto que já existia; só os títulos seguem o canvas, que diz
   «talões»). O texto final é seu (B-21).
10. **Ligação «Política de privacidade»** com 44 px de área de toque por padding vertical (as outras 13 px de texto
    inline ficariam com 18 px).
11. **«Sair» e «Li a política»** ficam desativados enquanto um dos dois corre, para não haver dois pedidos.
12. **Onboarding: a barra da meta não deixa escolher exatamente € 50** sem passar por outro valor, porque um `<input type="range">`
    só dispara `change` quando o valor muda e começa em 50 sem resposta. Igual ao protótipo do canvas.
13. **Onboarding: o «Avançar» bloqueado tem 40 % de opacidade** (como no canvas); o axe não mede contraste de controlos
    inativos (`aria-disabled`) e o WCAG isenta-os, mas o texto fica claramente menos legível. A razão está escrita por cima.
14. **«— €» em vez de «€ —»** para a meta por definir, para seguir o formato `300 €` já usado na app (formato do dinheiro: ainda em aberto).
15. **Início: a legenda das semanas** ficou «Sem. 1 / 1–7 nov.» (a do canvas é «S1»), por ser mais clara e ser o texto que a tabela alternativa também usa.
16. **Início: o subtítulo «média € 79 por semana»** do canvas **não** foi aplicado: o número do canvas não corresponde às suas próprias barras (58+91+54+45 dão 62 por semana) e a média semanal não está definida na API. Não inventei o número.
17. **Início, exemplo: sem seletor de mês** (o canvas tem-no, mas navegar meses de um exemplo não faz sentido) e com as compras sem ligação.
18. **Início: formato do dinheiro e da percentagem** mantido como `22,75 €` e `38 %` (o canvas escreve `€ 22,75` e `38%`): ainda por decidir.
20. **Talões, escuro: a mesa é mais escura que o fundo** (`--color-table` escuro `#1D2922` → `#0C110E`), para a folha (`paper`) se distinguir; com o valor anterior os dois tons quase coincidiam. O canvas não tem versão escura.
21. **Talões: «OS SEUS TALÕES» repete-se em cada folha** (uma por mês); o canvas só mostra uma folha.
22. **Talões: a linha de data em Martian Mono** parte em duas linhas a 390 px quando é longa («28 out. · 11 itens · rever valores»); no canvas cabe numa.
23. **Talões: Resumo e Produtos** não foram redesenhados além do descrito: os períodos, os filtros e o «Ver como tabela» são os que o código já tinha. Fica para a passagem final se quiser alinhar pixel a pixel.
19. **Os documentos de `specs/011-inicio/`** (copy, plan, research, spec, tasks) ainda descrevem os textos e as cores antigos do anel («laranja», «vermelho» a 88 %, «Acima da meta pessoal este mês», «Gasto em mercado no mês»). Não os alterei; ficam para a passagem final.

## Dependências do backend

| Elemento escondido | O que falta no backend |
|---|---|
| Login por e-mail | decidido (D6): fica para depois |
| Início: cartão «O que mudou de preço» (só no exemplo) | endpoint com o mesmo produto, mesmo mercado, as duas últimas compras, ≥ 15 % e ≥ 0,20 € (B-04) |
| Início: «Por pessoa no mês» | funciona com o perfil que já existe; se o backend passar a devolver o valor por pessoa, deixa de ser divisão no cliente |
| Onboarding e Definições: ligação «Precisa de mais de € 800? Escreva o valor» (até € 5 000) | `PATCH /v1/me/profile` rejeita `monthly_goal_cents` > 80 000 (422 `out_of_range`; `CHECK` na base de dados). Falta subir `MONTHLY_GOAL_CENTS_RANGE` (e a migração do `CHECK`) para 500 000 (B-11). Quando houver: uma constante única em `features/profile/goals.ts`, o campo numérico no passo 4 e no `ProfileEditor`, mensagem «Indique um valor entre € 801 e € 5 000.» |

## Problemas em aberto

- Corrida de testes sob carga extrema: ver «Tarefa A».
- A política não tem rodapé nem botão de voltar quando é lida sem precisar de consentimento (a partir do login ou das
  Definições): é o comportamento anterior e o canvas não o define.

## Capturas

- Passo 4 (390 e 320 px, claro e escuro): `Documentation/noite-2026-11-03/passo-4/` do projeto: `login-*`, `login-erro-*`, `politica-*`, `politica-aberta-*`.
- Passo 9: `Documentation/noite-2026-11-03/passo-9/`: `adicionar-*` (primeiro ecrã) e `adicionar-auchan-*` (Auchan escolhida).
- Passo 8: `Documentation/noite-2026-11-03/passo-8/`: `rever-*`.
- Passo 7 (390 e 320 px, claro e escuro): `Documentation/noite-2026-11-03/passo-7/`: `compras-*`, `resumo-*`, `produtos-*`.
- Passo 6 (390 e 320 px, claro e escuro): `Documentation/noite-2026-11-03/passo-6/`: `inicio-*` (um estado por captura), `vazio-*`, `exemplo-*`.
- Passo 5 (390 e 320 px, claro e escuro): `Documentation/noite-2026-11-03/passo-5/` do projeto: `passoN-vazio-*` (sem resposta, «Avançar» bloqueado), `passoN-resposta-*`, `pronto-*`.
