import type { ReactNode } from "react";
import { useConfirmFocus } from "../../lib/useConfirmFocus";

/**
 * A question asked in the foot of the review: it takes the focus when it opens, so it is read out and brought into view, and gives it back to what opened it when it closes.
 * Taller than the foot was, it cannot stay pinned above the navigation bar until the page has scrolled: the margin (the foot's `bottom-20` and a little more) makes the focus scroll it clear of the bar.
 */
export function FootQuestion({ children }: { children: ReactNode }) {
  const ref = useConfirmFocus<HTMLDivElement>();
  return (
    <div ref={ref} tabIndex={-1} className="flex scroll-mb-24 flex-col gap-3 outline-none">
      {children}
    </div>
  );
}
