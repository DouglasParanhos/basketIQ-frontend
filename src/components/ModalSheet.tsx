import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A sheet that rises from the bottom and holds a form: a modal dialog. The focus goes to the first thing marked
 * `data-autofocus` (else the first control), stays inside while it is open (Tab and Shift+Tab go round), Esc and the
 * backdrop close it, and the focus goes back to what opened it. (`BottomSheet` is for read-only content.)
 */
export function ModalSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const titleId = useId();
  const sheet = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const first = sheet.current?.querySelector<HTMLElement>("[data-autofocus]") ?? sheet.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = [...(sheet.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
      const [head, tail] = [controls[0], controls[controls.length - 1]];
      if (!head || !tail) return;
      if (event.shiftKey && document.activeElement === head) {
        event.preventDefault();
        tail.focus();
      } else if (!event.shiftKey && document.activeElement === tail) {
        event.preventDefault();
        head.focus();
      } else if (!sheet.current?.contains(document.activeElement)) {
        event.preventDefault();
        head.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <button type="button" tabIndex={-1} aria-hidden onClick={onClose} className="absolute inset-0 cursor-default bg-black/40" />
      <div
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative mx-auto flex max-h-[90dvh] w-full max-w-xl flex-col gap-4 overflow-y-auto rounded-t-3xl bg-ground p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-lg"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="font-display text-2xl font-semibold">
            {title}
          </h2>
          <button type="button" aria-label="Fechar" onClick={onClose} className="grid size-11 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-brand-soft">
            <X aria-hidden className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
