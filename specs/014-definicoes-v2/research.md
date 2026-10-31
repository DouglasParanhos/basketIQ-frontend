# Research: Definições v2

**R1. Abas como rotas ou como estado? (D-Q1)**
- Decisão: rotas (`/definicoes/perfil`, `/privacidade`, `/conta`) num `SettingsLayout` com `SegmentedTabs` e `Outlet`, como a `TaloesLayout` (spec 009). `/definicoes` redireciona com `replace` para `/definicoes/perfil`. O ecrã de eliminar (`/definicoes/conta/eliminar`) fica fora do layout, como os detalhes sob Talões.
- Porquê: constituição VIII (o que a pessoa vê no URL) e o «Voltar» do navegador regressa à aba anterior; permite a ligação `?editar=meta` do Início; o `AppShell` já deixa «Definições» ativo sob `/definicoes/**`.
- Alternativa rejeitada: `useState` com a aba. Perde-se ao recarregar e não há ligação direta para a meta.
- Efeito: o teste F-98 («`/definicoes` é igual») e o `appConfig.test.tsx` passam a abrir `/definicoes` e a seguir o redirecionamento.

**R2. Como se modela a edição?**
- Decisão: um módulo puro `profileDraft.ts` (rascunho, contagem, validação, corpo do `PATCH`) e um componente `ProfileEditor` com estado local. Sem biblioteca de formulários.
- Porquê: a contagem de alterações e o «só o que mudou» são lógica com bordas (conjuntos, `null`, `[]`, mercados desconhecidos) que se testa sem DOM; a constituição III pede enviar só o que a pessoa mudou.
- O `PATCH` envia só o diferente do guardado. Ao contrário do onboarding, pode enviar `null` e `[]` (a API aceita-os, backend regras do contrato) para apagar a meta, as pessoas, os mercados ou os objetivos.
- Mercados desconhecidos: a API só aceita os suportados no `PATCH`; por isso, quando a lista de mercados muda, filtram-se os identificadores desconhecidos; quando não muda, o campo não é enviado e o mercado antigo mantém-se.

**R3. Reaproveitamento do onboarding.**
- Reaproveita-se: `useProfile`, `useSaveProfile`, `useMerchants`, `isConsentError`, as constantes `PEOPLE_MIN/MAX`, `GOAL_MIN_EUROS/MAX_EUROS`, `initialsOf` e o tipo `Goal` de `features/onboarding/state.ts`.
- Move-se para pastas partilhadas (T002, sem mudar comportamento): `Tick` e `ChoiceCard` de `steps.tsx` para `src/components/Choice.tsx` e `GOAL_OPTIONS` para `src/features/profile/goals.ts`. Os passos do onboarding passam a importá-los; os testes do onboarding não mudam.
- Não se reaproveitam `PeopleStep`, `MerchantsStep` nem `GoalAmountStep`: estão presos ao estado do onboarding (sugestões, «confirmado», «Ainda não sei»). O Perfil tem estados e textos próprios (contador com «—» e «Não indicar», campo livre da meta).
- Alternativa rejeitada: um único componente de formulário para os dois. Acopla dois fluxos com regras opostas (sugerir e confirmar vs. mostrar o guardado e só enviar a diferença).

**R4. Meta em euros (D-Q6).**
- Campo de texto em euros com `inputMode="decimal"`; valor inicial `centsToInput` («300,00»); leitura por `parseEurToCents` (aceita «450», «450,5», «1.234,56»). Válido se 5 000 ≤ cêntimos ≤ 80 000. Vazio = sem meta.
- O onboarding usa passos de 10 € (um controlo guiado para quem ainda não sabe); o Perfil serve quem já sabe o valor.

**R5. Consentimento em falta ao guardar (D-Q8).**
- Já existe: o 403 `privacy_consent_required` invalida `["me"]` (em `useSaveProfile.onError`), a `RequireSession` vê a versão desatualizada e leva a `/privacidade` com `state.from`; depois de aceitar, volta ao Perfil. As alterações por guardar perdem-se (sem rascunhos em armazenamento do navegador, constituição IV). Não se acrescenta código; testa-se que o Perfil não fica a dizer «guardado».
- Alternativa rejeitada: guardar o rascunho num contexto acima da `RequireSession`. É complexidade para um caso raro (a versão só sobe no lançamento, T033 da spec 013).

**R6. Apagar originais em bloco (D-Q9).**
- O `DELETE /v1/receipts/stored-files` apaga no máximo 500 compras e devolve `remaining`. Decisão: o cliente repete até `remaining` ser 0, mostrando «A apagar…» e atualizando a contagem no fim. Para: se a resposta tiver `receipts` 0 com `remaining` > 0 (sem progresso), ou em erro, e mostra quantas compras faltam com «Tentar de novo».
- Porquê: uma pessoa com milhares de compras não deve ter de tocar vezes sem conta; o limite de 500 é do servidor.
- Depois: invalidar `["stored-files"]`, `["receipts"]` e `["receipt"]` (a ficha de uma compra deixa de mostrar o original).
- O apagar usa `Dialog`? Não existe componente de diálogo no repositório: a confirmação é um bloco no próprio ecrã (padrão da eliminação atual), com o foco movido para o seu título.

**R7. Ecrã de eliminar (US4).**
- Mantém o pedido `DELETE /v1/me`, `qc.clear()` e `window.location.assign("/login")` do `SettingsPage` atual. Muda a estrutura (rota própria, lista do que desaparece) e os textos para os do protótipo. O botão da aba passa de «Eliminar conta» a «Eliminar conta…».
- O `SettingsPage.tsx` é removido quando as três abas e o ecrã novo existirem (T017); o rodapé com o nome e a versão passa para o `SettingsLayout`.

**R8. Contas anteriores ao onboarding.**
- A guarda `RequireOnboarding` só olha para `onboarding_completed_at`; uma conta migrada (concluída e vazia) entra normalmente. O Perfil mostra os quatro blocos por definir. Não é preciso lógica nova: o trabalho é o estado vazio ser de primeira classe (texto «Ainda não definiu.», botão «Definir») e a ligação `?editar=meta`.
- A migração do backend ainda não está aplicada (`f6b9c4e2a3d8`); na base de desenvolvimento, uma conta antiga vê o onboarding. Para ver o Perfil vazio basta uma conta que o tenha concluído a saltar tudo.

**R9. Efeito nos testes existentes.**
- `src/routes.test.tsx` F-98 (`/definicoes`); `src/config/appConfig.test.tsx:44` (nome e versão no rodapé); `src/features/features.test.tsx` F-23 (passa a `DeleteAccountPage.test.tsx`); `e2e/mock/ui.spec.ts` («default name is Super Mercado» abre `/definicoes`, que passa a redirecionar); `e2e/stack/journey.spec.ts` (F-23 com os nomes novos). `AppShell.test.tsx` (`["/definicoes", "Definições"]`) continua a servir.
- Mocks: `src/test/server.ts` e `e2e/mock/api.ts` ganham os handlers de `stored-files` (o de perfil e mercados já existe).

**R10. Foco e leitura por ecrã.**
- Ao entrar em edição o foco vai para o título do bloco escolhido (ou para o campo da meta com `?editar=meta`); a contagem «N alterações por guardar» é uma região `status`; ao guardar, «Perfil guardado.» é um `status` e o foco vai para o título «Perfil». Cada escolha (mercado, objetivo) usa a caixa de seleção nativa dentro do `ChoiceCard` com o visto: cor nunca sozinha.

**R11. Identificadores de teste (D-Q10).**
- F-189 a F-194, um por história; o backend 014 usa F-176 a F-182 e o frontend 011 usa F-183 a F-188. Ficam F-195 a F-205 para as specs 012 e 013 do frontend e 015. `traceability.py` não muda.

**R12. Spec 006 e Funcional.**
- A spec 006 (`006-definicoes-dados`) é reestilizada aqui, não substituída: o comportamento de eliminar e terminar sessão mantém-se. Registar F-189 a F-194 na Funcional §12.4 e uma nota na spec 006 na implementação (T025).
