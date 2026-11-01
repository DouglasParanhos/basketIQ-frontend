import { ListChecks } from "lucide-react";

/** Provisional screen of the Lista (spec 015): it only says the area is coming; it has no feature and promises none. */
export function ListaPage() {
  return (
    <div className="flex flex-col gap-4 pb-6 pt-6">
      <h1 className="text-[1.75rem] font-extrabold leading-tight tracking-tight">Lista</h1>
      <section className="flex flex-col items-center gap-2 rounded-surface border-[1.5px] border-dashed border-line p-8 text-center">
        <ListChecks aria-hidden className="size-8 text-ink-soft" />
        <h2 className="font-bold">Em breve</h2>
        <p className="text-sm text-ink-soft">Esta área ainda está em preparação.</p>
      </section>
    </div>
  );
}
