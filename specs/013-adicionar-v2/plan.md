# Implementation Plan: Adicionar v2 (talão comprido, várias partes)

**Branch**: `013-adicionar-v2` (sem ramo git criado; o trabalho fica no ramo atual) | **Date**: 2026-10-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-adicionar-v2/spec.md`

## Summary

Reestilizar o ecrã Adicionar segundo o desenho aprovado e corrigir a edição por parte: o ecrã inicial passa a ter os três botões grandes, o aviso de talão comprido e os mercados da API em chips; depois da primeira foto, o ecrã «Confirme as partes» mostra cada parte com pré-visualização, «Recortar» e «Apagar», «Adicionar outra parte» com a orientação da parte seguinte, o mercado, o texto sobre a junção e «Enviar talão · N fotos». O `ImageEditor` passa a ser controlado, para a edição viver com a parte e sobreviver a trocar, reordenar e apagar (A5 do HANDOFF); o que se envia é o que se vê. O envio (`useUpload`) **não muda**. No detalhe da compra, o aviso de qualidade ganha a ação «Tire outra foto». A câmara própria é um spike separado e não entra.

Sem bloqueio de contrato nem de decisão: o contrato já existe (`openapi.json` do backend, commit `4e327d4`) e as clarificações não deixam decisão de produto nova. Só frontend, sem dependências novas.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19

**Primary Dependencies**: react-router 7, TanStack Query 5 (`useMerchants`), openapi-fetch, `react-easy-crop` 6.2.4 (já usado), `heic2any` (carregado sob pedido, já usado), lucide-react, Tailwind CSS 4. Nenhuma biblioteca nova.

**Storage**: N/A. As partes (ficheiros, URLs de pré-visualização, edições) vivem só em memória no `AddPage`; nada em `localStorage` nem `sessionStorage`; os URLs libertam-se ao sair. Cache do TanStack Query: `["merchants"]` (já existe, 1 h) e `["receipts"]` (invalida o fim do envio, como hoje).

**Testing**: Vitest + Testing Library + msw (testes existentes de `features.test.tsx` adaptados; testes novos de módulos puros e do ecrã); Playwright projeto `mock` (axe, larguras, 44 px, fluxo com envio simulado; o mock ganha os endpoints de envio); capturas a 390 px em `Documentation/capturas-adicionar/` (fora do git). A jornada `stack` não muda.

**Target Platform**: PWA mobile-first, 320–820 px, claro e escuro

**Project Type**: web-app (frontend; backend noutro repositório)

**Performance Goals**: sem pedidos novos além de `GET /v1/merchants` (em cache); pré-visualizações por URL de objeto (sem copiar ficheiros); o recorte só se renderiza ao enviar.

**Constraints**: alvos ≥ 44 px; sem scroll horizontal a 320 px; WCAG 2.2 AA; a cor nunca é o único sinal; só 6 partes; PDF não se mistura com fotos; HEIC só para pré-visualização; fotos só em memória; texto em português europeu.

**Scale/Scope**: 0 rotas novas (`/adicionar` com dois estados), ~7 componentes e 3 módulos puros novos, `AddPage` e `ImageEditor` reorganizados, 1 alteração no `ReceiptPage`, ~5 ficheiros de teste, mocks do e2e.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.* Constituição do frontend v1.0.2.

| Princípio | Avaliação |
|---|---|
| I. Processamento local | Passa: o cliente só envia ao armazenamento privado (URL pré-assinado); a junção e a qualidade são do backend |
| II. Dinheiro exato | N/A (sem dinheiro novo; o duplicado mostra `formatCents` como hoje) |
| III. Nunca inventar valores | Passa: o texto não promete junção no cliente nem verifica qualidade; não há valores novos |
| IV. Privacidade no cliente | Passa: fotos em memória, sem `localStorage`; HEIC convertido só para pré-visualização, original enviado sem edição |
| V. Mobile-first e acessível | Passa com verificação: alvos ≥ 44 px, texto e ícone nos estados, foco gerido, `role="status"/"alert"`, axe claro e escuro, teclado |
| VI. Contrato tipado | Passa: tipos de `schema.d.ts` (`WarningOut`, `FileRequirements`, `MerchantOut`); nenhum à mão |
| VII. Rastreabilidade | Passa: F-200 a F-205, um por história; F-04, F-06, F-08, F-17, F-24 e F-31 mantêm os seus ids |
| VIII. Simplicidade | Passa: sem biblioteca nova, sem estado global; lógica das partes num módulo puro; `useUpload` intacto |

Resultado: **sem violações**; sem decisões de produto por confirmar (ver `spec.md`, Clarifications).

## Limites conhecidos (não são decisões)

- A navegação pela barra inferior com partes por enviar **não** pede confirmação (como hoje); só o «Voltar» e o «Cancelar» do ecrã o fazem (FR-011). Bloquear a navegação seria um acréscimo ao comportamento atual.
- O limite de 6 partes é uma constante do cliente igual ao do backend; o servidor devolve `max_photos` só no primeiro envio (R6).
- Uma compra pendente de um envio falhado fica no servidor se a pessoa a abandonar (comportamento de hoje, `upload.reset()`).

## Project Structure

### Documentation (this feature)

```text
specs/013-adicionar-v2/
├── plan.md              # este ficheiro
├── research.md          # Phase 0 (R1–R10)
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── adicionar-api.md # pedidos consumidos, com os campos reais
│   ├── routes.md        # só /adicionar
│   └── copy.md          # textos em português europeu
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── features/
│   ├── upload/
│   │   ├── AddPage.tsx          # orquestra: partes, mercado, erros, envio; dois estados do ecrã
│   │   ├── SourceButtons.tsx    # NOVO: aviso + os 3 botões grandes (ecrã inicial); os `input` de ficheiro ficam no AddPage
│   │   ├── MerchantPicker.tsx   # NOVO: MerchantChips (ecrã inicial) e MerchantField (ecrã das partes)
│   │   ├── PartsScreen.tsx      # NOVO: «Confirme as partes», grelha, adicionar, enviar, avisos do envio
│   │   ├── PartCard.tsx         # NOVO: pré-visualização, «Parte N», Recortar, Apagar, subir e descer
│   │   ├── PartEditor.tsx       # NOVO: título «Recortar a parte N», «Concluir», foco
│   │   ├── photos.ts            # NOVO, puro: partes (adicionar, remover, mover, editar, limite, PDF)
│   │   ├── edit.ts              # NOVO, puro: Edit {rotation, zoom, crop, aspect, area}, NO_EDIT, isEdited
│   │   ├── renderEdit.ts        # MOVIDO de ImageEditor.tsx: canvas → JPEG (mockável nos testes)
│   │   ├── preview.ts           # MOVIDO de AddPage.tsx: previewFor (HEIC só para pré-visualização)
│   │   ├── ImageEditor.tsx      # passa a controlado (value, onChange); só o componente
│   │   └── useUpload.ts         # INALTERADO
│   └── receipts/ReceiptPage.tsx # só a ação «Tire outra foto» no aviso de qualidade
├── lib/upload.ts                # INALTERADO (MAX_PHOTOS, validateFile, effectiveType)
├── lib/format.ts                # MERCHANT_OPTIONS mantém-se (usado por ReceiptPage)
└── test/{server,fixtures}.ts    # merchants já existe; upload-init e fotos por teste
e2e/mock/
├── api.ts                       # + upload-init, /photos, /upload-url, /process e o armazenamento simulado
└── ui.spec.ts                   # axe, larguras, 44 px e fluxos de Adicionar (F-205, F-200, F-201)
```

**Structure Decision**: a lógica das partes e da edição vai para módulos puros testáveis sem DOM; os componentes só desenham e chamam esses módulos; o envio fica em `useUpload` tal como está.
