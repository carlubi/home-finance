import { formatMoney } from "@/lib/format";

export type SharedPersonalEntry = { id: string; name: string; amount: number; category: string | null };
export type SharedPersonalMember = {
  id: string;
  name: string;
  income: number;
  expenses: number;
  investment: number;
  expenseItems: SharedPersonalEntry[];
  incomeItems: SharedPersonalEntry[];
  investmentItems: SharedPersonalEntry[];
};
export type SharedPersonalKind = "expense" | "income" | "investment";

const details = {
  expense: { heading: "Gastos personales compartidos", total: "Gastos", empty: "Sin gastos registrados este mes." },
  income: { heading: "Ingresos personales compartidos", total: "Ingresos", empty: "Sin ingresos registrados este mes." },
  investment: { heading: "Inversiones personales compartidas", total: "Aportación del mes", empty: "Sin aportaciones de inversión este mes." },
} as const;

export function SharedPersonalPanel({ members, kind }: { members: SharedPersonalMember[]; kind: SharedPersonalKind }) {
  if (!members.length) return null;
  const labels = details[kind];
  return <section className="grid gap-3 pt-3" aria-label={labels.heading}>
    <h2 className="text-sm font-semibold text-muted-foreground">{labels.heading}</h2>
    {members.map((member) => {
      const items = kind === "expense" ? member.expenseItems : kind === "income" ? member.incomeItems : member.investmentItems;
      const total = kind === "expense" ? member.expenses : kind === "income" ? member.income : member.investment;
      return <div key={member.id} className="rounded-2xl border border-border/70 bg-muted/45 p-4 text-muted-foreground">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wide">Solo lectura</p><h3 className="mt-1 text-lg font-semibold text-foreground/75">{member.name}</h3></div><p className="text-right text-sm">{labels.total}: <strong className="tabular-nums text-foreground/75">{formatMoney(total)}</strong></p></div>
        {items.length ? <ul className="mt-4 divide-y divide-border/60 border-t border-border/60">{items.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="min-w-0 truncate">{item.name}{item.category && <span className="ml-2 text-xs opacity-70">· {item.category}</span>}</span><span className="shrink-0 tabular-nums">{formatMoney(item.amount)}</span></li>)}</ul> : <p className="mt-3 text-sm">{labels.empty}</p>}
      </div>;
    })}
  </section>;
}
