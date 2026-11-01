# Quickstart: validar as Definições

Pré-requisitos: Node 24+, dependências instaladas, `corepack pnpm@9` (não há `pnpm` no PATH nem WSL). Backend com a spec 013 aplicada (perfil, mercados, ficheiros guardados). `src/api/schema.d.ts` já tem os tipos.

## Verificações automáticas

```powershell
corepack pnpm@9 lint
corepack pnpm@9 typecheck
corepack pnpm@9 exec vitest run --maxWorkers=4
corepack pnpm@9 e2e:mock        # Playwright, projeto mock (axe, larguras, claro e escuro)
```

Resultado esperado: tudo verde; os testes que abriam `/definicoes` seguem o redirecionamento para `/definicoes/perfil`.

## Cenários manuais (com `corepack pnpm@9 dev` e o backend a correr; dados de teste sintéticos)

**Pré-requisitos:** uma conta com o onboarding concluído e perfil preenchido, e uma conta que o tenha concluído a saltar tudo (perfil vazio, como as anteriores ao onboarding); compras confirmadas com originais guardados. A migração `f6b9c4e2a3d8` ainda não está aplicada: uma conta antiga na base de desenvolvimento vê o onboarding.

| # | Passos | Esperado |
|---|---|---|
| 1 | Abrir `/definicoes` | vai a `/definicoes/perfil`, cabeçalho com inicial, «Conta Google» e e-mail, abas Perfil · Privacidade · Conta, sem lembretes; «Voltar» não fica preso |
| 2 | Perfil preenchido | quatro blocos com os valores e «Editar» |
| 3 | Perfil vazio | «Ainda não definiu.» e «Definir» em cada bloco |
| 4 | «Editar» na meta, escrever 350, «Guardar alterações» | «1 alteração por guardar»; pedido só com `monthly_goal_cents` 35000; «Perfil guardado.»; o Início mostra a nova meta |
| 5 | Meta 30 ou 900 | «A meta tem de estar entre 50 € e 800 €.»; nada enviado |
| 6 | Esvaziar a meta e guardar | pedido com `monthly_goal_cents` nulo; o Início mostra «Definir a minha meta pessoal» |
| 7 | Mudar pessoas, tirar um mercado, juntar um objetivo | «3 alterações por guardar»; um só pedido com os três campos |
| 8 | «Cancelar» com alterações | «Descartar as N alterações?»; «Continuar a editar» mantém; «Descartar» volta ao guardado |
| 9 | Parar o backend e guardar | erro «Não foi possível guardar. Tente de novo.»; alterações mantidas; repetir funciona |
| 10 | `/definicoes/perfil?editar=meta` | em edição, foco na meta; depois de guardar o URL fica sem `editar` |
| 11 | Aba Privacidade | política com data e versão reais, retenção de 30 dias, «N ficheiros guardados agora» |
| 12 | «Apagar agora» e confirmar | contador a 0; as compras e os valores mantêm-se; a ficha da compra já não oferece o original |
| 13 | Sem originais | «Nenhum ficheiro guardado» e botão desativado |
| 14 | Aba Conta | «Entrou com Google · e-mail», «Terminar sessão», «Eliminar conta…»; operador vê a ligação ao painel |
| 15 | «Eliminar conta…» | ecrã próprio com a lista, caixa por marcar e botão desativado; «Cancelar» volta à aba Conta |
| 16 | Marcar a caixa e eliminar (conta de teste) | vai a `/login`; os dados desaparecem |
| 17 | Conta que não concluiu o onboarding abre `/definicoes/perfil` | vai a `/boas-vindas` |
| 18 | Ferramentas do navegador › Armazenamento | nada em `localStorage` nem `sessionStorage` |
| 19 | Larguras 320, 375, 430 e 820 px, claro e escuro | sem scroll horizontal, alvos ≥ 44 px, axe sem violações, cor nunca sozinha |
| 20 | Só teclado e leitor de ecrã | as abas movem-se com setas; a contagem e o «Perfil guardado.» são anunciados; o foco entra no bloco escolhido |

Referências: [contrato](./contracts/profile-api.md), [rotas](./contracts/routes.md), [textos](./contracts/copy.md), [modelo](./data-model.md).
