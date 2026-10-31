# Contrato consumido: Adicionar v2 (013)

Fonte: `../basketIQ-backend/openapi.json` (commit `4e327d4`) e o código do backend (só leitura: `routers/receipts.py`, `pipeline/quality.py`). Todos os pedidos exigem sessão e consentimento (401 e 403 `privacy_consent_required` tratados globalmente). **Nada é novo nem se propõe ao backend:** o ecrã reutiliza o fluxo de envio que `useUpload` já implementa.

## Pedidos

| Pedido | Parâmetros | Resposta | Notas |
|---|---|---|---|
| `GET /v1/merchants` | nenhum | `MerchantOut[]` (7) | alimenta chips e campo; cache de 1 h (`useMerchants`) |
| `POST /v1/receipts/upload-init` | corpo `UploadInitIn` | 201 `UploadInitOut`; 409 `duplicate_suspected` | primeira parte (ou o PDF); `merchant_hint` vem da escolha; `allow_duplicate` só ao «Guardar nova versão» |
| `POST /v1/receipts/{id}/photos` | corpo `{ filename, content_type, size_bytes, sha256 }` | 201 `PresignedUploadOut` | uma chamada por parte seguinte, pela ordem mostrada |
| `POST` ao `upload.url` pré-assinado | `FormData` (`fields` + `file`) | 2xx | com progresso (XHR); erro de rede é recuperável |
| `POST /v1/receipts/{id}/upload-url?position=` | `position` (0 = primeira parte) | `PresignedUploadOut` | URL novo ao retomar depois de uma falha |
| `POST /v1/receipts/{id}/process` | cabeçalho `Idempotency-Key` | 202 | uma só vez; a mesma chave ao retomar |
| `GET /v1/receipts/{id}` | — | `ReceiptOut` com `quality_warnings: WarningOut[]` | só o aviso de qualidade é novo para este ecrã |

## Campos

```text
UploadInitIn   { filename, content_type, size_bytes, sha256, merchant_hint?: Merchant | null, allow_duplicate?: bool }
UploadInitOut  { receipt_id, upload: PresignedUploadOut, requirements: FileRequirements }
FileRequirements { max_bytes: int, accepted_types: str[], max_pdf_pages: int, max_photos: int }   # max_photos = 6 (upload_max_photos)
MerchantOut    { id: str, name: str }
WarningOut     { code: str, message: str }   # codes: blurry, low_resolution, too_dark, low_text, low_ocr_confidence
```

## Regras de contrato que o ecrã usa

1. `requirements.max_photos` (6) só chega **depois** do primeiro `upload-init`; o ecrã usa a constante `MAX_PHOTOS = 6` para desativar «Adicionar outra parte» (research R6).
2. A junção das partes é do servidor (`stitch.py`); o cliente só envia as partes, em ordem, e o servidor trata as linhas repetidas.
3. Os avisos de qualidade saem do processamento (`image_warnings`, `ocr_warnings`: «avisa e sugere, nunca rejeita»); só existem depois do envio, no detalhe da compra. Os `message` já vêm em português («A imagem parece desfocada.», «A imagem está demasiado escura.», …).
4. PDF e fotos não se misturam: a restrição é do cliente (e do backend, que recusa fotos adicionais a um PDF).
5. Duplicado suspeito: 409 com `details.duplicate_of { receipt_id, merchant, purchase_at, total_cents }`; o ecrã mostra-o como hoje.

## Em falta (sem pergunta ao backend)

Nada. A câmara própria (moldura, contorno, captura automática) é do cliente e depende do spike (US5).
