# Implementation Plan: Contorno do talão na câmara e recorte por cantos

**Branch**: `feature/camara-recorte` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

## Summary

Mostrar o que o backend já faz. A câmara própria passa a desenhar os 4 cantos do talão (porte de `_paper_quad`), a animar o recorte ao tirar a foto e a pré-visualizar a parte endireitada. O «Recortar» passa a ser 4 cantos + rodar, em vez do `react-easy-crop`. O envio continua a levar o original; só uma parte com cantos mexidos segue endireitada no telemóvel. Sem mudanças na API nem no backend.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19.3.
**Primary Dependencies**: as de hoje. Sai `react-easy-crop`. Nenhuma biblioteca nova (sem OpenCV.js).
**Testing**: Vitest + Testing Library (jsdom, sem canvas: a deteção e o warp são funções puras sobre arrays), Playwright `e2e:mock` com a câmara falsa (`e2e/mock/fakeCamera.ts`).
**Target Platform**: PWA em Android (Chrome) e iPhone (Safari).
**Performance Goals**: análise de um frame (conselho a 1200 px + cantos a 800 px) < 80 ms a 4 Hz num telemóvel médio; animação a 60 fps com `matrix3d` (sem mexer em píxeis).
**Constraints**: nada em armazenamento do browser; o original segue sem edição; rotação e cantos em coordenadas normalizadas (0..1) da imagem, que valem para o HEIC convertido e para o original.

## Design

| Peça | Ficheiro | Notas |
|---|---|---|
| Cantos do papel | `src/features/capture/paperQuad.ts` (novo) | Porte de `_paper_quad`: fecho 7×7 da máscara do papel, corrida mais longa por linha que toca a caixa, retas das duas arestas longas (3 passes a cortar pontos longe), pontas pelos percentis 0,2/99,8 ao longo das arestas. Papel deitado: transpõe. Sem quadrilátero: a caixa do papel. Usa `levels` e `paperBox` de `analyzeFrame.ts`. |
| Homografia e warp | `src/features/capture/homography.ts` (novo) | Sistema 8×8 (como `perspective_coefficients`), `matrix3d` para CSS, warp inverso bilinear sobre RGBA. |
| Sonda de 800 px | `src/features/capture/frame.ts` | `GrayFrame(side)`. |
| Contorno ao vivo | `useCamera.ts`, `CameraCapture.tsx` | `useFrameGuidance` devolve `{ hint, quad }`; SVG sobre a caixa medida do vídeo. |
| Animação | `CameraCapture.tsx` | Moldura congelada recortada ao quadrilátero; `requestAnimationFrame` interpola os cantos até ao retângulo; `matrix3d` por frame. |
| Cantos por parte | `analyzeStill.ts`, `analyzeFrame.ts` (`StillCheck.quad`), `photos.ts` | Também para galeria e câmara do sistema. |
| Pré-visualização | `upload/FlatPreview.tsx` (novo), `PartCard.tsx` | Warp pequeno (altura do cartão) num canvas. |
| Editor | `upload/QuadEditor.tsx` (novo), `edit.ts`, `renderEdit.ts`, `PartEditor.tsx` | `Edit = { rotation, corners }`; sai `ImageEditor.tsx`. |

## Constitution Check

- IV (privacidade): imagens só em memória; a deteção corre no telemóvel.
- VII (testes antes): cada teste F-226 a F-229 visto a falhar antes do código.
- VIII (simples): sem estado global novo; o editor continua controlado (`value`/`onChange`).
