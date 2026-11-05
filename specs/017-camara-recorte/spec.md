# Feature Specification: Contorno do talão na câmara e recorte por cantos

**Feature Branch**: `feature/camara-recorte`

**Created**: 2026-11-05

**Status**: Implementada (Vitest, lint, typecheck, `e2e:mock` e paridade com o backend em 251 capturas reais verdes; desempenho e teste manual em Android e iPhone por fazer)

**Input**: pedido do Douglas (2026-11-05): «outras aplicações, ao usar a câmara, detetam o documento e fazem um efeito de recorte; é possível fazer algo semelhante?». Parte da câmara própria da spec 013 (US4, `src/features/capture/`) e do recorte com perspetiva que o backend já faz depois do envio (`flatten_paper`, `Backend/src/basketiq/pipeline/preprocess.py`).

**Convenção de rastreabilidade**: os testes levam o identificador no nome (`F-xx: …`). Identificadores **F-226 a F-229** (faixa F-226 a F-235, Plano de Testes §5.1). Nenhum contrato da API muda.

## Clarifications

### Session 2026-11-05

Decisões do Douglas, 2026-11-05.

- Q: A spec 013 (FR-017) proíbe desenhar o contorno detetado. Mantém-se? → A: **não**, inverte-se. Não havia um motivo forte. A FR-017 da 013 fica substituída pela FR-001 desta spec.
- Q: O que se envia depois do efeito de recorte? → A: o **original**, como hoje. O backend já recorta e endireita (`flatten_paper`); se o cliente errar um canto, o backend ainda tem a foto toda. O recorte no telemóvel é só visual.
- Q: Ajuste manual dos cantos? → A: sim. Se a pessoa mexer nos cantos, segue o JPEG endireitado no telemóvel (a mesma regra de hoje: sem edição segue o original, com edição segue o que se vê).
- Q: Onde se ajustam os cantos? → A: no «Recortar a parte N», que passa a ser **4 cantos + rodar** e substitui o recorte retangular (`react-easy-crop`): um retângulo é um caso particular de 4 cantos, por isso o zoom e os formatos «Talão estreito/largo» deixam de ser precisos.
- Q: Como se detetam os cantos? → A: porte em TypeScript de `_paper_quad` do backend, sobre a mesma sonda de 800 px, para o contorno mostrado prever o que o backend faz. Sem OpenCV.js (mesma decisão de 2026-11-01 da spec 013).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Contorno ao vivo (Priority: P1)

1. **Given** a câmara própria aberta e um talão na imagem, **When** a câmara o vê, **Then** desenha os quatro lados do talão sobre a imagem, amarelos, ou verdes quando o conselho é «ok», e o contorno segue o talão inclinado ou em perspetiva. — F-226
2. **Given** a câmara sem talão na imagem, **Then** não há contorno. — F-226
3. **Given** um leitor de ecrã, **Then** o contorno é decorativo (`aria-hidden`): os conselhos continuam a ser o que se anuncia. — F-226

### User Story 2 - Efeito de recorte ao tirar a foto (Priority: P1)

1. **Given** um talão detetado, **When** a foto é tirada (sozinha ou pelo obturador), **Then** a imagem congela, o que está fora do talão escurece e o talão endireita-se num retângulo; depois a câmara fecha e aparece «Confirme as partes», como hoje. — F-227
2. **Given** «reduzir movimento» ligado no telemóvel, ou nenhum talão detetado, **Then** não há animação e a câmara fecha logo. — F-227
3. **Given** a foto tirada, **Then** o ficheiro que segue é a imagem inteira (`parte-N.jpg`), como hoje. — F-227

### User Story 3 - Pré-visualização endireitada (Priority: P2)

1. **Given** uma parte com talão detetado (da câmara própria, da câmara do telemóvel ou da galeria), **Then** a pré-visualização em «Confirme as partes» mostra o talão endireitado. Sem talão detetado, mostra a foto como hoje. — F-228

### User Story 4 - Recortar pelos cantos (Priority: P1)

1. **Given** «Recortar a parte N», **Then** a foto aparece com quatro cantos arrastáveis, colocados onde o talão foi detetado (ou nos cantos da foto, sem talão detetado), e «Rodar para a esquerda», «Rodar para a direita», «Repor cantos» e «Concluir». — F-229
2. **Given** um canto a ser arrastado, **Then** uma lupa mostra o que está debaixo do dedo. — F-229
3. **Given** um teclado, **When** um canto tem o foco, **Then** as setas movem-no 1 % (com Shift, 5 %). — F-229
4. **Given** cantos mexidos, **When** a parte é enviada, **Then** segue o JPEG endireitado pelos cantos (e rodado, se rodou); sem cantos mexidos nem rotação, segue o original. — F-229, F-201
5. **Given** «Repor cantos», **Then** os cantos voltam aos detetados e a parte deixa de contar como recortada. — F-229
6. **Given** a parte rodada, **Then** os cantos acompanham a imagem e as setas movem-nos no sentido em que se veem. — F-229

### Edge Cases

- Talão deitado na foto (mais largo do que alto): os cantos detetam-se na mesma.
- Talão sem bordas limpas (rasgado, sombra): sem quadrilátero, usa-se o retângulo do papel, como o backend.
- Talão numa mesa clara (sem papel distinto): sem contorno e sem animação; os cantos do editor começam nos cantos da foto.
- Parte de um talão comprido, cortada em cima e em baixo: o contorno vai até às bordas da imagem.
- HEIC que o browser não descodifica: sem cantos detetados, «Recortar» já está desativado (spec 013).

## Requirements *(mandatory)*

- **FR-001**: A câmara própria MUST desenhar o contorno detetado do talão sobre a imagem (substitui a FR-017 da spec 013 nesta parte; a captura automática mantém-se). — US1
- **FR-002**: O contorno MUST aparecer só depois de duas análises seguidas com talão e MUST mover-se suavemente; sem talão MUST desaparecer. — US1
- **FR-003**: Ao tirar a foto com talão detetado, MUST haver a animação de recorte (≤ 0,6 s) antes de fechar; com `prefers-reduced-motion: reduce` MUST NOT haver animação. — US2
- **FR-004**: O ficheiro da câmara MUST continuar a ser a imagem inteira. — US2
- **FR-005**: «Recortar a parte N» MUST ter 4 cantos arrastáveis (≥ 44 px, com nome acessível e teclado), rodar, «Repor cantos» e «Concluir»; MUST NOT ter zoom nem formatos. — US4
- **FR-006**: Uma parte MUST seguir o original enquanto não tiver rotação nem cantos mexidos; com cantos mexidos MUST seguir o JPEG endireitado (margem de 2 %, tamanho pelas arestas maiores, como `flatten_paper`); só com rotação, MUST seguir a imagem inteira rodada. — US4
- **FR-007**: Nada novo em `localStorage`/`sessionStorage`; a deteção corre no telemóvel e nenhuma imagem sai antes do envio (constituição IV). — todas

## Success Criteria

- **SC-001**: Em `Receipts_Synthetic` e nas variantes do golden set real, os cantos do porte TS diferem dos de `_paper_quad` em ≤ 2 % da largura do papel, e devolvem `null` nos mesmos casos.
- **SC-002**: A análise de um frame (conselho + cantos) leva < 80 ms no Xiaomi e no iPhone de teste.
- **SC-003**: Vitest, lint, typecheck e `e2e:mock` verdes; axe sem violações na câmara e no editor.

## Rastreabilidade

| Id | Cenário | User Story |
|---|---|---|
| F-226 | Contorno ao vivo | US1 |
| F-227 | Efeito de recorte ao tirar a foto | US2 |
| F-228 | Pré-visualização endireitada | US3 |
| F-229 | Recortar pelos cantos | US4 |
