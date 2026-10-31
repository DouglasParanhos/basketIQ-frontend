import type { QueryClient } from "@tanstack/react-query";

/**
 * A purchase was added, changed or deleted: what the lists and the Início show is old. The overview is marked old without
 * waiting for it; the receipts are awaited because a caller may want the list fresh before it leaves.
 */
export function invalidateReceiptData(qc: QueryClient): Promise<void> {
  void qc.invalidateQueries({ queryKey: ["overview"] });
  return qc.invalidateQueries({ queryKey: ["receipts"] });
}
