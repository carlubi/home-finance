"use client";

import { useTransition } from "react";
import { Pencil, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteFamilyExpense } from "@/app/(app)/familia/actions";
import { familyCategoryColor } from "@/lib/family";
import { formatDate, formatMoney, formatMonth } from "@/lib/format";
import type { FamilyDisplayExpense, FamilyExpense } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FamilyExpenseDialog } from "./family-expense-dialog";

function perPerson(amount: number, people: number) {
  return amount / people;
}

export function FamilyExpenseTable({
  month,
  rows,
  manualExpenses,
}: {
  month: string;
  rows: FamilyDisplayExpense[];
  manualExpenses: FamilyExpense[];
}) {
  const [pending, startTransition] = useTransition();
  const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);
  const totalPerPerson = rows.reduce(
    (sum, row) => sum + perPerson(Number(row.amount), row.people_count),
    0
  );
  const manualById = new Map(manualExpenses.map((expense) => [expense.id, expense]));

  function remove(id: string) {
    if (!window.confirm("¿Eliminar este gasto familiar?")) return;
    startTransition(async () => {
      const result = await deleteFamilyExpense(id);
      if (result.error) toast.error(result.error);
      else toast.success("Gasto familiar eliminado.");
    });
  }

  return (
    <Card className="card-lift">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Gastos de {formatMonth(month)}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Recurrentes activos y gastos puntuales de la unidad familiar.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <FamilyExpenseDialog defaultDate={month} />
            <Receipt className="size-5 shrink-0 text-primary" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="grid place-items-center gap-2 rounded-xl border border-dashed p-10 text-center">
            <p className="text-sm font-medium">No hay gastos familiares este mes.</p>
            <p className="text-xs text-muted-foreground">
              Añade un gasto puntual o configura uno recurrente.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concepto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Importe mensual</TableHead>
                <TableHead className="text-center">Personas</TableHead>
                <TableHead className="text-right">Por persona</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const manual = row.source === "manual" ? manualById.get(row.id) : null;
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="grid gap-0.5">
                        <span className="font-medium">{row.name}</span>
                        {row.source === "recurring" && (
                          <span className="text-xs text-muted-foreground">Recurrente</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: familyCategoryColor(row.category) }}
                        />
                        {row.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.source === "recurring" ? "Cada mes" : formatDate(row.occurred_at)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatMoney(Number(row.amount))}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        {row.people_count} {row.people_count === 1 ? "persona" : "personas"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatMoney(perPerson(Number(row.amount), row.people_count))}
                    </TableCell>
                    <TableCell>
                      {manual ? (
                        <div className="flex justify-end gap-1">
                          <FamilyExpenseDialog
                            defaultDate={month}
                            initial={manual}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Editar gasto"
                                aria-label={`Editar ${manual.name}`}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={pending}
                            title="Eliminar gasto"
                            aria-label={`Eliminar ${manual.name}`}
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => remove(manual.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="block text-right text-xs text-muted-foreground">Ajustes</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <tfoot className="border-t bg-muted/50 font-medium">
              <TableRow>
                <TableCell colSpan={3}>Total del mes</TableCell>
                <TableCell className="text-right text-base tabular-nums">
                  {formatMoney(total)}
                </TableCell>
                <TableCell />
                <TableCell className="text-right text-base tabular-nums">
                  {formatMoney(totalPerPerson)}
                </TableCell>
                <TableCell />
              </TableRow>
            </tfoot>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
