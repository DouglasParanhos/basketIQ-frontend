# Data Model: Navegação de cinco destinos

Sem dados persistentes, sem entidades de domínio e sem armazenamento no cliente. Só tipos de apresentação.

## NavDestination (constante do shell)

| Campo | Tipo | Regra |
|---|---|---|
| `to` | string | caminho de destino (`/`, `/compras`, `/adicionar`, `/lista`, `/definicoes`) |
| `label` | string | «Início», «Talões», «Adicionar», «Lista», «Definições» |
| `icon` | componente lucide | `House`, `ReceiptText`, `Plus`, `ListChecks`, `Settings` |
| `match` | `(pathname) => boolean` | decide o estado ativo (R3) |
| `primary` | boolean | só o Adicionar (botão em destaque) |
| `requiresSmartList` | boolean | só a Lista; filtrada fora quando `useSmartListEnabled()` é falso |

Ordem fixa: Início, Talões, Adicionar, Lista, Definições. Com a opção desligada o conjunto tem 4 elementos.

## SegmentedTabs (props)

| Prop | Tipo | Regra |
|---|---|---|
| `label` | string | nome acessível do `tablist` |
| `tabs` | `{ id: string; label: string }[]` | 2 a 4 elementos |
| `value` | string | `id` da aba ativa |
| `onChange` | `(id: string) => void` | chamado na ativação (clique, `Enter`, `Espaço`) |

Estado interno: apenas o foco (*roving tabindex*). A aba ativa vem sempre de `value`.

## PublicConfig (leitura, tipo local temporário — R1)

| Campo | Tipo | Regra |
|---|---|---|
| `app_name` | string | já existente, em `schema.d.ts` |
| `smart_list_enabled` | boolean (opcional) | ausente ou diferente de `true` = Lista escondida |

## Parâmetros do Resumo reconhecidos no redirecionamento (R4)

`periodo`, `de`, `ate`, `mercado`, `produto`, `produto_nome` (os que `DashboardPage` lê hoje).
