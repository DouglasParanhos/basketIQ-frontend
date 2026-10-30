# Research: Navegação de cinco destinos

Cada ponto resolve uma dúvida do contexto técnico ou da spec. Nada ficou por esclarecer.

**R1. Como ler `smart_list_enabled` se o `schema.d.ts` ainda não o tem?**
- Decisão: `useSmartListEnabled()` em `config/appConfig.tsx`, sobre o `useAppConfig()` existente, com um tipo local estreito (`{ smart_list_enabled?: boolean }`) e `=== true`. Campo em falta, pedido em curso ou falhado = `false`.
- Porquê: a Fase 1 (frontend) precede a Fase 2 (que expõe o campo no backend, spec 013 US8). `schema.d.ts` é gerado e não se edita à mão.
- Alternativas: editar o ficheiro gerado (rejeitado: perde-se no próximo `gen:api`); fazer primeiro o backend (rejeitado: inverte a ordem do plano e a Fase 1 não depende de dados).
- Consequência: tarefa para remover o tipo local depois do `pnpm gen:api` da Fase 2.

**R2. Onde ficam as abas Compras · Resumo · Produtos?**
- Decisão: uma rota de layout `TaloesLayout` (abas + `<Outlet/>`) com filhos `/compras`, `/compras/resumo` e `/produtos`. As páginas de detalhe (`/compras/:id`, `/produtos/:id`) ficam **fora** do layout, sem abas.
- Porquê: uma só definição das abas; as páginas existentes não mudam. O react-router 7 dá prioridade ao caminho estático `/compras/resumo` sobre `/compras/:id`, mas isso fica protegido por teste (spec US2.5).
- Alternativa: abas dentro de cada página (rejeitada: duplicação e alteração de ecrãs que a Fase 4 reestiliza).

**R3. Como se marca «Talões» como ativo em `/produtos` e `/compras/...`?**
- Decisão: cada item do shell tem uma função `match(pathname)`; Talões casa com `/compras` e `/produtos` e prefixos; Início casa com `/` exato; Adicionar com `/adicionar`; Definições com `/definicoes`.
- Porquê: o `NavLink` só sabe o seu `to` e `/produtos` não é descendente de `/compras`.
- Alternativa: `NavLink` com `to="/compras"` (rejeitada: `/produtos` ficava sem destino ativo).

**R4. O que fazem os endereços antigos do Resumo em `/`?**
- Decisão: `/` com algum dos parâmetros do Resumo (`periodo`, `de`, `ate`, `mercado`, `produto`, `produto_nome`) redireciona (`replace`) para `/compras/resumo` com a mesma `search`; sem parâmetros mostra o Início.
- Porquê: o `journey.spec.ts` (projeto `stack`) e ligações guardadas usam `/?de=…&ate=…`. Resposta confirmada na clarificação da spec.
- Limite: um `/` sem parâmetros que antes mostrava o Resumo do mês corrente mostra agora o Início; é o comportamento pedido.

**R5. Conteúdo do Início provisório.**
- Decisão: título «Início», o botão «Adicionar talão» e a ligação «Ver resumo» para `/compras/resumo`. Sem números, sem consultas à API.
- Porquê: a spec 011 substitui-o; manter o mínimo (constituição VIII).

**R6. Como é o componente de abas?**
- Decisão: `SegmentedTabs` controlado (`tabs`, `value`, `onChange`, `label`), `role="tablist"`/`tab`, `aria-selected`, *roving tabindex*; **ativação manual**: as setas movem o foco, `Enter`/`Espaço` ativam. Nas Talões, quem usa calcula `value` pelo caminho e `onChange` navega; nas Definições (spec 014) usa-se o mesmo componente.
- Porquê: ativação automática dispararia uma navegação (e pedidos à API) a cada seta. Um componente só de apresentação serve os dois usos sem lógica de rotas dentro.
- Alternativa: `NavLink`s estilizados (rejeitada: o requisito pede semântica de abas com teclado).
- Pergunta para a Liz: a ativação manual é aceitável? (spec US3.1 diz «as setas movem entre abas»).

**R7. A Lista tem rota na Fase 1?**
- Decisão: **não**. O destino aparece só com a opção ligada e aponta para `/lista`, que não existe até à Fase 7; sem rota, `/lista` é «não encontrado», como pede a spec para a opção desligada (US2.7). A opção está desligada até à Fase 7.
- Porquê: construir um ecrã que a spec 015 vai desenhar seria código especulativo.

**R8. Ícones.**
- Decisão: `House` (Início), `ReceiptText` (Talões, já usado), `Plus` (Adicionar), `ListChecks` (Lista), `Settings` (Definições). Todos existem em `lucide-react` instalado (verificado: `House`, `ListChecks`). `ChartPie` deixa de ser usado.

**R9. Cabem cinco destinos a 320 px?**
- Decisão: sim, `flex-1` dá 64 px por item; «Definições» em `text-xs` ocupa cerca de 58 px. Não se altera o desenho; verifica-se com o teste existente «no horizontal scrolling at 320 px» e com um novo teste de alvos ≥ 44 px e etiquetas completas.
- Plano B se falhar: etiqueta abreviada só no destino mais largo, nunca esconder a etiqueta.

**R10. Quatro destinos (Lista desligada).**
- Decisão (clarificação): ordem Início · Talões · Adicionar · Definições, Adicionar em destaque sem ser central. Sem layout especial para a lateral `md` (já é uma lista vertical).

**R11. Textos.**
- Decisão: «Início», «Talões», «Voltar ao início» (hoje «Voltar ao resumo» em `RouteError`). Português europeu conforme o `design-ux-v2/README.md`.

**R12. As abas conservam os filtros do Resumo ao trocar?**
- Decisão: não; cada aba leva ao caminho simples. Os filtros são do Resumo e vivem no URL dele (spec 004).
