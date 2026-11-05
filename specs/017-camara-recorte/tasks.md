---
description: "Tarefas da spec 017: contorno do talão na câmara e recorte por cantos"
---

# Tasks: Contorno do talão na câmara e recorte por cantos

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [contracts/copy.md](./contracts/copy.md)

**Estado (2026-11-05):** implementada. Vitest 585 + paridade 251/251, lint e tipos limpos, `e2e:mock` 182/182. Falta T014 (desempenho e teste manual nos telemóveis).

**Tests**: antes do código, cada um visto a falhar. Nome começa por `F-226:` … `F-229:`. Só dados sintéticos.

## Phase 1: Base pura

- [X] T001 [P] `homography.test.ts` e `homography.ts`: os 4 cantos mapeiam exatamente; inversa; `matrix3d`; warp de um xadrez
- [X] T002 [P] `paperQuad.test.ts` e `paperQuad.ts` (`F-226`): talão sintético rodado, em trapézio, deitado e direito → cantos a ≤ 1,5 % da largura do papel; sem papel → `null`
- [X] T003 `frame.ts`: `GrayFrame(side)`

## Phase 2: US1 e US2 — câmara

- [X] T004 `useCamera.ts`: `useFrameGuidance` → `{ hint, quad }`, com estabilização (2 análises) e suavização
- [X] T005 `CameraCapture.test.tsx` (`F-226`, `F-227`) e `CameraCapture.tsx`: SVG do contorno; animação de recorte; sem animação com `reduced motion` ou sem talão; o ficheiro é a imagem inteira

## Phase 3: US3 e US4 — partes e editor

- [X] T006 `analyzeStill.ts` / `StillCheck.quad`; `photos.ts`
- [X] T007 `edit.test.ts`, `photos.test.ts` (`F-229`, `F-201`) e `edit.ts`: `Edit = { rotation, corners }`
- [X] T008 `renderEdit.ts`: warp pelos cantos, depois a rotação
- [X] T009 `QuadEditor.test.tsx` (`F-229`) e `QuadEditor.tsx`; `PartEditor.tsx`; apagar `ImageEditor.tsx`, o teste e `react-easy-crop`
- [X] T010 `FlatPreview.tsx` e `PartCard.tsx` (`F-228`)
- [X] T011 `src/test/upload.tsx` (`FakeQuadEditor`), `AddPage.parts.test.tsx`, `AddQuality.test.tsx`

## Phase 4: Verificação

- [X] T012 `e2e/mock/camera.spec.ts` (`F-226`, `F-227`, `F-229`): contorno, `reducedMotion`, arrastar um canto, envio endireitado só depois de mexer; axe
- [X] T013 Paridade com o backend (SC-001): `scripts/paper_quad_parity.py` (corre no ambiente do Backend) + `paperQuad.parity.test.ts` com `PARITY_DIR`: 251/251
- [ ] T014 Desempenho (SC-002) e teste manual no Xiaomi e no iPhone
- [X] T015 Spec 013: FR-017 e copy do editor remetem para esta spec; Plano de Testes §5.1 (faixa F-226 a F-235)
- [ ] T016 `lint`, `typecheck`, `vitest`, `e2e:mock`; `/simplify`; commit
