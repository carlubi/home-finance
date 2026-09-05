"use client";

import { useRef, useState, useTransition } from "react";
import type { ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Save, Trash2 } from "lucide-react";
import type { Category, FixedExpense, Investment } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteFixedExpense,
  deleteInvestment,
  saveFixedExpense,
  saveInvestment,
  updateMonthlyIncome,
} from "@/app/(app)/ajustes/actions";
import { recurringFrequencyLabels, recurringMonthLabels } from "@/lib/recurring";

const INVESTMENT_TYPES = [
  { value: "fixed_income", label: "Fondos de renta fija" }, { value: "equity", label: "Fondos de renta variable" },
  { value: "mixed", label: "Fondos de renta mixta" }, { value: "money_market", label: "Fondos monetarios" },
  { value: "crypto", label: "Criptomonedas" }, { value: "real_estate", label: "Fondos inmobiliarios" },
];

export function CustomMonthsFields({ months = [] }: { months?: number[] | null }) {
  return <div className="grid gap-1"><Label className="text-xs">Meses (si es personalizado)</Label><div className="flex flex-wrap gap-1">{recurringMonthLabels.map((label, index) => <label key={label} className="cursor-pointer rounded border px-1.5 py-0.5 text-xs"><input className="mr-1" type="checkbox" name="custom_months" value={index + 1} defaultChecked={months?.includes(index + 1)} />{label}</label>)}</div></div>;
}

function ChangeScopeFields({
  currentMonth,
  compact = false,
}: {
  currentMonth: string;
  compact?: boolean;
}) {
  return (
    <>
      <input type="hidden" name="effective_month" value={currentMonth} />
      <div className={compact ? "grid gap-1" : "grid gap-2"}>
        {!compact && <Label>Aplicar cambio</Label>}
        <Select
          name="change_scope"
          defaultValue="from_month"
          items={[
            { value: "from_month", label: "Desde este mes" },
            { value: "global", label: "Todos los meses" },
          ]}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="from_month">Desde este mes</SelectItem>
            <SelectItem value="global">Todos los meses</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

function SuffixedInput({
  suffix,
  className,
  ...props
}: ComponentProps<typeof Input> & { suffix: string }) {
  return (
    <div className="relative">
      <Input className={className ?? "pr-8"} {...props} />
      <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted-foreground">
        {suffix}
      </span>
    </div>
  );
}

function SaveStatusButton({
  saved,
  pending,
  label,
  variant = "default",
}: {
  saved: boolean;
  pending: boolean;
  label: string;
  variant?: ComponentProps<typeof Button>["variant"];
}) {
  if (saved) {
    return (
      <span className="grid h-8 min-w-8 place-items-center rounded-lg border border-green-600/30 bg-green-600/10 text-green-700 dark:text-green-400">
        <Check className="size-4" />
      </span>
    );
  }

  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {variant === "outline" && <Save className="size-4" />}
      {label}
    </Button>
  );
}

function refreshAfterSavedState(router: ReturnType<typeof useRouter>) {
  window.setTimeout(() => router.refresh(), 1200);
}

export function MonthlyIncomeForm({
  monthlyIncome,
  currentMonth,
}: {
  monthlyIncome: number | null;
  currentMonth: string;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saved, setSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <>
      <form
        ref={formRef}
        onInput={() => setSaved(false)}
        onChange={() => setSaved(false)}
        action={(formData) =>
          startTransition(async () => {
            setSaved(false);
            const r = await updateMonthlyIncome(formData);
            if (r.error) toast.error(r.error);
            else {
              setSaved(true);
              toast.success("Ingreso mensual actualizado.");
              refreshAfterSavedState(router);
            }
          })
        }
        className="grid w-full gap-3"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(14rem,1fr)_13rem_auto_auto] lg:items-end">
          <div className="grid gap-2">
            <Label htmlFor="monthly_income">Ingreso mensual / salario</Label>
            <SuffixedInput
              key={monthlyIncome ?? "empty"}
              id="monthly_income"
              name="monthly_income"
              type="text"
              inputMode="decimal"
              suffix="€"
              defaultValue={monthlyIncome ?? ""}
              placeholder="Ej. 1.800,50"
            />
          </div>
          <ChangeScopeFields currentMonth={currentMonth} />
          <SaveStatusButton saved={saved} pending={pending} label="Guardar" />
          {monthlyIncome !== null && (
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Puedes escribir decimales con coma o punto:{" "}
          <span className="tabular-nums">1.800,50</span>,{" "}
          <span className="tabular-nums">1800.50</span> o{" "}
          <span className="tabular-nums">1800</span>. Los puntos de miles se
          permiten y se normalizan automáticamente.
        </p>
      </form>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este ingreso recurrente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el ingreso mensual según el alcance seleccionado:
              desde este mes o en todos los meses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                startTransition(async () => {
                  const formData = new FormData(formRef.current ?? undefined);
                  formData.set("monthly_income", "");
                  const result = await updateMonthlyIncome(formData);
                  if (result.error) toast.error(result.error);
                  else {
                    setSaved(false);
                    toast.success("Ingreso recurrente eliminado.");
                    router.refresh();
                  }
                  setConfirmDelete(false);
                })
              }
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function FixedExpensesManager({
  fixedExpenses,
  categories,
  currentMonth,
  entryKind = "expense",
}: {
  fixedExpenses: FixedExpense[];
  categories: Category[];
  currentMonth: string;
  entryKind?: "expense" | "income";
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<FixedExpense | null>(null);
  const [newSaved, setNewSaved] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const entries = fixedExpenses.filter((expense) => expense.entry_kind === entryKind);
  const entryLabel = entryKind === "income" ? "Ingreso" : "Gasto";

  function runSave(formData: FormData, successMessage: string) {
    startTransition(async () => {
      const id = String(formData.get("id") ?? "");
      if (id) {
        setSavedIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      } else {
        setNewSaved(false);
      }
      const result = await saveFixedExpense(formData);
      if (result.error) toast.error(result.error);
      else {
        formRef.current?.reset();
        if (id) {
          setSavedIds((current) => new Set(current).add(id));
        } else {
          setNewSaved(true);
        }
        toast.success(successMessage);
        refreshAfterSavedState(router);
      }
    });
  }

  return (
    <div className="grid gap-4">
      <form
        ref={formRef}
        onInput={() => setNewSaved(false)}
        onChange={() => setNewSaved(false)}
        action={(formData) => runSave(formData, "Movimiento recurrente añadido.")}
        className="grid min-w-0 grid-flow-col auto-cols-[minmax(7rem,1fr)] items-end gap-2"
      >
        <input type="hidden" name="effective_month" value={currentMonth} />
        <input type="hidden" name="entry_kind" value={entryKind} />
        {entryKind === "income" ? (
          <Input id="recurring-income-name" name="name" placeholder="Concepto" required />
        ) : (
          <Input name="name" placeholder={`Concepto de ${entryLabel.toLowerCase()} recurrente`} required />
        )}
        <Select
          name="category_id"
          defaultValue="none"
          items={[
            { value: "none", label: "Sin categoría" },
            ...categories.map((category) => ({
              value: category.id,
              label: category.name,
            })),
          ]}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin categoría</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select name="frequency" defaultValue="monthly" items={Object.entries(recurringFrequencyLabels).map(([value, label]) => ({ value, label }))}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(recurringFrequencyLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
        </Select>
        <CustomMonthsFields />
        <SuffixedInput
          name="amount"
          inputMode="decimal"
          suffix="€"
          placeholder="Ej. 850,00"
          required
        />
        <SaveStatusButton saved={newSaved} pending={pending} label="Añadir" />
      </form>

      {entries.length > 0 ? (
        <div className="grid gap-2">
          {entries.map((expense) => (
            <form
              key={expense.id}
              onInput={() =>
                setSavedIds((current) => {
                  const next = new Set(current);
                  next.delete(expense.id);
                  return next;
                })
              }
              onChange={() =>
                setSavedIds((current) => {
                  const next = new Set(current);
                  next.delete(expense.id);
                  return next;
                })
              }
              action={(formData) => runSave(formData, "Movimiento recurrente actualizado.")}
              className="grid min-w-0 grid-flow-col auto-cols-[minmax(7rem,1fr)] items-end gap-2 rounded-lg border bg-muted/20 p-3"
            >
              <input type="hidden" name="id" value={expense.id} />
              <input type="hidden" name="entry_kind" value={entryKind} />
              {entryKind === "income" ? (
                <Input id={`recurring-income-name-${expense.id}`} key={`${expense.id}-name-${expense.name}`} name="name" placeholder="Concepto" defaultValue={expense.name} required />
              ) : (
                <Input key={`${expense.id}-name-${expense.name}`} name="name" defaultValue={expense.name} required />
              )}
              <Select
                key={`${expense.id}-category-${expense.category_id ?? "none"}`}
                name="category_id"
                defaultValue={expense.category_id ?? "none"}
                items={[
                  { value: "none", label: "Sin categoría" },
                  ...categories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  })),
                ]}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select name="frequency" defaultValue={expense.frequency ?? "monthly"} items={Object.entries(recurringFrequencyLabels).map(([value, label]) => ({ value, label }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(recurringFrequencyLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
              <CustomMonthsFields months={expense.custom_months} />
              <SuffixedInput
                key={`${expense.id}-amount-${expense.amount ?? "empty"}`}
                name="amount"
                inputMode="decimal"
                defaultValue={expense.amount ?? ""}
                suffix="€"
                placeholder="Ej. 850,00"
                required
              />
              <ChangeScopeFields currentMonth={currentMonth} compact />
              <SaveStatusButton
                saved={savedIds.has(expense.id)}
                pending={pending}
                label="Guardar"
                variant="outline"
              />
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => setConfirmDelete(expense)}
              >
                <Trash2 className="size-4" />
              </Button>
            </form>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aún no tienes {entryLabel.toLowerCase()}s recurrentes.
        </p>
      )}

      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este gasto recurrente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará «{confirmDelete?.name}» de los ajustes recurrentes. Esta
              acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                startTransition(async () => {
                  if (!confirmDelete) return;
                  const result = await deleteFixedExpense(confirmDelete.id);
                  if (result.error) toast.error(result.error);
                  else {
                    toast.success("Gasto fijo eliminado.");
                    router.refresh();
                  }
                  setConfirmDelete(null);
                })
              }
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function InvestmentsManager({
  investments,
  currentMonth,
}: {
  investments: Investment[];
  currentMonth: string;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<Investment | null>(null);
  const [newSaved, setNewSaved] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function runSave(formData: FormData, successMessage: string) {
    startTransition(async () => {
      const id = String(formData.get("id") ?? "");
      if (id) {
        setSavedIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      } else {
        setNewSaved(false);
      }
      const result = await saveInvestment(formData);
      if (result.error) toast.error(result.error);
      else {
        formRef.current?.reset();
        if (id) {
          setSavedIds((current) => new Set(current).add(id));
        } else {
          setNewSaved(true);
        }
        toast.success(successMessage);
        refreshAfterSavedState(router);
      }
    });
  }

  return (
    <div className="grid gap-4">
      <form
        ref={formRef}
        onInput={() => setNewSaved(false)}
        onChange={() => setNewSaved(false)}
        action={(formData) => runSave(formData, "Inversión recurrente añadida.")}
        className="grid min-w-0 grid-flow-col auto-cols-[minmax(7rem,1fr)] items-end gap-2"
      >
        <input type="hidden" name="effective_month" value={currentMonth} />
        <Input name="name" placeholder="Fondo o inversión" required />
        <SuffixedInput
          name="monthly_amount"
          inputMode="decimal"
          suffix="€"
          placeholder="Ej. 300,00"
          required
        />
        <Select name="frequency" defaultValue="monthly" items={Object.entries(recurringFrequencyLabels).map(([value, label]) => ({ value, label }))}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Frecuencia" /></SelectTrigger>
          <SelectContent>{Object.entries(recurringFrequencyLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
        </Select>
        <CustomMonthsFields />
        <Select name="investment_type" items={INVESTMENT_TYPES}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Tipo de inversión" /></SelectTrigger>
          <SelectContent>{INVESTMENT_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
        </Select>
        <SuffixedInput
          name="expected_annual_return_pct"
          inputMode="decimal"
          suffix="%"
          placeholder="Ej. 8"
        />
        <SuffixedInput
          name="accumulated_capital"
          inputMode="decimal"
          suffix="€"
          placeholder="Ya invertido"
        />
        <SaveStatusButton saved={newSaved} pending={pending} label="Añadir" />
      </form>

      {investments.length > 0 ? (
        <div className="grid gap-2">
          {investments.map((investment) => (
            <form
              key={investment.id}
              onInput={() =>
                setSavedIds((current) => {
                  const next = new Set(current);
                  next.delete(investment.id);
                  return next;
                })
              }
              onChange={() =>
                setSavedIds((current) => {
                  const next = new Set(current);
                  next.delete(investment.id);
                  return next;
                })
              }
              action={(formData) =>
                runSave(formData, "Inversión recurrente actualizada.")
              }
              className="grid min-w-0 grid-flow-col auto-cols-[minmax(7rem,1fr)] items-end gap-2 rounded-lg border bg-muted/20 p-3"
            >
              <input type="hidden" name="id" value={investment.id} />
              <Input
                key={`${investment.id}-name-${investment.name}`}
                name="name"
                defaultValue={investment.name}
                required
              />
              <SuffixedInput
                key={`${investment.id}-monthly-${investment.monthly_amount ?? "empty"}`}
                name="monthly_amount"
                inputMode="decimal"
                defaultValue={investment.monthly_amount ?? ""}
                suffix="€"
                placeholder="Ej. 300,00"
              />
              <Select name="frequency" defaultValue={investment.frequency ?? "monthly"} items={Object.entries(recurringFrequencyLabels).map(([value, label]) => ({ value, label }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(recurringFrequencyLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
              <CustomMonthsFields months={investment.custom_months} />
              <Select name="investment_type" defaultValue={investment.investment_type ?? undefined} items={INVESTMENT_TYPES}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Tipo de inversión" /></SelectTrigger>
                <SelectContent>{INVESTMENT_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
              </Select>
              <SuffixedInput
                key={`${investment.id}-return-${investment.expected_annual_return_pct ?? "empty"}`}
                name="expected_annual_return_pct"
                inputMode="decimal"
                defaultValue={investment.expected_annual_return_pct ?? ""}
                suffix="%"
                placeholder="Ej. 8"
              />
              <SuffixedInput
                key={`${investment.id}-capital-${investment.accumulated_capital ?? "empty"}`}
                name="accumulated_capital"
                inputMode="decimal"
                defaultValue={investment.accumulated_capital ?? ""}
                suffix="€"
                placeholder="Ya invertido"
              />
              <ChangeScopeFields currentMonth={currentMonth} compact />
              <SaveStatusButton
                saved={savedIds.has(investment.id)}
                pending={pending}
                label="Guardar"
                variant="outline"
              />
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => setConfirmDelete(investment)}
              >
                <Trash2 className="size-4" />
              </Button>
            </form>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aún no tienes inversiones recurrentes.
        </p>
      )}

      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta inversión recurrente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará «{confirmDelete?.name}» de los ajustes mensuales. Esta
              acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                startTransition(async () => {
                  if (!confirmDelete) return;
                  const result = await deleteInvestment(confirmDelete.id);
                  if (result.error) toast.error(result.error);
                  else {
                    toast.success("Inversión recurrente eliminada.");
                    router.refresh();
                  }
                  setConfirmDelete(null);
                })
              }
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
