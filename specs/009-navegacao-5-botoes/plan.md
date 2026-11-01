# Implementation Plan: Navegação de cinco destinos

**Branch**: `009-navegacao-5-botoes` (sem ramo git criado; os commits são da Liz) | **Date**: 2026-10-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-navegacao-5-botoes/spec.md`

## Summary

Substituir a barra de 4 destinos (Resumo, Compras, Adicionar, Definições) por **Início · Talões · Adicionar · Lista · Definições**, com a Lista escondida enquanto `smart_list_enabled` (de `GET /v1/config`) não for verdadeiro. O Resumo atual passa de `/` para `/compras/resumo` **sem mudar a lógica**; `/` passa a ser um Início provisório (a spec 011 substitui-o). Cria-se um componente de abas controlado (`SegmentedTabs`) usado já em Talões (Compras · Resumo · Produtos) e reutilizável nas Definições (spec 014). Só frontend: rotas, shell, um componente, um hook de configuração e testes. Sem backend, sem dados novos, sem `pnpm gen:api`.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19

**Primary Dependencies**: react-router 7 (`createBrowserRouter`), TanStack Query 5, lucide-react, Tailwind CSS 4 (tokens em `src/styles.css`)

**Storage**: N/A (a opção da lista vem de `GET /v1/config` pela cache do TanStack Query; nada em `localStorage`)

**Testing**: Vitest + Testing Library + msw (`src/**/*.test.tsx`); Playwright projeto `mock` com axe (`e2e/mock/ui.spec.ts`); projeto `stack` só para verificar que os endereços antigos continuam a servir (`e2e/stack/journey.spec.ts`)

**Target Platform**: PWA mobile-first, 320–820 px, modo claro e escuro

**Project Type**: web-app (frontend; o backend é outro repositório)

**Performance Goals**: sem pedidos novos além de `GET /v1/config` (já existente, `staleTime` de 1 h); sem aumento do pacote principal (Início provisório trivial; nenhuma biblioteca nova)

**Constraints**: alvos de toque ≥ 44 px; sem scroll horizontal a 320 px com 5 destinos; WCAG 2.2 AA (axe claro e escuro); a cor nunca é o único sinal; service worker continua a não guardar `/v1/**`; texto em português europeu

**Scale/Scope**: 1 shell, 1 componente novo, 2 páginas novas triviais (Início provisório e layout de Talões), 1 hook, ~8 ficheiros de teste ajustados

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.* Constituição do frontend v1.0.1.

| Princípio | Avaliação |
|---|---|
| I. Processamento local | N/A (sem documentos) |
| II. Dinheiro exato | N/A (sem valores monetários nesta spec) |
| III. Nunca inventar valores | Passa: o Início provisório não mostra números; campo `smart_list_enabled` em falta = desligado, não um valor inventado |
| IV. Privacidade no cliente | Passa: a opção vem da cache de servidor; nada em `localStorage`; o service worker não guarda `/v1/**` |
| V. Mobile-first e acessível | Passa com verificação: cinco destinos (emenda 1.0.1), alvos ≥ 44 px, `aria-current`, axe; risco de largura a 320 px tratado em R9 |
| VI. Contrato tipado | **Atenção:** `schema.d.ts` não tem `smart_list_enabled` até a spec 013 do backend (US8) e um `pnpm gen:api`. Ver R1; desvio temporário com tarefa de remoção |
| VII. Rastreabilidade | Passa: cada tarefa de teste leva `F-xx:` (faixa F-86 a F-125); o F-xx concreto atribui-se na Fase 8 |
| VIII. Simplicidade | Passa: sem estado global novo, sem biblioteca de abas, um só componente controlado reutilizável |

Resultado: **sem violações**; um desvio justificado (R1) fica em *Complexity Tracking*.

## Project Structure

### Documentation (this feature)

```text
specs/009-navegacao-5-botoes/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── routes.md
│   └── public-config.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── App.tsx                         # tabela de rotas: Início, layout de Talões, redirecionamento de `/`
├── config/appConfig.tsx            # + useSmartListEnabled()
├── components/
│   ├── AppShell.tsx                # 5 destinos, Lista condicional, ativo por prefixo de caminho
│   └── SegmentedTabs.tsx           # NOVO: abas controladas (tablist)
└── features/
    ├── home/HomePage.tsx           # NOVO: Início provisório
    └── taloes/TaloesLayout.tsx     # NOVO: abas Compras · Resumo · Produtos + <Outlet/>

src/test/server.ts                  # handler de /v1/config com a opção
e2e/mock/api.ts                     # FakeState.smartList
```

**Structure Decision**: aplicação única já existente; só se acrescentam dois ficheiros em `features/` e um em `components/`. O Resumo (`features/dashboard/DashboardPage.tsx`) **não se altera**.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Leitura de `smart_list_enabled` com um tipo local (contraria o princípio VI temporariamente) | A Fase 1 precede a Fase 2: o campo ainda não está em `schema.d.ts` | Editar `schema.d.ts` à mão (ficheiro gerado) ou esperar pelo backend (bloqueia a Fase 1). Tarefa T023 remove o desvio depois do `pnpm gen:api` da Fase 2 |

## Post-Design Constitution Re-check

Sem alterações às conclusões acima: o desenho final (componente controlado, layout de rota, hook com tipo local) não acrescenta estado global, dependências nem armazenamento no cliente.
