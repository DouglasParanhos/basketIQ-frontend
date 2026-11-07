import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

/** A short sheet of read-only content that rises from the bottom: the focus goes in, stays in until it closes (Esc, the backdrop or the button) and goes back to what opened it. */
export function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const titleId = useId();
  const close = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      // The close button is the only thing that can take the focus inside (the content is read-only): keeping it there is the whole trap.
      else if (event.key === "Tab") {
        event.preventDefault();
        close.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <button type="button" tabIndex={-1} aria-hidden onClick={onClose} className="absolute inset-0 cursor-default bg-black/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative mx-auto flex max-h-[80dvh] w-full max-w-xl flex-col gap-3 overflow-y-auto rounded-t-3xl bg-paper p-4 pb-6 shadow-lg"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-base font-extrabold">
            {title}
          </h2>
          <button ref={close} type="button" aria-label="Fechar" onClick={onClose} className="grid size-11 shrink-0 place-items-center text-ink-soft">
            <X aria-hidden className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
