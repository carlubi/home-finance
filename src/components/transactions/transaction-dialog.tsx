"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { saveTransaction } from "@/app/(app)/transactions/actions";
import type { Category, Expense, Income } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const PAYMENT_METHODS = [
  "Tarjeta",
  "Efectivo",
  "Transferencia",
  "Domiciliación",
  "Bizum",
  "Otro",
];

export function TransactionDialog({
  kind,
  categories,
  open,
  onOpenChange,
  initial,
  userId,
}: {
  kind: "expense" | "income";
  categories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: (Expense & Income) | Expense | Income | null;
  userId: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const isExpense = kind === "expense";
  const initialExpense = initial as Expense | null | undefined;
  const initialIncome = initial as Income | null | undefined;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const form = new FormData(e.currentTarget);

      let attachmentPath = initialExpense?.attachment_path ?? null;
      const file = form.get("attachment") as File | null;
      if (isExpense && file && file.size > 0) {
        const supabase = createClient();
        const path = `${userId}/attachments/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage
          .from("documents")
          .upload(path, file);
        if (error) {
          toast.error("No se pudo subir el adjunto.");
          return;
        }
        attachmentPath = path;
      }

      const categoryValue = String(form.get("category") ?? "");
      const result = await saveTransaction({
        id: initial?.id,
        kind,
        name: String(form.get("name") ?? ""),
        category_id: categoryValue || null,
        amount: Number(form.get("amount")),
        occurred_at: String(form.get("occurred_at") ?? ""),
        payment_method: isExpense ? String(form.get("payment_method") ?? "") || null : null,
        is_recurring: !isExpense ? form.get("is_recurring") === "on" : undefined,
        notes: String(form.get("notes") ?? "") || null,
        attachment_path: attachmentPath,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(initial ? "Movimiento actualizado." : "Movimiento guardado.");
        onOpenChange(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initial
              ? isExpense
                ? "Editar gasto"
                : "Editar ingreso"
              : isExpense
                ? "Nuevo gasto"
                : "Nuevo ingreso"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={initial?.name ?? ""}
              placeholder={isExpense ? "Compra supermercado" : "Nómina"}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="amount">Importe (€)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                defaultValue={initial?.amount ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="occurred_at">Fecha real</Label>
              <Input
                id="occurred_at"
                name="occurred_at"
                type="date"
                required
                defaultValue={
                  initial?.occurred_at ?? new Date().toISOString().slice(0, 10)
                }
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Categoría</Label>
            <Select
              name="category"
              defaultValue={initial?.category_id ?? undefined}
              items={categories.map((c) => ({ value: c.id, label: c.name }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isExpense ? (
            <>
              <div className="grid gap-2">
                <Label>Método de pago</Label>
                <Select
                  name="payment_method"
                  defaultValue={initialExpense?.payment_method ?? undefined}
                  items={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un método" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="attachment">Adjunto (opcional)</Label>
                <Input id="attachment" name="attachment" type="file" />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="is_recurring" className="font-normal">
                Ingreso recurrente (se repite cada mes)
              </Label>
              <Switch
                id="is_recurring"
                name="is_recurring"
                defaultChecked={initialIncome?.is_recurring ?? false}
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea id="notes" name="notes" defaultValue={initial?.notes ?? ""} />
          </div>
          {!isExpense && initialIncome?.auto_salary && (
            <p className="rounded-md border border-primary/30 bg-primary/5 p-2.5 text-xs text-muted-foreground">
              Este ingreso viene del ingreso mensual de Ajustes. Al guardar,
              <strong> este mes queda personalizado</strong>: futuros cambios en
              Ajustes ya no lo modificarán. Los demás meses no se ven afectados.
            </p>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
