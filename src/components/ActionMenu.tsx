import { MoreVertical } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export interface ActionMenuItem {
  label: string;
  /** A line under the label that says what the action does. */
  hint?: string;
  icon?: ReactNode;
  danger?: boolean;
  onSelect: () => void;
}

/**
 * The three dots of a row: a button that opens a menu. `aria-haspopup="menu"`, items with `role="menuitem"`; the arrows,
 * Home and End move between them, Esc and Tab close it and Esc gives the focus back to the button; targets of 44 px.
 */
export function ActionMenu({ id, label, items, disabled = false }: { id?: string; label: string; items: ActionMenuItem[]; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  // Where the menu goes: on the screen, not inside the row, so no ancestor can cut it; above the button when there is no room below.
  const [place, setPlace] = useState<{ right: number; top?: number; bottom?: number }>({ right: 0 });
  const anchor = useRef({ top: 0, right: 0 });
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  function toggle() {
    if (!open && button.current) {
      const r = button.current.getBoundingClientRect();
      anchor.current = { top: r.top, right: r.right };
      const needed = items.length * 56 + 16;
      const right = Math.max(8, window.innerWidth - r.right);
      setPlace(r.bottom + needed > window.innerHeight && r.top > needed ? { right, bottom: window.innerHeight - r.top + 4 } : { right, top: r.bottom + 4 });
    }
    setOpen(!open);
  }

  useEffect(() => {
    if (!open) return;
    // Moving the focus into a menu that sits on the screen must not scroll the page (which would close it).
    box.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
    // The menu hangs on the button: it closes when the button moves away from where it was (the page scrolled or resized).
    const close = () => {
      const r = button.current?.getBoundingClientRect();
      if (!r || Math.abs(r.top - anchor.current.top) > 1 || Math.abs(r.right - anchor.current.right) > 1) setOpen(false);
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    const onPointerDown = (e: PointerEvent) => {
      if (!(e.target instanceof Node) || !box.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  function onKeyDown(event: React.KeyboardEvent) {
    const entries = [...(box.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const at = entries.indexOf(document.activeElement as HTMLElement);
    const go = (i: number) => {
      event.preventDefault();
      entries[(i + entries.length) % entries.length]?.focus();
    };
    if (event.key === "ArrowDown") go(at + 1);
    else if (event.key === "ArrowUp") go(at - 1);
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(entries.length - 1);
    else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      button.current?.focus();
    } else if (event.key === "Tab") setOpen(false);
  }

  return (
    <div ref={box} className="relative shrink-0">
      <button
        ref={button}
        id={id}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={toggle}
        className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-brand-soft disabled:opacity-40"
      >
        <MoreVertical aria-hidden className="size-5" />
      </button>
      {open && (
        <div id={menuId} role="menu" tabIndex={-1} aria-label={label} onKeyDown={onKeyDown} style={place} className="fixed z-40 w-64 max-w-[calc(100vw-1rem)] overflow-hidden rounded-surface bg-paper py-1 shadow-lg ring-1 ring-line">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                button.current?.focus();
                item.onSelect();
              }}
              className={`flex min-h-11 w-full items-start gap-3 px-4 py-2 text-left hover:bg-brand-soft focus-visible:bg-brand-soft ${item.danger ? "text-alert" : "text-ink"}`}
            >
              {item.icon && <span aria-hidden className="mt-0.5 shrink-0">{item.icon}</span>}
              <span className="flex flex-col">
                <span className="font-semibold">{item.label}</span>
                {item.hint && <span className="text-xs font-normal text-ink-soft">{item.hint}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
