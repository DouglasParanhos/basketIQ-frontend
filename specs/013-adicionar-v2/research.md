# Research: Adicionar v2 (013)

Fontes: `Documentation/design-ux-v2/AdicionarV2.dc.html` e `README.md`, plano UX v2 Fase 5, HANDOFF (A5), `specs/013-adicionar-v2/spec.md` (Clarifications), `../basketIQ-backend/openapi.json` (commit `4e327d4`) e o código do backend e do frontend (só leitura). Nada foi alterado fora de `specs/013-adicionar-v2`.

## R1. Estrutura: dividir o `AddPage`

- **Decision**: `AddPage` fica como orquestrador (estado das partes, mercado, erro de ficheiro, envio, qual o estado do ecrã); o ecrã inicial é `SourceButtons` + `MerchantChips`; o ecrã das partes é `PartsScreen` com `PartCard` e `PartEditor`; a lógica das partes sai para `photos.ts` e a da edição para `edit.ts` (puros); `previewFor` vai para `preview.ts` e `renderEdit` para `renderEdit.ts`.
- **Rationale**: hoje o `AddPage` tem 285 linhas com estado, validação, pré-visualização, edição e envio no mesmo ficheiro; as regras (limite, PDF, reordenar, o que se envia) ficam testáveis sem DOM e sem `react-easy-crop`. `renderEdit` fora do componente permite fazer `vi.mock` do editor sem perder o render.
- **Alternatives**: manter um ficheiro (os testes de A5 exigiriam o canvas e o cropper); estado em contexto (constituição VIII).

## R2. A5: a edição vive com a parte

- **Facto verificado (código atual)**: `ImageEditor` tem estado interno (`crop`, `zoom`, `rotation`, `aspect`) e o `AddPage` monta-o com `key={active.id}`; ao trocar de parte o editor remonta com o estado de origem e o `onCropComplete` volta a chamar `onChange` com «sem edição»; o `AddPage` guarda por parte só `{ rotation, area, changed }`. Resultado: ao voltar a uma parte editada, o editor aparece sem a edição e o valor guardado pode ser reposto como «sem alteração» (a foto segue sem a edição) ou ficar desfasado do que se vê. Fixa-se com um teste que falha primeiro.
- **Facto verificado (biblioteca)**: `react-easy-crop` 6.2.4 é controlado: `crop`, `zoom`, `rotation` e `aspect` são props; `onCropComplete` devolve a área em píxeis; existem `initialCroppedAreaPixels` e `initialCroppedAreaPercentages` mas não são precisos quando as quatro props vêm do valor guardado (a área recalcula-se ao montar).
- **Decision**: `Edit = { rotation, zoom, crop: {x,y}, aspect: number | null, area: Area | null }`; `ImageEditor` recebe `value: Edit` e `onChange(edit)` e não tem estado de edição próprio; `changed` deixa de ser guardado: `isEdited(edit) = rotation !== 0 || zoom !== 1 || aspect !== null` (a mesma regra de hoje). O envio decide por `isEdited` e `renderEdit(previewUrl, edit)` sobre a edição guardada, e as partes não editadas seguem o original (inclui HEIC).
- **Rationale**: uma só fonte de verdade; sobrevive a trocar, reordenar e apagar; o que se vê é o que se envia (SC-003).
- **Alternatives**: manter o editor montado e escondê-lo (memória por parte, cropper pesado); guardar só `area` (não restaura a vista).

## R3. Mercados: chips e campo

- **Decision**: `useMerchants` (já existe: `GET /v1/merchants`, 7 mercados, 1 h de cache) alimenta `MerchantChips` no ecrã inicial (`role="radiogroup"` com `role="radio"`, «Detetar sozinho» primeiro e escolhido, 44 px, inicial e nome) e `MerchantField` no ecrã das partes (`<select>` com a mesma lista e `<label>` «Supermercado (opcional)»); o estado é um só no `AddPage` e vai para `merchant_hint`. Com a lista a carregar ou em erro: só «Detetar sozinho» e uma nota «Não foi possível carregar os supermercados. Pode enviar na mesma.»; o envio nunca fica bloqueado.
- **Facto verificado**: `MERCHANT_OPTIONS` (`lib/format.ts`) também é usado em `ReceiptPage` (escolher o mercado de uma compra): **não se retira**; só o `AddPage` deixa de o usar.
- **Alternatives**: manter o `<select>` fixo (omite nada, mas o README manda usar a API e o desenho usa chips).

## R4. Confirmar antes de perder as partes

- **Decision**: «Voltar» (topo do ecrã das partes) e «Cancelar» (com partes) pedem confirmação no ecrã: «Descartar as N fotos?» com «Descartar» e «Continuar a editar»; sem partes não há confirmação. Descartar liberta os URLs, `upload.reset()` e volta ao ecrã inicial.
- **Limite conhecido**: a navegação pela barra inferior não bloqueia (como hoje). `useBlocker` seria um acréscimo ao comportamento atual, não é pedido pela spec (FR-011 fala em «Voltar ou cancelar»); fica registado em `plan.md`.

## R5. Foco

- **Decision** (padrão das specs 010 e 014): ao abrir «Recortar» o foco vai ao título «Recortar a parte N» (`tabIndex={-1}`); «Concluir» devolve-o ao botão «Recortar» da parte (`data-part-edit`); ao apagar uma parte vai ao título «Confirme as partes»; ao adicionar uma parte vai ao «Recortar» da parte nova. A primeira entrada no ecrã das partes (depois de escolher o primeiro ficheiro) põe o foco no título.
- **Rationale**: quem usa teclado ou leitor de ecrã não perde o sítio quando o conteúdo muda.

## R6. Limite de partes

- **Facto verificado**: `MAX_PHOTOS = 6` (`lib/upload.ts`); backend `upload_max_photos = 6` e `FileRequirements.max_photos` devolvido no `upload-init` (só depois do primeiro envio; `useUpload` não o lê hoje).
- **Decision**: mantém-se a constante. «Adicionar outra parte» desativado no limite com «No máximo 6 fotos por talão.» (o número vem de `MAX_PHOTOS`, não escrito à mão). Se divergirem, o backend recusa (422/409) e `useUpload` mostra o erro.
- **Alternative**: ler `max_photos` do `upload-init` (só chega tarde demais para desativar o botão).

## R7. «Adicionar outra parte»

- **Decision**: o botão usa o campo da câmara (`capture="environment"`, como o «Fotografar mais» de hoje) e mantém-se o botão discreto «Escolher da galeria» (o «Escolher outra foto» de hoje, com o campo de imagens); nenhuma capacidade existente se perde. O texto «Parte N · comece onde a parte N−1 acabou» (N = número de partes + 1) fica por cima do botão, como a faixa do desenho. Com PDF como primeira parte o botão não aparece (US2.12).
- **Alternative**: um só botão sem `capture` (a folha do sistema oferece câmara ou galeria; mais um toque na câmara e perde-se o comportamento direto de hoje).

## R8. Aviso de qualidade (US3)

- **Facto verificado**: `ReceiptPage` mostra `Notice` com título «A fotografia pode ser melhorada», os `message` de cada aviso e uma frase solta; `Notice` já tem ícone, texto e `role="status"` (ou `alert` em erro).
- **Decision**: acrescentar a ação `LinkButton` «Tire outra foto» (`/adicionar`, 44 px) ao `Notice`, e tirar a frase solta «Se os valores não estiverem certos, tire uma nova fotografia.» (a ação ocupa o lugar). Sem verificação no cliente.
- **Rationale**: RF-05 do backend: avisa e sugere, nunca rejeita; os `message` já vêm em português.

## R9. Estratégia de testes em jsdom

- **Facto verificado**: `URL.createObjectURL` não existe no jsdom; hoje `previewFor` lança, o `AddPage` põe `previewError` e o editor **nunca monta** nos testes (por isso F-31 só vê nomes de ficheiro).
- **Decision**: os testes novos stub-am `URL.createObjectURL` e `revokeObjectURL` por ficheiro (não em `setup.ts`, para não mudar os testes existentes) e fazem `vi.mock("./ImageEditor")` (um editor falso com botões que produzem edições) e `vi.mock("./renderEdit")` (devolve `new Blob(["editado:" + rotação])`) para verificar o que se envia. Os existentes F-04, F-06, F-08, F-17, F-24 e F-31 só trocam seletores (`Enviar talão`, `Supermercado (opcional)`, nomes das partes, `Adicionar outra parte`) e **mantêm as sequências de chamadas** (`init`, `photo`, `storage`, `process`).
- **Alternatives**: stub global de `createObjectURL` (monta o cropper em todos os testes); testar o canvas em jsdom (não suportado).

## R10. e2e e capturas

- **Facto verificado**: `e2e/mock/api.ts` só responde a `GET /v1/merchants` neste ecrã; não há `upload-init`, `/photos`, `/upload-url` nem `/process`, nem o armazenamento.
- **Decision**: acrescentar ao mock o `upload-init` (com `requirements.max_photos: 6`), `/photos`, `/process` e uma rota de armazenamento (`page.route` ao URL pré-assinado) com contadores em `FakeState` (`uploads`, `photos`, `processed`), e ficheiros sintéticos pequenos (`setInputFiles` com buffer). Os testes de axe cobrem o ecrã inicial, o das partes (com 2 partes e com a confirmação de descartar) e o editor; o de 44 px os mesmos; o F-06 mantém-se.
- **Capturas**: 390 px em `Documentation/capturas-adicionar/`, claro e escuro, só se a spec for implementada.

## Correções e riscos (encontrados ao planear)

1. O editor com `key={active.id}` mantém uma instância por vez; a lista de partes do desenho mostra **todas** as pré-visualizações ao mesmo tempo (imagens simples, sem cropper), o que não pesa mais do que hoje (um URL de objeto por parte).
2. `previewFor` converte HEIC com `heic2any` por parte (já assim); com 6 partes HEIC a conversão corre em série para não disparar a memória. Fica como tarefa de implementação, sem decisão.
3. `useUpload` não muda: o contador «A enviar a foto N de M» e a retoma mantêm-se; só o texto do botão passa a «Enviar talão · N fotos».
