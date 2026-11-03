import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { api, unwrap, type Schemas } from "../../api/client";
import { Button, Notice, PageHeader, Spinner } from "../../components/ui";
import { formatQuantity, formatUnitPrice } from "../../lib/format";
import { merchantName } from "../../lib/merchants";
import { formatDayMonth } from "../../lib/month";

const plural = (n: number | string, one: string, many: string) => `${formatQuantity(String(n))} ${Number(n) === 1 ? one : many}`;

function Price({ point, label, basis }: { point: Schemas["ArticlePrice"] | null; label: string; basis: string }) {
  if (!point) return null;
  return (
    <span>
      {label} <span className="amount font-semibold text-ink">{formatUnitPrice(point.price_cents, basis)}</span> (
      {formatDayMonth(point.date)}
      {point.discounted && ", com desconto"})
    </span>
  );
}

function Article({ article: a, basis }: { article: Schemas["ListArticle"]; basis: string }) {
  return (
    <li className="flex flex-col gap-0.5 border-t border-line py-2 text-sm">
      <span className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 font-semibold">{merchantName(a.merchant, a.merchant_name)}</span>
        <span className="shrink-0 text-right">
          <span className="amount font-bold">{formatUnitPrice(a.avg_price_cents, basis)}</span>
          <span className="block text-xs text-ink-soft">{plural(a.purchases, "compra", "compras")}</span>
        </span>
      </span>
      <span className="flex flex-wrap gap-x-3 text-xs text-ink-soft">
        {a.purchases > 1 && <Price point={a.lowest} label="mais baixo" basis={basis} />}
        {a.purchases > 1 && <Price point={a.highest} label="mais alto" basis={basis} />}
        <Price point={a.last} label="última" basis={basis} />
      </span>
    </li>
  );
}

function Item({ item: i }: { item: Schemas["ListItem"] }) {
  return (
    <li className="rounded-surface bg-paper p-4 ring-1 ring-inset ring-line">
      <Link to={`/produtos/${i.product_id}`} className="flex min-h-11 items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{i.name}</span>
          <span className="block text-xs text-ink-soft">
            {plural(i.purchases, "compra", "compras")}
            {/* Packages only make sense for products sold by the unit; a weighed one counts one per line. */}
            {i.price_basis === "un" &&
              ` · ${plural(i.packages, "embalagem", "embalagens")} · cerca de ${formatQuantity(String(i.packages_per_month))} por mês`}
          </span>
        </span>
        <ChevronRight aria-hidden className="size-[18px] shrink-0 text-ink-soft" />
      </Link>
      <p className="mt-1 text-sm">
        Preço médio que pagou: <span className="amount font-bold">{formatUnitPrice(i.avg_price_cents, i.price_basis)}</span>
      </p>
      {i.mixed_units && <p className="text-xs text-ink-soft">Algumas compras usam outra unidade e não entram no preço médio.</p>}
      <ul className="mt-2 flex flex-col">
        {i.articles.map((a) => (
          <Article key={`${a.merchant}-${a.merchant_name}`} article={a} basis={i.price_basis} />
        ))}
      </ul>
    </li>
  );
}

/** The smart list, first increment (spec 015 US-A): what was bought in the window, per product and per store. */
export function ListaPage() {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["list-articles"],
    queryFn: async () => unwrap(await api.GET("/v1/lists/articles")),
  });
  return (
    <div className="flex flex-col gap-4 pb-6">
      <PageHeader title="Lista" />
      {isLoading && <Spinner />}
      {error && (
        <Notice
          tone="error"
          title="Não foi possível mostrar a lista"
          action={
            <Button variant="secondary" onClick={() => void refetch()}>
              Tentar de novo
            </Button>
          }
        />
      )}
      {data && (
        <>
          <p className="text-sm text-ink-soft">
            Valores calculados com os seus talões dos últimos {data.window_days} dias. Não são preços de hoje.
          </p>
          {data.items.length === 0 ? (
            <Notice tone="info">Ainda não há compras confirmadas nestes {data.window_days} dias.</Notice>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.items.map((i) => (
                <Item key={i.product_id} item={i} />
              ))}
            </ul>
          )}
          {data.excluded_lines > 0 && (
            <p className="text-xs text-ink-soft">
              {plural(data.excluded_lines, "artigo ficou de fora por não ter", "artigos ficaram de fora por não terem")} o produto
              identificado.
            </p>
          )}
        </>
      )}
    </div>
  );
}
