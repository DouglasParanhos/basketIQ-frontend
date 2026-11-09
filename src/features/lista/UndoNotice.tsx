import { useEffect, useRef } from "react";

/** How long «Desfazer» stays: more than the 10 s the design asks, and the server keeps the item for a day. */
export const UNDO_MS = 12_000;

/** «[Produto] removido da lista.» with «Desfazer». It does not take the focus; it is a status, and goes away by itself. */
export function UndoNotice({ name, onUndo, onGone }: { name: string; onUndo: () => void; onGone: () => void }) {
  const gone = useRef(onGone);
  gone.current = onGone;
  // The timer belongs to this notice (its key is the removed item): a new removal builds a new one.
  useEffect(() => {
    const timer = window.setTimeout(() => gone.current(), UNDO_MS);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div role="status" className="fixed inset-x-4 bottom-[calc(10.5rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-surface bg-ink px-4 py-1 text-ground shadow-lg md:bottom-24">
      <span className="py-2 text-sm">{name} removido da lista.</span>
      <button type="button" onClick={onUndo} className="min-h-11 px-2 text-sm font-extrabold underline">
        Desfazer
      </button>
    </div>
  );
}
