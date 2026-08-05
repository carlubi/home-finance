"use client";

import { useState, useTransition } from "react";
import type { ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreVertical, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import {
  deleteInvestment,
  saveInvestment,
} from "@/app/(app)/ajustes/actions";
import { formatMoney } from "@/lib/format";
import type { Investment } from "@/lib/types";
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
}: {
  month: string;
  investments: Investment[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Investment | null>(null);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(investment: Investment) {
    setEditing(investment);
    setDialogOpen(true);
  }

  function save(formData: FormData) {
    startTransition(async () => {
      const result = await saveInvestment(formData);
      if (result.error) toast.error(result.error);
      else {
        toast.success(editing ? "Inversión actualizada." : "Inversión añadida.");
        setDialogOpen(false);
        router.refresh();
      }
    });
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
                <Badge variant={oneOff ? "outline" : "secondary"} className="hidden sm:inline-flex">
                  {oneOff ? "Puntual" : "Mensual"}
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
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(investment)}>
                      <Pencil />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setConfirmDelete(investment)}
                    >
                      <Trash2 />
                      Eliminar
                    </DropdownMenuItem>
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
              {editing ? "Editar inversión" : "Nueva inversión del mes"}
            </DialogTitle>
          </DialogHeader>
          <form action={save} className="grid gap-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <input type="hidden" name="effective_month" value={month} />
            <input
              type="hidden"
              name="investment_entry_type"
              value={editingOneOff ? "one_off" : "recurring"}
            />
            {!editingOneOff && (
              <input type="hidden" name="change_scope" value="from_month" />
            )}
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

            <div className="grid gap-2">
              <Label htmlFor="investment-amount">Importe invertido</Label>
              <SuffixedInput
                id="investment-amount"
                name={editingOneOff ? "one_off_amount" : "monthly_amount"}
                inputMode="decimal"
                required
                suffix="€"
                defaultValue={amount ?? ""}
                placeholder="Ej. 300,00"
              />
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
