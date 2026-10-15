# Feature Specification: Estado do processamento e revisão

**Feature Branch**: `003-revisao`

**Created**: 2026-10-15

**Status**: Implemented

**Input**: Especificação Funcional RF-06, RF-07, RF-08, §9, regras de negócio; Plano de Testes F-07, F-10..F-16. Backend: `../Backend/specs/004-revisao-confirmacao`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Acompanhar o processamento (Priority: P1)

Depois do envio, a compra mostra os passos (Recebida → A validar o ficheiro → A ler os produtos) e
atualiza-se sozinha, mesmo com o separador em segundo plano.

**Acceptance Scenarios**:

1. **Given** uma compra em extração, **When** é aberta, **Then** mostra o passo atual e que a pessoa pode sair do ecrã. — §9 — `src/features/features.test.tsx › review (RF-07, F-11..F-15) › shows processing steps while the receipt is being read`
2. **Given** um erro (formato inválido, ilegível, falha temporária), **When** a compra é aberta, **Then** mostra o motivo e a ação; falhas temporárias e ilegíveis permitem "Processar novamente". — F-07 — `src/features/features.test.tsx › review (RF-07, F-11..F-15) › F-07: an invalid document shows the reason and what to do`

---

### User Story 2 - Rever e corrigir (Priority: P1)

A compra aparece como um talão. Valores com pouca confiança têm marcador amarelo com o texto
"Verificar …". A pessoa edita produto, quantidade, unidade, preço, total e desconto; adiciona,
remove ou divide linhas; corrige supermercado, data e total da nota.

**Acceptance Scenarios**:

1. **Given** valores abaixo do limiar, **When** a revisão abre, **Then** cada valor tem marcador e texto ("Verificar quantidade", "Verificar preço unitário") e o topo lista os motivos. — F-11, F-12 — `src/features/features.test.tsx › review (RF-07, F-11..F-15) › F-12: low-confidence values are highlighted with text, not colour alone`; `e2e/mock/ui.spec.ts › flows with a fake API › F-12: low confidence shown with words and a marker, not colour alone`
2. **Given** uma linha editada, **When** guarda, **Then** o PATCH leva a `version` e só os campos alterados, e a linha passa a "Corrigido manualmente". — F-13 — `src/features/features.test.tsx › review (RF-07, F-11..F-15) › F-13: editing a line sends only the changed field with the version`; `src/lib/lib.test.ts › review draft (RF-07) › sends only the fields the person changed`
3. **Given** linhas removidas e adicionadas, **When** a pessoa edita, **Then** a soma recalcula-se de imediato e o PATCH envia a lista final. — F-14 — `src/features/features.test.tsx › review (RF-07, F-11..F-15) › F-14: adds and removes lines, recalculating the sum`
4. **Given** uma linha a dividir, **When** toca "Dividir linha", **Then** quantidades inteiras repartem-se e linhas ao peso dividem o total. — RF-07 — `src/lib/lib.test.ts › review draft (RF-07) › splits integer quantities between two lines`; `… › splits weighed lines by halving the total`
5. **Given** um nome de produto corrigido, **When** guarda, **Then** é enviado como `product_name` e a descrição original mantém-se. — RF-10 — `src/lib/lib.test.ts › review draft (RF-07) › sends a new product name as a correction, keeping the original description`
6. **Given** data/hora editadas, **When** guarda, **Then** são interpretadas em Europe/Lisbon, incluindo mudança de hora. — PT-7 — `src/lib/lib.test.ts › review draft (RF-07) › uses Lisbon time for purchase dates across DST`
7. **Given** a soma das linhas difere do total da nota, **When** corrige o total e confirma, **Then** a compra fica "Confirmada por si". — F-15b, F-13, F-15 — `e2e/stack/journey.spec.ts › journey: import, review, confirm, analyse, delete`

---

### User Story 3 - Confirmar, duplicados e supermercado desconhecido (Priority: P1)

**Acceptance Scenarios**:

1. **Given** uma compra pronta, **When** toca "Confirmar", **Then** envia a `version` e mostra "Confirmada por si". — F-15 — `src/features/features.test.tsx › review (RF-07, F-11..F-15) › F-15: confirms the purchase`
2. **Given** uma nota de alta confiança, **When** termina o processamento, **Then** aparece "Confirmada automaticamente". — F-15a — `e2e/stack/journey.spec.ts › journey: import, review, confirm, analyse, delete`
3. **Given** suspeita de duplicado, **When** a compra abre, **Then** a pessoa escolhe "Manter as duas" ou "Descartar esta". — F-17 — `e2e/stack/journey.spec.ts › journey: import, review, confirm, analyse, delete` (ramo "Manter as duas"); [NEEDS CLARIFICATION: "Descartar esta" sem teste de UI; coberto no backend `tests/api/test_receipts.py::test_attribute_duplicate_requires_decision`]
4. **Given** supermercado não reconhecido, **When** a compra abre, **Then** a pessoa escolhe o supermercado ("Ler novamente") ou marca como não suportado. — F-10 — verificado no backend (`tests/api/test_receipts.py::test_user_chooses_merchant_or_marks_unsupported`); [NEEDS CLARIFICATION: sem teste de UI dedicado]
5. **Given** uma compra confirmada, **When** se faz logout e login, **Then** as correções mantêm-se. — F-16 — verificado no backend (`tests/api/test_persistence.py::test_confirmed_receipt_with_corrections_survives_logout_and_login`)

### Edge Cases

- Conflito de versão (alterada noutro dispositivo): mensagem para recarregar, nada é sobrescrito.
- Valores mal escritos (ex.: "3,4x") bloqueiam Guardar/Confirmar com a mensagem no campo.
- Linhas não identificadas aparecem como "Produto não identificado" com "Verificar esta linha".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A revisão MUST mostrar a evidência da nota ("Na nota: …") para cada linha lida.
- **FR-002**: Baixa confiança MUST ter marcador + ícone + texto (nunca só cor).
- **FR-003**: A UI MUST recalcular derivados (soma das linhas, diferença para o total) localmente e o backend recalcula ao guardar.
- **FR-004**: Confirmar MUST ficar indisponível enquanto faltarem valores bloqueantes, explicando o que falta.
- **FR-005**: Dinheiro introduzido MUST ser convertido para cêntimos sem ponto flutuante. — PT-7 — `src/lib/lib.test.ts › money (PT-7) › …`

### Key Entities

- **DraftLine**: linha em edição (texto dos campos, campos tocados, linha de origem).

## Success Criteria *(mandatory)*

- **SC-001**: Ecrã de revisão sem violações axe em modo claro e escuro (`e2e/mock/ui.spec.ts › accessibility … › revisão has no axe violations`, `… › dark mode has no contrast violations`).

## Assumptions

- [NEEDS CLARIFICATION: notificação (push) quando o processamento termina com o ecrã fechado?]
