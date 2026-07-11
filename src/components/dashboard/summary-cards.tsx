import {
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  Receipt,
  Sparkle,
  Wallet,
} from "lucide-react";
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
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: string;
  delta?: number | null;
  upIsGood?: boolean;
  deltaSuffix?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconClass?: string;
}) {
  return (
    <Card className="card-lift">
      <CardContent className="flex items-start gap-3 pt-0">
        {Icon && (
          <span
            className={cn(
              "mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl",
              iconClass ?? "bg-primary/10 text-primary"
            )}
          >
            <Icon className="size-4.5" />
          </span>
        )}
        <div className="grid min-w-0 gap-0.5">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="truncate text-2xl font-bold">{value}</p>
          {delta !== undefined && (
            <Delta value={delta} upIsGood={upIsGood} suffix={deltaSuffix} />
          )}
        </div>
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
    <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Ingresos"
        value={formatMoney(income)}
        delta={incomeDelta}
        upIsGood
        icon={Wallet}
        iconClass="bg-[oklch(0.65_0.15_165/0.15)] text-[oklch(0.5_0.13_165)] dark:text-[oklch(0.75_0.13_165)]"
      />
      <StatCard
        label="Gastos"
        value={formatMoney(expenses)}
        delta={expensesDelta}
        upIsGood={false}
        icon={Receipt}
        iconClass="bg-[oklch(0.6_0.19_25/0.14)] text-[oklch(0.55_0.19_25)] dark:text-[oklch(0.75_0.14_25)]"
      />
      <StatCard
        label="Ahorro"
        value={formatMoney(savings)}
        delta={savingsDelta}
        upIsGood
        icon={PiggyBank}
      />
      <StatCard
        label="% de ahorro"
        value={savingsPct === null ? "—" : `${savingsPct.toFixed(1)}%`}
        icon={Sparkle}
        iconClass="bg-[oklch(0.62_0.2_330/0.14)] text-[oklch(0.55_0.2_330)] dark:text-[oklch(0.78_0.15_330)]"
      />
    </div>
  );
}
