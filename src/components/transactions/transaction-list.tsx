"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown,
  FileUp,
  MoreVertical,
  Paperclip,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteTransaction,
  deleteTransactions,
} from "@/app/(app)/transactions/actions";
import { formatDate, formatMoney } from "@/lib/format";
import type { Category, Expense, Income } from "@/lib/types";
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
import { TransactionDialog } from "./transaction-dialog";

type Tx = (Expense | Income) & { categories?: Category | null };

export function TransactionList({
  kind,
  items,
  categories,
  userId,
  emptyLabel,
}: {
  kind: "expense" | "income";
  items: Tx[];
  categories: Category[];
  userId: string;
  emptyLabel: string;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tx | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Tx | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const allSelected = items.length > 0 && selected.size === items.length;

  function toggleOne(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((t) => t.id)));
  }

  async function onDelete() {
    if (!confirmDelete) return;
    const result = await deleteTransaction(kind, confirmDelete.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Eliminado.");
      router.refresh();
    }
    setConfirmDelete(null);
  }

  async function onBulkDelete() {
    setDeleting(true);
    try {
      const result = await deleteTransactions(kind, [...selected]);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          result.count === 1
            ? "1 movimiento eliminado."
            : `${result.count} movimientos eliminados.`
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
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Selección múltiple */}
        {items.length > 0 ? (
          selected.size > 0 ? (
            <div className="animate-pop-in flex items-center gap-2">
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

        {kind === "expense" ? (
          <div className="inline-flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" />
              Añadir gasto
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    size="sm"
                    variant="outline"
                    className="px-2"
                    aria-label="Más opciones de gasto"
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => {
                    setEditing(null);
                    setDialogOpen(true);
                  }}
                >
                  <Plus />
                  Nuevo gasto
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/importar")}>
                  <FileUp />
                  Importar documento
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            Añadir ingreso
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {items.map((tx) => (
            <li
              key={tx.id}
              className={
                "row-hover flex items-center gap-3 p-3 " +
                (selected.has(tx.id) ? "bg-primary/5" : "")
              }
            >
              <Checkbox
                checked={selected.has(tx.id)}
                onCheckedChange={() => toggleOne(tx.id)}
                aria-label={`Seleccionar ${tx.name}`}
              />
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: tx.categories?.color ?? "#94a3b8" }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {tx.name}
                  {"is_recurring" in tx && tx.is_recurring && (
                    <Repeat className="ml-1 inline size-3 text-muted-foreground" />
                  )}
                  {"attachment_path" in tx && tx.attachment_path && (
                    <Paperclip className="ml-1 inline size-3 text-muted-foreground" />
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDate(tx.occurred_at)}
                  {tx.categories?.name ? ` · ${tx.categories.name}` : ""}
                  {"payment_method" in tx && tx.payment_method
                    ? ` · ${tx.payment_method}`
                    : ""}
                </p>
              </div>
              {"auto_salary" in tx && tx.auto_salary && (
                <Badge
                  variant="secondary"
                  className="hidden sm:inline-flex"
                  title="Generado por el ingreso mensual de Ajustes. Si lo editas, este mes se personaliza y deja de sincronizarse."
                >
                  Automático
                </Badge>
              )}
              {tx.source === "import" && (
                <Badge variant="outline" className="hidden sm:inline-flex">
                  Importado
                </Badge>
              )}
              <span
                className={
                  "text-sm font-semibold tabular-nums " +
                  (kind === "income" ? "text-green-600 dark:text-green-400" : "")
                }
              >
                {kind === "expense" ? "−" : "+"}
                {formatMoney(tx.amount)}
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
                  <DropdownMenuItem
                    onClick={() => {
                      setEditing(tx);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setConfirmDelete(tx)}
                  >
                    <Trash2 />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      <TransactionDialog
        kind={kind}
        categories={categories}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        userId={userId}
      />

      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará «{confirmDelete?.name}» de forma permanente. Esta acción
              no se puede deshacer.
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
              ¿Eliminar {selected.size} movimiento{selected.size === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán de forma permanente los{" "}
              {kind === "expense" ? "gastos" : "ingresos"} seleccionados. Esta
              acción no se puede deshacer.
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
    </div>
  );
}
