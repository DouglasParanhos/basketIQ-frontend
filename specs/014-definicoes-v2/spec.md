# Feature Specification: Definições v2 (Perfil, Privacidade e Conta)

**Feature Branch**: `014-definicoes-v2`

**Created**: 2026-10-30

**Status**: Especificada em 2026-10-31 (dia, sem supervisão). **Pode ser implementada:** o backend da spec 013 está enviado e `src/api/schema.d.ts` já tem `GET/PATCH /v1/me/profile`, `GET /v1/merchants` e `GET/DELETE /v1/receipts/stored-files`. **O lançamento da UX v2 espera por esta spec** (decisão da Liz, 2026-10-30): é aqui que as contas anteriores ao onboarding passam a poder definir a meta e as preferências.

**Input**: Especificação Funcional v1.4 §8, RF-12, RF-13, RF-14; `Documentation/Super Mercado_—_Plano_de_Implementação_UX_v2.md` (Fase 6, D3, D8, decisão 17); `Documentation/design-ux-v2/DefinicoesV2.dc.html` (layout) e `README.md` (textos pt-PT e o que não se implementa). Backend: `../basketIQ-backend/specs/013-perfil-utilizador` (`contracts/api.md`). Specs relacionadas: `006-definicoes-dados` (reestilizada aqui), `009-navegacao-5-botoes` (`SegmentedTabs`), `010-onboarding` (perfil, mercados, guarda), `011-inicio` (liga aqui «Definir a minha meta pessoal»).

**Convenção de rastreabilidade**: cada critério cita o RF da Especificação Funcional. Os testes do frontend levam o identificador no nome (`F-xx: …`). Identificadores **F-189 a F-194**, um por história (o backend 014 usa F-176 a F-182 e o frontend 011 usa F-183 a F-188); por confirmar pela Liz (D-Q10). Os cenários do perfil, dos ficheiros originais e do consentimento são «Verificado no Backend» (F-100 a F-112); aqui verifica-se o que o ecrã mostra e envia.

**Fora desta spec:** os lembretes semanais («Lembretes para lançar talões»): não existem na v1 e o interruptor não aparece (README, decisão de 2026-10-30). O texto «Ajusta as comparações» do protótipo também não: as comparações entre mercados são da spec 015. A lista de dados apagados com a lista inteligente ativa (spec 015) acrescenta-se lá.

## Clarifications

### Session 2026-10-31

Respostas deduzidas dos documentos (plano UX v2, README de design, spec 013 do backend, specs 009, 010 e 011, código atual), dadas sem supervisão: a recomendada fica registada e as de produto levam «por confirmar pela Liz» com o código D-Q. Vão todas para o relatório `Documentation/ANALISE_spec014_frontend_2026-10-31.md`.

- Q: Os lembretes semanais aparecem? → A: não (README: «Não aparece na v1»). Fecha o NEEDS CLARIFICATION da Fase 0.
- Q: Que versão da política se mostra? → A: a real, a que a pessoa aceitou (`privacy_version` de `GET /v1/me`, por exemplo «2026-10-15»), não «versão 1.0» do protótipo (README). A data é `privacy_accepted_at`.
- Q: As abas são rotas ou estado? → A: rotas, como Compras · Resumo · Produtos (spec 009): `/definicoes/perfil`, `/definicoes/privacidade`, `/definicoes/conta`; `/definicoes` redireciona (substituindo) para `/definicoes/perfil`. O ecrã de eliminar é a rota própria `/definicoes/conta/eliminar`, fora do layout das abas. O teste F-98 («`/definicoes` mantém-se») passa a verificar o redirecionamento. **Por confirmar pela Liz (D-Q1).**
- Q: Como é que o Início leva à edição da meta? → A: `/definicoes/perfil?editar=meta` abre o Perfil já em modo de edição, com o foco no campo da meta. Substitui o `/definicoes` provisório do botão «Definir a minha meta pessoal» (spec 011, D-P8). **Por confirmar pela Liz (D-Q2).**
- Q: Cada «Editar» abre o seu bloco ou o perfil todo? → A: o perfil todo: qualquer «Editar» entra no modo «Editar perfil» (como o protótipo, com «Cancelar» e «Guardar alterações») com o foco no bloco escolhido. Não há quatro modos de edição independentes. **Por confirmar pela Liz (D-Q3).**
- Q: O que conta como «alteração»? → A: cada diferença em relação ao perfil guardado: pessoas alteradas = 1; meta alterada ou apagada = 1; cada mercado ou objetivo acrescentado ou retirado = 1. «3 alterações por guardar» no protótipo (meta e dois mercados) é coerente com isto. Com 0 alterações, «Guardar alterações» fica desativado. **Por confirmar pela Liz (D-Q4).**
- Q: «Cancelar» com alterações pede confirmação? → A: sim, no próprio ecrã: «Descartar as N alterações?» com «Descartar» e «Continuar a editar». Sem alterações, cancela de imediato. A spec diz que ações que perdem trabalho pedem confirmação explícita; o custo é um toque. **Por confirmar pela Liz (D-Q5).**
- Q: O que se envia ao guardar? → A: só os campos alterados (constituição III): `household_size`, `merchants`, `goals`, `monthly_goal_cents`. Apagar a meta envia `monthly_goal_cents: null`; tirar todos os mercados ou objetivos envia `[]` (é o que a API aceita, ao contrário do onboarding, que nunca envia `null` nem `[]`). **Nunca** se envia `onboarding_completed`: o Perfil não mexe nele. Um pedido inválido não grava nada (backend, regra 2).
- Q: Como se introduz a meta? → A: um campo em euros (aceita «450», «450,50»), validado antes de enviar: de 50,00 € a 800,00 €, senão «A meta tem de estar entre 50 € e 800 €.» e não envia. Campo vazio = sem meta. O onboarding usa passos de 10 €; no Perfil a pessoa pode escrever o valor exato. **Por confirmar pela Liz (D-Q6).**
- Q: E as pessoas? → A: dois botões «Menos uma pessoa» e «Mais uma pessoa» de 1 a 12, como no onboarding; o valor atual é o guardado (sem sugestão de 2). Para apagar o número de pessoas há a ação «Não indicar»: envia `household_size: null`. **Por confirmar pela Liz (D-Q7).**
- Q: Os objetivos têm o atalho «Todas as anteriores»? → A: não; são três caixas, com os mesmos rótulos do onboarding.
- Q: Que acontece se a política mudou a meio (403 `privacy_consent_required`)? → A: o comportamento que já existe: `["me"]` fica invalidada, a guarda leva a pessoa a `/privacidade` e depois de aceitar volta ao Perfil. **As alterações por guardar perdem-se** (nada de rascunhos em `localStorage`, constituição IV). Como a versão da política só sobe no lançamento (T033 da spec 013), é raro. O texto «A política de privacidade mudou. Confirme-a para continuar.» aparece na página de consentimento, não aqui. **Por confirmar pela Liz (D-Q8).**
- Q: «Apagar agora» apaga tudo de uma vez? → A: o servidor apaga no máximo 500 compras por chamada e devolve `remaining`. O cliente repete a chamada até `remaining` ser 0, com «A apagar…» e o contador; se uma chamada falhar, mostra quantas compras ficam por apagar e «Tentar de novo». **Por confirmar pela Liz (D-Q9)** (alternativa: uma chamada e «Apagar mais»).
- Q: Onde fica o painel do operador? → A: na aba Conta, só para quem tem o papel de operador, como hoje (não muda). O rodapé com o nome e a versão da aplicação mantém-se em todas as abas.
- Q: Que texto tem a lista da eliminação? → A: a do protótipo: compras e talões lidos, ficheiros originais, perfil/meta/preferências, acesso com a conta Google. Com a lista inteligente ativa (spec 015) passa a incluir as listas; fica para essa spec.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cabeçalho da conta e abas (Priority: P1)

**Why this priority**: é a estrutura de todo o ecrã e o ponto de entrada da barra de navegação.

**Independent Test**: layout das Definições na tabela real de rotas com msw.

**Acceptance Scenarios**:

1. **Given** as Definições, **When** abrem, **Then** vêm o título «Definições», o cabeçalho com a inicial, «Conta Google» e o e-mail, e as abas Perfil, Privacidade e Conta. — §8, RF-12
2. **Given** `/definicoes`, **When** abre, **Then** vai para `/definicoes/perfil` (substituindo a entrada no histórico, para o «Voltar» não ficar preso) e a aba Perfil fica ativa. — §8
3. **Given** as abas, **When** usadas por teclado, **Then** comportam-se como o componente partilhado da spec 009 (setas, Início e Fim movem o foco; Enter ou Espaço ativam) e cada aba tem a sua rota. — §8
4. **Given** os lembretes semanais, **When** as Definições abrem, **Then** o interruptor não aparece em nenhuma aba. — D3, README
5. **Given** a barra de navegação, **When** a pessoa está em qualquer rota sob `/definicoes`, **Then** «Definições» fica ativo. — spec 009
6. **Given** qualquer aba, **When** é mostrada, **Then** o rodapé com o nome e a versão da aplicação mantém-se e há um só `<h1>`. — RF-12, §8

---

### User Story 2 - Perfil: ler, editar e guardar (Priority: P1)

**Why this priority**: é o único sítio onde as contas anteriores ao onboarding definem a meta, e onde as novas corrigem o que responderam.

**Independent Test**: `ProfileTab` e o rascunho puro com respostas sintéticas.

**Acceptance Scenarios**:

1. **Given** um perfil, **When** abre a aba, **Then** vê quatro blocos: pessoas na casa, onde faz compras, meta pessoal do mês («Um objetivo seu, não um limite.») e objetivos, cada um com «Editar». — RF-13
2. **Given** um perfil vazio (conta anterior ao onboarding ou que saltou os passos), **When** abre, **Then** cada bloco diz que ainda não está definido e o botão diz «Definir». — RF-13, RF-14
3. **Given** «Editar» num bloco, **When** a pessoa o toca, **Then** entra no modo «Editar perfil» com os valores guardados, com o foco no bloco escolhido, e «Guardar alterações» está desativado até haver uma alteração. — RF-13
4. **Given** o modo de edição, **When** a pessoa altera pessoas, mercados, meta ou objetivos, **Then** vê «N alterações por guardar» (singular «1 alteração por guardar») e «Guardar alterações» fica ativo. — RF-13 (contagem: D-Q4)
5. **Given** alterações por guardar, **When** toca «Cancelar», **Then** vê «Descartar as N alterações?» com «Descartar» e «Continuar a editar»; «Descartar» volta à leitura com o perfil guardado; sem alterações, cancela de imediato. — RF-13 (D-Q5)
6. **Given** alterações válidas, **When** toca «Guardar alterações», **Then** é enviado um único pedido só com os campos alterados, a leitura mostra o perfil devolvido com a confirmação «Perfil guardado.» (região `status`, para o leitor de ecrã) e o Início usa a nova meta (cache `["overview"]` invalidada). — RF-13, RF-15
7. **Given** o envio falha (rede ou erro do servidor), **When** a pessoa guarda, **Then** mantém-se em edição com «Não foi possível guardar. Tente de novo.», sem perder as alterações, e pode repetir. — RF-13
8. **Given** pessoas fora de 1 a 12 ou meta fora de 50,00 a 800,00 €, **When** guarda, **Then** os botões das pessoas param nos limites, a meta mostra «A meta tem de estar entre 50 € e 800 €.» e nada é enviado. — RF-13
9. **Given** a meta, **When** a pessoa esvazia o campo e guarda, **Then** é enviado `monthly_goal_cents: null`, o perfil fica sem meta e o Início mostra «Definir a minha meta pessoal». — RF-13, RF-15
10. **Given** o consentimento da política atual em falta, **When** guarda, **Then** nada fica gravado e a pessoa é levada a aceitar a política (o comportamento da guarda); depois volta ao Perfil. — RF-12, RF-13 (D-Q8)
11. **Given** `/definicoes/perfil?editar=meta`, **When** abre, **Then** o Perfil está em edição com o foco no campo da meta. — RF-13, RF-15 (D-Q2)
12. **Given** a lista de mercados não carrega, **When** a pessoa edita, **Then** vê o aviso «Não foi possível carregar os mercados.» com «Tentar de novo»; os restantes campos continuam editáveis e os mercados guardados não se perdem. — RF-13
13. **Given** mercados guardados que a API já não lista (deixaram de ser suportados), **When** a pessoa edita e guarda sem mexer nos mercados, **Then** o campo `merchants` não é enviado; se mexer nos mercados, os não suportados deixam de constar, porque a API só aceita os suportados. — RF-13, backend regra 5
14. **Given** o perfil, **When** é mostrado ou guardado, **Then** a meta nunca é calculada nem sugerida pela aplicação e nada de perfil fica em `localStorage`. — constituição III e IV

---

### User Story 3 - Privacidade e originais (Priority: P1)

**Independent Test**: `PrivacyTab` com respostas sintéticas de `stored-files`.

**Acceptance Scenarios**:

1. **Given** a aba, **When** abre, **Then** vê «Política de privacidade», «Aceite a <data> · versão <versão aceite>» e a ligação «Ler a política» para `/privacidade`. — RF-12
2. **Given** a aba, **When** abre, **Then** vê que os originais (fotos e PDF) são apagados automaticamente 30 dias depois de confirmar a compra e que os valores ficam. — RF-12
3. **Given** originais guardados, **When** abre, **Then** vê «N ficheiros guardados agora» (singular «1 ficheiro guardado agora») e «Apagar agora». — RF-12
4. **Given** «Apagar agora», **When** a pessoa o toca, **Then** vê uma confirmação que diz a consequência: as compras e os valores ficam; as fotos e os PDF desaparecem e não é possível recuperá-los. — RF-12
5. **Given** a confirmação, **When** a pessoa a aceita, **Then** o ecrã repete o apagar até não restar nenhuma compra por tratar, o contador passa a 0 e as compras mantêm-se (a ficha de uma compra deixa de oferecer o original). — RF-12, F-22a
6. **Given** nenhum original, **When** abre, **Then** vê «Nenhum ficheiro guardado» e «Apagar agora» desativado. — RF-12
7. **Given** o apagar falha, **When** acontece, **Then** vê um erro acionável com quantas compras ficam por tratar e «Tentar de novo», e o contador reflete o que o servidor diz. — RF-12
8. **Given** «Os seus direitos», **When** abre, **Then** lê o texto e as ações existentes (ver e apagar compras uma a uma, apagar só o original, eliminar a conta). — RF-12
9. **Given** a contagem a carregar ou em erro, **When** abre, **Then** vê o indicador ou o erro com «Tentar de novo» e nenhum número inventado. — constituição III
10. **Given** uma nova versão da política, **When** a pessoa entra, **Then** é pedida a aceitação antes de guardar dados novos, pela guarda que já existe; esta aba mostra a versão que aceitou. — RF-12, RF-13, D8

---

### User Story 4 - Conta: terminar sessão e eliminar (Priority: P1)

**Independent Test**: `AccountTab` e `DeleteAccountPage` com msw; o F-23 adaptado.

**Acceptance Scenarios**:

1. **Given** a aba, **When** abre, **Then** vê «Entrou com Google · e-mail», «Terminar sessão», «Eliminar conta» e, só para operadores, a ligação ao painel do operador. — RF-01, RF-12
2. **Given** «Eliminar conta…», **When** a pessoa o toca, **Then** vai a `/definicoes/conta/eliminar`, um ecrã próprio com «Isto não pode ser desfeito» e a lista do que desaparece. — F-23
3. **Given** a lista, **When** é lida, **Then** inclui compras e talões lidos, ficheiros originais, perfil/meta/preferências e o acesso com a conta Google. — F-23, RF-13
4. **Given** o ecrã, **When** a caixa «Compreendo que os meus dados serão eliminados e que não é possível recuperá-los.» não está marcada, **Then** «Eliminar a minha conta» está desativado. — F-23
5. **Given** a confirmação, **When** elimina, **Then** a pessoa é levada ao login, a cache é limpa e os dados desaparecem. — F-23
6. **Given** «Cancelar», **When** é tocado, **Then** volta às Definições (aba Conta) sem eliminar nada. — F-23
7. **Given** o comportamento atual, **When** é reestilizado, **Then** o pedido, a limpeza da cache e o redirecionamento não mudam. — plano Fase 6
8. **Given** a eliminação falha, **When** acontece, **Then** a pessoa vê o erro, o ecrã mantém-se e nada foi eliminado. — F-23

---

### User Story 5 - Contas anteriores ao onboarding (Priority: P1)

*Acrescentada em 2026-10-31: a decisão de 2026-10-30 (onboarding só para contas novas) faz do Perfil o único sítio onde as contas existentes definem a meta e as preferências.*

**Independent Test**: `ProfileTab` com um perfil «migrado» (`onboarding_completed_at` preenchido, restantes campos vazios) e a ligação do Início.

**Acceptance Scenarios**:

1. **Given** uma conta anterior ao onboarding (concluída e sem respostas), **When** abre as Definições, **Then** vê o Perfil com os quatro blocos por definir e nenhum redirecionamento para `/boas-vindas`. — RF-14
2. **Given** essa conta no Início, **When** toca «Definir a minha meta pessoal», **Then** chega a `/definicoes/perfil?editar=meta` em edição, com o foco na meta. — RF-13, RF-15
3. **Given** essa conta, **When** define a meta e guarda, **Then** é enviado só `monthly_goal_cents` (sem `onboarding_completed`, sem `null`s, sem listas vazias dos outros blocos) e o Início passa a mostrar o anel com meta. — RF-13, RF-15
4. **Given** essa conta, **When** define pessoas, mercados e objetivos no mesmo guardar, **Then** é enviado um só pedido com esses quatro campos. — RF-13
5. **Given** uma conta que ainda não concluiu o onboarding, **When** abre `/definicoes/perfil`, **Then** a guarda leva-a a `/boas-vindas`: o Perfil não substitui o onboarding de contas novas. — RF-14, spec 010
6. **Given** a conta que definiu a meta no Perfil, **When** volta ao Início, **Then** os valores são os novos (não os de há segundos). — constituição III

---

### User Story 6 - Qualidade (Priority: P1)

**Acceptance Scenarios**:

1. **Given** cada aba e o ecrã de eliminar, **When** corre o axe em claro e escuro de 320 a 820 px, **Then** não há violações. — §8, §10
2. **Given** os testes, **When** correm, **Then** há testes de edição e cancelamento, de guardar com erro e com consentimento em falta, de apagar originais, de eliminação (F-23) e das contas anteriores ao onboarding. — plano Fase 6
3. **Given** os textos, **When** são revistos, **Then** estão em português europeu conforme a tabela do `README.md` (por exemplo «não é possível recuperá-los» em vez de «dá para recuperá-los», «Aceite a … » sem «você»). — §8
4. **Given** nenhum dado de perfil, **When** a aplicação corre, **Then** nada fica em `localStorage` nem `sessionStorage`. — constituição IV
5. **Given** a 320 px, **When** qualquer aba é mostrada, **Then** não há scroll horizontal e todos os alvos de toque têm pelo menos 44 px. — §8
6. **Given** o estado de uma escolha (mercado, objetivo), **When** é lido, **Then** a cor nunca é o único sinal (visto de marca, texto). — §8, constituição V

### Edge Cases

- Perda de rede ao guardar: o modo de edição mantém-se com as alterações.
- A sessão expira ao guardar (401): tratado globalmente (`sessionLost`); as alterações perdem-se com a sessão.
- Ações destrutivas (apagar originais, eliminar conta) pedem sempre confirmação explícita no próprio ecrã.
- Dois dispositivos a editar: ganha o último a guardar, porque o `PATCH` só envia os campos alterados e não há versão (backend 013).
- Rota desconhecida sob `/definicoes/…`: página «Não foi possível mostrar esta página» (a de qualquer rota inexistente).
- Perfil que a API devolve com um mercado fora da lista de mercados: aparece na leitura pelo identificador e mantém-se se a pessoa não o retirar (US2.13).
- Atalho do navegador «Voltar» a partir de `/definicoes/conta/eliminar` leva à aba Conta.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: As Definições MUST ter o título «Definições», o cabeçalho da conta (inicial, «Conta Google», e-mail) e as abas Perfil, Privacidade e Conta como rotas (`/definicoes/perfil`, `/definicoes/privacidade`, `/definicoes/conta`); `/definicoes` MUST redirecionar (`replace`) para `/definicoes/perfil`. — US1, D-Q1
- **FR-002**: O interruptor de lembretes semanais MUST NOT aparecer. — US1.4
- **FR-003**: O Perfil MUST mostrar pessoas, mercados, meta e objetivos a partir de `GET /v1/me/profile`, com «Definir» nos blocos sem valor, e MUST NOT mostrar sugestões como se fossem valores guardados. — US2.1, US2.2, constituição III
- **FR-004**: O modo «Editar perfil» MUST mostrar a contagem de alterações pela regra da D-Q4, desativar «Guardar alterações» sem alterações e pedir confirmação ao cancelar com alterações. — US2.3 a US2.5
- **FR-005**: «Guardar alterações» MUST enviar um único `PATCH /v1/me/profile` só com os campos alterados, `null` para a meta apagada ou o número de pessoas retirado, `[]` para uma lista esvaziada, e MUST NOT enviar `onboarding_completed`. A resposta substitui a cache `["profile"]` e invalida `["overview"]`. — US2.6, US2.9, US5.3
- **FR-006**: A validação MUST fazer-se antes de enviar: pessoas de 1 a 12; meta de 50,00 a 800,00 € em cêntimos inteiros (`parseEurToCents`); a mensagem diz o limite. O servidor pode devolver 422 e a mensagem do campo mostra-se. — US2.8, constituição II
- **FR-007**: Em erro de rede ou 5xx o modo de edição MUST manter as alterações; em 403 `privacy_consent_required` aplica-se o comportamento existente da guarda. — US2.7, US2.10
- **FR-008**: `?editar=meta` MUST abrir o Perfil em edição com o foco na meta. — US2.11, US5.2
- **FR-009**: Os mercados MUST vir de `GET /v1/merchants` (os 7 suportados, com nome); mercados guardados desconhecidos MUST conservar-se se não forem retirados. — US2.12, US2.13
- **FR-010**: A aba Privacidade MUST mostrar a versão e a data da política aceite (reais), a retenção de 30 dias, a contagem de ficheiros guardados (`GET /v1/receipts/stored-files`), «Apagar agora» com confirmação (`DELETE`, repetido até `remaining` = 0) e «Os seus direitos». — US3
- **FR-011**: Depois de apagar originais, as caches `["stored-files"]`, `["receipts"]` e `["receipt"]` MUST invalidar-se; as compras e os valores não mudam. — US3.5
- **FR-012**: A aba Conta MUST ter «Terminar sessão», «Eliminar conta…» e, para operadores, a ligação ao painel; a eliminação MUST ter ecrã próprio (`/definicoes/conta/eliminar`) com a lista do que desaparece, a caixa de compreensão e «Cancelar», e MUST manter o pedido `DELETE /v1/me`, a limpeza da cache e o redirecionamento para `/login`. — US4
- **FR-013**: Contas anteriores ao onboarding MUST usar o Perfil sem passar por `/boas-vindas`; contas sem onboarding concluído MUST continuar a ser levadas a `/boas-vindas` pela guarda da spec 010. — US5.1, US5.5
- **FR-014**: Todo o texto MUST estar em português europeu conforme a tabela do `README.md` de `design-ux-v2`; nenhum estado depende só da cor; alvos ≥ 44 px; sem scroll horizontal a 320 px. — US6
- **FR-015**: Nada do perfil nem do estado de edição MUST ficar em `localStorage` nem `sessionStorage`. — US6.4, constituição IV

### Key Entities

- **Perfil** (`ProfileOut`): `household_size` (1 a 12 ou nulo), `merchants` (identificadores de `GET /v1/merchants`), `goals` (`finances`, `shopping_list`, `savings`), `monthly_goal_cents` (5 000 a 80 000 ou nulo), `onboarding_completed_at`. O Perfil nunca altera o último.
- **Rascunho de edição**: estado local de apresentação (pessoas, mercados, objetivos, texto da meta); a diferença para o perfil guardado dá a contagem e o corpo do `PATCH`.
- **Ficheiros guardados**: `{ files }` e, ao apagar, `{ files_deleted, receipts, remaining }`.
- **Conta** (`MeOut`): nome, e-mail, papel, `privacy_version`, `privacy_accepted_at`, `current_privacy_version`, `created_at`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma conta anterior ao onboarding define a meta no Perfil em no máximo 3 toques a partir do Início (botão, escrever o valor, guardar), e o Início mostra o anel com meta logo a seguir (F-193).
- **SC-002**: Em 100 % dos testes de guardar, o corpo do `PATCH` tem exatamente os campos alterados e nunca `onboarding_completed` (F-190, F-193).
- **SC-003**: Uma pessoa percebe, só pelo texto e sem ver cores, o que está escolhido nos mercados e nos objetivos (F-190, F-194).
- **SC-004**: Zero violações do axe em cada aba e no ecrã de eliminar, em claro e escuro, a 320, 375, 430 e 820 px, sem scroll horizontal a 320 px (F-194).
- **SC-005**: Nenhum dado de perfil em `localStorage` nem `sessionStorage` (F-194).
- **SC-006**: Os testes existentes de eliminação (F-23) e de originais (F-22a) passam adaptados; `lint`, `typecheck`, Vitest e `e2e:mock` passam.
- **SC-007**: «Apagar agora» deixa o contador a 0 com até 500 × N compras e nunca apaga compras nem valores (F-191).

## Assumptions

- Depende da spec 013 do backend (perfil, mercados, ficheiros guardados e consentimento por versão, enviada), da spec 009 do frontend (`SegmentedTabs`, navegação) e da spec 010 (`useProfile`, `useSaveProfile`, `useMerchants`, a guarda `RequireOnboarding`). Os tipos já estão em `src/api/schema.d.ts`.
- A migração do backend que marca as contas existentes como concluídas está desenhada (spec 013, `f6b9c4e2a3d8`) e **ainda não aplicada**; até ser, uma conta antiga na base de desenvolvimento vê o onboarding. Isto não afeta o Perfil.
- A versão da política só sobe no lançamento (T033 da spec 013); por isso o 403 por consentimento é raro e as alterações não guardadas perdem-se (D-Q8).
- O botão «Definir a minha meta pessoal» da spec 011 aponta para `/definicoes/perfil?editar=meta` quando esta spec for implementada; até lá aponta para `/definicoes`.
- **Identificadores de teste propostos (por confirmar pela Liz, D-Q10):** F-189 a F-194; ficam F-195 a F-205 para as specs 012 e 013 do frontend e a 015. `traceability.py` do backend não muda.

## Identificadores de teste (constituição VII)

| ID | O que verifica | Critérios | Tarefas |
|---|---|---|---|
| F-189 | Cabeçalho, abas como rotas, redirecionamento, teclado, sem lembretes, barra ativa | US1.1 a US1.6 | T006 a T008 |
| F-190 | Perfil: leitura, vazio, edição, contagem, cancelar, guardar só o alterado, erros, validação, mercados | US2.1 a US2.14 | T004, T005, T009 a T011 |
| F-191 | Privacidade: versão real, retenção, contagem, apagar com confirmação, repetir até `remaining` 0, erros | US3.1 a US3.10 | T012 a T014 |
| F-192 | Conta: sessão, eliminar em ecrã próprio, F-23 adaptado | US4.1 a US4.8 | T015 a T017, T024 |
| F-193 | Contas anteriores ao onboarding: Perfil vazio, ligação do Início, só a meta, guarda | US5.1 a US5.6 | T018, T019 |
| F-194 | Qualidade: axe, larguras, texto, sem `localStorage`, alvos, cor | US6.1 a US6.6 | T020 a T023 |
