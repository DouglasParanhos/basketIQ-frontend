# Data Model: Onboarding

Sem dados persistentes novos no cliente. O perfil vive no backend (spec 013); aqui só há tipos de apresentação e o estado em memória do percurso.

## Perfil (leitura, `Schemas["ProfileOut"]`)

| Campo | Tipo | Notas |
|---|---|---|
| `household_size` | `number \| null` | 1 a 12 |
| `merchants` | `string[]` | ids de `GET /v1/merchants`; pode conter ids que já não existem (não se filtram na leitura) |
| `goals` | `("finances" \| "shopping_list" \| "savings")[]` | |
| `monthly_goal_cents` | `number \| null` | 5000 a 80000, cêntimos inteiros |
| `onboarding_completed_at` | `string \| null` | decide a guarda; só preenche uma vez |

Query: `["profile"]`. Em «Ir para o início» recebe a resposta do `PATCH` (R3).

## Mercado (leitura, `Schemas["MerchantOut"]`)

`{ id: string, name: string }`, 7 itens por ordem fixa. Query: `["merchants"]`.

## Alteração do perfil (envio, `Schemas["ProfilePatch"]`)

Todos os campos opcionais; omitido = manter. O onboarding envia sempre `onboarding_completed: true` e, **só dos passos confirmados**, `goals`, `household_size`, `merchants`, `monthly_goal_cents`. Nunca envia `null` nem `[]`.

## OnboardingState (memória do componente)

| Campo | Tipo | Regra |
|---|---|---|
| `step` | `0 \| 1 \| 2 \| 3` | passo atual; `Voltar` não desce de 0 |
| `phase` | `"asking" \| "done"` | `done` mostra «Tudo pronto» |
| `goals` | `Goal[]` | até 3 valores; «Todas as anteriores» é derivada (R5) |
| `householdSize` | `number` | 1 a 12; inicial: o guardado ou 2 |
| `merchants` | `string[]` | ids; sem repetidos |
| `goalEuros` | `number` | 50 a 800 em passos de 10; inicial: o guardado/100 ou 300 |
| `goalUnknown` | `boolean` | «Ainda não sei»; com `true` a meta não se envia |
| `confirmed` | `{ goals, people, merchants, goal: boolean }` | `Avançar` marca o passo atual; `Saltar` não marca |

### Transições

- `next`: marca `confirmed[passo]` e avança; no passo 3 envia o `PATCH`.
- `skip`: avança sem marcar; no passo 3 envia o `PATCH` (que pode levar só `onboarding_completed`).
- `back`: desce um passo, sem apagar respostas nem confirmações. Voltar a um passo já confirmado e tocar «Saltar» mantém a confirmação anterior (US2.7).
- envio com sucesso: `phase = "done"` (a cache do perfil já foi atualizada pelo `useSaveProfile`, R3). Envio com erro: mantém tudo e `step` (R8).

### Funções puras (`state.ts`)

- `buildPatch(state): ProfilePatch`: ver R4. Casos de teste: tudo saltado; 3 pessoas confirmadas e meta saltada; mercados vazios confirmados; «Ainda não sei» confirmado; meta 300 → `30000`.
- `toggleGoal(goals, goal)` e `toggleAll(goals)`: ver R5.
- `initialsOf(name)`: 1.ª letra em maiúscula; se a primeira palavra for um artigo (`El`, `La`, `Los`, `Las`, `O`, `A`, `Os`, `As`) e houver segunda palavra, as primeiras letras das duas (P4): `Pingo Doce` → `P`, `Lidl` → `L`, `El Corte Inglés` → `EC`.
