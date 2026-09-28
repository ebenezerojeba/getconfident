"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { label: string; value: number | null };

const axis = { fontSize: 12, fill: "var(--muted-foreground)" };

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { value?: number | null }[];
  label?: string;
  unit?: string;
}) {
  if (!active || !payload?.length || payload[0].value === null || payload[0].value === undefined) {
    return null;
  }
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums">
        {payload[0].value}
        {unit ? ` ${unit}` : ""}
      </p>
    </div>
  );
}

/** Accessible data table fallback (identity never depends on the chart alone). */
function DataTable({ title, data, unit }: { title: string; data: Point[]; unit?: string }) {
  return (
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
        View as table
      </summary>
      <table className="mt-2 w-full text-left">
        <caption className="sr-only">{title}</caption>
        <thead>
          <tr className="text-muted-foreground">
            <th className="py-1 font-medium">Period</th>
            <th className="py-1 text-right font-medium">{unit ?? "Value"}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label} className="border-t">
              <td className="py-1">{d.label}</td>
              <td className="py-1 text-right tabular-nums">{d.value ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function TrendLine({
  title,
  data,
  unit,
  domain = [0, 100],
  height = 200,
}: {
  title: string;
  data: Point[];
  unit?: string;
  domain?: [number, number | "auto"];
  height?: number;
}) {
  return (
    <figure>
      <div role="img" aria-label={`${title} chart`} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis tick={axis} tickLine={false} axisLine={false} domain={domain} width={44} />
            <Tooltip
              content={<ChartTooltip unit={unit} />}
              cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{ r: 4, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 2 }}
              activeDot={{ r: 6, stroke: "var(--card)", strokeWidth: 2 }}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <DataTable title={title} data={data} unit={unit} />
    </figure>
  );
}

export function TrendBars({
  title,
  data,
  unit,
  height = 200,
}: {
  title: string;
  data: Point[];
  unit?: string;
  height?: number;
}) {
  return (
    <figure>
      <div role="img" aria-label={`${title} chart`} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 12, bottom: 0, left: -16 }}
            barCategoryGap={6}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={8} />
            <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
            <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: "var(--muted)" }} />
            <Bar
              dataKey="value"
              fill="var(--chart-1)"
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable title={title} data={data} unit={unit} />
    </figure>
  );
}
