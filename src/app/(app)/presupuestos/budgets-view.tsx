"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleMinus,
  CircleSlash,
  Lightbulb,
  Plus,
  SmilePlus,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { SERIES } from "@/lib/chart-colors";
import { cn } from "@/lib/utils";
import { formatMoney, formatMonth } from "@/lib/format";
import type {
  MonthlyBudgetView,
  YearBudgetMonthView,
} from "@/lib/monthly-budgets";
import { buildBudgetCategoryTotals as getBudgetCategoryTotals } from "@/lib/monthly-budgets";
import type {
  Category,
  MonthlyBudgetItem,
  MonthlyBudgetOutcome,
} from "@/lib/types";
import { CategoryDonut } from "@/components/charts/category-donut";
import { ChartCard } from "@/components/charts/chart-card";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  closeMonthlyBudget,
  deleteMonthlyBudgetItem,
  saveMonthlyBudgetItem,
} from "./actions";

const intensityMeta = {
  green: {
    label: "Verde",
    className:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  orange: {
    label: "Naranja",
    className:
      "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  red: {
    label: "Rojo",
    className:
      "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
    dot: "bg-red-500",
  },
};

const outcomeMeta: Record<
  MonthlyBudgetOutcome,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  under: {
    label: "Gastaste menos",
    icon: SmilePlus,
    className:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  met: {
    label: "Cumplido",
    icon: CheckCircle2,
    className:
      "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  over: {
    label: "Te pasaste",
    icon: CircleSlash,
    className: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
  },
};

function monthParam(month: string) {
  return month.slice(0, 7);
}

function OutcomeBadge({ outcome }: { outcome: MonthlyBudgetOutcome | null }) {
  if (!outcome) return null;
  const meta = outcomeMeta[outcome];
  const Icon = meta.icon;

  return (
    <Badge variant="outline" className={meta.className}>
      <Icon className="size-3" />
      {meta.label}
    </Badge>
  );
}

const compact = new Intl.NumberFormat("es-ES", {
  notation: "compact",
  maximumFractionDigits: 0,
});

function budgetItemColor(item: MonthlyBudgetItem) {
  return item.categories?.color ?? "var(--viz-muted)";
}

function shortMonthName(month: string) {
  const label = new Date(month + "T00:00:00").toLocaleDateString("es-ES", {
    month: "short",
  });
  return label.charAt(0).toUpperCase() + label.slice(1).replace(".", "");
}

function BudgetExpenseLine({
  data,
}: {
  data: Array<{ label: string; Previsto: number }>;
}) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={SERIES.grid} strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--viz-muted)", fontSize: 12 }}
            axisLine={{ stroke: SERIES.axis }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--viz-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={(value: number) => compact.format(value)}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: SERIES.axis }} />
          <Area
            type="monotone"
            dataKey="Previsto"
            stroke={SERIES.expense}
            strokeWidth={2}
            fill={SERIES.expense}
            fillOpacity={0.1}
            dot={{
              r: 4,
              fill: SERIES.expense,
              stroke: "var(--background)",
              strokeWidth: 2,
            }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function BudgetVsActualBars({
  data,
}: {
  data: Array<{ label: string; Previsto: number; Real: number }>;
}) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={2} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={SERIES.grid} strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--viz-muted)", fontSize: 12 }}
            axisLine={{ stroke: SERIES.axis }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--viz-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={(value: number) => compact.format(value)}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--viz-grid)", opacity: 0.4 }} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value: string) => (
              <span className="text-xs text-muted-foreground">{value}</span>
            )}
          />
          <Bar
            dataKey="Previsto"
            fill={SERIES.expense}
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="Real"
            fill={SERIES.savings}
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function YearBudgetOverview({
  userId,
  year,
  months,
}: {
  userId: string;
  year: number;
  months: YearBudgetMonthView[];
}) {
  const [openMonth, setOpenMonth] = useState<YearBudgetMonthView | null>(null);
  const maxTotal = Math.max(0, ...months.map((month) => month.total));
  const monthlyChartData = months.map((month) => ({
    label: shortMonthName(month.month),
    Previsto: month.total,
    Real: month.actualTotal,
  }));
  const categoryTotals = getBudgetCategoryTotals({ userId, months });

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-xl font-semibold">Vista global {year}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Presupuesto previsto por mes y comparación con el gasto real.
        </p>
      </div>

      <div className="grid gap-4">
        <ChartCard
          title="Evolución del gasto"
          description="Gasto previsto por mes"
          fileName={`evolucion-gasto-previsto-${year}`}
        >
          <BudgetExpenseLine data={monthlyChartData} />
        </ChartCard>
      </div>

      <ChartCard
        title="Dónde más gastas"
        description="Acumulado anual previsto por categoría"
        fileName={`categorias-presupuesto-${year}`}
      >
        <CategoryDonut
          data={categoryTotals}
          emptyLabel="Aún no hay gastos previstos para este año."
        />
      </ChartCard>

      <Card>
        <CardHeader>
          <CardTitle>Meses previstos</CardTitle>
          <CardDescription>
            Top 3 partidas previstas por mes. Haz click para abrir el detalle.
          </CardDescription>
        </CardHeader>
        <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {months.map((month) => {
            const ratio = maxTotal > 0 ? month.total / maxTotal : 0;
            const heatClass =
              ratio >= 0.85
                ? "border-red-500/30 bg-red-500/[0.04]"
                : ratio >= 0.6
                  ? "border-amber-500/30 bg-amber-500/[0.05]"
                  : month.total > 0
                    ? "border-emerald-500/25 bg-emerald-500/[0.04]"
                    : "bg-card";

            return (
              <button
                key={month.month}
                type="button"
                onClick={() => setOpenMonth(month)}
                className={cn(
                  "grid min-h-44 min-w-0 cursor-pointer gap-3 overflow-hidden rounded-lg border p-3 text-left outline-none transition-colors hover:bg-muted/30 focus-visible:ring-3 focus-visible:ring-ring/40",
                  heatClass
                )}
              >
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {shortMonthName(month.month)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatMonth(month.month)}
                    </p>
                  </div>
                  <p className="max-w-28 shrink-0 truncate text-right font-semibold tabular-nums">
                    {formatMoney(month.total)}
                  </p>
                </div>

                <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
                  {month.topItems.length > 0 ? (
                    month.topItems.map((item) => (
                      <span
                        key={item.id}
                        className="h-full flex-1"
                        style={{ backgroundColor: budgetItemColor(item) }}
                      />
                    ))
                  ) : (
                    <span className="h-full w-full bg-muted" />
                  )}
                </div>

                <div className="grid min-w-0 gap-2">
                  {month.topItems.length > 0 ? (
                    month.topItems.map((item) => (
                      <div
                        key={item.id}
                        className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-sm"
                      >
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: budgetItemColor(item) }}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {item.name}
                        </span>
                        <span className="max-w-24 truncate text-right tabular-nums text-muted-foreground">
                          {formatMoney(Number(item.planned_amount))}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Sin gastos previstos.
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        </CardContent>
      </Card>

      <Dialog
        open={openMonth !== null}
        onOpenChange={(open) => {
          if (!open) setOpenMonth(null);
        }}
      >
        <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
          {openMonth && (
            <>
              <DialogHeader>
                <DialogTitle>{formatMonth(openMonth.month)}</DialogTitle>
                <DialogDescription>
                  Gastos previstos y comparación con el gasto real del mes.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border bg-muted/25 p-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        Previsto
                      </p>
                      <p className="mt-1 text-2xl font-semibold tabular-nums">
                        {formatMoney(openMonth.total)}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/25 p-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        Real
                      </p>
                      <p className="mt-1 text-2xl font-semibold tabular-nums">
                        {formatMoney(openMonth.actualTotal)}
                      </p>
                    </div>
                  </div>

                  <BudgetVsActualBars
                    data={[
                      {
                        label: shortMonthName(openMonth.month),
                        Previsto: openMonth.total,
                        Real: openMonth.actualTotal,
                      },
                    ]}
                  />
                </div>

                <div className="grid gap-2">
                  <p className="text-sm font-medium">Gastos previstos</p>
                  {openMonth.items.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto pr-1">
                      <div className="grid gap-2">
                        {openMonth.items.map((item) => (
                          <div
                            key={item.id}
                            className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border bg-muted/20 p-2 text-sm"
                          >
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: budgetItemColor(item) }}
                            />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{item.name}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {item.categories?.name ?? "Sin categoría"}
                              </p>
                            </div>
                            <p className="max-w-24 truncate text-right tabular-nums">
                              {formatMoney(Number(item.planned_amount))}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      No hay gastos previstos en este mes.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function BudgetsView({
  categories,
  views,
  selected,
  userId,
  year,
  yearBudget,
}: {
  categories: Category[];
  views: MonthlyBudgetView[];
  selected: MonthlyBudgetView;
  userId: string;
  year: number;
  yearBudget: YearBudgetMonthView[];
}) {
  const [pending, startTransition] = useTransition();
  const [showYearOverview, setShowYearOverview] = useState(false);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const closeFormRef = useRef<HTMLFormElement>(null);
  const [outcome, setOutcome] = useState<MonthlyBudgetOutcome>(
    selected.plan?.outcome ?? selected.suggestedOutcome ?? "met"
  );

  const monthLabel = formatMonth(selected.month);
  const maxPlanned = Math.max(0, ...views.map((view) => view.plannedTotal));
  const actualProgress =
    selected.plannedTotal > 0
      ? Math.min(120, (selected.actualTotal / selected.plannedTotal) * 100)
      : 0;
  const plannedStrength =
    maxPlanned > 0 ? Math.max(4, (selected.plannedTotal / maxPlanned) * 100) : 0;
  const selectedIntensity = intensityMeta[selected.intensity];
  const lines = selected.plan?.monthly_budget_items ?? [];
  const selectedIndex = views.findIndex((view) => view.month === selected.month);
  const previousMonth = selectedIndex > 0 ? views[selectedIndex - 1]?.month : null;
  const nextMonth =
    selectedIndex >= 0 && selectedIndex < views.length - 1
      ? views[selectedIndex + 1]?.month
      : null;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {!showYearOverview && (
          <div className="grid gap-1">
            <h1 className="text-2xl font-semibold">Presupuestos mensuales</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Meses previstos, gastos reales y cierre.
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowYearOverview((value) => !value)}
          >
            <CalendarRange className="size-4" />
            {showYearOverview ? "Ocultar año" : `Ver ${year} completo`}
          </Button>
          <Badge
            variant="outline"
            className={cn("h-7 gap-2", selectedIntensity.className)}
          >
            <span className={cn("size-2 rounded-full", selectedIntensity.dot)} />
            {selectedIntensity.label}
          </Badge>
        </div>
      </div>

      {showYearOverview && (
        <YearBudgetOverview
          userId={userId}
          year={year}
          months={yearBudget}
        />
      )}

      {!showYearOverview && (
        <>
          <section
            className="grid gap-3 overflow-x-auto"
            style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(18rem, 1fr)" }}
          >
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{monthLabel}</CardTitle>
                  <CardDescription>
                    Previsto, real y diferencia.
                  </CardDescription>
                </div>
                <CardAction className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={!previousMonth}
                    aria-label="Mes anterior"
                    onClick={() => {
                      if (previousMonth) {
                        router.push(`/presupuestos?mes=${monthParam(previousMonth)}`);
                      }
                    }}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={!nextMonth}
                    aria-label="Mes siguiente"
                    onClick={() => {
                      if (nextMonth) {
                        router.push(`/presupuestos?mes=${monthParam(nextMonth)}`);
                      }
                    }}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/25 p-3">
                <p className="text-xs font-medium text-muted-foreground">Previsto</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {formatMoney(selected.plannedTotal)}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/25 p-3">
                <p className="text-xs font-medium text-muted-foreground">Real</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {formatMoney(selected.actualTotal)}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/25 p-3">
                <p className="text-xs font-medium text-muted-foreground">Diferencia</p>
                <p
                  className={cn(
                    "mt-1 text-2xl font-semibold tabular-nums",
                    selected.difference > 0
                      ? "text-red-700 dark:text-red-300"
                      : "text-emerald-700 dark:text-emerald-300"
                  )}
                >
                  {formatMoney(selected.difference)}
                </p>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Fuerza del mes frente a otros presupuestos</span>
                <span>{Math.round(plannedStrength)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", selectedIntensity.dot)}
                  style={{ width: `${plannedStrength}%` }}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Consumo del presupuesto al cerrar el mes</span>
                <span>{Math.round(actualProgress)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    actualProgress > 102 ? "bg-red-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${Math.min(100, actualProgress)}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <OutcomeBadge outcome={selected.plan?.outcome ?? null} />
              {selected.suggestedOutcome && !selected.plan?.outcome && (
                <Badge variant="outline" className="gap-1 border-border bg-muted/40">
                  <Lightbulb className="size-3" />
                  Sugerido: {outcomeMeta[selected.suggestedOutcome].label}
                </Badge>
              )}
            </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cerrar mes</CardTitle>
                <CardDescription>
                  Resultado frente a lo previsto.
                </CardDescription>
              </CardHeader>
              <CardContent>
            <form
              ref={closeFormRef}
              action={(formData) =>
                startTransition(async () => {
                  formData.set("outcome", outcome);
                  const result = await closeMonthlyBudget(formData);
                  if (result.error) toast.error(result.error);
                  else {
                    toast.success("Presupuesto cerrado.");
                    router.refresh();
                  }
                })
              }
              className="grid gap-3"
            >
              <input type="hidden" name="month" value={selected.month} />
              <div className="grid grid-cols-3 gap-2">
                {(["under", "met", "over"] as MonthlyBudgetOutcome[]).map((value) => {
                  const meta = outcomeMeta[value];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setOutcome(value)}
                      className={cn(
                        "grid h-20 place-items-center gap-1 rounded-lg border p-2 text-center text-xs font-medium transition-colors",
                        outcome === value
                          ? meta.className
                          : "bg-background hover:bg-muted"
                      )}
                    >
                      <Icon className="size-5" />
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>
              <Textarea
                name="notes"
                defaultValue={selected.plan?.notes ?? ""}
                placeholder="Nota del cierre"
              />
              <Button type="submit" disabled={pending}>
                <CheckCircle2 className="size-4" />
                Guardar cierre
              </Button>
            </form>
              </CardContent>
            </Card>
          </section>

          <section
            className="grid gap-4 overflow-x-auto"
            style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(18rem, 1fr)" }}
          >
            <Card>
          <CardHeader>
            <CardTitle>Gastos previstos</CardTitle>
            <CardDescription>
              Partidas de {monthLabel}.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <form
              ref={formRef}
              action={(formData) =>
                startTransition(async () => {
                  const result = await saveMonthlyBudgetItem(formData);
                  if (result.error) toast.error(result.error);
                  else {
                    formRef.current?.reset();
                    toast.success("Gasto previsto añadido.");
                    router.refresh();
                  }
                })
              }
              className="grid gap-3"
            >
              <input type="hidden" name="month" value={selected.month} />
              <div className="grid gap-1.5">
                <Label htmlFor="budget-name">Gasto</Label>
                <Input
                  id="budget-name"
                  name="name"
                  placeholder="Ej. seguro del coche"
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Categoría</Label>
                <Select
                  name="category_id"
                  items={categories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="budget-amount">Importe</Label>
                <Input
                  id="budget-amount"
                  name="planned_amount"
                  inputMode="decimal"
                  placeholder="250"
                  required
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={pending} className="w-full">
                  <Plus className="size-4" />
                  Añadir
                </Button>
              </div>
            </form>

            {lines.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partida</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Previsto</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="size-2 rounded-full"
                            style={{
                              backgroundColor:
                                item.categories?.color ?? "var(--viz-muted)",
                            }}
                          />
                          {item.categories?.name ?? "Sin categoría"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(Number(item.planned_amount))}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            startTransition(async () => {
                              const result = await deleteMonthlyBudgetItem(item.id);
                              if (result.error) toast.error(result.error);
                              else router.refresh();
                            })
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Todavía no hay gastos previstos para este mes.
              </div>
            )}
          </CardContent>
            </Card>

            <Card>
          <CardHeader>
            <CardTitle>Mapa mensual</CardTitle>
            <CardDescription>
              Totales previstos por mes.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid max-h-[32rem] gap-2 overflow-y-auto pr-2">
            {views.map((view) => {
              const meta = intensityMeta[view.intensity];
              const active = view.month === selected.month;

              return (
                <Link
                  key={view.month}
                  href={`/presupuestos?mes=${monthParam(view.month)}`}
                  className={cn(
                    "grid gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/60",
                    active && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{formatMonth(view.month)}</span>
                    <span className={cn("size-2.5 rounded-full", meta.dot)} />
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp className="size-3.5" />
                      {formatMoney(view.plannedTotal)}
                    </span>
                    {view.plan?.outcome ? (
                      <OutcomeBadge outcome={view.plan.outcome} />
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <CircleMinus className="size-3.5" />
                        Abierto
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
