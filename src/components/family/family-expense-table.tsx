"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  deleteFamilyExpense,
  deleteFamilyExpenses,
} from "@/app/(app)/familia/actions";
import { familyCategoryColor } from "@/lib/family";
import { formatDate, formatMoney, formatMonth } from "@/lib/format";
import type { FamilyDisplayExpense, FamilyExpense } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FamilyExpenseDialog } from "./family-expense-dialog";

function perPerson(amount: number, people: number) {
  return amount / people;
}

export function FamilyExpenseTable({
  month,
  rows,
  manualExpenses,
  peopleCount,
}: {
  month: string;
  rows: FamilyDisplayExpense[];
  manualExpenses: FamilyExpense[];
  peopleCount: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<FamilyExpense | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [editing, setEditing] = useState<FamilyExpense | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const manualById = new Map(manualExpenses.map((expense) => [expense.id, expense]));
  const selectableRows = rows.filter((row) => row.source === "manual");
  const allSelected =
    selectableRows.length > 0 && selected.size === selectableRows.length;
  const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);
  const totalPerPerson = rows.reduce(
    (sum, row) => sum + perPerson(Number(row.amount), row.people_count),
    0
  );
  const showPerPerson = peopleCount > 1;

  function toggleOne(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(
      allSelected ? new Set() : new Set(selectableRows.map((row) => row.id))
    );
  }

  function edit(expense: FamilyExpense) {
    setEditing(expense);
    setDialogOpen(true);
  }

  async function onDelete() {
    if (!confirmDelete) return;
    const result = await deleteFamilyExpense(confirmDelete.id);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Gasto familiar eliminado.");
      router.refresh();
    }
    setConfirmDelete(null);
  }

  async function onBulkDelete() {
    setDeleting(true);
    try {
      const result = await deleteFamilyExpenses([...selected]);
      if (result.error) toast.error(result.error);
      else {
        toast.success(
          result.count === 1
            ? "1 gasto familiar eliminado."
            : `${result.count} gastos familiares eliminados.`
        );
        setSelected(new Set());
        router.refresh();
      }
    } finally {
      setDeleting(false);
      setConfirmBulk(false);
    }
  }

  return (
    <Card className="card-lift">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Gastos de {formatMonth(month)}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Recurrentes activos y gastos puntuales de la unidad familiar.
            </p>
          </div>
          <FamilyExpenseDialog defaultDate={month} />
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {selectableRows.length > 0 ? (
          selected.size > 0 ? (
            <div className="animate-pop-in flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">
                {selected.size} seleccionado{selected.size === 1 ? "" : "s"}
              </span>
              <Button
                size="sm"
                variant="destructive"
                disabled={deleting}
                onClick={() => setConfirmBulk(true)}
              >
                <Trash2 className="size-4" />
                Eliminar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={deleting}
                onClick={() => setSelected(new Set())}
              >
                <X className="size-4" />
                Cancelar
              </Button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              Seleccionar todo
            </label>
          )
        ) : (
          <span />
        )}

        {rows.length === 0 ? (
          <div className="grid place-items-center gap-2 rounded-md border border-dashed p-10 text-center">
            <p className="text-sm font-medium">No hay gastos familiares este mes.</p>
            <p className="text-xs text-muted-foreground">
              Añade un gasto puntual o configura uno recurrente.
            </p>
          </div>
        ) : (
          <div className="divide-y rounded-md border">
            {rows.map((row) => {
              const manual = row.source === "manual" ? manualById.get(row.id) : null;
              const selectedRow = selected.has(row.id);
              return (
                <div
                  key={row.id}
                  className={
                    "row-hover flex min-w-0 items-center gap-3 p-3 " +
                    (selectedRow ? "bg-primary/5" : "")
                  }
                >
                  <Checkbox
                    checked={Boolean(manual && selectedRow)}
                    disabled={!manual}
                    onCheckedChange={() => manual && toggleOne(row.id)}
                    aria-label={
                      manual
                        ? `Seleccionar ${row.name}`
                        : "Gasto recurrente gestionado desde ajustes"
                    }
                  />
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: familyCategoryColor(row.category) }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.source === "recurring" ? "Cada mes" : formatDate(row.occurred_at)}
                      {` · ${row.category}`}
                    </p>
                  </div>

                  {manual?.import_id && (
                    <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
                      Importado
                    </Badge>
                  )}

                  <div
                    className={`hidden shrink-0 items-center gap-6 sm:grid ${
                      showPerPerson ? "sm:grid-cols-2" : "sm:grid-cols-1"
                    }`}
                  >
                    <div className="min-w-20 text-right">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">€/mes</p>
                      <p className="text-sm font-semibold tabular-nums">{formatMoney(Number(row.amount))}</p>
                    </div>
                    {showPerPerson && (
                      <div className="min-w-24 text-right">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Por persona</p>
                        <p className="text-sm font-semibold tabular-nums">
                          {formatMoney(perPerson(Number(row.amount), row.people_count))}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2 sm:hidden">
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{formatMoney(Number(row.amount))}</p>
                      {showPerPerson && (
                        <p className="text-xs text-muted-foreground tabular-nums">
                          Por persona: {formatMoney(perPerson(Number(row.amount), row.people_count))}
                        </p>
                      )}
                    </div>
                  </div>

                  {manual ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0"
                            aria-label={`Más opciones para ${row.name}`}
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => edit(manual)}>
                          <Pencil />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setConfirmDelete(manual)}
                        >
                          <Trash2 />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
                      Ajustes
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-sm">
            <span className="font-medium">Total del mes</span>
            <div className="flex items-center gap-5 tabular-nums">
              <span className="font-semibold">{formatMoney(total)}</span>
              {showPerPerson && (
                <span className="text-muted-foreground">
                  Por persona: <strong className="font-semibold text-foreground">{formatMoney(totalPerPerson)}</strong>
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <FamilyExpenseDialog
        key={editing?.id ?? "family-expense-dialog"}
        defaultDate={month}
        initial={editing}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
      />

      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este gasto familiar?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará «{confirmDelete?.name}» de forma permanente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmBulk} onOpenChange={setConfirmBulk}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar {selected.size} gasto{selected.size === 1 ? "" : "s"} familiares?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán de forma permanente los gastos seleccionados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={onBulkDelete}
            >
              {deleting ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
