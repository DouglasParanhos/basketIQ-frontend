import type { QueryClient } from "@tanstack/react-query";
import type { Schemas } from "../../api/client";

/**
 * A purchase was added, changed or deleted: what the lists, the totals by month and the Início show is old. The overview and
 * the totals are marked old without waiting for them; the receipts are awaited because a caller may want the list fresh before it leaves.
 */
export function invalidateReceiptData(qc: QueryClient): Promise<void> {
  void qc.invalidateQueries({ queryKey: ["overview"] });
  void qc.invalidateQueries({ queryKey: ["months"] });
  return qc.invalidateQueries({ queryKey: ["receipts"] });
}

/** A purchase was changed (`updated`, its new data) or deleted: it, the lists and the spending are old. */
export function receiptChanged(qc: QueryClient, updated?: Schemas["ReceiptOut"]): Promise<void> {
  if (updated) qc.setQueryData(["receipt", updated.id], updated);
  void qc.invalidateQueries({ queryKey: ["summary"] });
  return invalidateReceiptData(qc);
}

/** A step C rule changed (a group, a size or «não comparável»): the receipts, the products and the comparisons that show groups are old. */
export function groupingChanged(qc: QueryClient): Promise<unknown> {
  const keys = [["to-complete"], ["line-rules"], ["receipt"], ["product"], ["products"], ["group-comparison"]];
  return Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })));
}
