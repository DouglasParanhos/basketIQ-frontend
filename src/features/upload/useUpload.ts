import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { ApiError, api, unwrap, type Merchant, type Schemas } from "../../api/client";
import { postToStorage, sha256Hex, UploadError } from "../../lib/upload";

export type Phase = "idle" | "hashing" | "uploading" | "starting" | "done" | "duplicate" | "failed";

export interface DuplicateInfo {
  receipt_id: string;
  merchant: string | null;
  purchase_at: string | null;
  total_cents: number | null;
}

interface Pending {
  receiptId: string;
  idempotencyKey: string;
  upload: { url: string; fields: Record<string, string> };
  uploaded: boolean;
}

const MAX_NETWORK_RETRIES = 2;

/**
 * Upload flow: hash → upload-init (duplicate check) → presigned POST with progress → process.
 * A network failure keeps the created receipt, so "Tentar novamente" resumes it instead of
 * creating a second purchase (F-24). The same Idempotency-Key is reused for the process call.
 */
export function useUpload() {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
  const pending = useRef<Pending | null>(null);

  const start = useCallback(
    async (blob: Blob, filename: string, contentType: string, merchantHint: string | null, allowDuplicate = false) => {
      setError(null);
      setDuplicate(null);
      try {
        if (!pending.current) {
          setPhase("hashing");
          const sha256 = await sha256Hex(blob);
          const body: Schemas["UploadInitIn"] = {
            filename,
            content_type: contentType,
            size_bytes: blob.size,
            sha256,
            allow_duplicate: allowDuplicate,
            merchant_hint: (merchantHint as Merchant | null) ?? null,
          };
          const init = unwrap(await api.POST("/v1/receipts/upload-init", { body }));
          pending.current = {
            receiptId: init.receipt_id,
            idempotencyKey: crypto.randomUUID(),
            upload: init.upload,
            uploaded: false,
          };
        }
        const p = pending.current;
        if (!p.uploaded) {
          setPhase("uploading");
          for (let attempt = 0; ; attempt++) {
            try {
              await postToStorage(p.upload, blob, setProgress);
              break;
            } catch (e) {
              if (!(e instanceof UploadError && e.network) || attempt >= MAX_NETWORK_RETRIES) throw e;
              // The presigned URL may have expired while offline: ask for a fresh one.
              p.upload = unwrap(await api.POST("/v1/receipts/{receipt_id}/upload-url", { params: { path: { receipt_id: p.receiptId } } }));
            }
          }
          p.uploaded = true;
        }
        setPhase("starting");
        unwrap(
          await api.POST("/v1/receipts/{receipt_id}/process", {
            params: { path: { receipt_id: p.receiptId }, header: { "Idempotency-Key": p.idempotencyKey } },
          }),
        );
        setPhase("done");
        await qc.invalidateQueries({ queryKey: ["receipts"] });
        return p.receiptId;
      } catch (e) {
        if (e instanceof ApiError && e.code === "duplicate_suspected") {
          setDuplicate((e.details.duplicate_of as DuplicateInfo | undefined) ?? null);
          setPhase("duplicate");
          return null;
        }
        if (e instanceof ApiError && e.code === "upload_missing" && pending.current) pending.current.uploaded = false;
        setError(e instanceof Error ? e.message : "Não foi possível enviar a nota.");
        setPhase("failed");
        return null;
      }
    },
    [qc],
  );

  const reset = useCallback(() => {
    pending.current = null;
    setPhase("idle");
    setProgress(0);
    setError(null);
    setDuplicate(null);
  }, []);

  return { phase, progress, error, duplicate, start, reset, hasPending: () => pending.current !== null };
}
