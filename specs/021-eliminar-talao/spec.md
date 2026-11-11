# Feature Specification: Eliminar talão (leitura falhada) e eliminar compra confirmada com mais camadas

**Feature Branch**: `feat/eliminar-talao`

**Created**: 2026-11-11

**Status**: Implementado. Pedido da Liz ao testar no telemóvel a 11/11: «quero a opção de excluir talão quando temos esse problema de leitura» e «a opção excluir quando o talão já está confirmado, mas com mais camadas».

**Input**:
- Ecrã «Rever talão» com «Não conseguimos ler bem este talão» (spec 013, F-231): só tinha «Tirar outra foto» e «Corrigir à mão».
- Backend: `DELETE /v1/receipts/{id}` já existe e apaga a compra e o ficheiro em qualquer estado. Não há desfazer. Nada muda no backend.
- O padrão de confirmação de «Eliminar conta» (caixa «Compreendo…» que liga o botão final).

**Convenção de rastreabilidade:** F-350 a F-359 (Plano de Testes §5.1, faixa livre a seguir à da lista de compras, F-300 a F-349).

**Âmbito:** só o frontend. Os textos do aviso estão nesta spec; o vocabulário segue o glossário (compra, talão, supermercado).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Eliminar um talão que não foi lido (Priority: P1)

1. **Given** um talão com a leitura falhada («Não conseguimos ler bem este talão»), **When** a pessoa abre o talão, **Then** além de «Tirar outra foto» e «Corrigir à mão» há «Eliminar talão». — F-350, F-357
2. **Given** a pergunta aberta («Eliminar esta compra?»), **When** toca em «Cancelar», **Then** a pergunta fecha, nada é apagado e o foco volta a «Eliminar talão». — F-350
3. **Given** a pergunta aberta, **When** toca em «Eliminar compra», **Then** a compra e o ficheiro são apagados e a pessoa vai para a lista de compras. — F-350

### User Story 2 - Eliminar uma compra confirmada, com mais camadas (Priority: P1)

1. **Given** uma compra confirmada, **When** toca em «Eliminar compra» (em «Ficheiro e dados»), **Then** aparece «Eliminar esta compra confirmada?» com o resumo do que se perde (supermercado, data, número de produtos e total), o que deixa de contar (Resumo, Produtos, meta do mês), que não se pode desfazer, e as saídas mais seguras: «Editar talão» e «Apagar só o ficheiro». — F-351
2. **Given** a pergunta aberta, **When** a pessoa ainda não marcou «Compreendo que esta compra e o ficheiro serão apagados e que não é possível recuperá-los», **Then** o botão «Eliminar compra» está desligado e nada é apagado. — F-352
3. **Given** a caixa marcada, **When** toca em «Eliminar compra», **Then** a compra é apagada, as listas e o Resumo são atualizados e a pessoa vai para a lista de compras. — F-353
4. **Given** a pergunta aberta, **When** toca em «Cancelar», **Then** fecha sem apagar, o foco volta a «Eliminar compra» e, se a abrir de novo, a caixa está desmarcada. — F-354
5. **Given** um erro ao apagar, **When** acontece, **Then** aparece «Não foi possível eliminar a compra.» com a causa em linguagem comum, e a pergunta continua aberta. — F-355

### User Story 3 - O resto não muda (Priority: P2)

1. **Given** uma compra ainda em revisão, **When** toca em «Eliminar talão» no fim da revisão, **Then** continua a haver uma só pergunta, sem caixa. — F-356
2. **Given** os dois estados novos, **When** se abrem a 320 px, **Then** não há violações axe, nem scroll horizontal, e todos os botões estão ao alcance, em claro e escuro. — F-357, F-358

## Requirements *(mandatory)*

- A caixa «Compreendo…» é a mesma de «Eliminar conta» (`AcknowledgeBox` em `components/ui.tsx`).
- Uma compra confirmada (`status = CONFIRMED`) leva as camadas novas; qualquer outra (em revisão, falhada, por enviar) leva a pergunta simples de `DeleteReceiptNotice`.
- O resumo usa os dados que o talão já tem (`merchant`, `store_label`, `purchase_at`, `lines`, `totals.recalculated_total_cents`): sem pedidos novos.
- Fora do âmbito, por decisão: um período de «Desfazer» (apagamento lógico) exigiria backend, como na lista de compras. Fica como possível melhoria.

## Identificadores de teste

| Id | Critérios | Teste |
|---|---|---|
| F-350 | US1.1 a US1.3 | `src/features/receipts/DeleteReceipt.test.tsx` |
| F-351 | US2.1 | `src/features/receipts/DeleteReceipt.test.tsx` |
| F-352, F-353 | US2.2, US2.3 | `src/features/receipts/DeleteReceipt.test.tsx` |
| F-354, F-355 | US2.4, US2.5 | `src/features/receipts/DeleteReceipt.test.tsx` |
| F-356 | US3.1 | `src/features/receipts/DeleteReceipt.test.tsx` |
| F-357, F-358 | US1.1, US2.1, US3.2 | `e2e/mock/ui.spec.ts` |
