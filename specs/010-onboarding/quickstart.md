# Quickstart: validar o onboarding

Pré-requisitos: Node 24+, dependências instaladas, `corepack pnpm@9` (não há `pnpm` no PATH nem WSL). O contrato (`src/api/schema.d.ts`) já inclui o perfil e os mercados; não é preciso voltar a correr `gen:api` salvo se o backend mudar.

## Verificações automáticas

```powershell
corepack pnpm@9 lint
corepack pnpm@9 typecheck
corepack pnpm@9 test            # Vitest
corepack pnpm@9 e2e:mock        # Playwright, projeto mock (axe, larguras, claro e escuro)
```

Se o Vitest falhar com `Channel closed` / `heap out of memory` por falta de memória na máquina, repetir com menos *workers*: `corepack pnpm@9 exec vitest run --maxWorkers=4`.

Resultado esperado: tudo verde; testes existentes sem alterações de comportamento (só passam a servir um perfil concluído por omissão).

## Cenários manuais (com `corepack pnpm@9 dev` e o backend a correr; dados de teste sintéticos)

**Pré-requisito:** a **T032 do backend** aplicada (migração `e5a8b3d1f2c7` e, quando existir, a migração que marca as contas existentes como concluídas, na base de desenvolvimento) e a imagem da API reconstruída. **Depois da segunda migração, as contas que já estavam na base não veem o onboarding: para o cenário 1 usar um utilizador novo no servidor OIDC de teste.** Sem isso `GET /v1/me/profile` falha, a guarda deixa passar (US3.6) e o onboarding não aparece, o que pode passar por sucesso. Confirmar primeiro que `GET /v1/me/profile` responde 200 numa conta de teste.

| # | Passos | Esperado |
|---|---|---|
| 1 | Conta nova, depois do consentimento, abrir `/` | vai para `/boas-vindas`, passo 1, «Passo 1 de 4», sem «Voltar» |
| 2 | Marcar «Todas as anteriores» | as três opções ficam marcadas; desmarcar uma desmarca «Todas as anteriores» |
| 3 | Avançar; no passo 2 tocar «Avançar» sem mexer | 2 «pessoas»; os botões param em 1 e em 12 |
| 4 | Passo 3 | 7 mercados vindos da API, com inicial e nome |
| 5 | Passo 4: mexer na barra; tocar «Ainda não sei» | 50 a 800 €; a barra fica desativada e aparece «Pode definir a sua meta pessoal mais tarde, nas Definições.» |
| 6 | Concluir | pedido único `PATCH /v1/me/profile`; «Tudo pronto»; «Ir para o início» leva a `/` e não volta ao percurso |
| 7 | Conta nova: «Saltar» nos 4 passos (4 toques) | `PATCH` só com `onboarding_completed: true`; perfil sem valores |
| 8 | Confirmar só as pessoas (3) e saltar a meta | só `household_size` guardado |
| 9 | Recarregar a meio | volta ao passo 1 (com os valores guardados, se o perfil os tiver sem conclusão) |
| 10 | Falhar o envio (parar o backend) e concluir | aviso com «Tentar de novo»; respostas mantidas; ao repetir não duplica |
| 11 | Mudar a versão da política no backend e concluir | aviso com ligação para `/privacidade` |
| 12 | Conta que já concluiu abre `/boas-vindas` | vai para `/` (alterar respostas: Perfil, spec 014) |
| 12b | Conta que já existia antes do onboarding (marcada pela migração) abre `/` e `/boas-vindas` | `/` abre sem interrupção; `/boas-vindas` vai para `/`; a meta fica por definir |
| 13 | Ferramentas do navegador › Armazenamento | nada em `localStorage` nem `sessionStorage` |
| 13b | Abrir `/` com a resposta do perfil lenta | só o indicador de carregamento, sem barra de navegação nem Início |
| 14 | Larguras 320, 375, 430 e 820 px, claro e escuro | sem scroll horizontal, alvos ≥ 44 px, axe sem violações |
| 15 | Só teclado e leitor de ecrã | o foco vai para o título ao mudar de passo; progresso e valor anunciados |

Referências: [rotas](./contracts/routes.md), [API consumida](./contracts/profile-api.md), [textos e estilo](./contracts/copy.md), [modelo](./data-model.md).
