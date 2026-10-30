# Contrato consumido: perfil e mercados

Fonte de verdade: `../basketIQ-backend/specs/013-perfil-utilizador/contracts/api.md` e `src/api/schema.d.ts` (gerado a 2026-10-30). Este ficheiro só fixa o que o onboarding usa.

| Chamada | Quando | Resposta | Tratamento |
|---|---|---|---|
| `GET /v1/me/profile` | na guarda e no ecrã (cache `["profile"]`, `staleTime` 60 s, sem tentativas automáticas) | `ProfileOut` (vazio numa conta nova) | 401 global; outro erro → a guarda deixa passar de imediato (US3.6) |
| `GET /v1/merchants` | ao entrar no passo 3 (cache `["merchants"]`, `staleTime` longo) | `MerchantOut[]`, 7 itens | erro → aviso com «Tentar de novo» e o passo pode ser saltado |
| `PATCH /v1/me/profile` | uma vez, ao concluir ou saltar o passo 4 | `ProfileOut` | ver abaixo |

## Corpo do `PATCH`

```text
{ onboarding_completed: true,
  goals?: Goal[],            # só se houver pelo menos um escolhido e o passo foi confirmado
  household_size?: 1..12,    # só se o passo 2 foi confirmado
  merchants?: string[],      # só se houver pelo menos um e o passo foi confirmado
  monthly_goal_cents?: 5000..80000 }   # só se o passo 4 foi confirmado e «Ainda não sei» está desligado
```

Exemplos (sintéticos):

| Percurso | Corpo |
|---|---|
| tudo saltado | `{ "onboarding_completed": true }` |
| 3 pessoas confirmadas, resto saltado | `{ "household_size": 3, "onboarding_completed": true }` |
| tudo confirmado, meta 300 € | `{ "goals": ["finances"], "household_size": 2, "merchants": ["LIDL"], "monthly_goal_cents": 30000, "onboarding_completed": true }` |

Nunca se envia `null`, `[]`, nem valores sugeridos que a pessoa não confirmou.

## Erros do `PATCH`

| Resposta | O que a pessoa vê | O que acontece ao estado |
|---|---|---|
| rede ou 5xx | «Não foi possível guardar. Tente de novo.» + botão para repetir | respostas e passo mantidos; repetir é idempotente |
| 403 `privacy_consent_required` | «A política de privacidade mudou. Confirme-a para continuar.» + ligação para `/privacidade` | nada gravado; `["me"]` invalidado |
| 422 | a mensagem do campo devolvida pela API (já em português) | respostas mantidas |
| 401 | tratado globalmente (`sessionLost`) | — |

## Identificadores de teste do backend

F-100 a F-112 (perfil, validação, conclusão, mercados, consentimento, originais, opção da lista) são «Verificado no Backend». Os testes do frontend desta spec têm identificadores próprios (ver P5 no `plan.md`).
