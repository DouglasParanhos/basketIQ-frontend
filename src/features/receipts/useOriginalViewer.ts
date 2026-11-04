import { useMutation } from "@tanstack/react-query";
import { api, unwrap } from "../../api/client";

/** Opens the original file of a purchase (photo number `photo`, from 1) in another tab: «Ver talão original» and «Ver original». */
export function useOriginalViewer(receiptId: string) {
  return useMutation({
    mutationFn: async (photo: number) =>
      unwrap(await api.GET("/v1/receipts/{receipt_id}/original", { params: { path: { receipt_id: receiptId }, query: { photo } } })),
    onSuccess: (o) => window.open(o.url, "_blank", "noopener,noreferrer"),
  });
}
