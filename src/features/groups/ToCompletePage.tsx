import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { api, unwrap, type Schemas } from "../../api/client";
import { SegmentedTabs } from "../../components/SegmentedTabs";
import { Button, ErrorNotice, Field, Notice, Select, Spinner } from "../../components/ui";
import { formatCents, formatQuantity, parseQuantity, plural } from "../../lib/format";
import { merchantName } from "../../lib/merchants";
import { groupingChanged } from "../receipts/cache";

type Item = Schemas["ToCompleteItemOut"];
type Rule = Schemas["LineRuleOut"];
type Group = Schemas["CatalogGroupOut"];
type Class = Schemas["CatalogClassOut"];
type Change = Omit<Schemas["LineRulesIn"], "targets">;
type Target = Schemas["RuleTargetIn"];
type Tab = "ungrouped" | "missing_size" | "assigned";
type Done = { message: string; undo: () => Promise<unknown> };

const LABELS: Record<Tab, string> = { ungrouped: "Por agrupar", missing_size: "Tamanho em falta", assigned: "Atribuídos por si" };
const TABS = Object.entries(LABELS).map(([id, label]) => ({ id, label }));
const UNIT_NAMES: Record<string, string> = { kg: "kg", l: "litros", un: "unidades", rolo: "rolos", dose: "doses" };

const target = (x: Pick<Item, "chain" | "description_key"> & { description?: string | null }): Target => ({
  chain: (x.chain ?? null) as Target["chain"],
  description: x.description ?? x.description_key,
});

/** Everything a rule says, as a change: sending it back restores the rule exactly (and no rule clears it). */
const ruleToChange = (rule: Rule | undefined): Change => ({
  group: rule?.group?.slug ?? null,
  not_comparable: rule?.not_comparable ?? false,
  size: rule?.size ? { value: rule.size.value, unit: rule.size.unit } : null,
});

const putRules = async (targets: Target[], change: Change) => unwrap(await api.PUT("/v1/line-rules", { body: { targets, ...change } }));

/** Puts back what each description had before, one request per distinct earlier state. */
function restore(before: { target: Target; change: Change }[]) {
  const byState = new Map<string, { change: Change; targets: Target[] }>();
  for (const { target: t, change } of before) {
    const key = JSON.stringify(change);
    byState.set(key, { change, targets: [...(byState.get(key)?.targets ?? []), t] });
  }
  return Promise.all([...byState.values()].map(({ targets, change }) => putRules(targets, change)));
}

/**
 * «Por completar» (step C, D13): descriptions the catalogue could not group, and grouped ones without a size. Nothing here is
 * required: no counter, no reminder, «o resto pode esperar». A choice applies to every purchase of that description, past and
 * future, and «Desfazer» undoes the last one until the person leaves the screen.
 */
export default function ToCompletePage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("ungrouped");
  const [done, setDone] = useState<Done | null>(null);
  const catalog = useQuery({
    queryKey: ["catalog-groups"],
    queryFn: async () => unwrap(await api.GET("/v1/catalog/groups")),
    staleTime: Infinity,
  });
  const rules = useQuery({ queryKey: ["line-rules"], queryFn: async () => unwrap(await api.GET("/v1/line-rules")) });
  // Only the groups a person can choose, once: classes without one are left out.
  const classes = useMemo(
    () => (catalog.data?.classes ?? []).map((c) => ({ ...c, groups: c.groups.filter((g) => g.comparable) })).filter((c) => c.groups.length > 0),
    [catalog.data],
  );

  // Every action returns its message and how to undo it; refreshing what shows groups is done here, once.
  const act = useMutation({
    mutationFn: (action: () => Promise<Done>) => action(),
    onSuccess: async (result) => {
      setDone({ message: result.message, undo: () => result.undo().then(() => groupingChanged(qc)) });
      await groupingChanged(qc);
    },
  });
  const apply = (items: Item[], change: Change) =>
    act.mutate(async () => {
      const before = items.map((i) => ({ target: target(i), change: ruleToChange(rules.data?.find((r) => r.id === i.rule_id)) }));
      const result = await putRules(items.map(target), change);
      return { message: `Aplicado a ${plural(result.applied_lines, "compra", "compras")}.`, undo: () => restore(before) };
    });
  const remove = (rule: Rule) =>
    act.mutate(async () => {
      unwrap(await api.DELETE("/v1/line-rules/{rule_id}", { params: { path: { rule_id: rule.id } } }));
      return { message: "Regra removida.", undo: () => putRules([target(rule)], ruleToChange(rule)) };
    });

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-2 pt-6">
        <Link to="/produtos" aria-label="Voltar aos produtos" className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-brand-soft">
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <h1 className="font-display text-2xl font-semibold leading-tight">Por completar</h1>
      </header>
      <p className="text-sm text-ink-soft">
        Produtos que não conseguimos agrupar ou sem tamanho. Completar é opcional: serve para comparar o que paga pelo mesmo tipo de produto.
      </p>
      <SegmentedTabs label="Por completar" tabs={TABS} value={tab} onChange={(id) => setTab(id as Tab)} />
      {done && (
        <Notice
          tone="success"
          action={
            <Button variant="secondary" size="sm" onClick={() => void done.undo().then(() => setDone(null))}>
              Desfazer
            </Button>
          }
        >
          {done.message}
        </Notice>
      )}
      {act.error && <Notice tone="error">{act.error.message}</Notice>}
      {catalog.error && <ErrorNotice what="carregar os grupos" error={catalog.error} onRetry={() => void catalog.refetch()} />}
      {tab === "assigned" ? (
        <Assigned rules={rules} busy={act.isPending} onRemove={remove} />
      ) : (
        <ToComplete key={tab} tab={tab} classes={classes} busy={act.isPending} onApply={apply} />
      )}
    </div>
  );
}

function ToComplete({
  tab,
  classes,
  busy,
  onApply,
}: {
  tab: "ungrouped" | "missing_size";
  classes: Class[];
  busy: boolean;
  onApply: (items: Item[], change: Change) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchGroup, setBatchGroup] = useState("");
  const query = useQuery({
    queryKey: ["to-complete", tab],
    queryFn: async () => unwrap(await api.GET("/v1/to-complete", { params: { query: { tab } } })),
  });
  if (query.isLoading) return <Spinner />;
  if (query.error) return <ErrorNotice what="carregar a lista" error={query.error} onRetry={() => void query.refetch()} />;
  const data = query.data!;
  if (data.items.length === 0) {
    return <Notice tone="info">{tab === "ungrouped" ? "Não há produtos por agrupar." : "Não há produtos sem tamanho."}</Notice>;
  }
  const chosen = data.items.filter((i) => selected.has(i.description_key));
  const toggle = (key: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  return (
    <section aria-label={LABELS[tab]} className="flex flex-col">
      {tab === "ungrouped" && chosen.length > 0 && (
        <div className="mb-3 flex flex-col gap-2 rounded-surface bg-paper p-3 ring-1 ring-inset ring-line">
          <GroupSelect label={`Atribuir os ${chosen.length} selecionados a`} classes={classes} value={batchGroup} onChange={setBatchGroup} />
          <Button disabled={!batchGroup} busy={busy} onClick={() => onApply(chosen, { group: batchGroup })}>
            Aplicar a {plural(chosen.reduce((n, i) => n + i.lines, 0), "compra", "compras")}
          </Button>
        </div>
      )}
      <ul className="flex flex-col">
        {data.items.map((item) => (
          <li key={item.description_key} className="flex gap-3 border-t border-line py-3">
            {tab === "ungrouped" && (
              // The box is small; its label is the 44 px target.
              <label className="-ml-3 grid size-11 shrink-0 place-items-center">
                <input
                  type="checkbox"
                  className="size-5 accent-brand"
                  aria-label={`Selecionar ${item.description}`}
                  checked={selected.has(item.description_key)}
                  onChange={() => toggle(item.description_key)}
                />
              </label>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{item.description}</p>
              <p className="text-xs text-ink-soft">
                {merchantName(item.chain, item.merchant_name)} · {plural(item.purchases, "compra", "compras")} · {formatCents(item.spent_cents)}
                {item.group && ` · ${item.group.name}`}
              </p>
              {tab === "ungrouped" ? (
                <GroupChoice item={item} classes={classes} busy={busy} onApply={(change) => onApply([item], change)} />
              ) : (
                <SizeChoice item={item} classes={classes} busy={busy} onApply={(change) => onApply([item], change)} />
              )}
            </div>
          </li>
        ))}
      </ul>
      {data.total > data.items.length && (
        <p className="border-t border-line pt-3 text-sm text-ink-soft">
          Mostramos os {data.page_size} com mais gasto, de {data.total}. O resto pode esperar.
        </p>
      )}
    </section>
  );
}

function GroupSelect({ label, classes, value, onChange }: { label: string; classes: Class[]; value: string; onChange: (slug: string) => void }) {
  return (
    <Select label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Escolher…</option>
      {classes.map((c) => (
        <optgroup key={c.slug} label={c.name}>
          {c.groups.map((g) => (
            <option key={g.slug} value={g.slug}>
              {g.name}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}

/** The suggestions in one tap; «Outro grupo» in two; «Não comparável» takes it out of the list until undone. */
function GroupChoice({ item, classes, busy, onApply }: { item: Item; classes: Class[]; busy: boolean; onApply: (change: Change) => void }) {
  const [other, setOther] = useState(false);
  return (
    <div className="mt-2 flex flex-col gap-2">
      {item.hint && <p className="text-xs">Parece ser da secção {item.hint.name}.</p>}
      <div className="flex flex-wrap gap-2">
        {item.suggestions.map((g) => (
          <Button key={g.slug} variant="secondary" size="sm" busy={busy} onClick={() => onApply({ group: g.slug })}>
            {g.name}
          </Button>
        ))}
        <Button variant="quiet" size="sm" aria-expanded={other} onClick={() => setOther((o) => !o)}>
          Outro grupo
        </Button>
        <Button variant="quiet" size="sm" busy={busy} onClick={() => onApply({ not_comparable: true })}>
          Não comparável
        </Button>
      </div>
      {other && <GroupSelect label="Grupo" classes={classes} value="" onChange={(slug) => slug && onApply({ group: slug })} />}
    </div>
  );
}

/** The size of one package, given once for the description: a number and its unit, among the group's bases. */
function SizeChoice({ item, classes, busy, onApply }: { item: Item; classes: Class[]; busy: boolean; onApply: (change: Change) => void }) {
  const group: Group | undefined = classes.flatMap((c) => c.groups).find((g) => g.slug === item.group?.slug);
  const bases = group?.bases.length ? group.bases : ["kg", "l", "un"];
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState(bases[0]!);
  const parsed = parseQuantity(value);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (parsed) onApply({ size: { value: parsed, unit } });
  }
  if (!open) {
    return (
      <Button className="mt-2" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Indicar tamanho
      </Button>
    );
  }
  return (
    <form onSubmit={submit} className="mt-2 flex flex-wrap items-end gap-2">
      <Field label="Tamanho de uma embalagem" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className="w-40" />
      <Select label="Unidade" value={unit} onChange={(e) => setUnit(e.target.value)}>
        {bases.map((b) => (
          <option key={b} value={b}>
            {UNIT_NAMES[b] ?? b}
          </option>
        ))}
      </Select>
      <Button type="submit" disabled={!parsed} busy={busy}>
        Guardar
      </Button>
    </form>
  );
}

function Assigned({ rules, busy, onRemove }: { rules: UseQueryResult<Rule[]>; busy: boolean; onRemove: (r: Rule) => void }) {
  if (rules.isLoading) return <Spinner />;
  if (rules.error) return <ErrorNotice what="carregar o que atribuiu" error={rules.error} onRetry={() => void rules.refetch()} />;
  if (!rules.data?.length) return <Notice tone="info">Ainda não atribuiu nenhum grupo nem tamanho.</Notice>;
  return (
    <ul className="flex flex-col">
      {rules.data.map((r) => (
        <li key={r.id} className="flex items-center gap-3 border-t border-line py-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{r.description ?? r.description_key}</p>
            <p className="text-xs text-ink-soft">
              {[
                merchantName(r.chain),
                r.not_comparable ? "Não comparável" : r.group?.name,
                r.size && formatQuantity(r.size.value, UNIT_NAMES[r.size.unit] ?? r.size.unit),
                `aplicado a ${plural(r.applied_lines, "compra", "compras")}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <Button variant="quiet" size="sm" busy={busy} onClick={() => onRemove(r)}>
            Remover
          </Button>
        </li>
      ))}
    </ul>
  );
}
