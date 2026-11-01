"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PiggyBank, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, formatMonth } from "@/lib/format";
import { currentSavingsRate, estimatedMonthlyInterest, type SavingsAccount, type SavingsInterestRate } from "@/lib/savings-account";
import { deleteSavingsInterestRate, saveSavingsAccount, saveSavingsInterestRate } from "./savings-actions";

export function SavingsAccountSettings({ account, rates, currentMonth, monthlyInterest }: {
  account: SavingsAccount | null;
  rates: SavingsInterestRate[];
  currentMonth: string;
  monthlyInterest: number;
}) {
  const [pending, startTransition] = useTransition();
  const [remunerated, setRemunerated] = useState(account?.is_remunerated ?? false);
  const rateForm = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const activeRate = account?.is_remunerated ? currentSavingsRate(rates, currentMonth) : null;

  return <div className="grid gap-5">
    <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4">
      <PiggyBank className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      <div>
        <p className="text-sm font-medium">Saldo actual registrado: {formatMoney(account?.balance ?? 0)}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">El saldo no se suma a ingresos: solo los intereses mensuales calculados a partir de él. Se usa este saldo actual para todos los meses con un tipo de interés configurado; al cambiarlo, se recalculan también los meses anteriores. La estimación no incrementa el saldo automáticamente.</p>
        {activeRate && <p className="mt-2 text-sm">Tipo vigente: <strong>{Number(activeRate.annual_rate_pct).toLocaleString("es-ES")}% anual</strong> · {activeRate.payout_frequency === "monthly" ? `Interés del mes en ingresos: ${formatMoney(monthlyInterest)}` : `Equivalente mensual estimado: ${formatMoney(estimatedMonthlyInterest(account?.balance ?? 0, Number(activeRate.annual_rate_pct)))} (abono anual)`}</p>}
      </div>
    </div>

    <form action={(formData) => startTransition(async () => {
      const result = await saveSavingsAccount(formData);
      if (result.error) toast.error(result.error);
      else { toast.success("Saldo guardado."); router.refresh(); }
    })} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div className="grid gap-2">
        <Label htmlFor="savings-balance">Saldo en la cuenta (€)</Label>
        <Input id="savings-balance" name="balance" type="number" inputMode="decimal" min="0" step="0.01" defaultValue={account?.balance ?? 0} required />
      </div>
      <Button type="submit" disabled={pending}>Guardar saldo</Button>
      <label className="flex min-h-9 items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="is_remunerated" checked={remunerated} onChange={(event) => setRemunerated(event.target.checked)} className="size-4 accent-primary" />
        Cuenta remunerada
      </label>
    </form>

    {account?.is_remunerated && <div className="grid gap-4 border-t pt-5">
      <div>
        <h3 className="font-semibold">Historial de intereses</h3>
        <p className="mt-1 text-sm text-muted-foreground">Indica qué porcentaje anual se aplicaba en cada mes. El siguiente tipo sustituye al anterior desde su mes de inicio.</p>
      </div>
      <form ref={rateForm} action={(formData) => startTransition(async () => {
        const result = await saveSavingsInterestRate(formData);
        if (result.error) toast.error(result.error);
        else { rateForm.current?.reset(); toast.success("Tipo de interés guardado."); router.refresh(); }
      })} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <div className="grid gap-2"><Label htmlFor="rate-start">Desde el mes</Label><Input id="rate-start" name="starts_on" type="month" defaultValue={currentMonth.slice(0, 7)} required /></div>
        <div className="grid gap-2"><Label htmlFor="rate-pct">Interés anual (%)</Label><Input id="rate-pct" name="annual_rate_pct" type="number" inputMode="decimal" min="0" max="100" step="0.0001" placeholder="2,50" required /></div>
        <div className="grid gap-2"><Label htmlFor="rate-frequency">Abono de intereses</Label><select id="rate-frequency" name="payout_frequency" defaultValue="monthly" className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"><option value="monthly">Cada mes</option><option value="annual">Una vez al año</option></select></div>
        <Button type="submit" disabled={pending}>Añadir interés</Button>
      </form>
      {rates.length > 0 ? <ul className="grid gap-2">
        {rates.map((rate) => <li key={rate.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-sm">
          <span className="min-w-32 font-medium">Desde {formatMonth(rate.starts_on)}</span>
          <span className="tabular-nums">{Number(rate.annual_rate_pct).toLocaleString("es-ES")}% anual</span>
          <span className="text-muted-foreground">· abono {rate.payout_frequency === "monthly" ? "mensual" : "anual"}</span>
          {activeRate?.id === rate.id && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Vigente</span>}
          <Button type="button" variant="ghost" size="icon" className="ml-auto size-8" aria-label={`Eliminar interés desde ${formatMonth(rate.starts_on)}`} disabled={pending} onClick={() => startTransition(async () => {
            const result = await deleteSavingsInterestRate(rate.id);
            if (result.error) toast.error(result.error);
            else router.refresh();
          })}><Trash2 className="size-4" /></Button>
        </li>)}
      </ul> : <p className="text-sm text-muted-foreground">Aún no has añadido ningún tipo de interés.</p>}
      <p className="text-xs text-muted-foreground">Con abono mensual, el interés estimado bruto se añade automáticamente a Ingresos: saldo vigente × tipo anual ÷ 12. No lo registres otra vez manualmente. Con abono anual, registra el cobro cuando lo recibas. El cálculo supone que el saldo permanece igual durante todo el mes.</p>
    </div>}
  </div>;
}
