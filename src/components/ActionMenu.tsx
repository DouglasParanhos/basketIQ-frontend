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
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    box.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!(e.target instanceof Node) || !box.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
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
        onClick={() => setOpen(!open)}
        className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-brand-soft disabled:opacity-40"
      >
        <MoreVertical aria-hidden className="size-5" />
      </button>
      {open && (
        <div id={menuId} role="menu" tabIndex={-1} aria-label={label} onKeyDown={onKeyDown} className="absolute right-0 top-full z-20 mt-1 w-64 overflow-hidden rounded-surface bg-paper py-1 shadow-lg ring-1 ring-line">
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
