# Contrato consumido: perfil, mercados, ficheiros guardados e conta

Fonte de verdade: `../basketIQ-backend/specs/013-perfil-utilizador/contracts/api.md` e `src/api/schema.d.ts` (já com todos os tipos abaixo). Este ficheiro só fixa o que as Definições usam. Nada foi inventado; nenhuma pergunta ao backend fica em aberto.

| Chamada | Quando | Resposta | Cache |
|---|---|---|---|
| `GET /v1/me` | cabeçalho, Privacidade, Conta | `MeOut`: `display_name`, `email`, `role`, `created_at`, `privacy_version`, `privacy_accepted_at`, `current_privacy_version` | `["me"]` (existente) |
| `GET /v1/me/profile` | aba Perfil | `ProfileOut` (vazio numa conta sem linha) | `["profile"]`, `staleTime` 60 s, sem tentativas (existente, spec 010) |
| `PATCH /v1/me/profile` | «Guardar alterações» | `ProfileOut` | substitui `["profile"]`; invalida `["overview"]` |
| `GET /v1/merchants` | modo de edição e leitura dos nomes | `MerchantOut[]` (`id`, `name`; 7 itens) | `["merchants"]`, `staleTime` longo (existente) |
| `GET /v1/receipts/stored-files` | aba Privacidade | `StoredFilesOut` `{ files }` | `["stored-files"]` |
| `DELETE /v1/receipts/stored-files` | «Apagar agora» (confirmado) | `StoredFilesDeleted` `{ files_deleted, receipts, remaining }`; máximo 500 compras por chamada | invalida `["stored-files"]`, `["receipts"]`, `["receipt"]` no fim |
| `DELETE /v1/me` | ecrã de eliminar | `{ receipts_deleted, objects_deleted }` | `qc.clear()` e `/login` (existente, não muda) |
| `POST /v1/auth/logout` | «Terminar sessão» | — | `qc.clear()` e `/login` (existente) |

## Corpo do `PATCH` das Definições

Só os campos que a pessoa alterou (comparação com o perfil guardado):

```text
{ household_size?: 1..12 | null,       # null = «Não indicar»
  merchants?: string[],                # só suportados (os de GET /v1/merchants); [] = nenhum
  goals?: ("finances"|"shopping_list"|"savings")[],   # ordem canónica; [] = nenhum
  monthly_goal_cents?: 5000..80000 | null }           # null = sem meta
```

Nunca `onboarding_completed`. Um pedido sem alterações não se envia (o botão está desativado). Exemplos sintéticos:

| Percurso | Corpo |
|---|---|
| conta anterior ao onboarding define só a meta (350 €) | `{ "monthly_goal_cents": 35000 }` |
| apaga a meta | `{ "monthly_goal_cents": null }` |
| 4 pessoas e tira o Lidl (estava Lidl e Continente) | `{ "household_size": 4, "merchants": ["CONTINENTE"] }` |
| tira todos os objetivos | `{ "goals": [] }` |

## Erros do `PATCH`

| Resposta | O que a pessoa vê | Estado |
|---|---|---|
| rede ou 5xx | «Não foi possível guardar. Tente de novo.» | mantém-se em edição com as alterações; repetir é idempotente |
| 403 `privacy_consent_required` | levada a `/privacidade` pela guarda (`["me"]` invalidado) | alterações por guardar perdidas (D-Q8) |
| 422 | a mensagem do campo devolvida pela API | mantém-se em edição |
| 401 | tratado globalmente (`sessionLost`) | — |

## Erros de `stored-files`

| Resposta | O que a pessoa vê |
|---|---|
| `GET` em erro | «Não foi possível carregar os ficheiros guardados.» + «Tentar de novo»; nenhum número |
| `DELETE` em erro a meio | «Não foi possível apagar tudo. Faltam N compras.» + «Tentar de novo» (N = `remaining` da última resposta, ou o último contador conhecido) |
| `DELETE` sem progresso (`receipts` 0 com `remaining` > 0) | igual ao erro; o cliente não repete indefinidamente |

## Identificadores de teste do backend

F-100 a F-112 (perfil, validação, mercados, consentimento, originais) são «Verificado no Backend». Os testes desta spec são F-189 a F-194.
