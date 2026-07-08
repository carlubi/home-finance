"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Check, RotateCcw, Trash2 } from "lucide-react";
import type { Category, ExtractedTransaction } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import {
  confirmImport,
  discardExtractedRow,
  restoreExtractedRow,
  updateExtractedRow,
} from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ReviewTable({
  importId,
  rows: initialRows,
  categories,
  duplicates,
  confirmed,
}: {
  importId: string;
  rows: ExtractedTransaction[];
  categories: Category[];
  duplicates: string[];
  confirmed: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [pending, startTransition] = useTransition();
  const duplicateSet = new Set(duplicates);

  const pendingRows = rows.filter((r) => r.status === "pending");
  const total = pendingRows.reduce(
    (s, r) => s + (r.kind === "expense" ? -1 : 1) * Number(r.amount),
    0
  );

  function patchRow(id: string, patch: Partial<ExtractedTransaction>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function saveRow(row: ExtractedTransaction) {
    startTransition(async () => {
      const r = await updateExtractedRow({
        id: row.id,
        name: row.name,
        amount: Number(row.amount),
        occurred_at: row.occurred_at,
        suggested_category_id: row.suggested_category_id,
        kind: row.kind,
      });
      if (r.error) toast.error(r.error);
    });
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        La IA no detectó transacciones en este archivo.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      {confirmed && (
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <Check className="mr-1 inline size-4 text-green-600" />
          Esta importación ya fue confirmada.
        </div>
      )}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2 font-medium">Tipo</th>
              <th className="p-2 font-medium">Concepto</th>
              <th className="p-2 font-medium">Categoría</th>
              <th className="p-2 font-medium">Fecha real</th>
              <th className="p-2 text-right font-medium">Importe</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const discarded = row.status === "discarded";
              const rowCategories = categories.filter((c) => c.kind === row.kind);
              return (
                <tr
                  key={row.id}
                  className={"border-t " + (discarded ? "opacity-45" : "")}
                >
                  <td className="p-2">
                    <Badge
                      variant={row.kind === "expense" ? "outline" : "secondary"}
                    >
                      {row.kind === "expense" ? "Gasto" : "Ingreso"}
                    </Badge>
                    {duplicateSet.has(row.id) && (
                      <span
                        className="mt-1 flex items-center gap-1 text-[10px] text-amber-600"
                        title="Ya existe un movimiento con el mismo importe y fecha"
                      >
                        <AlertTriangle className="size-3" />
                        Posible duplicado
                      </span>
                    )}
                  </td>
                  <td className="p-2">
                    <Input
                      value={row.name}
                      disabled={discarded || confirmed}
                      className="h-8 min-w-40"
                      onChange={(e) => patchRow(row.id, { name: e.target.value })}
                      onBlur={() => saveRow(row)}
                    />
                  </td>
                  <td className="p-2">
                    <Select
                      value={row.suggested_category_id ?? undefined}
                      disabled={discarded || confirmed}
                      onValueChange={(v) => {
                        patchRow(row.id, { suggested_category_id: String(v) });
                        saveRow({ ...row, suggested_category_id: String(v) });
                      }}
                      items={rowCategories.map((c) => ({
                        value: c.id,
                        label: c.name,
                      }))}
                    >
                      <SelectTrigger size="sm" className="min-w-32">
                        <SelectValue placeholder="Categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {rowCategories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2">
                    <Input
                      type="date"
                      value={row.occurred_at}
                      disabled={discarded || confirmed}
                      className="h-8 w-36"
                      onChange={(e) =>
                        patchRow(row.id, { occurred_at: e.target.value })
                      }
                      onBlur={() => saveRow(row)}
                    />
                  </td>
                  <td className="p-2 text-right">
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={row.amount}
                      disabled={discarded || confirmed}
                      className="h-8 w-24 text-right"
                      onChange={(e) =>
                        patchRow(row.id, {
                          amount: Number(e.target.value),
                        })
                      }
                      onBlur={() => saveRow(row)}
                    />
                  </td>
                  <td className="p-2 text-right">
                    {!confirmed &&
                      (discarded ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title="Restaurar"
                          onClick={() =>
                            startTransition(async () => {
                              await restoreExtractedRow(row.id);
                              patchRow(row.id, { status: "pending" });
                            })
                          }
                        >
                          <RotateCcw className="size-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title="Descartar"
                          onClick={() =>
                            startTransition(async () => {
                              await discardExtractedRow(row.id);
                              patchRow(row.id, { status: "discarded" });
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!confirmed && (
        <div className="flex items-center justify-between rounded-md border p-3">
          <p className="text-sm text-muted-foreground">
            {pendingRows.length} transacciones se importarán · balance{" "}
            <span className="font-medium text-foreground">{formatMoney(total)}</span>
          </p>
          <Button
            disabled={pending || pendingRows.length === 0}
            onClick={() =>
              startTransition(async () => {
                const r = await confirmImport(importId);
                if (r.error) toast.error(r.error);
                else {
                  toast.success(`Importadas ${r.count} transacciones.`);
                  router.push("/");
                }
              })
            }
          >
            <Check className="size-4" />
            Confirmar importación
          </Button>
        </div>
      )}
    </div>
  );
}
