"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, formatMonth } from "@/lib/format";
import { deleteStartingBalance, saveStartingBalance } from "./starting-balance-actions";

export function StartingBalanceSettings({ balance, currentMonth }: {
  balance: { starts_on: string; amount: number } | null;
  currentMonth: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return <div className="grid gap-4">
    <form action={(formData) => startTransition(async () => {
      const result = await saveStartingBalance(formData);
      if (result.error) toast.error(result.error);
      else { toast.success("Saldo inicial guardado."); router.refresh(); }
    })} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div className="grid gap-2">
        <Label htmlFor="starting-balance-amount">Ahorro inicial (€)</Label>
        <Input id="starting-balance-amount" name="amount" type="number" inputMode="decimal" min="0" max="999999999999.99" step="0.01" defaultValue={balance?.amount ?? ""} placeholder="0,00" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="starting-balance-month">Mes en que ya tenías ese ahorro</Label>
        <Input id="starting-balance-month" name="starts_on" type="month" max={currentMonth.slice(0, 7)} defaultValue={balance?.starts_on.slice(0, 7) ?? currentMonth.slice(0, 7)} required />
      </div>
      <Button type="submit" disabled={pending}>Guardar</Button>
    </form>
    {balance && <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
      <span className="text-muted-foreground">Saldo inicial registrado: {formatMoney(balance.amount)} desde {formatMonth(balance.starts_on)}</span>
      <Button type="button" variant="outline" disabled={pending} onClick={() => startTransition(async () => {
        const result = await deleteStartingBalance();
        if (result.error) toast.error(result.error);
        else { toast.success("Saldo inicial eliminado."); router.refresh(); }
      })}>Quitar saldo inicial</Button>
    </div>}
  </div>;
}
