# Feature Specification: Lista inteligente e comparação entre mercados (interface)

**Feature Branch**: `015-lista-inteligente`

**Created**: 2026-10-30

**Status**: Draft (Fase 0 do plano UX v2: só histórias e critérios de aceitação; sem requisitos técnicos, plano nem tarefas). **Só se constrói depois do passo C.**

**Input**: Especificação Funcional v1.4 RF-16, RF-15, §12.1, §12.3; `Documentation/Super Mercado_—_Plano_de_Implementação_UX_v2.md` (Fase 7, secção 6.7); `Documentation/RASCUNHO_decisoes_spec010_2026-10-30.md` (D11, D12); `Documentation/design-ux-v2/ListaV3.dc.html`, `HomeF.dc.html` (layout; textos conforme a tabela do `README.md`; os elementos do protótipo que não se implementam estão listados no mesmo `README.md`). Backend: `../basketIQ-backend/specs/015-lista-inteligente`.

**Convenção de rastreabilidade**: cada critério cita o RF da Especificação Funcional. Os testes do frontend levam o identificador no nome (`F-xx: …`); o F-xx atribui-se na Fase 8, na faixa do passo D (F-146 a F-175). Teste de cada critério: por criar.

**Âmbito**: ecrãs atrás da opção da lista, depois do passo C. Preços de terceiros e plano Pro ficam fora (§12.3): o ecrã não tem qualquer referência a eles.

**Regra de comparação (D11 e D12):** janela de 90 dias; só se compara com 2 mercados de pelo menos 3 compras cada, diferença de pelo menos 15 % da média do grupo e de 0,20 € na compra típica; **sem ranking de mercados**; o ecrã mostra sempre a janela e o número de compras. Texto: «preço médio que pagou» ou «pelo que costuma pagar»; «sem diferença clara»; «faltam X compras para comparar».

**Incremento 1 (2026-11-01):** a US-A constrói-se **antes do passo C**. O item da lista é o **artigo**, isto é, o mesmo produto na mesma
cadeia (`Documentation/BRAINSTORM_lista_inteligente_2026-11-01.md`). Este incremento não compara cadeias e não gera listas. Lê
`GET /v1/lists/articles` (backend, spec 015 US-A). As restantes histórias continuam a depender do passo C.

## User Scenarios & Testing *(mandatory)*

### User Story A - Artigos comprados na janela (Priority: P1, incremento 1)

**Acceptance Scenarios**:

1. **Given** a opção ligada, **When** a pessoa abre Lista, **Then** vê sempre «Valores calculados com os seus talões dos últimos N dias. Não
   são preços de hoje.», com o N que vem da API. — F-153, RF-16
2. **Given** os itens, **When** são mostrados, **Then** aparece um cartão por produto, na ordem da API, com ligação à página do produto
   (onde está a evolução do preço), o número de compras e o preço médio que pagou na base. As embalagens e o ritmo por mês só aparecem
   em produtos à unidade. — F-153, RF-16
3. **Given** um artigo (uma cadeia), **When** é listado, **Then** mostra o número de compras, a média, o mais baixo e o mais alto com a
   data e «com desconto» quando o houve, e a última compra. Com uma só compra não mostra o mais baixo nem o mais alto. Uma loja não
   suportada aparece com o nome que tem. — F-153, RF-16
4. **Given** o texto, **When** é revisto, **Then** está em português europeu e em tom neutro: sem «poupa», «perda», «caro», «mais barato»
   nem ordenação de cadeias. — F-153, RF-16
5. **Given** nenhuma compra na janela, **Then** a pessoa vê uma mensagem clara e nenhuma lista. **Given** linhas sem produto
   identificado, **Then** vê quantas ficaram de fora. **Given** um erro, **Then** vê «Tentar de novo», que volta a pedir. — F-154,
   constituição III
6. **Given** cada vista, **When** corre o axe em claro e escuro de 320 a 820 px, **Then** não há violações nem scroll horizontal. — F-153,
   §8

---

### User Story 1 - Escolher o modo e ver o progresso (Priority: P1)

**Acceptance Scenarios**:

1. **Given** a opção ligada, **When** a pessoa abre Lista, **Then** escolhe entre «Hoje», «2ª compra do mês» e «O que falta». — RF-16
2. **Given** histórico insuficiente, **When** abre, **Then** vê o progresso com o mínimo configurado como denominador («0/2 meses») e o que falta, sem lista. — RF-16, constituição III
3. **Given** um modo vindo do cartão do Início, **When** a Lista abre, **Then** esse modo vem escolhido. — RF-16
4. **Given** a geração em curso, **When** demora, **Then** vê um estado de carregamento e, se falhar, um erro com ação. — RF-16
5. **Given** a opção desligada, **When** abre `/lista`, **Then** vê «não encontrado». — RF-16

---

### User Story 2 - Um só mercado (Priority: P1)

**Acceptance Scenarios**:

1. **Given** «Um só mercado» e um mercado escolhido, **When** abre, **Then** vê «Lista no <mercado> · N itens» e o total esperado nesse mercado. — RF-16
2. **Given** a lista, **When** é mostrada, **Then** não há mercados ordenados por total nem texto «mais barato». — RF-16, D12
3. **Given** um item em que a regra de comparação se cumpre, **When** é listado, **Then** mostra «preço médio que pagou» em cada mercado, a janela, o número de compras de cada um e «a diferença é de cerca de 0,50 € numa compra típica». — RF-16, D12
4. **Given** um item em que não se cumpre, **When** é listado, **Then** mostra «sem diferença clara» ou «faltam X compras para comparar». — RF-16, D12
5. **Given** cada item, **When** é listado, **Then** mostra a quantidade, «última vez» e «esperado»; um item sem compras nesse mercado leva «~» e «sem compras aqui · usa a sua média geral». — RF-16
6. **Given** uma caixinha de item, **When** a pessoa a marca, **Then** o estado persiste e o alvo de toque tem pelo menos 44 px. — RF-16, §8
7. **Given** as diferenças, **When** são escritas, **Then** o tom é neutro («€ 1,40 a mais»), sem «poupa», «perda» nem «caro». — RF-16

---

### User Story 3 - Múltiplos mercados (Priority: P1)

**Acceptance Scenarios**:

1. **Given** «Múltiplos mercados», **When** abre, **Then** a pessoa escolhe os mercados do dia e cada escolhido mostra ✓ e texto. — RF-16, §8
2. **Given** menos de 2 mercados escolhidos, **When** quer continuar, **Then** não pode e vê porquê. — RF-16
3. **Given** o resultado, **When** abre, **Then** vê o total esperado por mercado, o grupo «Em qualquer mercado» com o número de itens e o total da lista. — RF-16
4. **Given** o resultado, **When** abre, **Then** não vê comparação com um «melhor mercado único» nem mercados ordenados. — RF-16, D12
5. **Given** o texto de apoio, **When** é lido, **Then** diz «Cada item aparece no mercado onde, pelo que costuma pagar, a diferença é clara; os restantes ficam em qualquer mercado». — RF-16, secção 6.7
6. **Given** um item em «Em qualquer mercado» por falta de dados, **When** é listado, **Then** diz «faltam X compras para comparar». — RF-16
7. **Given** «Mudar», **When** é tocado, **Then** volta à escolha de mercados sem perder a lista. — RF-16

---

### User Story 4 - Fonte dos valores (Priority: P1)

*Obrigatório em todo o ecrã da lista (plano, secção 6.7).*

**Acceptance Scenarios**:

1. **Given** qualquer vista da lista, **When** abre, **Then** a linha «Valores calculados com os seus talões dos últimos 90 dias. Não são preços de hoje.» está sempre visível (a janela vem da configuração). — RF-16, D11
2. **Given** «Como calculamos», **When** é tocado, **Then** abre a folha «De onde vêm estes valores» com «Esperado», «Última vez», «~» e «Não são preços de hoje nem informação oficial dos mercados. O preço na loja pode ser diferente.» — RF-16
3. **Given** a folha, **When** abre, **Then** o foco entra nela, «Esc» e «Entendi» fecham-na e o foco volta ao botão de origem. — §8
4. **Given** o ecrã e a folha, **When** são revistos, **Then** não têm qualquer referência ao plano Pro, a preços de hoje de terceiros nem a mercados que a pessoa ainda não usa. — RF-16, §12.3
5. **Given** o texto de diferenças, **When** é revisto, **Then** não usa «poupa», «poupou», «perda», «caro» nem «mais barato para si». — RF-16, D12

---

### User Story 5 - Nas compras (Priority: P2)

**Acceptance Scenarios**:

1. **Given** uma lista aberta, **When** a pessoa entra em «Nas compras», **Then** vê a data, «2 de 3 no carrinho» e «€ 7,50 de € 17,60». — RF-16
2. **Given** um item, **When** é marcado, **Then** a caixinha e o total mudam e o estado persiste. — RF-16
3. **Given** «Terminei · adicionar talão», **When** é tocado, **Then** vai para Adicionar. — RF-16
4. **Given** o talão confirmado do mesmo dia, **When** a pessoa volta, **Then** os itens comprados aparecem marcados e comparados com o esperado. — RF-16
5. **Given** a frase «Ao ler o talão desta compra, marcamos o que levou e comparamos com o esperado», **When** é revista, **Then** só é mostrada se a ligação ao talão existir. — RF-16

---

### User Story 6 - Cartões do Início (Priority: P2)

*Movidos da spec 011: só existem depois do passo C.*

**Acceptance Scenarios**:

1. **Given** a opção da lista desligada, **When** o Início abre, **Then** o cartão da lista não existe no ecrã nem na ordem de tabulação. — RF-16
2. **Given** a opção ligada e histórico suficiente, **When** o Início abre, **Then** vê «Com base nas suas compras de N meses» e os três botões «Gerar lista de hoje», «Gerar a 2ª compra do mês» e «O que falta comprar», que levam à Lista com esse modo. — RF-16
3. **Given** histórico insuficiente, **When** o Início abre, **Then** vê «Disponível com 2 meses de talões» e o progresso «0/2 meses». — RF-16
4. **Given** o cartão «Mesmo produto, mercados diferentes», **When** há grupos comparáveis (D12), **Then** mostra, por grupo, o preço médio que pagou em cada mercado, o número de compras, a janela e a base (por kg, por unidade), com a legenda «Preços pagos nos seus próprios talões». — RF-15, D12
5. **Given** esse cartão, **When** a regra não se cumpre, **Then** mostra «sem diferença clara» ou «faltam X compras para comparar», e nunca assinala um mercado como «mais barato». — RF-15, D12
6. **Given** esse cartão sem nenhum grupo com dados para comparar, **When** o Início abre, **Then** o cartão não aparece. — RF-15

---

### User Story 7 - Qualidade (Priority: P1)

**Acceptance Scenarios**:

1. **Given** cada vista, **When** corre o axe em claro e escuro de 320 a 820 px, **Then** não há violações. — §8, §10
2. **Given** os dois modos de mercado, **When** correm os testes de interface, **Then** cada um tem testes. — RF-16
3. **Given** o texto, **When** é revisto, **Then** está em português europeu e em tom neutro. — §8, RF-16
4. **Given** valores em cêntimos, **When** são mostrados, **Then** a formatação é só de apresentação. — constituição II
5. **Given** o service worker, **When** a lista é consultada, **Then** nada da API fica em cache. — constituição IV

### Edge Cases

- Lista vazia (nada a comprar no modo escolhido): mensagem clara e sem erro.
- Mercado do perfil que deixou de ser suportado: não aparece e a lista não falha.

## Requirements *(mandatory)*

*Por escrever em `/speckit-clarify` e `/speckit-plan`; a Fase 0 cobre só histórias e critérios.*

## Success Criteria *(mandatory)*

*Por escrever. O plano pede: testes de UI dos dois modos, texto revisto e axe verde.*

## Assumptions

- Depende do passo C, da spec 011 (Início) do frontend e da 015 do backend, e da Fase 7 aprovada antes de ligar a opção.
