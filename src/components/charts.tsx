import { useEffect, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCents } from "../lib/format";

/** Chart colours come from CSS tokens so light/dark use their own validated steps. */
function useToken(name: string, fallback: string): string {
  const read = () =>
    typeof window === "undefined" ? fallback : getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  const [value, setValue] = useState(read);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const update = () => setValue(read());
    mq?.addEventListener("change", update);
    return () => mq?.removeEventListener("change", update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}

export interface Point {
  label: string;
  short: string;
  cents: number;
}

const AXIS = { fontSize: 12, fill: "var(--color-ink-soft)" };

function euroTick(cents: number): string {
  return cents >= 100_000 ? `${Math.round(cents / 100_000)} mil €` : `${Math.round(cents / 100)} €`;
}

function TooltipBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-control bg-paper px-3 py-2 text-sm shadow-lg ring-1 ring-line">
      <p className="text-ink-soft">{title}</p>
      <p className="font-bold text-ink">{children}</p>
    </div>
  );
}

/** Spending per day or month. Single series: no legend; the heading names it. */
export function SpendBars({ points, title }: { points: Point[]; title: string }) {
  const color = useToken("--color-chart", "#0b8a52");
  return (
    <figure aria-label={title} className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke="var(--color-line)" strokeDasharray="2 4" />
          <XAxis dataKey="short" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={52} tickFormatter={euroTick} />
          <Tooltip
            cursor={{ fill: "var(--color-brand-soft)" }}
            content={({ active, payload }) =>
              active && payload?.[0] ? (
                <TooltipBox title={(payload[0].payload as Point).label}>{formatCents((payload[0].payload as Point).cents)}</TooltipBox>
              ) : null
            }
          />
          <Bar dataKey="cents" fill={color} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </figure>
  );
}

/** Unit price over time for one product. */
export function PriceLine({ points, title, basis }: { points: (Point & { merchant: string })[]; title: string; basis: string }) {
  const color = useToken("--color-chart", "#0b8a52");
  return (
    <figure aria-label={title} className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-line)" strokeDasharray="2 4" />
          <XAxis dataKey="short" tick={AXIS} tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={56} tickFormatter={(c: number) => formatCents(c)} domain={["auto", "auto"]} />
          <Tooltip
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as (Point & { merchant: string }) | undefined;
              return active && p ? (
                <TooltipBox title={`${p.label}, ${p.merchant}`}>
                  {formatCents(p.cents)} {basis}
                </TooltipBox>
              ) : null;
            }}
          />
          <Line
            type="linear"
            dataKey="cents"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 4, fill: color, stroke: "var(--color-paper)", strokeWidth: 2 }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}

/** Accessible alternative for every chart (RF-11 / plano de testes §10). */
export function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-2 text-sm">
      <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-brand">Ver como tabela</summary>
      <div className="max-h-72 overflow-auto">
        <table className="w-full">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {head.map((h, i) => (
                <th key={h} scope="col" className={`py-1 font-semibold text-ink-soft ${i ? "text-right" : "text-left"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="border-t border-line">
                {row.map((cell, i) => (
                  <td key={i} className={`py-1 ${i ? "text-right" : "text-left"}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
