"use client";

import { useState, useTransition } from "react";
import type { ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreVertical, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import {
  deleteInvestment,
  saveInvestment,
  saveInvestmentMonthOverride,
  skipInvestmentForMonth,
} from "@/app/(app)/ajustes/actions";
import { formatMoney } from "@/lib/format";
import { recurringFrequencyLabels } from "@/lib/recurring";
import type { Category, Investment } from "@/lib/types";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomMonthsFields } from "@/components/settings/recurring-finance-forms";

const INVESTMENT_TYPES = [
  { value: "fixed_income", label: "Fondos de renta fija" },
  { value: "equity", label: "Fondos de renta variable" },
  { value: "mixed", label: "Fondos de renta mixta" },
  { value: "money_market", label: "Fondos monetarios" },
  { value: "crypto", label: "Criptomonedas" },
  { value: "real_estate", label: "Fondos inmobiliarios" },
];

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

function isOneOff(investment: Investment) {
  return Number(investment.one_off_amount ?? 0) > 0 && !investment.monthly_amount;
}

export function InvestmentList({
  month,
  investments,
  categories,
}: {
  month: string;
  investments: Investment[];
  categories: Category[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Investment | null>(null);
  const [editScope, setEditScope] = useState<"global" | "month">("global");

  function openNew() {
    setEditing(null);
    setEditScope("global");
    setDialogOpen(true);
  }

  function openEdit(investment: Investment, scope: "global" | "month" = "global") {
    setEditing(investment);
    setEditScope(scope);
    setDialogOpen(true);
  }

  function save(formData: FormData) {
    startTransition(async () => {
      const result = editScope === "month"
        ? await saveInvestmentMonthOverride(formData)
        : await saveInvestment(formData);
      if (result.error) toast.error(result.error);
      else {
        toast.success(editing ? "Inversión actualizada." : "Inversión añadida.");
        setDialogOpen(false);
        router.refresh();
      }
    });
  }

  async function skipThisMonth(investment: Investment) {
    if (!window.confirm(`¿Eliminar «${investment.name}» solo de este mes?`)) return;
    const result = await skipInvestmentForMonth(investment.id, month);
    if (result.error) toast.error(result.error);
    else { toast.success("Inversión recurrente eliminada de este mes."); router.refresh(); }
  }

  async function remove() {
    if (!confirmDelete) return;
    const result = await deleteInvestment(confirmDelete.id);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Inversión eliminada.");
      router.refresh();
    }
    setConfirmDelete(null);
  }

  const editingOneOff = editing ? isOneOff(editing) : true;
  const amount = editing
    ? editingOneOff
      ? editing.one_off_amount
      : editing.monthly_amount
    : null;

  return (
    <div className="grid gap-2">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={openNew}>
          <Plus className="size-4" />
          Añadir inversión
        </Button>
      </div>

      {investments.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No hay inversiones registradas este mes.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {investments.map((investment) => {
            const oneOff = isOneOff(investment);
            const displayAmount = Number(
              oneOff ? investment.one_off_amount : investment.monthly_amount
            );
            return (
              <li key={investment.id} className="row-hover flex items-center gap-3 p-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[oklch(0.72_0.16_95/0.16)] text-[oklch(0.48_0.13_95)]">
                  {oneOff ? <Plus className="size-4" /> : <Repeat className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{investment.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {oneOff ? "Puntual este mes" : "Recurrente mensual"}
                    {investment.expected_annual_return_pct != null
                      ? ` · ${Number(investment.expected_annual_return_pct).toFixed(1)}% esperado`
                      : ""}
                  </p>
                </div>
                <Badge
                  variant={oneOff ? "outline" : "secondary"}
                  className={oneOff ? "hidden sm:inline-flex" : "hidden border-transparent bg-muted text-muted-foreground hover:bg-muted sm:inline-flex"}
                >
                  {oneOff ? "Puntual" : "Recurrente"}
                </Badge>
                <span className="text-sm font-semibold tabular-nums">
                  −{formatMoney(displayAmount)}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreVertical className="size-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-64">
                    {oneOff ? (
                      <>
                        <DropdownMenuItem onClick={() => openEdit(investment)}><Pencil />Editar</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(investment)}><Trash2 />Eliminar</DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem onClick={() => openEdit(investment, "global")}><Pencil />Editar recurrente</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(investment, "month")}><Pencil />Editar esta inversión</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => skipThisMonth(investment)}><Trash2 />Eliminar esta inversión</DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? editScope === "month" ? "Editar esta inversión" : "Editar inversión recurrente" : "Nueva inversión del mes"}
            </DialogTitle>
          </DialogHeader>
          <form action={save} className="grid gap-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            {editScope !== "month" && <input type="hidden" name="effective_month" value={month} />}
            <input
              type="hidden"
              name="investment_entry_type"
              value={editingOneOff ? "one_off" : "recurring"}
            />
            {!editingOneOff && <input type="hidden" name="change_scope" value={editScope === "month" ? "from_month" : "global"} />}
            {editingOneOff && <input type="hidden" name="change_scope" value="global" />}

            <div className="grid gap-2">
              <Label htmlFor="investment-name">Fondo o inversión</Label>
              <Input
                id="investment-name"
                name="name"
                required
                defaultValue={editing?.name ?? ""}
                placeholder="Ej. MSCI World"
              />
            </div>

            <div className={editScope === "month" ? "grid grid-cols-2 gap-3" : "grid gap-2"}>
              <div className="grid gap-2"><Label htmlFor="investment-amount">Importe invertido</Label><div className="relative"><Input id="investment-amount" name={editingOneOff ? "one_off_amount" : "monthly_amount"} inputMode="decimal" required className="pr-7" defaultValue={amount ?? ""} placeholder="Ej. 300,00" /><span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted-foreground">€</span></div></div>
              {editScope === "month" && <div className="grid gap-2"><Label htmlFor="investment-date">Fecha real</Label><Input id="investment-date" name="effective_month" type="date" required defaultValue={month} /></div>}
            </div>

            {!editingOneOff && editScope !== "month" && (
              <div className="grid gap-2">
                <Label>Frecuencia</Label>
                <Select name="frequency" defaultValue={editing?.frequency ?? "monthly"} items={Object.entries(recurringFrequencyLabels).map(([value, label]) => ({ value, label }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(recurringFrequencyLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {!editingOneOff && editScope !== "month" && <CustomMonthsFields months={editing?.custom_months} />}

            <div className="grid gap-2">
              <Label>Tipo de inversión</Label>
              <Select name="investment_type" defaultValue={editing?.investment_type ?? undefined} items={INVESTMENT_TYPES}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Selecciona un tipo" /></SelectTrigger>
                <SelectContent>{INVESTMENT_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Categoría</Label>
              <Select name="category_id" defaultValue={editing?.category_id ?? "none"} items={[{ value: "none", label: "Sin categoría" }, ...categories.map((category) => ({ value: category.id, label: category.name }))]}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Sin categoría</SelectItem>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="investment-return">Rentabilidad esperada</Label>
              <SuffixedInput
                id="investment-return"
                name="expected_annual_return_pct"
                inputMode="decimal"
                suffix="%"
                defaultValue={editing?.expected_annual_return_pct ?? ""}
                placeholder="Ej. 8"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Para decimales usa coma o punto. Ejemplos:{" "}
              <span className="tabular-nums">300,50 €</span>,{" "}
              <span className="tabular-nums">1.200,00 €</span> o{" "}
              <span className="tabular-nums">8,5%</span>.
            </p>

            {!editingOneOff && (
              <p className="rounded-md border border-primary/30 bg-primary/5 p-2.5 text-xs text-muted-foreground">
                Esta inversión es recurrente. Al editarla desde el resumen, se
                conservarán los meses anteriores y el cambio se aplicará desde
                este mes.
              </p>
            )}

            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta inversión?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará «{confirmDelete?.name}» de forma permanente. Esta
              acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
