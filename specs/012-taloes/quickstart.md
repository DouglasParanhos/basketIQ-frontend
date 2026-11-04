# Quickstart: validar os Talões (012)

Pré-requisitos: Docker Desktop com a stack do backend a correr (para o contrato real) ou só os testes com API simulada; Node com `corepack pnpm@9` (sem `pnpm` no PATH nesta máquina: para o Playwright, um atalho `pnpm.cmd` → `corepack pnpm@9` fora do repositório).

## 1. Contrato

```text
corepack pnpm@9 gen:api            # lê ../basketIQ-backend/openapi.json
git diff --stat src/api/schema.d.ts
```

Esperado: `MonthTotalOut` e `GET /v1/analytics/months` aparecem; `ProductSearchItem` ganha `avg_price_cents`, `price_basis`, `purchases`, `merchants`; `typecheck` sem erros nas funcionalidades existentes (o `ProfilePatch` mantém o `as` da spec 014).

## 2. Testes (por esta ordem, um de cada vez)

```text
corepack pnpm@9 lint
corepack pnpm@9 typecheck
corepack pnpm@9 exec vitest run --maxWorkers=4 src/features/receipts      # F-195
corepack pnpm@9 exec vitest run --maxWorkers=4 src/features/features.test.tsx   # F-196 (Resumo)
corepack pnpm@9 exec vitest run --maxWorkers=4 src/features/products     # F-197
corepack pnpm@9 exec vitest run --maxWorkers=4                           # tudo
corepack pnpm@9 e2e:mock            # só com o Docker livre (F-199)
```

## 3. Cenários à mão (API real, dados sintéticos)

| Cenário | Esperado |
|---|---|
| Duas compras confirmadas em outubro e uma em setembro | dois cabeçalhos, «Outubro 2026 · 2 confirmados · …» e «Setembro 2026 · 1 confirmado · …» com os totais do endpoint |
| Uma compra em revisão | emblema «!» dourado e «rever valores»; entra em «Requer ação · 1» |
| Uma compra a ser lida | emblema «…», «a ler o talão…», total «—» |
| Uma compra com documento ilegível | texto «Documento ilegível» com ícone; sem «rever valores» |
| Escolher o ano de 2025 | a lista mostra só 2025 (carrega páginas até lá); «Requer ação» continua a mostrar todos os anos |
| Confirmar uma compra | o cabeçalho do mês e o N do chip atualizam sem recarregar |
| Produtos | «N compras · M mercados» e preço médio com base; um produto sem preço não mostra preço; «A–Z» reordena |
| Detalhe do produto | mínimo, máximo, comprou; evolução por compra; «Preço médio que pagou, por mercado» (e «Nos seus talões») sem «mais barato» nem ordem por preço; coluna «Descrição original» |
| Resumo | mesmos valores que antes (F-18, F-19, F-21); «Ver como tabela» abre «Gasto por período» |

## 4. Qualidade

- Axe sem violações nas três abas e no detalhe, claro e escuro, a 320, 375, 430 e 820 px; sem scroll horizontal a 320 px.
- Todos os controlos com ≥ 44 px (chips, seletor de ano, pílulas de período, linhas, pesquisa).
- Teclado: as abas, os filtros, o seletor de ano e as linhas chegam-se pela ordem visual, com foco visível.
- Capturas a 390 px (claro e escuro) das três abas e do detalhe em `Documentation/capturas-taloes/` (fora do git).
