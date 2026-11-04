---

description: "Tarefas da spec 013: Adicionar v2 (talão comprido, várias partes)"
---

# Tasks: Adicionar v2 (talão comprido, várias partes)

**Input**: `/specs/013-adicionar-v2/` — [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Estado (2026-10-31): implementada e verificada (lint e tipos limpos, Vitest 268 testes, `e2e:mock` 90 de 90, capturas feitas); só a jornada `stack` (T026, manual) não foi corrida e a US5 (spike) segue adiada.** Sem bloqueio de contrato (sem `gen:api`: o fluxo de envio, `GET /v1/merchants` e `quality_warnings` já estão em `schema.d.ts`) e **sem decisões de produto por confirmar** (Clarifications da spec). **A US5 (spike da câmara própria) está ADIADA**: é um documento separado (T023).

**Tests**: pedidos (constituição VII; testes antes do código, cada um visto a falhar). Identificadores: `F-200` US1, `F-201` US2, `F-202` US3, `F-203` US4, `F-204` US5 (adiada), `F-205` US6. O nome de cada teste novo começa por `F-200:` … `F-205:`. Os testes existentes `F-04`, `F-06`, `F-08`, `F-17`, `F-24` e `F-31` mantêm os seus ids e só mudam de seletores. Os cenários de junção, qualidade e duplicados são «Verificado no Backend». `scripts/traceability.py` do backend não muda.

**Comandos**: `corepack pnpm@9 <script>` no PowerShell ou Git Bash (não há `pnpm` no PATH nem WSL). Vitest: `corepack pnpm@9 exec vitest run --maxWorkers=4` (um ficheiro de cada vez: `… <ficheiro>`). Playwright (`e2e:mock`) precisa de `pnpm` no PATH (atalho `pnpm.cmd` → `corepack pnpm@9`, fora do repositório) e só corre com o Docker livre. Só dados sintéticos. O commit só depois de `/simplify` (T031).

**Regra de teste em jsdom (plan R9):** `URL.createObjectURL` não existe no jsdom e hoje a pré-visualização falha, por isso o editor nunca monta nos testes. Os testes novos stub-am `URL.createObjectURL` e `URL.revokeObjectURL` **por ficheiro** (nunca em `src/test/setup.ts`) e fazem `vi.mock("./ImageEditor")` e `vi.mock("./renderEdit")`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode correr em paralelo (ficheiros diferentes, sem dependência de tarefa por acabar)
- **[Story]**: US1 ecrã inicial · US2 várias partes · US3 aviso de qualidade · US4 orientação · US5 spike (ADIADA) · US6 qualidade

## Phase 1: Setup

- [X] T001 Linha de base, sem alterar ficheiros: `lint`, `typecheck`, `exec vitest run --maxWorkers=4` (registar os números); confirmar em `src/api/schema.d.ts` os tipos `WarningOut` (`code`, `message`), `FileRequirements` (`max_bytes`, `accepted_types`, `max_pdf_pages`, `max_photos`), `MerchantOut` e `UploadInitIn` com `merchant_hint`, e `GET /v1/merchants`; se faltar algum, **parar** e escrever em `Documentation/PENDENTE_dia_frontend_2026-10-31.md` (não editar o `schema.d.ts` à mão)
- [X] T002 [P] Auxiliares de teste em `src/test/upload.tsx` (novo; só dados sintéticos): `stubPreviewUrls()` (define `URL.createObjectURL` → «blob:parte-N» e `revokeObjectURL` e devolve o contador de URLs libertados; usada por ficheiro de teste, nunca no `setup.ts`), `jpg(name, body?)` e `pdf(name)` (`File` sintéticos), `FakeImageEditor` (componente para `vi.mock("./ImageEditor")`: mostra `value.rotation` e `value.zoom` em texto, com botões «rodar» (`onChange({ ...value, rotation: 90, area })`) e «zoom» (`zoom: 2`) para produzir edições) e `serveUpload()` (handlers msw de `upload-init`, `/photos`, `upload-url`, armazenamento e `process`, com `requirements.max_photos: 6`, que devolve a lista ordenada de chamadas «init:a.jpg», «photo:b.jpg», «storage:…», «process»). Os testes existentes têm de continuar verdes
- [X] T003 [P] `e2e/mock/api.ts`: `POST /v1/receipts/upload-init` (201 com `requirements.max_photos: 6`; 409 `duplicate_suspected` quando `FakeState.duplicate`), `POST /v1/receipts/:id/photos`, `POST /v1/receipts/:id/upload-url`, `POST /v1/receipts/:id/process` (202) e uma rota de armazenamento por `page.route` ao URL pré-assinado (204; erro de rede quando `FakeState.storageFails`), com contadores em `FakeState` (`inits`, `photos`, `stored`, `processed`, `names` na ordem de chegada) e um detalhe de compra com `quality_warnings` (`{ code: "blurry", message: "A imagem parece desfocada." }`) para um id próprio. Os testes `e2e:mock` existentes têm de continuar verdes

---

## Phase 2: Foundational (bloqueia as histórias)

- [X] T004 [P] Escrever `src/features/upload/edit.test.ts` (novo; `F-201:`), a falhar primeiro: `NO_EDIT` é `{ rotation: 0, zoom: 1, crop: { x: 0, y: 0 }, aspect: null, area: null }`; `isEdited(NO_EDIT)` é falso; é verdadeiro com `rotation` 90, com `zoom` 1,5 e com `aspect` 1/3; **mexer só em `crop` com zoom 1 não conta** (`isEdited({ ...NO_EDIT, crop: { x: 10, y: 5 } })` é falso); `rotation` 360 não existe (a rotação é um dos 0, 90, 180, 270)
- [X] T005 Criar `src/features/upload/edit.ts` (puro, sem React) com o tipo `Edit` (`rotation`: 0, 90, 180 ou 270; `zoom`: 1 a 4; `crop`: `{ x, y }`; `aspect`: `number | null`, `1/3` talão estreito ou `1/2` talão largo; `area`: `Area | null` de `react-easy-crop`), `NO_EDIT` e `isEdited(edit) = edit.rotation !== 0 || edit.zoom !== 1 || edit.aspect !== null`. Nada importa este módulo até T014. Depende de T004
- [X] T006 [P] Escrever `src/features/upload/photos.test.ts` (novo; `F-201:`), a falhar primeiro: `canAdd` — lista vazia aceita foto e PDF; com fotos recusa PDF com «Só é possível juntar fotografias a uma fotografia.»; com PDF recusa foto com a mesma mensagem; com 6 partes recusa com «No máximo 6 fotos por talão.» (o número vem de `MAX_PHOTOS`); `add` acrescenta no fim; `remove` retira e **mantém a edição das outras**; `move(id, -1)` e `move(id, 1)` trocam com a vizinha e fora dos limites não fazem nada; `setEdit` substitui só a edição dessa parte; `toUploadFiles(parts, render)` devolve **por ordem**: a parte com `previewUrl` e `isEdited` vai como `render(previewUrl, edit)` com `contentType: "image/jpeg"` e nome `.jpg`; a não editada vai o `file` original com o seu tipo (inclui HEIC); uma parte editada sem `previewUrl` (HEIC que não converteu) vai o original; `nextPartText([1 parte])` é «Parte 2 · comece onde a parte 1 acabou» e com 2 partes «Parte 3 · comece onde a parte 2 acabou»
- [X] T007 Criar `src/features/upload/photos.ts` (puro) com o tipo `Part` (`id`, `file`, `type`, `previewUrl: string | null`, `previewError`, `edit`) e `canAdd`, `add`, `remove`, `move`, `setEdit`, `toUploadFiles`, `nextPartText` conforme `data-model.md`, reutilizando `MAX_PHOTOS` e `effectiveType` de `src/lib/upload.ts` (que **não** mudam). Depende de T005, T006
- [X] T008 Refatorar **sem mudar comportamento**: mover `previewFor` de `src/features/upload/AddPage.tsx` para `src/features/upload/preview.ts` (HEIC convertido com `heic2any` só para a pré-visualização) e `renderEdit` de `ImageEditor.tsx` para `src/features/upload/renderEdit.ts` (o parâmetro passa a `Pick<Edit, "rotation" | "area">`, tipo estrutural que o `Edit` antigo e o novo cumprem); `AddPage.tsx` e `ImageEditor.tsx` passam a importá-los. Correr `features.test.tsx` (F-04, F-06, F-08, F-17, F-24 e F-31): têm de continuar verdes **sem alterações** antes de qualquer outra mudança. Depende de T005

**Checkpoint**: `lint`, `typecheck` e Vitest completos verdes; os testes existentes continuam verdes.

---

## Phase 3: User Story 1 — Ecrã inicial (P1) 🎯 MVP

**Goal**: título, subtítulo, três botões grandes, aviso de talão comprido e mercados da API em chips.

**Independent Test**: `AddPage.test.tsx` com `GET /v1/merchants` simulado; F-06 e F-08 adaptados.

- [X] T009 [P] [US1] Escrever `src/features/upload/AddPage.test.tsx` (novo; `F-200:`) e adaptar F-06 e F-08 de `src/features/features.test.tsx`, a falhar primeiro: `<h1>` «Adicionar talão» e o subtítulo «Lemos o talão e confirma os valores.»; os três botões pela ordem Fotografar, Escolher imagem, Escolher PDF (o primeiro é o principal) e o aviso «Talão comprido? Tire mais de uma foto, uma parte de cada vez. Juntamos tudo num só talão.»; o grupo «Supermercado (opcional)» é um `radiogroup` com «Detetar sozinho» primeiro e escolhido e os 7 mercados da API (incluindo Auchan e Aldi, **a lista vem da API e não de `MERCHANT_OPTIONS`**: um mock com um mercado a mais mostra-o); escolher «Lidl» e um ficheiro envia `merchant_hint: "LIDL"`; com `GET /v1/merchants` a falhar só aparece «Detetar sozinho» e a nota «Não foi possível carregar os supermercados. Pode enviar na mesma.», e o envio continua possível; F-06: `input-camera` com `capture="environment"` e `accept="image/*"`; F-08: ficheiro `.exe` mostra «não é suportado» num aviso `role="alert"` e não muda de ecrã. Depende de T002
- [X] T010 [P] [US1] Criar `src/features/upload/SourceButtons.tsx` (aviso de talão comprido e três botões de 44 px ou mais, o primeiro em tom principal; recebe `onPick(id)` e **não** tem os `input`: os `input` ocultos com `data-testid="input-camera" | "input-image" | "input-pdf"` e os mesmos `accept` e `capture` de hoje ficam no `AddPage`, sempre montados, como hoje, para servirem também «Adicionar outra parte» e «Escolher da galeria» no ecrã das partes) e `src/features/upload/MerchantPicker.tsx` com `MerchantChips` (`role="radiogroup"` de `useMerchants`; cada chip é um `<input type="radio">` escondido dentro de uma `<label>` de 44 px com inicial e nome, como os formatos do `ImageEditor`, para as **setas** mudarem de chip, «Detetar sozinho» primeiro e por defeito, nota se a lista falhar) e `MerchantField` (`<select>` «Supermercado (opcional)» com a mesma lista, para o ecrã das partes). Depende de T009
- [X] T011 [US1] Alterar `src/features/upload/AddPage.tsx`: ecrã inicial com `<h1>` «Adicionar talão», subtítulo, `SourceButtons` e `MerchantChips`; o estado `merchant` único alimenta `MerchantChips` e `MerchantField`; deixar de importar `MERCHANT_OPTIONS` (que **continua** em `src/lib/format.ts` por causa de `ReceiptPage.tsx`); o ecrã com fotos continua como hoje, só com o campo trocado por `MerchantField` e os rótulos «Enviar talão» e «Supermercado (opcional)» (adaptar os seletores de F-04, F-17, F-24 e F-31 em `features.test.tsx`). Depende de T010

**Checkpoint**: T009 verde; F-04, F-06, F-08, F-17, F-24 e F-31 verdes com os seletores novos.

---

## Phase 4: User Story 2 — Várias partes do mesmo talão (P1)

**Goal**: o ecrã «Confirme as partes», com a edição de cada parte a manter-se (A5) e o envio como uma só compra.

**Independent Test**: `AddPage.parts.test.tsx` com `FakeImageEditor`, `renderEdit` simulado e `serveUpload`.

- [X] T012 [P] [US2] Escrever `src/features/upload/ImageEditor.test.tsx` (novo; `F-201:`) com o **componente real** em jsdom, a falhar primeiro: com `value = { ...NO_EDIT, zoom: 2 }` o controlo de zoom mostra 2; com `aspect: 1/3` o formato «Talão estreito» está escolhido e com `null` «Original»; «Rodar para a direita» chama `onChange` com `rotation: 90` e «Rodar para a esquerda» com `rotation: 270`; mover o zoom chama `onChange` com o novo `zoom`; **o componente não tem estado de edição próprio** (re-renderizar com outro `value` muda o que mostra). Depende de T005
- [X] T013 [P] [US2] Escrever `src/features/upload/AddPage.parts.test.tsx` (novo; `F-201:`; `stubPreviewUrls`, `vi.mock("./ImageEditor")` com `FakeImageEditor`, `vi.mock("./renderEdit")` que devolve `new Blob(["editado:" + rotation])`), a falhar primeiro: (1) escolher uma foto abre «Confirme as partes» (`<h1>`, foco no título) com «Parte 1», «Recortar», «Apagar», «Adicionar outra parte» e «Enviar talão»; (2) **A5**: rodar a parte 1 no editor, «Concluir», abrir a parte 2 e voltar à 1: o editor recebe a rotação 90; apagar a parte 2 e subir ou descer partes não perde a edição da parte que se move; (3) no envio de duas partes, a editada vai como JPEG renderizado («editado:90») e a não editada vai o original, **pela ordem mostrada** (depois de «Descer a parte 1», a ordem de `init` e `photo` troca); (4) «Enviar talão · 2 fotos» com duas e «Enviar talão» com uma; (5) o texto «Juntamos as 2 fotos num só talão antes de enviar. Se as partes se sobrepuserem, cuidamos das linhas repetidas.» só com 2 ou mais; (6) com 6 partes «Adicionar outra parte» fica desativado com «No máximo 6 fotos por talão.»; (7) PDF depois de uma foto: aviso «Só é possível juntar fotografias a uma fotografia.» e sem parte nova; PDF como primeira parte: sem «Adicionar outra parte»; (8) apagar a última parte volta ao ecrã inicial (`upload.reset()`: sem envio pendente); (9) «Voltar» e «Cancelar» com 2 partes mostram «Descartar as 2 fotos?» com «Descartar» e «Continuar a editar» (este mantém tudo, aquele liberta os URLs de pré-visualização e volta ao início); sem partes não há confirmação; (10) durante `uploading` (armazenamento lento) «Adicionar outra parte», «Apagar», «Recortar» e as setas ficam desativados; depois de um erro voltam a estar ativos; (11) foco: ao abrir «Recortar» vai ao título «Recortar a parte 1», ao «Concluir» ao botão «Recortar» da parte, ao apagar ao título «Confirme as partes», ao adicionar ao «Recortar» da parte nova; (12) HEIC: a pré-visualização converte-se (stub de `heic2any`), e sem edição o ficheiro enviado é o original `image/heic`; (13) **as sequências de chamadas de F-04 e F-31 não mudaram** (`init`, `photo`, `storage`, `process`); (14) depois de uma falha de rede, apagar a parte 2 e enviar de novo devolve 409 `duplicate_suspected` (a compra abandonada do mesmo utilizador conta como duplicado), o ecrã mostra o aviso do duplicado e «Guardar nova versão» conclui o envio com `allow_duplicate: true`; adaptar também os seletores de F-17, F-24 e F-31 em `features.test.tsx` («Adicionar outra parte», «Parte 2», «Apagar a parte 1», «Descer a parte 1»). Depende de T002, T007, T008, T011
- [X] T014 [US2] Alterar `src/features/upload/ImageEditor.tsx` para **controlado**: `ImageEditor({ src, value, onChange })` sem estados `crop`, `zoom`, `rotation` nem `aspect`; passa-os ao `Cropper` a partir de `value` e, em cada mudança (rodar, zoom, formato, arrastar), chama `onChange({ ...value, … })`; `onCropComplete` atualiza só `area`; o aspeto natural da imagem (`onMediaLoaded`, usado quando `aspect` é nulo) continua a ser estado interno do editor porque deriva da imagem e não é edição; mantém os controlos, os rótulos «Rodar para a esquerda», «Rodar para a direita», «Formato do recorte» (Original, Talão estreito, Talão largo) e «Zoom» e `ASPECTS`; o tipo `Edit` vem de `edit.ts` (já não se exporta de `ImageEditor.tsx`). Depende de T012
- [X] T015 [P] [US2] Criar `src/features/upload/PartCard.tsx` (pré-visualização `object-contain` de cerca de 250 px, «Parte N», nome e tamanho em MB, «Recortar» desativado sem pré-visualização, «Apagar», «Subir a parte N» e «Descer a parte N», tudo ≥ 44 px, `aria-label` com o número da parte, `data-part-edit` no «Recortar») e `src/features/upload/PartEditor.tsx` (`<h2 tabIndex={-1}>` «Recortar a parte N», o `ImageEditor` com `value` da parte e «Concluir» de 44 px; foca o título ao montar). Depende de T014
- [X] T016 [US2] Criar `src/features/upload/PartsScreen.tsx`: `<h1 tabIndex={-1}>` «Confirme as partes», botão «Voltar», a grelha de `PartCard` (ou o `PartEditor` da parte em edição no lugar da lista), «Adicionar outra parte» (campo da câmara, `capture="environment"`) e «Escolher da galeria» (campo de imagens), `MerchantField`, o texto da junção, «Enviar talão · N fotos» (e «Enviar talão» com uma), «Cancelar», a confirmação «Descartar as N fotos?» com `role="alert"`, e os avisos do envio que o `AddPage` tem hoje (progresso «A enviar a foto N de M», duplicado, falha) **sem mudar a lógica nem os textos de F-17 e F-24**; controlos desativados em `hashing`, `uploading` e `starting`. Depende de T015
- [X] T017 [US2] Reorganizar `src/features/upload/AddPage.tsx` como orquestrador: estado `parts` com `photos.ts` (`add`, `remove`, `move`, `setEdit`, `canAdd`), `editingId`, `merchant`, `fileError`, `confirmingDiscard`; `onPick` valida com `validateFile` e `canAdd` e chama `upload.reset()`; ecrã inicial quando não há partes, `PartsScreen` quando há; envio por `toUploadFiles(parts, renderEdit)` e `upload.start(files, merchant || null, allowDuplicate)` e `navigate(`/compras/${id}`)` com sucesso; foco conforme T013 (11); liberta os URLs de objeto ao descartar, ao apagar e ao sair; `previewFor` de `preview.ts` com as conversões HEIC em série. `src/features/upload/useUpload.ts` e `src/lib/upload.ts` **não se alteram**. Depende de T013, T016
- [X] T018 [US2] Confirmar que `git diff --stat -- src/features/upload/useUpload.ts src/lib/upload.ts` está vazio e correr `features.test.tsx` e `AddPage.parts.test.tsx` completos: F-04, F-17, F-24 e F-31 com as mesmas sequências de chamadas. Depende de T017

**Checkpoint**: T012 e T013 verdes; `lint`, `typecheck` e Vitest completos.

---

## Phase 5: User Story 3 — Aviso de qualidade da imagem (P2)

**Goal**: o aviso do detalhe da compra com a ação «Tire outra foto».

- [X] T019 [P] [US3] Acrescentar a `src/features/features.test.tsx` (`F-202:`), a falhar primeiro: um `ReceiptOut` com `quality_warnings` `[{ code: "blurry", message: "A imagem parece desfocada." }, { code: "too_dark", message: "A imagem está demasiado escura." }]` mostra o título «A fotografia pode ser melhorada», as duas mensagens, e uma ligação «Tire outra foto» com `href="/adicionar"`; **não** mostra «Se os valores não estiverem certos, tire uma nova fotografia.»; o aviso tem `role="status"`, ícone (`aria-hidden`) e texto; sem avisos, nada aparece; a revisão e a confirmação continuam possíveis (o botão «Confirmar» não está desativado). Depende de T001
- [X] T020 [US3] Alterar `src/features/receipts/ReceiptPage.tsx` (`Body`, o `Notice` de `quality_warnings`): passar a ação `LinkButton` «Tire outra foto» (`/adicionar`, 44 px) em `action` e retirar a frase solta; sem outra mudança. Depende de T019

**Checkpoint**: T019 verde.

---

## Phase 6: User Story 4 — Orientação sem moldura (P3)

- [X] T021 [P] [US4] Acrescentar a `src/features/upload/AddPage.parts.test.tsx` (`F-203:`), a falhar primeiro: com 1 parte o texto «Parte 2 · comece onde a parte 1 acabou» está junto a «Adicionar outra parte»; com 2 partes «Parte 3 · comece onde a parte 2 acabou»; no limite de 6 partes e com PDF o texto não aparece; **não existe** moldura, «Captura automática» nem «Talão detetado» em nenhum ecrã (o ecrã não finge uma moldura que a câmara do sistema não permite). Depende de T013
- [X] T022 [US4] Garantir em `src/features/upload/PartsScreen.tsx` que o texto vem de `nextPartText(parts)` (já devia estar na T016; se não, acrescentar) e que fica por cima do botão, com `aria-describedby` do botão «Adicionar outra parte». Depende de T021

---

> **2026-11-01:** a US4 passou a «Câmara própria com orientação ao vivo» e a US5 a «Verificação de cada foto antes do envio» (spec). Implementadas em `src/features/capture/`, `AddPage.tsx`, `PartCard.tsx` e `photos.ts`; testes `F-203`/`F-204` em `AddPage.parts.test.tsx`, `src/features/capture/*.test.ts(x)` e `e2e/mock/camera.spec.ts`. O spike (T023) deixa de ser preciso.

- [X] T032 [US4] (2026-11-03; `F-203`) Captura automática na câmara própria (US4.3, US4.9, FR-017): em `src/features/capture/CameraCapture.tsx` o «ok» estabilizado chama o disparo do obturador, uma vez por abertura (em `hints.ts` o `stabilizer` passa a exigir os 4 frames também a um «ok» no primeiro frame); numa parte seguinte só depois de a imagem deixar de estar «ok»; o obturador fica. Texto do `ok`: «Talão detetado · segure firme». Testes a falhar primeiro em `CameraCapture.test.tsx` e `e2e/mock/camera.spec.ts`

## Phase 7: User Story 5 — Spike da câmara própria (P3) — ADIADA

**Não implementar** até a Liz o pedir. É um documento, não código.

- [ ] T023 [US5] ADIADA (`F-204`): escrever `specs/013-adicionar-v2/spike-camara.md` com a conclusão (compensa ou não a câmara própria com `getUserMedia`, moldura, deteção de contorno e captura automática), o peso da biblioteca (OpenCV.js ou equivalente), o desempenho em telemóveis médios e o comportamento em PWA no iOS; se for negativa, diz porquê e a Fase 5 fica só com o texto de orientação. Sem código de produção

---

## Phase 8: User Story 6 — Qualidade (P1)

**Goal**: acessibilidade, larguras, alvos, texto e armazenamento verificados.

- [X] T024 [P] [US6] Escrever `src/features/upload/AddQuality.test.tsx` (novo; `F-205:`; mesmos stubs do T013): nenhum texto proibido (`/você|a gente|Enviar nota|mais barato|Captura automática/i`) no ecrã inicial, nas partes, no editor e na confirmação de descartar; os mercados aparecem por texto e inicial, sem `img`; o progresso do envio tem `role` de progresso com nome; o duplicado e a falha são anunciados (`role="status"` ou `alert`); o erro de ficheiro é `role="alert"`; os controlos das partes têm nome acessível com o número; Tab percorre os controlos pela ordem visual (Voltar, partes, Adicionar, Galeria, Supermercado, Enviar, Cancelar) e, no ecrã inicial, as setas mudam de chip de mercado; nada em `localStorage` nem `sessionStorage`. Depende de T017
- [X] T025 [P] [US6] Em `e2e/mock/ui.spec.ts` (`F-205:`, `F-200:`, `F-201:`; usa os endpoints de T003 e `setInputFiles` com buffers sintéticos): axe sem violações e sem scroll horizontal em `/adicionar` (ecrã inicial), no ecrã das partes com 2 partes, no editor de uma parte e na confirmação de descartar, em claro e escuro, a 320, 375, 430 e 820 px; alvos ≥ 44 px a 320 px nos quatro estados (selector de controlos como em `F-194`, sem contar etiquetas que não envolvem controlo); fluxo de uma foto (`inits` 1, `processed` 1; no máximo 3 toques do ecrã inicial a «Enviar talão», SC-001); fluxo de duas partes (`inits` 1, `photos` 1, `processed` 1, nomes pela ordem mostrada, também depois de «Descer a parte 1»; no máximo 5 toques depois da primeira foto, SC-002); **A5 com o editor real** (`F-201:`): rodar a parte 1 para a direita e aplicar zoom, «Concluir», abrir a parte 2 e voltar à 1: a rotação (botão de rotação ativo) e o valor do zoom mantêm-se, e o ficheiro enviado dessa parte é um JPEG renderizado; retoma depois de `storageFails` sem segunda compra; duplicado com «Guardar nova versão»; o `F-06` existente continua; nada em `localStorage` nem `sessionStorage`. Depende de T003, T017
- [X] T026 [US6] (editado; NÃO corrido: precisa da stack completa e a jornada está desatualizada por outra causa) Adaptar `e2e/stack/journey.spec.ts` (linhas que clicam «Enviar nota» → «Enviar talão» e o que dependa do ecrã de partes); **manual**, só com a stack completa a correr e a jornada ainda desatualizada por outra causa (HANDOFF, commit `0a2856f` do backend): registar «não corrido» se não houver backend. Depende de T017
- [X] T027 [US6] (feito: o `ImageEditor` tinha os formatos com 36 px, o zoom com 16 px e o formato escolhido sem contraste em escuro; corrigidos) Corrigir nos ecrãs o que T024 e T025 apontarem (nomes acessíveis, contraste, tamanhos, foco, o encolher de botões como o da spec 014), sem alterar comportamento. Depende de T024, T025

**Checkpoint**: T024 e T025 verdes; `e2e:mock` a 100 %.

---

## Phase 9: Polish e fecho

- [X] T028 Capturas a 390 px em `Documentation/capturas-adicionar/` (fora do git), claro e escuro: ecrã inicial, partes com 2 partes, editor de uma parte, confirmação de descartar, aviso de qualidade no detalhe. Depende de T027
- [X] T029 Documentos fora do git: registar F-200 a F-205 na Especificação Funcional §12.4 e no HANDOFF (estado da spec 013 e da US5 adiada); acrescentar uma nota na spec `002-adicionar-nota` («reestilizada pela 013; comportamento igual») e a nota para a próxima versão do Funcional sobre várias fotos de uma nota (Clarifications); atualizar `Documentation/PENDENTE_dia_frontend_2026-10-31.md`. Depende de T027
- [ ] T030 Correr `corepack pnpm@9 lint`, `typecheck`, `exec vitest run --maxWorkers=4` e `e2e:mock` (só com o Docker livre; se não responder, parar e registar); registar o resultado. Depende de T027
- [ ] T031 Correr `/simplify` sobre o diff e repetir T030; mostrar o `git diff --stat`. O commit só depois disto. Depende de T030

---

## Dependencies & Execution Order

- T001 → tudo o resto. T002 e T003 [P] entre si.
- Fundação: T004 → T005; T006 → T007 (depende de T005); T008 depende de T005. T004 ‖ T006.
- US1 (T009 a T011) depende de T002, T008. US2 depende de US1 (T011) e dos módulos puros (T007). US3 (T019, T020) só depende de T001 e **não** de US1 nem US2. US4 depende de T013 (e de T016 na implementação).
- US5 (T023) ADIADA, não bloqueia nada.
- US6 (T024 a T027) depende da US2 implementada (T017) e de T003.
- Dentro de cada história, escrever o teste (T004, T006, T009, T012, T013, T019, T021, T024, T025) antes da implementação e vê-lo falhar.

## Parallel Opportunities

- Setup: T002 ‖ T003.
- Fundação: T004 ‖ T006.
- US1: T009 antes de T010 e T011 (testes primeiro).
- US2: T012 ‖ T013; depois T015 ‖ (T014 antes dele).
- US3 em paralelo com US1 e US2 (ficheiros diferentes: `receipts/`).
- US6: T024 ‖ T025.

## Implementation Strategy

- **MVP**: Fase 1 + Fase 2 + US1 (o ecrã inicial novo com os mercados da API). Já entrega o que o desenho mais mostra e mantém o fluxo de hoje.
- Depois US2 (o ecrã das partes com a correção A5), a parte maior e de maior valor; US3 pode fazer-se em qualquer altura.
- US4 acompanha a US2; US6 fecha a entrega; a US5 só por pedido da Liz.
- A navegação pela barra com partes por enviar não pede confirmação (limite conhecido, `plan.md`).
