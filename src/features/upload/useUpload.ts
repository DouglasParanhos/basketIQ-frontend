import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { ApiError, api, unwrap, type Merchant, type Schemas } from "../../api/client";
import { postToStorage, sha256Hex, UploadError } from "../../lib/upload";
import { invalidateReceiptData } from "../receipts/cache";

export type Phase = "idle" | "hashing" | "uploading" | "starting" | "done" | "duplicate" | "failed";

export interface DuplicateInfo {
  receipt_id: string;
  merchant: string | null;
  purchase_at: string | null;
  total_cents: number | null;
}

/** A file to send: the first is the receipt, the following ones are more photos of the same long receipt. */
export interface UploadFile {
  blob: Blob;
  filename: string;
  contentType: string;
}

interface Pending {
  receiptId: string;
  idempotencyKey: string;
  /** One entry per file, in order: `position` 0 is the first photo. */
  uploads: { upload: { url: string; fields: Record<string, string> }; uploaded: boolean }[];
}

const MAX_NETWORK_RETRIES = 2;

/**
 * Upload flow: hash → upload-init (duplicate check) → one presigned POST per photo with progress → process.
 * A network failure keeps the created receipt, so "Tentar novamente" resumes it instead of
 * creating a second purchase (F-24); photos already sent are not sent again. The same Idempotency-Key is
 * reused for the process call.
 */
export function useUpload() {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [photo, setPhoto] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
  const pending = useRef<Pending | null>(null);

  const start = useCallback(
    async (files: UploadFile[], merchantHint: string | null, allowDuplicate = false) => {
      setError(null);
      setDuplicate(null);
      try {
        if (!pending.current) {
          setPhase("hashing");
          const first = files[0]!;
          const body: Schemas["UploadInitIn"] = {
            filename: first.filename,
            content_type: first.contentType,
            size_bytes: first.blob.size,
            sha256: await sha256Hex(first.blob),
            allow_duplicate: allowDuplicate,
            merchant_hint: (merchantHint as Merchant | null) ?? null,
          };
          const init = unwrap(await api.POST("/v1/receipts/upload-init", { body }));
          const uploads = [{ upload: init.upload, uploaded: false }];
          for (const file of files.slice(1)) {
            const upload = unwrap(
              await api.POST("/v1/receipts/{receipt_id}/photos", {
                params: { path: { receipt_id: init.receipt_id } },
                body: {
                  filename: file.filename,
                  content_type: file.contentType,
                  size_bytes: file.blob.size,
                  sha256: await sha256Hex(file.blob),
                },
              }),
            );
            uploads.push({ upload, uploaded: false });
          }
          pending.current = { receiptId: init.receipt_id, idempotencyKey: crypto.randomUUID(), uploads };
        }
        const p = pending.current;
        setPhase("uploading");
        for (const [position, item] of p.uploads.entries()) {
          if (item.uploaded) continue;
          setPhoto(position);
          const report = (fraction: number) => setProgress((position + fraction) / p.uploads.length);
          for (let attempt = 0; ; attempt++) {
            try {
              await postToStorage(item.upload, files[position]!.blob, report);
              break;
            } catch (e) {
              if (!(e instanceof UploadError && e.network) || attempt >= MAX_NETWORK_RETRIES) throw e;
              // The presigned URL may have expired while offline: ask for a fresh one.
              item.upload = unwrap(
                await api.POST("/v1/receipts/{receipt_id}/upload-url", {
                  params: { path: { receipt_id: p.receiptId }, query: { position } },
                }),
              );
            }
          }
          item.uploaded = true;
        }
        setPhase("starting");
        unwrap(
          await api.POST("/v1/receipts/{receipt_id}/process", {
            params: { path: { receipt_id: p.receiptId }, header: { "Idempotency-Key": p.idempotencyKey } },
          }),
        );
        setPhase("done");
        await invalidateReceiptData(qc);
        return p.receiptId;
      } catch (e) {
        if (e instanceof ApiError && e.code === "duplicate_suspected") {
          setDuplicate((e.details.duplicate_of as DuplicateInfo | undefined) ?? null);
          setPhase("duplicate");
          return null;
        }
        if (e instanceof ApiError && e.code === "upload_missing" && pending.current) {
          for (const item of pending.current.uploads) item.uploaded = false;
        }
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
    setPhoto(0);
    setError(null);
    setDuplicate(null);
  }, []);

  return { phase, progress, photo, error, duplicate, start, reset, hasPending: () => pending.current !== null };
}
