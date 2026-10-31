# Research: Início

**R1. De onde vêm os tipos enquanto o endpoint não existe?**
- Decisão: de lado nenhum. Não se escrevem tipos à mão nem se alarga `schema.d.ts`. A implementação (tarefas de código) só começa quando o backend publicar `overview` no OpenAPI e se correr `corepack pnpm@9 gen:api`. Até lá faz-se especificação, plano, tarefas, análise e a lista de perguntas.
- Porquê: constituição VI («alterações de contrato começam no backend») e a regra «não inventes campos». Tipos à mão esconderiam um desvio do contrato real e os testes do msw passariam contra uma resposta que o backend não devolve.
- Alternativa rejeitada: um tipo local provisório (como se fez com `smart_list_enabled` na spec 009, depois removido na T023). Aceitável para um campo; para uma resposta com três listas, o risco de desvio é grande.
- Estado a 2026-10-31: o backend 014 já tem o contrato **escrito** (`contracts/api.md`, commits `ff3a090` e `ba3512f`), que responde a C1 a C9 e C11 e já traz o `status` das últimas compras (Q7) (ver `contracts/overview-api.md`). Falta o OpenAPI publicado.
- Consequência: a T001 das tarefas é uma verificação de pré-requisito («`overview` existe em `schema.d.ts` e os tipos batem com o contrato escrito»); se falhar, parar.

**R2. Um pedido ou vários? E a cache?**
- Decisão: um só `GET /v1/analytics/overview?month=YYYY-MM` por mês mostrado (US5.6). O cliente não usa `summary` nem `consumption` no Início.
- Porquê: é o contrato da 014 («núcleo do Início») e mantém o p95 medido no backend.
- Cache: chave `["overview", month]`, `staleTime` 30 s, releitura ao focar a janela.
- **Invalidação (tarefa nesta spec):** As mutações atuais invalidam `["summary"]` e/ou `["receipts"]` e nada invalida `["overview"]` (verificado: `ReceiptPage.tsx:152` e `302-303`, `ReviewEditor.tsx:70-71`, `useUpload.ts:109`, que só invalida `receipts`; `useSaveProfile` só grava o perfil na cache). Com `staleTime` de 30 s, confirmar ou eliminar uma compra e abrir o Início logo a seguir mostraria valores antigos como atuais. Decisão: invalidar também `["overview"]` nos cinco pontos: apagar compra (`ReceiptPage`), editar/confirmar (`ReviewEditor`), decisão de duplicado (`DuplicateChoice`), fim do envio (`useUpload`, porque as últimas compras passaram a incluir as que estão em processamento) e `useSaveProfile.onSuccess` (a meta muda o anel). São as tarefas T035 a T039 desta spec, não das specs 013 e 014 do frontend. Alternativa rejeitada: `staleTime` 0 (um pedido a cada visita ao Início, contra o US5.6 «um pedido por mês mostrado»).

**R3. Composição e ordem dos cartões (D-P9, aprovado).**
- Decisão: seguindo o HomeF sem os cartões da lista e da comparação: cabeçalho de mês; anel; média mensal e compras no mês lado a lado (em 320 px, em coluna); gasto por semana; «Onde gasta mais»; últimas compras.
- Estados: com dados; sem meta (anel vazio, o resto igual); conta vazia (`empty`): cartões tracejados com o que cada um desbloqueia; carregamento (indicador, sem valores); erro («Tentar de novo»).
- «Poucos dados»: o HomeF mostra «0/3 meses» no cartão da lista; sem esse cartão, o progresso («0/2 meses») usa `average_months` e `average_min_months` da API (C1 respondida).
- Gasto por semana: sem «média por semana» enquanto a API não a devolver (C15, D-P14): o cliente não calcula médias (constituição III).

**R4. Cores do anel e token laranja (D-P3, aprovado).**
- Verde `--color-ok`, vermelho `--color-alert` (README). Laranja: o README manda `--color-marker` (+ `--color-marker-ink`), mas `--color-marker` é o amarelo #ffc928, contraste fraco como traço de 16 px sobre `--color-paper` (1,5:1 medido a 2026-10-31; o gráfico precisa de ≥ 3:1). O laranja do protótipo, #c2691a, dá 3,9:1 sobre `--color-paper` (e `--color-ok` 5,7:1, `--color-alert` 6,5:1); o modo escuro mede-se na implementação.
- Decisão (Liz, 2026-10-31): acrescentar `--color-warn` (laranja do protótipo, #c2691a no claro, par escuro derivado) e `--color-warn-soft` para o chip, e verificar a razão de contraste de cada par (traço sobre fundo ≥ 3:1; texto do chip ≥ 4,5:1) em claro e escuro. A decisão D1 do plano UX fica fechada com isto.
- O axe não mede o contraste de gráficos (≥ 3:1): a verificação é um teste que calcula a razão dos pares de tokens (traço do anel e das barras sobre `--color-paper`, em claro e escuro), na T009.

**R5. Texto acima da meta (D-P1, aprovado).**
- Decisão: «Acima da meta pessoal este mês · 52,00 € além da meta». Escolha pelo sinal de `goal_cents − spent_cents` (inteiros), não por `goal_pct`, que arredonda (100,4 % mostra 100). Igual à meta: «Reta final · saldo da meta: 0,00 €».
- Nunca: «excedeu», «perdeu», «negativo», sinal de menos, «limite». O anel enche-se (traço limitado a 100 %).
- Caso a testar: `goal_pct` 100 com saldo positivo (39 900/40 000 = 99,75 % → 100): «Reta final · saldo da meta: 1,00 €» com 100 %.

**R6. Cartão da média (D-P2 e D-P12, aprovados).**
- Fundo: verde suave se abaixo, vermelho suave se acima (RF-15), neutro sem fundo colorido se «na média», sem tendência ou sem média. O texto diz sempre o mesmo que a cor, sem ícone de alarme.
- «Na média»: o backend decide (`average_trend`, limiar `AVERAGE_ON_TARGET_PCT` = 5). O cliente mapeia `below`/`on_average`/`above` e mostra o valor absoluto de `recent_vs_average_pct`; não aplica limiares.
- Sinal: negativo = abaixo (C2 respondida).
- A média e a tendência não dependem do mês pedido (C11 respondida, backend R4): o cartão é igual em todos os meses.
- Média presente com tendência nula (2 meses de dados): D-P13, texto proposto «Tendência: ainda sem meses suficientes».

**R7. Formato dos euros (D-P4, aprovado).**
- `formatCents` (já existe; «248,00 €»). O protótipo mostra «€ 248» (convenção brasileira, sem cêntimos); o pt-PT escreve «248,00 €» e uma soma gasto + saldo com euros arredondados pode não bater no ecrã (201,60 € + 198,40 € mostrados como 202 + 198).

**R8. Meses (D-P5, aprovado).**
- `?mes=YYYY-MM` no URL (constituição VIII: período no URL). Sem `mes` ou inválido → mês corrente de Lisboa. «Mês anterior» e «Mês seguinte» são botões que mudam o parâmetro com `push` (o «Voltar» do navegador regressa ao mês anterior). «Mês seguinte» desativado no mês corrente. Um mês futuro escrito à mão mostra zeros (a API devolve zeros).
- Rótulo: «Este mês» no corrente; nos outros, mês e ano por extenso («setembro de 2026», com `formatMonth`); por baixo, o intervalo («1 – 30 set. 2026»).
- O mês corrente de Lisboa calcula-se com `lisbonToday()`; na viragem de mês o cliente e o servidor podem divergir segundos: o cliente envia sempre `month` explícito, que a API aceita e devolve (C9 respondida).
- Rótulo das compras: «Mês passado: N» no mês corrente; «Mês anterior: N» nos outros (D-P10).

**R9. A meta não tem histórico (D-P7, decidido).**
- O perfil guarda uma só meta e a API devolve sempre a meta atual (C8 respondida). Um mês passado mostra o gasto desse mês contra a meta de hoje, **com a nota «Meta atual»** junto ao valor da meta (e «… da meta atual usada» na alternativa em texto do anel), para não parecer que era a meta daquele mês.

**R10. «Definir a minha meta pessoal» (D-P8, aprovado).**
- Aponta para `/definicoes` até a spec 014 do frontend fixar a rota de edição da meta; quando existir, passa a essa rota (uma constante, um teste). O lançamento espera pelo Perfil (decisão da Liz, 2026-10-30).

**R11. Efeito nos testes e nos mocks existentes.**
- `RequireOnboarding.test.tsx`, `OnboardingPage.test.tsx`, `routes.test.tsx`, `AppShell.test.tsx`, `HomeRoute.test.tsx` e os e2e abrem `/` e esperam o título «Início». (`features.test.tsx` não contém o Início.) Com a página nova, `/` faz um pedido a `overview`; com `onUnhandledRequest: "error"` esses testes falham sem handler. Tarefa: handler por omissão em `src/test/server.ts` (resposta sintética com dados) e em `e2e/mock/api.ts`. O teste F-95 da página provisória («Ver resumo») em `HomeRoute.test.tsx` fica obsoleto e é substituído; os F-96 do redirecionamento mantêm-se.
- O projeto `stack` (`journey.spec.ts`) abre o Início depois do onboarding e espera o título «Início»: deve continuar a passar, mas só se corre com o backend a ter `overview`.

**R12. Spec 004 e Funcional.**
- Registar o anel de três faixas como exceção a «gráficos de série única» na spec 004 (US5.5, D7), na implementação. Sem alteração da Funcional além da nota RF-15 já feita.

**R13. Últimas compras com estado (Q7 mudou, decisão da Liz 2026-10-31).**
- As últimas compras incluem as que requerem revisão ou estão em processamento, com `status`. O backend já o registou (`status`: `ReceiptStatus`, sem os estados de erro). O ecrã mostra o estado como texto e ícone, com os rótulos de `STATUS` (`src/lib/status.ts`), nunca só cor (US4.6), e uma compra não confirmada só aparece na sua linha: o gasto, as semanas e os mercados são de confirmadas.
- O total pode ser nulo (compra em processamento): «—».

**R14. Identificadores de teste (D-P6, decidido).**
- F-183 a F-188, um por história. O backend 014 usa F-176 a F-182. `traceability.py` do backend não muda. A reserva F-176 a F-205 fica assim: backend 014 F-176 a F-182; frontend 011 F-183 a F-188; F-189 a F-205 para as seguintes (frontend 012, 013, 014 e backend 015).
