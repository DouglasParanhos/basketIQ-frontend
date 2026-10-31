import type { QueryClient } from "@tanstack/react-query";

/**
 * A purchase was added, changed or deleted: what the lists, the totals by month and the Início show is old. The overview and
 * the totals are marked old without waiting for them; the receipts are awaited because a caller may want the list fresh before it leaves.
 */
export function invalidateReceiptData(qc: QueryClient): Promise<void> {
  void qc.invalidateQueries({ queryKey: ["overview"] });
  void qc.invalidateQueries({ queryKey: ["months"] });
  return qc.invalidateQueries({ queryKey: ["receipts"] });
}
