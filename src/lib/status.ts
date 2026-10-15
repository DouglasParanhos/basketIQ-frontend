import type { Schemas } from "../api/client";

export type ReceiptStatus = Schemas["ReceiptOut"]["status"];

type Tone = "progress" | "attention" | "done" | "error";

export const STATUS: Record<ReceiptStatus, { label: string; tone: Tone }> = {
  RECEIVED: { label: "A aguardar", tone: "progress" },
  VALIDATING: { label: "A validar", tone: "progress" },
  EXTRACTING: { label: "A extrair", tone: "progress" },
  REVIEW_REQUIRED: { label: "Revisão necessária", tone: "attention" },
  COMPLETED: { label: "Pronta a confirmar", tone: "attention" },
  CONFIRMED: { label: "Confirmada", tone: "done" },
  INVALID_FORMAT: { label: "Formato inválido", tone: "error" },
  UNREADABLE: { label: "Documento ilegível", tone: "error" },
  UNSUPPORTED_MERCHANT: { label: "Mercado não suportado", tone: "error" },
  TEMPORARY_FAILURE: { label: "Falha temporária", tone: "error" },
  PERMANENT_FAILURE: { label: "Falha permanente", tone: "error" },
};

export const IN_PROGRESS: ReadonlySet<ReceiptStatus> = new Set(["RECEIVED", "VALIDATING", "EXTRACTING"]);
export const EDITABLE: ReadonlySet<ReceiptStatus> = new Set(["REVIEW_REQUIRED", "COMPLETED"]);

export function isTerminal(status: ReceiptStatus): boolean {
  return !IN_PROGRESS.has(status);
}
