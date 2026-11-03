import {
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
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
        "flex items-center gap-0.5 text-xs tabular-nums",
        good ? "text-green" : "text-red"
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
  helper,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: string;
  delta?: number | null;
  upIsGood?: boolean;
  deltaSuffix?: string;
  helper?: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Color semántico del icono (p. ej. text-green). Por defecto, neutro. */
  iconClass?: string;
}) {
  return (
    <Card size="sm">
      <CardContent className="grid min-w-0 gap-1">
        <p className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-text-secondary">
          {Icon && <Icon className={cn("size-3.5 shrink-0", iconClass ?? "text-text-tertiary")} />}
          <span className="truncate" title={label}>{label}</span>
        </p>
        <p className="truncate text-2xl font-medium text-text-primary">{value}</p>
        {delta !== undefined && (
          <Delta value={delta} upIsGood={upIsGood} suffix={deltaSuffix} />
        )}
        {helper && <p className="text-xs text-text-tertiary">{helper}</p>}
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
  monthlyInvestment,
  accumulatedInvestment,
  accumulatedSavingsInterest,
}: {
  income: number;
  expenses: number;
  savings: number;
  savingsPct: number | null;
  incomeDelta: number | null;
  expensesDelta: number | null;
  savingsDelta: number | null;
  monthlyInvestment?: number;
  accumulatedInvestment?: number;
  accumulatedSavingsInterest?: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard
        label="Ingresos"
        value={formatMoney(income)}
        delta={incomeDelta}
        upIsGood
        icon={Wallet}
        iconClass="text-green"
      />
      <StatCard
        label="Gastos"
        value={formatMoney(expenses)}
        delta={expensesDelta}
        upIsGood={false}
        icon={Receipt}
        iconClass="text-red"
      />
      <StatCard
        label="Ahorro"
        value={formatMoney(savings)}
        delta={savingsDelta}
        upIsGood
        icon={PiggyBank}
        iconClass="text-accent"
      />
      <StatCard
        label="Inversión acumulada"
        value={formatMoney(accumulatedInvestment ?? 0)}
        helper={
          monthlyInvestment && monthlyInvestment > 0
            ? `${formatMoney(monthlyInvestment)} aportados este mes`
            : undefined
        }
        icon={Landmark}
      />
      <StatCard
        label="Dinero acumulado por la cuenta remunerada"
        value={formatMoney(accumulatedSavingsInterest ?? 0)}
        helper="Intereses generados hasta este mes"
        icon={PiggyBank}
      />
      <StatCard
        label="% de ahorro"
        value={savingsPct === null ? "—" : `${savingsPct.toFixed(1)}%`}
        helper="Las inversiones no forman parte del ahorro neto"
        icon={Sparkle}
      />
    </div>
  );
}
