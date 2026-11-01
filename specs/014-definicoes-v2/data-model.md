# Data Model: Definições v2

Só existe estado de apresentação. Os tipos do servidor vêm de `src/api/schema.d.ts` (`ProfileOut`, `ProfilePatch`, `MerchantOut`, `StoredFilesOut`, `StoredFilesDeleted`, `MeOut`); nenhum tipo é escrito à mão.

## Perfil guardado (`ProfileOut`)

| Campo | Valores | Conta anterior ao onboarding |
|---|---|---|
| `household_size` | 1 a 12 ou nulo | nulo |
| `merchants` | identificadores de `GET /v1/merchants` | `[]` |
| `goals` | `finances`, `shopping_list`, `savings` | `[]` |
| `monthly_goal_cents` | 5 000 a 80 000 ou nulo | nulo |
| `onboarding_completed_at` | data ou nulo; o Perfil nunca o altera | preenchido |

## Rascunho de edição (`ProfileDraft`, módulo puro `profileDraft.ts`)

| Campo | Tipo | Origem |
|---|---|---|
| `people` | inteiro 1 a 12 ou `null` | `household_size` |
| `merchants` | `string[]` | `merchants` (inclui os que a API já não lista) |
| `goals` | `Goal[]` | `goals` |
| `goalText` | texto do campo em euros | `centsToInput(monthly_goal_cents)` ou `""` |

Funções puras:

| Função | Faz |
|---|---|
| `initialDraft(profile)` | copia o perfil guardado para o rascunho |
| `goalCents(draft)` | `null` se `goalText` estiver vazio; `undefined` se for ilegível; senão os cêntimos inteiros de `parseEurToCents` |
| `stepPeople(people, delta)` | `null` + 1 = 1; `null` − 1 = `null`; entre 1 e 12 nos limites |
| `validate(draft)` | `{ goal?: "…" }`: a meta fora de 5 000 a 80 000 cêntimos ou ilegível dá «A meta tem de estar entre 50 € e 800 €.»; pessoas fora de 1 a 12 não acontecem (botões) |
| `countChanges(draft, saved)` | pessoas diferentes = 1; meta diferente = 1; cada mercado ou objetivo acrescentado ou retirado = 1 |
| `buildPatch(draft, saved, knownMerchants)` | só os campos alterados: `household_size` (inteiro ou `null`), `merchants` (só os conhecidos, quando a lista mudou), `goals` (ordem canónica, quando mudou), `monthly_goal_cents` (inteiro ou `null`); `{}` sem alterações |

Regras:

- Meta vazia = sem meta; se o guardado já era sem meta, não é alteração.
- `merchants` e `goals` comparam-se como conjuntos (a ordem não conta).
- `buildPatch` nunca inclui `onboarding_completed` nem campos iguais aos guardados.
- Nenhuma percentagem, sugestão ou valor por omissão: um perfil vazio mostra campos vazios (as sugestões do onboarding não existem aqui).

## Estado do ecrã

| Estado | Onde | Persistência |
|---|---|---|
| modo (`ler` \| `editar`) e `ProfileDraft` | `ProfileTab` (`useState`/`useReducer`) | nenhuma; perde-se ao sair |
| passos do apagar (`idle` \| `confirmar` \| `a apagar` \| `erro`) e contadores | `PrivacyTab` | nenhuma |
| caixa «Compreendo…» | `DeleteAccountPage` | nenhuma |

## Cache do servidor

`["profile"]`, `["merchants"]`, `["stored-files"]`, `["me"]` (e `["overview"]`, `["receipts"]`, `["receipt"]` invalidadas por esta spec).
