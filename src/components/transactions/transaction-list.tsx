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
} from "lucide-react";
import { deleteTransaction } from "@/app/(app)/transactions/actions";
import { formatDate, formatMoney } from "@/lib/format";
import type { Category, Expense, Income } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="grid gap-2">
      <div className="flex justify-end">
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
            <li key={tx.id} className="row-hover flex items-center gap-3 p-3">
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
                  title="Generado por el ingreso mensual configurado en Ajustes"
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
              {"auto_salary" in tx && tx.auto_salary ? (
                // El salario automático se gestiona desde Ajustes
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  title="Este ingreso se edita desde Ajustes → Ingreso mensual"
                  onClick={() => router.push("/ajustes")}
                >
                  <Pencil className="size-4" />
                </Button>
              ) : (
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
              )}
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
    </div>
  );
}
