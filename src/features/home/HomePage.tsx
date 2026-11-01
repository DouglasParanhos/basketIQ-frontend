import { useSearchParams } from "react-router";
import { Button, Notice, Spinner } from "../../components/ui";
import { currentMonth, parseMonth } from "../../lib/month";
import { AverageCard } from "./AverageCard";
import { GoalRing } from "./GoalRing";
import { HomeEmpty } from "./HomeEmpty";
import { MonthStepper } from "./MonthStepper";
import { PurchasesCard, SpendCards } from "./SpendCards";
import { useOverview } from "./useOverview";

/** The Início: the goal ring, the average and the month's spending, with the month in the URL (`?mes=AAAA-MM`). */
export function HomePage() {
  const [params, setParams] = useSearchParams();
  const current = currentMonth();
  const month = parseMonth(params.get("mes")) ?? current;
  const isCurrentMonth = month === current;
  const overview = useOverview(month);
  const go = (next: string) => setParams(next === current ? {} : { mes: next });

  return (
    <div className="flex flex-col gap-3.5 pb-6 pt-6">
      <h1 className="sr-only">Início</h1>
      <MonthStepper month={month} current={current} onChange={go} />
      {overview.isError ? (
        <Notice
          tone="error"
          title="Não foi possível carregar o Início."
          action={
            <Button variant="secondary" onClick={() => void overview.refetch()}>
              Tentar de novo
            </Button>
          }
        />
      ) : !overview.data ? (
        <Spinner />
      ) : overview.data.empty ? (
        <HomeEmpty overview={overview.data} />
      ) : (
        <>
          <GoalRing overview={overview.data} isCurrentMonth={isCurrentMonth} />
          <div className="grid grid-cols-2 gap-3 max-[359px]:grid-cols-1">
            <AverageCard overview={overview.data} />
            <PurchasesCard overview={overview.data} isCurrentMonth={isCurrentMonth} />
          </div>
          <SpendCards overview={overview.data} />
        </>
      )}
    </div>
  );
}
