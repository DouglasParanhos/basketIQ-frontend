# Research: Onboarding

Cada ponto resolve uma dúvida do contexto técnico ou da spec. As decisões da Liz (P1 a P5, C1, I3, E1) estão no `plan.md`.

**R1. Onde fica a guarda do onboarding e como evita o piscar do Início?**
- Decisão: `RequireOnboarding` (layout de rota) dentro de `Protected` e **acima** do AppShell (R14). Lê `useProfile()`; enquanto carrega, mostra `Spinner` (não renderiza o Início); com `onboarding_completed_at` nulo, `<Navigate to="/boas-vindas" replace />`; com erro na leitura, **deixa passar** (renderiza `<Outlet/>`).
- Porquê: a US3.5 pede «sem piscar» e a US3.6 «não ficar bloqueada». `RequireSession` já trata login e consentimento antes (a guarda corre depois, US3.2). `GET /v1/me/profile` só exige sessão (contrato da 013, regra 4), por isso responde mesmo com a política desatualizada.
- Alternativa: pôr a lógica dentro de `RequireSession` (rejeitada: mistura duas responsabilidades e afetaria `/operador`).
- `useProfile` não tem tentativas automáticas (`retry: false`): com a API em falha a guarda deixa passar de imediato, em vez de esperar pelo recuo do cliente (cerca de 3 s). Uma falha momentânea só salta o onboarding nessa sessão: a guarda volta a decidir no carregamento seguinte.

**R2. A página `/boas-vindas` fica dentro do AppShell?**
- Decisão: **não**. Fica no mesmo ramo `Protected` (sessão e consentimento) que a guarda, mas ao lado do AppShell, e a guarda inversa envia quem já concluiu para `/`.
- Porquê: o protótipo é um ecrã inteiro sem barra de navegação; mostrar o shell deixaria sair a meio do percurso sem sentido.
- Assumido, por confirmar na revisão.

**R3. Como a cache do perfil e o ecrã «Tudo pronto» convivem?**
- Decisão: a resposta do `PATCH` atualiza a cache `["profile"]` no `onSuccess` do `useSaveProfile`. O ecrã decide **uma só vez**, quando o perfil chega: o componente `Entry` guarda esse primeiro perfil (`useState`) e só então escolhe entre o Início (já concluído) e o percurso. Uma cache que passe a «concluído» (por causa do `PATCH` ou de uma releitura ao focar a janela) não tira a pessoa de «Tudo pronto»; «Ir para o início» só navega.
- Porquê: a US3.4 manda quem já concluiu para o Início e a US1.8 pede que se veja «Tudo pronto». `/boas-vindas` está fora de `RequireOnboarding`, por isso nenhuma guarda a desvia; só o `Entry` decide, uma vez. Com a cache já atualizada, a guarda direta (US3.1) não devolve a pessoa a `/boas-vindas` depois de «Ir para o início».
- Teste obrigatório: concluir mostra «Tudo pronto», uma releitura do perfil não o tira de lá, e o botão leva ao Início sem voltar ao percurso.

**R4. O que significa «confirmar» no código?**
- Decisão: o estado guarda `touched` por passo (`goals`, `people`, `merchants`, `goal`). `Avançar` marca o passo como confirmado com o que o ecrã mostra; `Saltar` não marca. `buildPatch(state)` constrói o corpo só com os passos confirmados:
  - objetivos: `goals` se houver pelo menos um escolhido; nada se estiver vazio;
  - pessoas: `household_size` com o valor mostrado (2 por omissão, ou o guardado);
  - mercados: `merchants` se houver pelo menos um; nada se vazio;
  - meta: `monthly_goal_cents = euros * 100` só se «Ainda não sei» **não** estiver ativo;
  - `onboarding_completed: true` sempre.
- Porquê: US2.1 a US2.6. Função pura, testada antes do ecrã (cenário: tudo saltado → `{ onboarding_completed: true }`; 3 pessoas + meta saltada → só `household_size: 3`).
- Voltar a um passo já confirmado e mudá-lo atualiza o valor; voltar e saltar não retira uma confirmação anterior (a pessoa já confirmou). Ver P3 para o caso pré-preenchido.

**R5. «Todas as anteriores» é um valor?**
- Decisão: **não**. É uma caixa derivada na interface: marcada quando os três objetivos estão marcados; ao marcá-la marca os três, ao desmarcá-la desmarca todos; desmarcar um qualquer desmarca-a. A API recebe só os três valores (`finances`, `shopping_list`, `savings`).
- Mapa do protótipo para a API: `fin` → `finances`, `lista` → `shopping_list`, `eco` → `savings`.

**R6. Meta pessoal: barra e unidades.**
- Decisão: `<input type="range" min=50 max=800 step=10>` em euros inteiros (como o protótipo), valor inicial 300; ao enviar, `euros * 100` (inteiro, constituição II). Sem alterar o valor com «Ainda não sei»: a barra fica `disabled` e o valor mostrado passa a «Ainda não sei»; mexer na barra desativa «Ainda não sei» (comportamento do protótipo). O texto «€ 300» do protótipo passa a «300 €» (formato pt-PT, spec US1.4).
- Formatação: um auxiliar em `format.ts` para euros inteiros (`Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })`). O `formatCents` existente mostra «300,00 €», que não é o que a spec pede.
- Limite: uma meta guardada que não seja múltipla de 10 € (por exemplo definida nas Definições) seria arredondada pela barra se a pessoa tocasse «Avançar»; só acontece no caso pré-preenchido (P3).

**R7. Lista de mercados e iniciais.**
- Decisão: `useMerchants()` (`GET /v1/merchants`, `staleTime` longo, 7 itens com `id` e `name`). Cada cartão mostra a inicial e o nome. **Inicial (P4):** a primeira letra do nome; se a primeira palavra for um artigo (`El`, `La`, `Los`, `Las`, `O`, `A`, `Os`, `As`, sem distinguir maiúsculas) e houver segunda palavra, as primeiras letras das duas (`El Corte Inglés` → `EC`, `Pingo Doce` → `P`). Sem nomes escritos à mão. Enquanto carrega: `Spinner`; se falha: aviso com «Tentar de novo» e o passo pode ser saltado (a lista é opcional, spec Edge Cases).
- O valor enviado é o `id` da API. Ids guardados que deixaram de existir (regra 5 do contrato) não aparecem nos cartões e perdem-se se a pessoa confirmar o passo; é o comportamento esperado (só se grava o que ela vê e confirma).
- `MERCHANT_NAMES`, `MERCHANT_OPTIONS` e `merchantName` em `format.ts` não se tocam (P1): continuam a mostrar «Outra loja» e lojas históricas até às specs 012 e 013.

**R8. Erros do envio.**
- Decisão: um único `Notice` de erro acima do botão, sem perder as respostas:
  - rede ou 5xx: «Não foi possível guardar. Tente de novo.» com o botão a repetir o mesmo `PATCH` (idempotente, F-101);
  - 403 `privacy_consent_required`: motivo («A política de privacidade mudou. Confirme-a para continuar.») e ligação para `/privacidade`; invalida `["me"]` para a guarda tratar o resto;
  - 422: mostra a mensagem do campo (a API devolve em português). Pela barra e pelo controlo de pessoas não deve ocorrer, mas a mensagem não se perde.
- Sessão expirada (401): já tratada globalmente (`sessionLost`).

**R9. Acessibilidade do percurso.**
- Decisão:
  - ao mudar de passo, o foco vai para o `<h1>` do passo (`tabIndex={-1}`, `ref.focus()`); o `<h1>` tem `aria-describedby` a apontar para o texto visível «Passo N de 4», por isso o leitor de ecrã lê o título e depois o passo (mecanismo único; não há região `aria-live` para o passo);
  - a barra de progresso é `role="progressbar"` com `aria-valuenow` (25, 50, 75, 100), `aria-valuemin`/`max` e `aria-label`; o texto «Passo N de 4» não depende dela;
  - objetivos e mercados são `<input type="checkbox">` dentro de `<label>` (cartão inteiro clicável), com marca de verificação visível quando ativos (não só a cor da moldura);
  - pessoas: botões «Menos uma pessoa» e «Mais uma pessoa» (desativados em 1 e em 12) e o número num `<output aria-live="polite">` que anuncia «2 pessoas»;
  - meta: `<input type="range">` com `aria-label` «Meta pessoal mensal, em euros» e `aria-valuetext` («300 euros»); o botão «Ainda não sei» muda de rótulo para «Definir um valor» (sem `aria-pressed`: o rótulo já diz o estado);
  - alvos ≥ 44 px (`min-h-12` do `Button` e `size-11` nos botões redondos).
- Movimento: nenhuma animação além da transição da barra, desligada com `prefers-reduced-motion`.

**R10. Estilo: protótipo → tokens.**
- Decisão: usar a tabela do `design-ux-v2/README.md`: botão principal `Button` (`bg-brand`), cartões `bg-paper` com `border` normal e `border-2 border-brand` quando escolhidos, secundário `text-ink-soft`, títulos Nunito Sans 800 (sem Fraunces), números grandes (pessoas 120 px, meta 80 px do protótipo) em Nunito 800 com `tabular-nums`, círculo da marca de verificação em `bg-brand-soft`/`text-brand`. Em 320 px os números reduzem-se (`clamp`) para não quebrar a linha.
- Largura: coluna única `max-w-md` centrada até 820 px; o botão de ação fica fixo em baixo (`sticky bottom-0` com `pb-[env(safe-area-inset-bottom)]`), como no protótipo.

**R11. Impacto nos testes existentes.**
- Decisão: `src/test/server.ts` e `e2e/mock/api.ts` passam a servir por omissão um perfil **concluído** (`onboarding_completed_at` preenchido) e os 7 mercados. No Vitest (`onUnhandledRequest: "error"`) um `GET /v1/me/profile` sem *handler* falha o pedido e a guarda deixa passar, com erro registado: o *handler* por omissão é obrigatório. No Playwright o `fakeApi` responde 404 a caminhos desconhecidos e a guarda também deixa passar: o por omissão só é necessário para os testes novos.
- No projeto `stack`, uma conta nova cai no onboarding: `journey.spec.ts` conclui-o (saltando ou por `PATCH`) antes da jornada. Só se corre com o backend, ou seja, fica como tarefa manual (como a T022 da 009).

**R12. PWA e privacidade.**
- Decisão: sem alterações a `vite.config.ts`. `/boas-vindas` é uma rota do SPA servida pelo `navigateFallback`; as respostas `/v1/**` continuam fora de cache (`navigateFallbackDenylist` e `runtimeCaching: []`). Teste de regressão: o onboarding não escreve em `localStorage` nem `sessionStorage` (US4.4).

**R13. Estado do percurso e o botão «Voltar» do navegador.**
- Decisão: estado só em memória, passo em `useReducer`, **não** no URL. O botão do navegador/Android sai de `/boas-vindas`; a guarda devolve a pessoa ao percurso no passo 1, com os valores já guardados.
- Porquê: a US4.2 pede exatamente isso (recarregar volta ao passo 1) e um `?passo=3` sobreviveria ao recarregamento.

**R14. Onde fica a guarda na tabela de rotas, e o que isso muda no AppShell? (I3)**
- Decisão: a tabela passa a ter três ramos:
  1. `/login` e `/privacidade`, como hoje;
  2. `Protected` (sessão e consentimento, sem shell) com `/boas-vindas` e, ao lado, `RequireOnboarding` > `AppShell` > as rotas de utilizador (`/`, `/compras…`, `/produtos…`, `/adicionar`, `/definicoes`);
  3. `AppShell` > `Protected admin` > `/operador`, e `*` (não encontrado), como hoje, fora da guarda.
- Porquê: com a guarda acima do shell, enquanto o perfil (e a sessão) carregam só se vê o `Spinner`, sem a barra de navegação. Mantém o `errorElement` do AppShell onde estava.
- Consequência: o `Suspense` de `Protected` ficaria acima do shell e a barra desapareceria enquanto uma página *lazy* (Produtos, Operador) carrega. Para não regredir, o `AppShell` passa a envolver o `<Outlet/>` num `Suspense` com `Spinner` (alteração mínima de uma linha, com teste).
- Alternativa rejeitada: esconder a barra no shell conforme o estado do perfil (acopla o shell ao onboarding).

**R15. Propostas do `/simplify` que não se aplicaram (aceites pela Liz em 2026-10-30; não voltar a discutir)**
- **Barra de navegação durante o carregamento:** mantém-se a guarda acima do AppShell, só com o indicador (decisão I3, confirmada).
- **Filtro `knownMerchants` em `buildPatch`:** mantém-se. Um mercado guardado que a API já deixou de listar daria 422 no `PATCH`; o filtro evita-o e R7 diz que esses ids se perdem se a pessoa confirmar o passo. Tirá-lo mudaria o comportamento e deixaria de cumprir R7.
- **`staleTime` infinito ou sem releitura ao focar a janela em `useProfile`:** não se aplica. Mudaria o contrato da cache descrito no plano (60 s) e as Definições (spec 014) vão precisar de um perfil fresco.
- **Perfil pedido só depois de `/v1/me`:** só se resolve devolvendo `onboarding_completed_at` em `/v1/me`, o que é alteração do backend (fora desta spec). Fica registado para a spec 011 ou 014 do backend.
- **`Suspense` repetido (em `Protected` e no AppShell):** mantém-se. O do AppShell evita que a barra desapareça enquanto uma página *lazy* carrega; o de `Protected` serve `/boas-vindas`. Tirar um deles mexe em `Protected`, que as rotas de operador também usam.
- **`IconButton` em `ui.tsx`:** não se cria. O padrão já existe em quatro ficheiros que esta spec não reescreve; fica para quando as specs 012 e 013 os tocarem.
- **Dados do `e2e/mock/api.ts` repetidos (`MERCHANTS`, perfis):** mantêm-se. Nenhum ficheiro de `e2e/` importa de `src/`; o mock é independente de propósito, como já é o `me()`.
- **Variáveis de espera e matriz de axe nos e2e:** tirou-se o `networkidle` e reduziu-se o atraso do teste do carregamento; a matriz de 2 temas × 4 larguras mantém-se porque a spec pede axe de 320 a 820 px em claro e escuro.

**R16. Contas que já existiam antes do onboarding (P6, decisão da Liz de 2026-10-30)**
- Decisão: o onboarding é só para contas novas. A distinção faz-se **no backend**, com uma migração de dados que preenche `onboarding_completed_at` nas contas existentes. No frontend nada muda: `RequireOnboarding` e `Entry` já tratam «concluído» como «não interromper» e «concluído» a abrir `/boas-vindas` como «ir para o Início».
- Porquê: uma só fonte da verdade (o perfil), sem lógica de «conta antiga» no cliente (por exemplo uma data de criação que `/v1/me` não devolve) e sem segunda ida à API.
- Alternativas rejeitadas: (a) o cliente decidir pela data de criação da conta, que exige campo novo e põe regra de produto no cliente; (b) manter «uma vez, e pode saltar», resposta anterior da Liz, agora substituída.
- Consequências: a meta de uma conta existente fica por definir até ao Perfil (spec 014); o Início (spec 011) tem de tratar a meta em falta. Testes desta spec: um perfil concluído e vazio (conta migrada) não é interrompido (T028).
