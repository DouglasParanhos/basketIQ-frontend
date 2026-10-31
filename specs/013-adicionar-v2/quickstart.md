# Quickstart: validar o Adicionar v2 (013)

Pré-requisitos: Node com `corepack pnpm@9` (sem `pnpm` no PATH nesta máquina: para o Playwright, um atalho `pnpm.cmd` → `corepack pnpm@9` fora do repositório); Docker livre para o `e2e:mock`; stack do backend só para o teste manual com API real. Só dados sintéticos.

## 1. Testes (um de cada vez, por esta ordem)

```text
corepack pnpm@9 lint
corepack pnpm@9 typecheck
corepack pnpm@9 exec vitest run --maxWorkers=4 src/features/upload/photos.test.ts     # F-201 (regras)
corepack pnpm@9 exec vitest run --maxWorkers=4 src/features/upload/edit.test.ts       # F-201 (edição)
corepack pnpm@9 exec vitest run --maxWorkers=4 src/features/upload/AddPage.test.tsx   # F-200, F-201, F-203, F-205
corepack pnpm@9 exec vitest run --maxWorkers=4 src/features/features.test.tsx         # F-04, F-06, F-08, F-17, F-24, F-31 adaptados; F-202
corepack pnpm@9 exec vitest run --maxWorkers=4                                        # tudo
corepack pnpm@9 e2e:mock                                                              # só com o Docker livre (F-205)
```

## 2. Cenários à mão (API real ou mock)

| Cenário | Esperado |
|---|---|
| Abrir `/adicionar` | «Adicionar talão», subtítulo, chips de mercados (7 + «Detetar sozinho»), 3 botões, aviso de talão comprido |
| Escolher «Lidl» e uma foto | ecrã «Confirme as partes» com 1 parte, o mercado «Lidl» no campo, «Enviar talão» |
| Adicionar uma 2.ª parte | «Parte 2 · comece onde a parte 1 acabou» antes de adicionar; depois «Enviar talão · 2 fotos» e o texto da junção |
| Recortar a parte 1, voltar, abrir a parte 2 e voltar à 1 | o recorte da parte 1 vê-se e é o que segue no envio |
| Apagar a parte 2 | a edição da parte 1 mantém-se; o foco vai ao título |
| Subir a parte 2 | a ordem do envio é a mostrada |
| 6 partes | «Adicionar outra parte» desativado com «No máximo 6 fotos por talão.» |
| PDF depois de uma foto | «Só é possível juntar fotografias a uma fotografia.» |
| Voltar com 2 partes | «Descartar as 2 fotos?»; «Continuar a editar» mantém tudo; «Descartar» volta ao início |
| Enviar com a rede cortada a meio | «O envio não terminou»; «Tentar novamente» retoma sem segunda compra |
| Duplicado | aviso com os dados e «Guardar nova versão» |
| Compra com `quality_warnings` | no detalhe, «A fotografia pode ser melhorada», os avisos e «Tire outra foto» → `/adicionar` |

## 3. Qualidade

- Axe sem violações no ecrã inicial, no das partes (2 partes), no editor e na confirmação de descartar, em claro e escuro, a 320, 375, 430 e 820 px; sem scroll horizontal a 320 px.
- Todos os controlos com ≥ 44 px (botões, chips, Recortar, Apagar, setas, Concluir, campo do mercado).
- Teclado: Tab segue a ordem visual; os chips mudam com as setas; o foco segue as regras de R5.
- Nada em `localStorage` nem `sessionStorage`.
- Capturas a 390 px (claro e escuro) em `Documentation/capturas-adicionar/` (fora do git): ecrã inicial, partes com 2 partes, editor, descartar.
