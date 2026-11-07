# Implementation Plan: Editar um talão já validado

**Branch**: `feature/editar-talao-validado` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

## Summary

`ConfirmedReceipt` (em `ReceiptPage.tsx`) ganha «Editar talão» e a pergunta (`FootQuestion` + `Notice`, como «Eliminar compra»). «Sim, editar» chama `POST /v1/receipts/{id}/reopen` e põe a resposta na cache de `["receipt", id]`: como o estado volta a `REVIEW_REQUIRED`/`COMPLETED`, a página mostra a revisão que já existe (`ReviewEditor`). `invalidateReceiptData` e `["summary"]` refrescam as listas e o resumo.

## Technical Context

- `src/api/schema.d.ts` regenerado a partir do `openapi.json` do backend.
- `e2e/mock/api.ts`: `POST /v1/receipts/{id}/reopen` e um talão validado para o caminho F-241.
