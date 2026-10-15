# Feature Specification: Adicionar nota

**Feature Branch**: `002-adicionar-nota`

**Created**: 2026-10-15

**Status**: Implemented

**Input**: Especificação Funcional RF-02..RF-05, RF-08, §4.2, §9; Plano de Testes F-04..F-08, F-17, F-24. Backend: `../Backend/specs/002-ingestao-upload`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enviar um PDF ou uma fotografia (Priority: P1)

A pessoa escolhe "Fotografar", "Escolher imagem" ou "Escolher PDF", indica opcionalmente o
supermercado e envia. A aplicação calcula o SHA-256, pede o URL de upload, envia o ficheiro com
progresso, inicia o processamento uma única vez e abre a compra.

**Why this priority**: É a entrada de todos os dados.

**Independent Test**: API e storage simulados (MSW); percurso real com o worker.

**Acceptance Scenarios**:

1. **Given** um PDF válido, **When** a pessoa o envia, **Then** acontecem, por esta ordem, `upload-init` (com SHA-256 de 64 hex e o supermercado indicado), POST ao storage e `process` com `Idempotency-Key`, e a compra abre. — F-04, RF-02, RF-03 — `src/features/features.test.tsx › add receipt (RF-02..RF-04) › F-04: uploads a PDF, starts processing once and opens the receipt`; `e2e/stack/journey.spec.ts › journey: import, review, confirm, analyse, delete`
2. **Given** uma fotografia, **When** é enviada, **Then** é processada por OCR local e a compra aparece. — F-05, F-27 — `e2e/stack/journey.spec.ts › journey: import, review, confirm, analyse, delete` (passo `lidl_photo`)
3. **Given** "Fotografar", **When** a pessoa toca, **Then** abre a câmara traseira (`capture="environment"`, `accept="image/*"`); com a permissão negada o navegador oferece escolher ficheiro. — F-06 — `src/features/features.test.tsx › add receipt (RF-02..RF-04) › F-06: the camera option opens the rear camera`; `e2e/mock/ui.spec.ts › flows with a fake API › F-06: camera input targets the rear camera; denial falls back to choosing a file`
4. **Given** uma imagem, **When** é escolhida, **Then** pode ser pré-visualizada, rodada e recortada antes do envio; sem edição é enviado o original. — RF-04 — [NEEDS CLARIFICATION: recorte/rotação sem teste automatizado; verificado manualmente no browser]

---

### User Story 2 - Ficheiros inválidos (Priority: P1)

**Acceptance Scenarios**:

1. **Given** um tipo não suportado (ex.: `.exe`), **When** é escolhido, **Then** é recusado antes de qualquer envio com mensagem clara. — F-08 — `src/features/features.test.tsx › add receipt (RF-02..RF-04) › F-08: rejects an unsupported file before uploading`; `src/lib/lib.test.ts › file validation (F-08, RF-04) › rejects other types, empty and oversized files`
2. **Given** um HEIC sem tipo MIME (comum em iOS), **When** é escolhido, **Then** é aceite pela extensão. — RF-04 — `src/lib/lib.test.ts › file validation (F-08, RF-04) › accepts the supported types`
3. **Given** um PDF corrompido, **When** o backend o rejeita, **Then** a compra mostra o motivo e a ação recomendada. — F-07 — `src/features/features.test.tsx › review (RF-07, F-11..F-15) › F-07: an invalid document shows the reason and what to do`

---

### User Story 3 - Duplicados e falhas de rede (Priority: P2)

**Acceptance Scenarios**:

1. **Given** um ficheiro já importado, **When** é enviado, **Then** aparece o aviso com supermercado, data e total da compra existente e a pessoa escolhe "Guardar nova versão" (novo `upload-init` com `allow_duplicate=true`) ou outro ficheiro. — F-17, RF-08 — `src/features/features.test.tsx › add receipt (RF-02..RF-04) › F-17: warns about a duplicate and lets the person keep a new version`; `e2e/stack/journey.spec.ts › journey: import, review, confirm, analyse, delete`
2. **Given** a rede falha durante o envio, **When** a pessoa toca "Tentar novamente", **Then** a mesma compra é retomada (sem segundo `upload-init`) com um URL de upload novo. — F-24 — `src/features/features.test.tsx › add receipt (RF-02..RF-04) › F-24: a network failure keeps the receipt and resumes with a fresh upload URL`
3. **Given** o hash local, **When** é calculado, **Then** coincide com o SHA-256 do backend. — RF-08 — `src/lib/upload.test.ts › sha256Hex (RF-08) › hashes file content like the backend does`

### Edge Cases

- Ficheiros > 15 MB ou vazios são recusados no cliente; o backend volta a validar o conteúdo real.
- Navegadores sem suporte HEIC: pré-visualização indisponível, envio permitido.
- Uma nota de cada vez (decisão do MVP).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A UI MUST oferecer Fotografar, Escolher imagem e Escolher PDF, com supermercado opcional.
- **FR-002**: A UI MUST validar tipo e tamanho antes de enviar.
- **FR-003**: A UI MUST mostrar o progresso do envio e permitir sair do ecrã durante o processamento.
- **FR-004**: A UI MUST reutilizar a compra e a `Idempotency-Key` ao repetir após falha.
- **FR-005**: A UI MUST apresentar o aviso de duplicado e deixar a decisão à pessoa.

### Key Entities

- **Upload pendente**: id da compra, chave de idempotência, URL/campos pré-assinados, estado do envio.

## Success Criteria *(mandatory)*

- **SC-001**: Nenhuma compra duplicada criada por repetição após falha de rede.
- **SC-002**: Ecrã "Adicionar" sem violações axe e sem scroll horizontal de 320 a 820 px (`e2e/mock/ui.spec.ts`).

## Assumptions

- A câmara usa o seletor nativo (`<input capture>`). [NEEDS CLARIFICATION: câmara própria na aplicação (getUserMedia) com guia de enquadramento?]
- [NEEDS CLARIFICATION: fila offline de envios (Background Sync) quando não há rede?]
