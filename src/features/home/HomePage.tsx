import { Link, useSearchParams } from "react-router";
import type { Schemas } from "../../api/client";
import { Button, Notice, Spinner } from "../../components/ui";
import { currentMonth, parseMonth } from "../../lib/month";
import { useProfile } from "../profile/useProfile";
import { AverageCard } from "./AverageCard";
import { EXAMPLE_PEOPLE, EXAMPLE_PRICE_CHANGES, exampleOverview } from "./exampleData";
import { GoalRing } from "./GoalRing";
import { HomeEmpty } from "./HomeEmpty";
import { MonthStepper } from "./MonthStepper";
import { PasskeyOffer } from "./PasskeyOffer";
import { PriceChangesCard } from "./PriceChangesCard";
import { PerPersonCard, PurchasesCard, SpendCards } from "./SpendCards";
import { useOverview } from "./useOverview";

/** The cards of a month with purchases. `example` is the Início with invented figures: no links to receipts that do not exist. */
function Cards({ overview, isCurrentMonth, people, example }: { overview: Schemas["OverviewOut"]; isCurrentMonth: boolean; people: number | null; example: boolean }) {
  return (
    <>
      <GoalRing overview={overview} isCurrentMonth={isCurrentMonth} />
      <div className="grid grid-cols-2 gap-3 max-[359px]:grid-cols-1">
        <AverageCard overview={overview} />
        <PurchasesCard overview={overview} isCurrentMonth={isCurrentMonth} />
      </div>
      {/* Without the people of the house there is nothing to divide by: the card is not shown. */}
      {people !== null && <PerPersonCard spentCents={overview.spent_cents} people={people} />}
      {/* «O que mudou de preço» has no data in the API yet: only the example shows it. */}
      <SpendCards overview={overview} example={example} between={example ? <PriceChangesCard changes={EXAMPLE_PRICE_CHANGES} /> : undefined} />
    </>
  );
}

/** The banner of the example: what it is, and the way out. */
function ExampleBanner() {
  return (
    <div className="flex items-center justify-between gap-2 rounded-[14px] bg-warn-soft dark:ring-1 dark:ring-inset dark:ring-warn-line py-1 pl-3.5 pr-1.5 text-xs font-extrabold text-warn-ink">
      <p>Dados de exemplo · loja fictícia</p>
      <Link to="/" className="inline-flex min-h-11 items-center px-2.5 font-extrabold text-brand underline">
        Sair do exemplo
      </Link>
    </div>
  );
}

/** The Início with invented figures: it reads nothing from the API and writes nothing to it, and has no hook of data. */
function ExampleHome() {
  return (
    <div className="flex flex-col gap-3.5 pb-6 pt-6">
      <h1 className="sr-only">Início, com dados de exemplo</h1>
      <ExampleBanner />
      <Cards overview={exampleOverview(currentMonth())} isCurrentMonth people={EXAMPLE_PEOPLE} example />
    </div>
  );
}

function MonthHome() {
  const [params, setParams] = useSearchParams();
  const current = currentMonth();
  const month = parseMonth(params.get("mes")) ?? current;
  const isCurrentMonth = month === current;
  const overview = useOverview(month);
  const profile = useProfile();
  const people = profile.data?.household_size ?? null;
  const go = (next: string) => setParams(next === current ? {} : { mes: next });
  const stepper = <MonthStepper month={month} current={current} onChange={go} />;

  return (
    <div className="relative flex flex-col gap-3.5 pb-6 pt-6">
      <h1 className="sr-only">Início</h1>
      {/* Its own slot, so the month stepper below keeps its place (and focus) as the data loads. Not on an empty account:
          there «A aguardar o seu primeiro talão» covers the page. */}
      {overview.data && !overview.data.empty && <PasskeyOffer />}
      {overview.isError ? (
        <>
          {stepper}
          <Notice
            tone="error"
            title="Não foi possível carregar o Início."
            action={
              <Button variant="secondary" onClick={() => void overview.refetch()}>
                Tentar de novo
              </Button>
            }
          />
        </>
      ) : !overview.data ? (
        <>
          {stepper}
          <Spinner />
        </>
      ) : overview.data.empty ? (
        <HomeEmpty overview={overview.data} people={people} stepper={stepper} />
      ) : (
        <>
          {stepper}
          <Cards overview={overview.data} isCurrentMonth={isCurrentMonth} people={people} example={false} />
        </>
      )}
    </div>
  );
}

/** The Início: the goal ring, the average and the month's spending, with the month in the URL (`?mes=AAAA-MM`). `?exemplo=1` shows invented figures. */
export function HomePage() {
  const [params] = useSearchParams();
  return params.get("exemplo") === "1" ? <ExampleHome /> : <MonthHome />;
}
