import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarDays,
  ChartPie, FileText, HousePlus, PiggyBank, Receipt, Users, Wallet,
} from "lucide-react";
import { getAppProfile, getCurrentUser } from "@/lib/auth";
import { addMonths, currentMadridMonth, formatMoney, formatMonth } from "@/lib/format";
import { getFamilyAccess, getOrCreateFamilyUnit } from "@/lib/family-unit";
import { createClient } from "@/lib/supabase/server";
import { familyMonthTotal } from "@/lib/family-month";
import { mealLabel, sortMeals } from "@/lib/meals";
import type { FamilyRecurringExpense } from "@/lib/types";
import { PageHeader, SectionTitle } from "@/components/layout/page-header";

export const metadata = { title: "Inicio" };

function todayInMadrid() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="inline-flex items-center gap-1 rounded-sm text-[13px] font-medium tracking-[-0.078px] text-text-secondary transition-fast outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent">
    {children}<ArrowRight className="size-3.5" />
  </Link>;
}

function AreaIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return <span className="grid size-7 place-items-center rounded-md border border-border-primary bg-bg-tertiary text-text-secondary"><Icon className="size-4" /></span>;
}

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const month = currentMadridMonth();
  const nextMonth = addMonths(month, 1);
  const today = todayInMadrid();
  const familyUnit = await getOrCreateFamilyUnit(supabase, user);
  const familyAccess = familyUnit ? await getFamilyAccess(supabase, user.id, familyUnit) : null;

  const [profileResult, summaryResult, familyExpensesResult, familyRecurringResult, familySkipsResult, groupResult, sharedResult, mealsResult] = await Promise.all([
    getAppProfile(user.id),
    supabase.from("monthly_summary").select("total_income,total_expenses,savings").eq("user_id", user.id).eq("month", month).maybeSingle(),
    familyUnit && familyAccess?.expenses !== "none"
      ? supabase.from("family_expenses").select("amount,occurred_at,recurring_expense_id").eq("family_unit_id", familyUnit.id).gte("occurred_at", month).lt("occurred_at", nextMonth)
      : Promise.resolve({ data: [], error: null }),
    familyUnit && familyAccess?.expenses !== "none"
      ? supabase.from("family_recurring_expenses").select("*").eq("family_unit_id", familyUnit.id)
      : Promise.resolve({ data: [], error: null }),
    familyUnit && familyAccess?.expenses !== "none"
      ? supabase.from("family_recurring_expense_skips").select("recurring_expense_id,month").eq("family_unit_id", familyUnit.id).eq("month", month)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("shared_groups").select("id"),
    supabase.from("shared_expenses").select("total_amount").gte("occurred_at", month).lt("occurred_at", nextMonth),
    familyUnit && familyAccess?.menus !== "none"
      ? supabase.from("menu_meals").select("id,meal_type,title").eq("family_unit_id", familyUnit.id).eq("meal_date", today).order("created_at")
      : Promise.resolve({ data: [] }),
  ]);

  const firstName = profileResult?.full_name?.trim().split(/\s+/)[0];
  const summary = summaryResult.data;
  const familyError = Boolean(familyExpensesResult.error || familyRecurringResult.error);
  const familyMonth = familyMonthTotal({
    month,
    expenses: familyExpensesResult.data ?? [],
    recurring: (familyRecurringResult.data ?? []) as FamilyRecurringExpense[],
    skips: familySkipsResult.data ?? [],
  });
  const sharedExpenses = sharedResult.data ?? [];
  const sharedTotal = sharedExpenses.reduce((total, expense) => total + Number(expense.total_amount), 0);
  const todayMeals = sortMeals(mealsResult.data ?? []);
  const mealsError = "error" in mealsResult ? mealsResult.error : null;
  const dateLabel = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid", weekday: "long", day: "numeric", month: "long",
  }).format(new Date());

  const metrics = [
    { label: "Ingresos", value: Number(summary?.total_income ?? 0), icon: ArrowDownLeft, href: "/gastos-personales", detail: "Entradas de este mes", tone: "text-green" },
    { label: "Gastos", value: Number(summary?.total_expenses ?? 0), icon: ArrowUpRight, href: "/gastos-personales", detail: "Salidas de este mes", tone: "text-red" },
    { label: "Ahorro", value: Number(summary?.savings ?? 0), icon: PiggyBank, href: "/gastos-personales", detail: "Balance del mes tras inversiones", tone: "text-accent" },
  ];

  return <div className="mx-auto max-w-6xl space-y-8">
    <PageHeader
      financialPrivacy
      eyebrow={<span className="capitalize">{dateLabel}</span>}
      title={firstName ? `Hola, ${firstName}` : "Tu resumen de hoy"}
      description="Lo más importante de tus finanzas y tu planificación, en un solo lugar."
    />

    <section aria-label={`Resumen financiero de ${formatMonth(month)}`} className="grid overflow-hidden rounded-lg border border-border-primary bg-bg-secondary linear-shadow-sm md:grid-cols-3 md:divide-x md:divide-border-primary max-md:divide-y max-md:divide-border-primary">
      {metrics.map((metric) => <Link key={metric.label} href={metric.href} className="group block p-5 transition-fast outline-none hover:bg-bg-tertiary/60 focus-visible:bg-bg-tertiary/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-text-secondary"><metric.icon className={`size-3.5 ${metric.tone}`} />{metric.label}</p>
          <ArrowUpRight className="size-3.5 text-text-tertiary transition-fast group-hover:text-text-primary" />
        </div>
        <p className="mt-3 text-3xl font-semibold text-text-primary">{summaryResult.error ? "—" : formatMoney(metric.value)}</p>
        <p className="mt-1 text-xs text-text-tertiary">{metric.detail} · <span className="capitalize">{formatMonth(month)}</span></p>
      </Link>)}
    </section>

    <section aria-label="Resumen de otras áreas" className="grid gap-4 lg:grid-cols-3">
      {familyAccess?.expenses !== "none" && <article className="flex min-h-56 flex-col rounded-lg border border-border-primary bg-bg-secondary p-5 linear-shadow-sm">
        <div className="flex items-center gap-2.5"><AreaIcon icon={Receipt} /><h2 className="text-base font-medium">Gastos de la unidad familiar</h2></div>
        {!familyUnit ? <p className="mt-4 text-[13px] text-text-secondary">Crea tu unidad familiar para llevar aquí los gastos de casa.</p> : <>
          <p className="mt-4 text-[13px] text-text-secondary">Total neto de este mes</p>
          <p className="mt-1 text-2xl font-medium">{familyError ? "—" : formatMoney(familyMonth.total)}</p>
          <p className="mt-1 text-xs text-text-tertiary">{familyMonth.count} {familyMonth.count === 1 ? "movimiento" : "movimientos"} · recurrentes incluidos</p>
        </>}
        <div className="mt-auto pt-5"><SectionLink href="/familia">Ver gastos familiares</SectionLink></div>
      </article>}

      <article className="flex min-h-56 flex-col rounded-lg border border-border-primary bg-bg-secondary p-5 linear-shadow-sm">
        <div className="flex items-center gap-2.5"><AreaIcon icon={Users} /><h2 className="text-base font-medium">Gastos compartidos</h2></div>
        <p className="mt-4 text-[13px] text-text-secondary">Total registrado este mes en tus grupos</p>
        <p className="mt-1 text-2xl font-medium">{sharedResult.error ? "—" : formatMoney(sharedTotal)}</p>
        <p className="mt-1 text-xs text-text-tertiary">{groupResult.data?.length ?? 0} {groupResult.data?.length === 1 ? "grupo" : "grupos"} · {sharedExpenses.length} {sharedExpenses.length === 1 ? "gasto" : "gastos"}</p>
        <div className="mt-auto pt-5"><SectionLink href="/compartidos">Ver compartidos</SectionLink></div>
      </article>

      {familyAccess?.menus !== "none" && <article className="flex min-h-56 flex-col rounded-lg border border-border-primary bg-bg-secondary p-5 linear-shadow-sm">
        <div className="flex items-center gap-2.5"><AreaIcon icon={CalendarDays} /><h2 className="text-base font-medium">Comidas de hoy</h2></div>
        {mealsError ? <p className="mt-4 text-[13px] text-text-secondary">No se pudieron cargar las comidas de hoy.</p> : todayMeals.length ? <ul className="mt-3 divide-y divide-border-primary">{todayMeals.slice(0, 4).map((meal) => <li key={meal.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="truncate">{meal.title}</span><span className="shrink-0 text-xs text-text-tertiary">{mealLabel(meal.meal_type)}</span></li>)}{todayMeals.length > 4 && <li className="py-2 text-xs text-text-tertiary">Y {todayMeals.length - 4} más</li>}</ul> : <p className="mt-4 text-[13px] text-text-secondary">Todavía no hay comidas planificadas para hoy.</p>}
        <div className="mt-auto pt-5"><SectionLink href="/menus">Abrir menús</SectionLink></div>
      </article>}
    </section>

    <section aria-labelledby="more-title">
      <SectionTitle id="more-title">Explorar la app</SectionTitle>
      <div className="grid overflow-hidden rounded-lg border border-border-primary bg-bg-secondary sm:grid-cols-2 lg:grid-cols-4 sm:divide-x sm:divide-border-primary max-sm:divide-y max-sm:divide-border-primary">
        {[
          ...(familyAccess?.mortgage !== "none" ? [{ href: "/hipoteca", label: "Hipoteca", detail: "Cuota, capital y simulaciones", icon: HousePlus }] : []),
          ...(familyAccess?.overview !== "none" ? [{ href: "/global", label: "Visión global", detail: "Finanzas compartidas", icon: ChartPie }] : []),
          { href: "/presupuestos", label: "Presupuestos", detail: "Planes y objetivos", icon: Wallet },
          { href: "/informes", label: "Informes", detail: "Análisis y exportación", icon: FileText },
        ].map((item) => <Link key={item.href} href={item.href} className="group flex items-center gap-3 px-4 py-3.5 transition-fast outline-none hover:bg-bg-tertiary/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
          <item.icon className="size-4 shrink-0 text-text-tertiary transition-fast group-hover:text-text-secondary" /><span className="min-w-0 flex-1"><span className="block text-[13px] font-medium text-text-primary">{item.label}</span><span className="block text-xs text-text-tertiary">{item.detail}</span></span><ArrowRight className="size-3.5 text-text-tertiary transition-fast group-hover:text-text-primary" />
        </Link>)}
      </div>
    </section>
  </div>;
}
