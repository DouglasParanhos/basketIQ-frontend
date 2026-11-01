# Data Model: Adicionar v2 (013)

Sem armazenamento local nem pedidos novos. Os tipos da API vêm de `src/api/schema.d.ts`; abaixo só o estado do ecrã.

## `Edit` (`edit.ts`, puro)

| Campo | Tipo | Notas |
|---|---|---|
| `rotation` | número | graus, múltiplos de 90 (0, 90, 180, 270) |
| `zoom` | número | 1 a 4 (como o controlo atual: `min=1`, `max=4`, passo 0,05) |
| `crop` | `{ x, y }` | posição do recorte no editor (restaura a vista) |
| `aspect` | número ou nulo | `null` = original; `1/3` talão estreito; `1/2` talão largo |
| `area` | `Area` (`react-easy-crop`) ou nulo | píxeis do recorte; nulo até o editor o calcular |

- `NO_EDIT = { rotation: 0, zoom: 1, crop: { x: 0, y: 0 }, aspect: null, area: null }`.
- `isEdited(edit) = edit.rotation !== 0 || edit.zoom !== 1 || edit.aspect !== null` (a regra de `changed` de hoje; mexer só na posição com zoom 1 não conta).
- A edição pertence a **uma parte** e nunca é partilhada.

## `Part` (`photos.ts`)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | texto | `crypto.randomUUID()` |
| `file` | `File` | o original, nunca alterado |
| `type` | texto | `effectiveType(file)` («image/jpeg», «image/heic», «application/pdf»…) |
| `previewUrl` | texto ou nulo | URL de objeto; nulo para PDF ou se a pré-visualização falhar; HEIC convertido só para isto |
| `previewError` | booleano | a pré-visualização falhou (HEIC que o navegador não converte) |
| `edit` | `Edit` | `NO_EDIT` ao início |

## Funções puras de `photos.ts`

| Função | Regra |
|---|---|
| `canAdd(parts, type)` | falso se há partes e `type` ou alguma parte é PDF («Só é possível juntar fotografias a uma fotografia.»); falso com `parts.length >= MAX_PHOTOS` («No máximo 6 fotos por talão.»); verdadeiro caso contrário |
| `add(parts, part)` | acrescenta no fim |
| `remove(parts, id)` | retira; a edição das outras mantém-se |
| `move(parts, id, ±1)` | troca com a vizinha; fora dos limites não faz nada |
| `setEdit(parts, id, edit)` | substitui só a edição dessa parte |
| `toUploadFiles(parts, render)` | por parte, **por ordem**: se `previewUrl` e `isEdited(edit)` → `render(previewUrl, edit)` como `image/jpeg` com `.jpg`; senão o original (`file`, `type`) |
| `nextPartText(parts)` | «Parte N · comece onde a parte N−1 acabou» com N = `parts.length + 1` |

## Estado do `AddPage`

| Estado | Origem | Efeito |
|---|---|---|
| `parts: Part[]` | `photos.ts` | `parts.length === 0` → ecrã inicial; senão ecrã das partes |
| `editingId: string \| null` | `Recortar`/`Concluir` | com valor, o editor ocupa o lugar da lista |
| `merchant: string` | chips e campo | `""` = «Detetar sozinho»; vai em `merchant_hint` |
| `fileError: string \| null` | `validateFile` e `canAdd` | `Notice` de erro (`role="alert"`) |
| `confirmingDiscard: boolean` | Voltar, Cancelar | mostra «Descartar as N fotos?» |
| `upload` | `useUpload` (inalterado) | fase, progresso, parte atual, duplicado, erro |

### Transições

- escolher o 1.º ficheiro válido → `upload.reset()`, cria a parte, foco no título «Confirme as partes».
- «Adicionar outra parte» / «Escolher da galeria» → `canAdd` → `upload.reset()` → acrescenta; foco no «Recortar» da parte nova.
- «Apagar» → `remove` → `upload.reset()`; com 0 partes volta ao ecrã inicial; senão foco no título.
- setas → `move` → `upload.reset()`.
- «Recortar» → `editingId`; «Concluir» → `editingId = null`; a edição fica na parte.
- «Voltar» ou «Cancelar» com partes → `confirmingDiscard`; «Descartar» → liberta os URLs, `parts = []`, `upload.reset()`; «Continuar a editar» → fecha o aviso.
- «Enviar talão» → `toUploadFiles` → `upload.start(files, merchant || null, allowDuplicate)` → com sucesso, `navigate("/compras/:id")`.
- Estados do envio: durante `hashing`, `uploading` e `starting` todos os controlos das partes ficam desativados.

### Validações (valores literais)

- Tipos aceites e 15 MB: `validateFile` (`ACCEPTED_TYPES`, `MAX_BYTES = 15 * 1024 * 1024`), vazio recusado.
- Limite: `MAX_PHOTOS = 6`.
- PDF e fotos não se misturam.

## Entidades da API (consumidas, sem mudança)

`UploadInitIn { filename, content_type, size_bytes, sha256, merchant_hint?, allow_duplicate }`, `UploadInitOut { receipt_id, upload, requirements: FileRequirements }`, `PresignedUploadOut { url, fields, expires_at }`, `MerchantOut { id, name }`, `WarningOut { code, message }` (em `ReceiptOut.quality_warnings`).
