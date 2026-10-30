# Quickstart: validar a navegação de cinco destinos

Pré-requisitos: Node 24+, dependências instaladas (`node_modules`), `pnpm` 9. Nesta máquina não há `pnpm` no PATH nem WSL: usar `corepack pnpm@9 <comando>` no PowerShell (Docker Desktop e `make` não são necessários para o frontend).

## Verificações automáticas

```powershell
corepack pnpm@9 lint
corepack pnpm@9 typecheck
corepack pnpm@9 test            # Vitest
corepack pnpm@9 e2e:mock        # Playwright, projeto mock (axe, larguras)
```

Resultado esperado: tudo verde, sem alterar `src/api/schema.d.ts`.

## Cenários manuais (com `corepack pnpm@9 dev` e o backend a correr)

| # | Passos | Esperado |
|---|---|---|
| 1 | Entrar com a opção da lista desligada | barra com 4 destinos: Início, Talões, Adicionar, Definições; Adicionar em destaque |
| 2 | Abrir `/` | Início provisório com «Adicionar talão» e «Ver resumo» |
| 3 | Tocar «Ver resumo» | `/compras/resumo` com o Resumo de sempre; destino ativo: Talões |
| 4 | Abrir `/?de=2026-09-01&ate=2026-09-30` | redireciona para `/compras/resumo?de=…&ate=…` com os mesmos filtros |
| 5 | Nas abas, mover com as setas e ativar com `Enter` | foco muda com as setas; a rota só muda com `Enter`/`Espaço`; Voltar regressa à aba anterior |
| 6 | Abrir `/produtos` e `/compras/<id>` | Talões ativo; o detalhe não mostra abas |
| 7 | Abrir `/compras/resumo` | nunca é tratado como identificador de compra |
| 8 | Abrir `/lista` com a opção desligada | «não encontrado» |
| 9 | Servir `smart_list_enabled: true` (teste ou backend) | 5 destinos, por ordem; a Lista aparece quando a configuração chega com a opção verdadeira |
| 10 | Larguras 320, 375, 430 e 820 px, claro e escuro | sem scroll horizontal, alvos ≥ 44 px, axe sem violações |

Referências: [routes](./contracts/routes.md), [configuração pública](./contracts/public-config.md), [modelo](./data-model.md).
