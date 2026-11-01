import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "../../api/client";

/** How many original files (photos and PDF) are still stored, from confirmed purchases. */
export function useStoredFiles() {
  return useQuery({
    queryKey: ["stored-files"],
    queryFn: async () => unwrap(await api.GET("/v1/receipts/stored-files")),
  });
}

/** The delete stopped before the end; `remaining` is what the last answer said (null if there was none). */
export class DeleteIncomplete extends Error {
  constructor(readonly remaining: number | null) {
    super("delete incomplete");
  }
}

/**
 * DELETE /v1/receipts/stored-files takes at most 500 purchases a call and says how many are left: call it again until
 * none is left. An answer that deleted nothing with purchases still left ends the loop (no endless calls).
 */
export function useDeleteStoredFiles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      let remaining: number | null = null;
      for (;;) {
        let answer;
        try {
          answer = unwrap(await api.DELETE("/v1/receipts/stored-files"));
        } catch {
          throw new DeleteIncomplete(remaining);
        }
        remaining = answer.remaining;
        if (remaining === 0) return;
        if (answer.receipts === 0) throw new DeleteIncomplete(remaining);
      }
    },
    // Even when it stopped half-way the count and the purchases (which offer the original) are read again.
    onSettled: () => {
      for (const queryKey of [["stored-files"], ["receipts"], ["receipt"]]) void qc.invalidateQueries({ queryKey });
    },
  });
}
