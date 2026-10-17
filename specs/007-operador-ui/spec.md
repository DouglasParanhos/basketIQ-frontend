# Feature Specification: Painel do operador

**Feature Branch**: `007-operador-ui`

**Created**: 2026-10-15

**Status**: Implemented (testes de UI só para a vista de configuração)

**Input**: Especificação Funcional §2.2, §10; Especificação Técnica §10, §11. Backend: `../Backend/specs/007-operador-admin`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Acompanhar falhas e reprocessar (Priority: P2)

Um operador (papel `admin`) vê jobs por estado com metadados técnicos (rota, motor, parser,
tentativas, código de erro) e reprocessa jobs falhados. Nunca vê o conteúdo das notas.

**Acceptance Scenarios**:

1. **Given** jobs falhados, **When** o operador filtra "Falhados", **Then** vê os metadados e "Reprocessar". — RF-admin — verificado no backend (`tests/api/test_admin.py::test_admin_reprocesses_a_failed_job`, `::test_admin_sees_job_metadata_without_receipt_content`); [NEEDS CLARIFICATION: sem teste de UI]
2. **Given** um utilizador sem papel `admin`, **When** abre `/operador`, **Then** é reencaminhado para o resumo e a ligação não aparece nas definições. — RF-admin — guarda `RequireSession admin`; backend `tests/api/test_admin.py::test_regular_user_cannot_use_admin`

---

### User Story 2 - Métricas e regras por supermercado (Priority: P3)

**Acceptance Scenarios**:

1. **Given** um período, **When** o operador abre "Métricas", **Then** vê uploads concluídos, tempo mediano até confirmação, linhas sem alteração, duplicados, utilizadores ativos, notas por supermercado, erros por tipo, rotas, custo externo e p95. — Funcional §10 — backend `tests/api/test_admin.py::test_admin_metrics_and_merchant_config`
2. **Given** um supermercado, **When** o operador altera limiar, limiar por campo, tolerância ou ativo, **Then** a regra é guardada e validada (0,5–1). — RF-admin — backend `tests/api/test_admin.py::test_admin_metrics_and_merchant_config`

---

### User Story 3 - Ver a configuração do produto (Priority: P3)

**Acceptance Scenarios**:

1. **Given** o ficheiro `config/app-config.yaml` do backend, **When** o operador abre "Configuração", **Then** vê o valor carregado de cada chave (`APP_NAME_FOR_CUSTOMER`, `LLM_ENABLED`), só em leitura, com a indicação de que a alteração se faz no ficheiro. — CFG-02 — `src/config/appConfig.test.tsx › operator configuration view (CFG-02) › shows each key of the file, read-only`; backend `tests/api/test_config.py::test_admin_config_shows_every_key_to_operators_only`

### Edge Cases

- Erros de validação da API aparecem junto ao formulário.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O painel MUST mostrar apenas metadados e agregados (sem conteúdo de notas nem e-mails).
- **FR-002**: O painel MUST estar acessível apenas a `admin`.

## Success Criteria *(mandatory)*

- **SC-001**: Operador reprocessa um job falhado sem acesso à nota.

## Assumptions

- [NEEDS CLARIFICATION: testes de UI do painel (vitest e axe) ainda por escrever.]
- [NEEDS CLARIFICATION: base legal para um operador alguma vez ver conteúdo de notas (fora do MVP).]
