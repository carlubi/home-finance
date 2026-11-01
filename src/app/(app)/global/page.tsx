import { redirect } from "next/navigation";
import { Info, Landmark, PiggyBank, Receipt, Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateFamilyUnit } from "@/lib/family-unit";
import { addMonths, currentMadridMonth, formatMoney } from "@/lib/format";
import { investmentMonthlyOutflow, roundCents } from "@/lib/finance";
import { groupInvestmentCapital, summarizeSharedFinances } from "@/lib/shared-finances";
import type { CategoryTotal, Investment, MonthlySummary } from "@/lib/types";
import { ChartCard } from "@/components/charts/chart-card";
import { CategoryDonut } from "@/components/charts/category-donut";
import { StatCard } from "@/components/dashboard/summary-cards";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";

export const metadata = { title: "Visión global · unidad familiar" };

function categoryTotal(userId: string, name: string, total: number, color: string): CategoryTotal {
  return { user_id: userId, month: "", category_id: name, category_name: name, category_color: color, total: roundCents(total), num_expenses: 1 };
}

export default async function GlobalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
  const familyUnit = await getOrCreateFamilyUnit(supabase, user);
  if (!familyUnit) redirect("/login");
  const currentMonth = currentMadridMonth();
  const year = currentMonth.slice(0, 4);
  const firstYearMonth = `${year}-01-01`;

  const [{ data: memberRows }, { data: sharingRows }] = await Promise.all([
    supabase.from("family_unit_members").select("user_id, display_name, email").eq("unit_id", familyUnit.id).eq("status", "active"),
    supabase.from("family_personal_sharing").select("user_id,enabled").eq("family_unit_id", familyUnit.id),
  ]);
  const activeMembers = (memberRows ?? []).filter((member) => member.user_id);
  const enabledIds = new Set((sharingRows ?? []).filter((row) => row.enabled).map((row) => row.user_id));
  const sharedMembers = activeMembers.filter((member) => activeMembers.length === 1 || enabledIds.has(member.user_id));
  const sharedIds = sharedMembers.map((member) => member.user_id!);
  const [{ data: summaryRows }, { data: investmentRows }] = sharedIds.length ? await Promise.all([
    supabase.from("monthly_summary").select("user_id,month,total_income,total_expenses,savings").in("user_id", sharedIds).gte("month", firstYearMonth).lte("month", currentMonth),
    supabase.from("investments").select("*").in("user_id", sharedIds),
  ]) : [{ data: [] }, { data: [] }];

  const summaries = (summaryRows ?? []) as MonthlySummary[];
  const investments = (investmentRows ?? []) as Investment[];
  const { income: totalIncome, expenses: totalExpenses, savings: totalSavings, investmentOutflow } = summarizeSharedFinances(summaries);
  const yearMonths: string[] = [];
  for (let cursor = firstYearMonth; cursor <= currentMonth; cursor = addMonths(cursor, 1)) yearMonths.push(cursor);
  const groupedInvestments = groupInvestmentCapital(investments.map((item) => ({
    name: item.name,
    capital: roundCents(yearMonths.reduce((sum, month) => sum + investmentMonthlyOutflow([item], month), 0)),
  })));
  const sections = sharedMembers.map((member, index) => categoryTotal(
    user.id,
    member.display_name || member.email,
    summaries.filter((row) => row.user_id === member.user_id).reduce((sum, row) => sum + Number(row.total_expenses), 0),
    ["#2a78d6", "#4a3aa7", "#1baf7a", "#eda100"][index % 4]
  )).filter((section) => section.total > 0);
  const investmentData = groupedInvestments.map((item, index) => categoryTotal(user.id, item.name, item.capital, ["#1baf7a", "#eda100", "#4a3aa7", "#e34948"][index % 4])).filter((item) => item.total > 0);
  const percent = (value: number) => totalIncome > 0 ? `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(value / totalIncome * 100)} %` : "—";
  const allocation = [
    { label: "Gastos totales", amount: totalExpenses, color: "#2a78d6", description: `Suma los gastos registrados desde enero hasta el mes actual de ${year} por los miembros que comparten sus finanzas. Incluye gastos recurrentes y gastos familiares que ya figuran en sus cuentas; estos últimos se cuentan una sola vez.` },
    { label: "Aportaciones a inversión", amount: investmentOutflow, color: "#1baf7a", description: `Dinero destinado a inversiones durante ${year}, calculado como ingresos menos gastos y ahorro. No incluye el capital invertido en años anteriores ni la rentabilidad.` },
    { label: "Ahorro", amount: totalSavings, color: "#eda100", description: `Suma el dinero que queda cada mes de ${year} después de gastos y aportaciones a inversión. No es el saldo actual de la cuenta remunerada.` },
  ];

  return <div className="grid gap-5">
    <div><p className="text-sm font-medium text-primary">La misma vista para toda la unidad · {year}</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Visión global familiar</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Suma los ingresos, gastos, aportaciones a inversión y ahorros personales compartidos desde enero hasta el mes actual de {year}.</p></div>
    {sharedMembers.length < activeMembers.length && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">{sharedMembers.length} de {activeMembers.length} miembros comparten sus finanzas personales. Las cifras conjuntas no incluyen a quienes aún no las comparten.</div>}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Ingresos compartidos" value={formatMoney(totalIncome)} icon={Wallet} />
      <StatCard label="Gastos de los miembros" value={formatMoney(totalExpenses)} icon={Receipt} />
      <StatCard label="Ahorro conjunto" value={formatMoney(totalSavings)} icon={PiggyBank} helper={`${percent(totalSavings)} de los ingresos`} />
      <StatCard label={`Aportado a inversión en ${year}`} value={formatMoney(investmentOutflow)} icon={Landmark} />
    </div>
    <div className="rounded-2xl border bg-card p-5">
      <h2 className="font-semibold">Destino de los ingresos compartidos</h2>
      <div className="mt-5 grid gap-4">{allocation.map((item) => <div key={item.label}>
        <div className="flex justify-between gap-2 text-sm">
          <div className="flex min-w-0 items-center gap-1">
            <span>{item.label}</span>
            <Popover>
              <PopoverTrigger aria-label={`Qué incluye ${item.label}`} className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                <Info className="size-3.5" aria-hidden="true" />
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(20rem,calc(100vw-2rem))] p-3 text-xs leading-5">
                <PopoverTitle className="text-sm">{item.label}</PopoverTitle>
                <p className="text-muted-foreground">{item.description}</p>
                <p className="text-muted-foreground">El porcentaje se calcula sobre los ingresos compartidos de {year}.</p>
              </PopoverContent>
            </Popover>
          </div>
          <span className="shrink-0 tabular-nums">{formatMoney(item.amount)} · <strong>{percent(item.amount)}</strong></span>
        </div>
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${totalIncome > 0 ? Math.max(0, Math.min(100, item.amount / totalIncome * 100)) : 0}%`, backgroundColor: item.color }} /></div>
      </div>)}</div>
      <div className="mt-4 grid gap-1 border-t pt-3 text-xs text-muted-foreground"><p>Las aportaciones de {year} no incluyen capital invertido en años anteriores ni rentabilidad.</p><p>Los gastos de la unidad familiar ya figuran en los gastos personales y no se suman por segunda vez.</p></div>
    </div>
    <div className="grid gap-4 lg:grid-cols-2"><ChartCard title="Gastos por miembro" description={`Acumulado de ${year} de los miembros que comparten`} fileName="gastos-miembros-globales"><CategoryDonut data={sections} emptyLabel="Aún no hay gastos compartidos este año." /></ChartCard><ChartCard title="Inversiones por producto" description={`Aportaciones de ${year} por producto`} fileName="inversiones-familiares"><CategoryDonut data={investmentData} emptyLabel="Aún no hay aportaciones compartidas este año." /></ChartCard></div>
    <div className="rounded-2xl border bg-card p-5"><h2 className="font-semibold">Aportación personal visible</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{sharedMembers.map((member) => { const rows = summaries.filter((row) => row.user_id === member.user_id); return <div key={member.user_id} className="rounded-xl bg-muted/40 p-4"><p className="font-medium">{member.display_name || member.email}</p><p className="mt-2 text-sm text-muted-foreground">Ingresos: {formatMoney(rows.reduce((sum, row) => sum + Number(row.total_income), 0))}</p><p className="text-sm text-muted-foreground">Gastos: {formatMoney(rows.reduce((sum, row) => sum + Number(row.total_expenses), 0))}</p><p className="text-sm text-muted-foreground">Ahorro tras inversiones: {formatMoney(rows.reduce((sum, row) => sum + Number(row.savings), 0))}</p></div>; })}{!sharedMembers.length && <p className="text-sm text-muted-foreground">Ningún miembro ha activado aún el uso compartido.</p>}</div></div>
  </div>;
}
