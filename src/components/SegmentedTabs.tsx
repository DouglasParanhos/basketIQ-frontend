import type { KeyboardEvent } from "react";

const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

export interface SegmentedTab {
  id: string;
  label: string;
}

/**
 * Controlled tabs (Compras · Resumo · Produtos, later Perfil · Privacidade · Conta). Arrow keys,
 * Home and End move the focus; Enter, Space or a click activate (manual activation, so moving
 * along the tabs does not navigate or fetch). Only the active tab is in the tab order.
 */
export function SegmentedTabs({
  label,
  tabs,
  value,
  onChange,
}: {
  label: string;
  tabs: SegmentedTab[];
  value: string;
  onChange: (id: string) => void;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLElement>, index: number) {
    const count = tabs.length;
    const step = STEP[event.key];
    const target =
      step !== undefined ? (index + step + count) % count : event.key === "Home" ? 0 : event.key === "End" ? count - 1 : null;
    if (target === null) return;
    event.preventDefault();
    event.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="tab"]')[target]?.focus();
  }

  return (
    <div role="tablist" aria-label={label} className="flex rounded-full bg-brand-soft p-1">
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === value}
          tabIndex={tab.id === value ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => onKeyDown(event, index)}
          className="min-h-11 flex-1 rounded-full px-3 text-sm font-medium text-ink-soft aria-selected:bg-paper aria-selected:font-bold aria-selected:text-ink aria-selected:shadow-sm"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
