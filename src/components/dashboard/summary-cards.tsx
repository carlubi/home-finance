import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function Delta({
  value,
  upIsGood,
  suffix = "% vs mes anterior",
}: {
  value: number | null;
  upIsGood: boolean;
  suffix?: string;
}) {
  if (value === null) return null;
  const up = value >= 0;
  const good = up === upIsGood;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <p
      className={cn(
        "flex items-center gap-0.5 text-xs",
        good ? "text-green-700 dark:text-green-500" : "text-red-700 dark:text-red-400"
      )}
    >
      <Icon className="size-3" />
      {up ? "+" : ""}
      {value.toFixed(1)}
      {suffix}
    </p>
  );
}

export function StatCard({
  label,
  value,
  delta,
  upIsGood = true,
  deltaSuffix,
}: {
  label: string;
  value: string;
  delta?: number | null;
  upIsGood?: boolean;
  deltaSuffix?: string;
}) {
  return (
    <Card>
      <CardContent className="grid gap-1 pt-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
        {delta !== undefined && (
          <Delta value={delta} upIsGood={upIsGood} suffix={deltaSuffix} />
        )}
      </CardContent>
    </Card>
  );
}

export function SummaryCards({
  income,
  expenses,
  savings,
  savingsPct,
  incomeDelta,
  expensesDelta,
  savingsDelta,
}: {
  income: number;
  expenses: number;
  savings: number;
  savingsPct: number | null;
  incomeDelta: number | null;
  expensesDelta: number | null;
  savingsDelta: number | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Ingresos"
        value={formatMoney(income)}
        delta={incomeDelta}
        upIsGood
      />
      <StatCard
        label="Gastos"
        value={formatMoney(expenses)}
        delta={expensesDelta}
        upIsGood={false}
      />
      <StatCard
        label="Ahorro"
        value={formatMoney(savings)}
        delta={savingsDelta}
        upIsGood
      />
      <StatCard
        label="% de ahorro"
        value={savingsPct === null ? "—" : `${savingsPct.toFixed(1)}%`}
      />
    </div>
  );
}
