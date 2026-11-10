# Feature Specification: Passo C nos ecrãs (grupos, «acima/abaixo do que costuma pagar», «Por completar»)

**Feature Branch**: `feature/passo-c`

**Created**: 2026-11-10

**Status**: Implementado. Sem protótipo aprovado: o desenho segue os tokens e as regras de `Documentation/design-ux-v2/README.md` e fica para a Liz aprovar.

**Input**:
- Especificação Funcional v1.5, §12.1.
- `Documentation/RASCUNHO_decisoes_spec010_2026-10-30.md`: D11, D12, D13 e D15.
- Backend: `../Backend/specs/010-passo-c` (o contrato está em `contracts/api.md`).

**Convenção de rastreabilidade:** o passo C usa a faixa F-56 a F-85. O frontend fica com F-76 a F-85; o backend tem F-56 a F-75.

**Âmbito:** só os talões confirmados da própria pessoa. Nada aqui usa preços de outras pessoas nem preços online (RF-17 fica para depois).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - No talão confirmado (Priority: P1)

1. **Given** uma linha cujo preço fica claramente acima ou abaixo do que a pessoa costuma pagar pelo mesmo grupo (decidido pela API: 15 % e 0,20 €), **When** abre o talão, **Then** por baixo da linha aparece, com seta e por palavras (nunca só pela cor), «Acima/Abaixo do que costuma pagar». A frase diz o preço por unidade da base, a média, o número de compras e a janela. — F-76
2. **Given** um preço «normal», sem média ainda ou sem tamanho, **When** abre o talão, **Then** a linha não ganha nada. — F-76
3. **Given** um talão confirmado com descrições por agrupar, **When** abre o talão, **Then** aparece uma vez, sem bloquear, «N produtos deste talão ficaram por agrupar.», com a ligação «Completar». Sem descrições por agrupar não aparece nada. — F-77

### User Story 2 - No produto (Priority: P2)

1. **Given** um produto com grupo, **When** abre o produto, **Then** aparece «<grupo>: o que pagou em cada supermercado», com o preço médio por supermercado ordenado pelo nome, o número de compras e a janela. Com uma diferença clara aparece «A diferença é de cerca de X € numa compra típica.». — F-78
2. **Given** um só supermercado, compras insuficientes ou uma diferença pequena, **When** abre o produto, **Then** a frase diz porque não há conclusão. Um produto sem grupo não tem esta secção. — F-79

### User Story 3 - «Por completar» (D13) (Priority: P2)

O ecrã é `/por-completar`. Entra-se pela ligação no fim de Talões › Produtos e pela frase do talão. Não há contador nem notificações.

1. **Given** descrições por agrupar, **When** escolhe uma sugestão (um toque), **Then** o grupo aplica-se a todas as compras dessa descrição e aparece «Aplicado a N compras.», com «Desfazer» até sair do ecrã. — F-80
2. **Given** «Outro grupo», **When** escolhe um grupo da lista por classe, **Then** o grupo aplica-se (dois toques). Os grupos não comparáveis não aparecem na lista. — F-81
3. **Given** «Não comparável», **When** o escolhe, **Then** a descrição sai da lista. — F-82
4. **Given** várias descrições selecionadas, **When** escolhe o grupo, **Then** o botão diz antes quantas compras mudam («Aplicar a N compras»). — F-83
5. **Given** uma descrição agrupada sem tamanho, **When** indica o tamanho de uma embalagem, **Then** as unidades possíveis são as bases do grupo. — F-84
6. **Given** mais descrições do que as que cabem, **When** abre o ecrã, **Then** vê «Mostramos os 10 com mais gasto, de N. O resto pode esperar.». Em «Atribuídos por si» pode remover uma regra, também com «Desfazer». — F-85
7. **Given** qualquer largura de 320 a 820 px, em claro e em escuro, **When** abre o ecrã, **Then** não há violações axe nem scroll horizontal, e cada controlo tem pelo menos 44 px. — F-85

## Identificadores de teste

| Id | Teste |
|---|---|
| F-76, F-77 | `src/features/groups/groups.test.tsx` |
| F-78, F-79 | `src/features/groups/groups.test.tsx` |
| F-80 a F-84 | `src/features/groups/groups.test.tsx` |
| F-85 | `src/features/groups/groups.test.tsx`, `e2e/mock/ui.spec.ts` |

## Decisões tomadas nesta spec (a confirmar pela Liz)

1. A linha do talão só ganha texto quando o preço está acima ou abaixo; «normal» e «sem média ainda» ficam em silêncio, para o talão não ficar cheio.
2. O ecrã do produto mantém o preço por supermercado do próprio produto e acrescenta, por baixo, a comparação do grupo (decisão do Douglas a 10/11).
3. «Desfazer» repõe o estado anterior da regra e vale até sair do ecrã. Só se desfaz a última ação.
