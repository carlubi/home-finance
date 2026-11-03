"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PiggyBank, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addMonths, formatMoney, formatMonth } from "@/lib/format";
import { currentSavingsRate, type RemuneratedAccount, type SavingsAccountInterest, type SavingsInterestRate } from "@/lib/savings-account";
import {
  deleteRemuneratedAccount, deleteSavingsAccountAmount, deleteSavingsInterestRate,
  saveRemuneratedAccount, saveSavingsAccountAmount, saveSavingsInterestRate,
  updateSavingsAccountAmount, updateSavingsInterestRate,
} from "./savings-actions";

type ActionResult = { error?: string; ok?: boolean };

function ratePeriod(rate: SavingsInterestRate, next?: SavingsInterestRate) {
  const inferredEnd = next ? addMonths(next.starts_on, -1) : null;
  const end = rate.ends_on && inferredEnd
    ? rate.ends_on < inferredEnd ? rate.ends_on : inferredEnd
    : rate.ends_on ?? inferredEnd;
  return `${formatMonth(rate.starts_on)}${end ? ` – ${formatMonth(end)}` : " en adelante"}`;
}

export function SavingsAccountSettings({ accounts, currentMonth, interests }: {
  accounts: RemuneratedAccount[];
  currentMonth: string;
  interests: SavingsAccountInterest[];
}) {
  const [pending, startTransition] = useTransition();
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [editingAmountId, setEditingAmountId] = useState<string | null>(null);
  const router = useRouter();
  const hasRemainingAccount = accounts.some((account) => account.active && account.allocation_mode === "remaining_savings");

  function submit(action: (data: FormData) => Promise<ActionResult>, success: string, onSuccess?: () => void) {
    return (formData: FormData) => startTransition(async () => {
      const result = await action(formData);
      if (result.error) toast.error(result.error);
      else { onSuccess?.(); toast.success(success); router.refresh(); }
    });
  }

  function remove(action: () => Promise<ActionResult>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (result.error) toast.error(result.error);
      else { toast.success(success); router.refresh(); }
    });
  }

  return <div className="grid gap-5">
    <div className="flex items-start gap-3 rounded-lg border border-border-primary bg-bg-tertiary/60 p-4">
      <PiggyBank className="mt-0.5 size-4 shrink-0 text-text-secondary" aria-hidden />
      <div className="grid gap-1 text-sm">
        <p className="font-medium">Una cuenta por banco o producto</p>
        <p className="text-xs leading-5 text-muted-foreground">Cada cuenta tiene sus propios tipos de interés por mes. Puedes aplicar el tipo a un importe concreto de ese banco o al ahorro acumulado que no hayas asignado a otras cuentas. El saldo inicial se indica en Configuración.</p>
      </div>
    </div>

    <form action={submit(saveRemuneratedAccount, "Cuenta añadida.")} className="grid gap-3 rounded-lg border border-dashed p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div className="grid gap-2"><Label htmlFor="new-remunerated-name">Banco o nombre de la cuenta</Label><Input id="new-remunerated-name" name="name" placeholder="Trade Republic" maxLength={100} required /></div>
      <div className="grid gap-2"><Label htmlFor="new-remunerated-mode">¿Sobre qué importe genera intereses?</Label><select id="new-remunerated-mode" name="allocation_mode" defaultValue={hasRemainingAccount ? "specified_amount" : "remaining_savings"} className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"><option value="remaining_savings" disabled={hasRemainingAccount}>Todo el ahorro disponible</option><option value="specified_amount">Un importe concreto</option></select></div>
      <input type="hidden" name="active" value="on" />
      <Button type="submit" disabled={pending}>Añadir cuenta</Button>
    </form>

    {accounts.length === 0 && <p className="text-sm text-muted-foreground">Añade tu primera cuenta para indicar sus tipos de interés y los meses en que se aplican.</p>}

    {accounts.map((account) => {
      const rates = [...account.remunerated_account_rates].sort((a, b) => b.starts_on.localeCompare(a.starts_on));
      const amounts = [...account.remunerated_account_amounts].sort((a, b) => b.starts_on.localeCompare(a.starts_on));
      const activeRate = account.active ? currentSavingsRate(rates, currentMonth) : null;
      const interestThisMonth = interests.filter((item) => item.account_id === account.id).reduce((sum, item) => sum + Number(item.amount), 0);
      return <section key={account.id} className="grid gap-4 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">{account.name}</h3>
          <Button type="button" variant="ghost" size="icon" aria-label={`Eliminar ${account.name}`} disabled={pending} onClick={() => {
            if (window.confirm(`¿Eliminar ${account.name} y su historial de tipos e importes?`)) remove(() => deleteRemuneratedAccount(account.id), "Cuenta eliminada.");
          }}><Trash2 className="size-4" /></Button>
        </div>

        <form action={submit(saveRemuneratedAccount, "Cuenta actualizada.")} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <p className="text-sm font-medium sm:col-span-3">Editar cuenta</p>
          <input type="hidden" name="id" value={account.id} />
          <div className="grid gap-2"><Label htmlFor={`name-${account.id}`}>Nombre</Label><Input id={`name-${account.id}`} name="name" defaultValue={account.name} maxLength={100} required /></div>
          <div className="grid gap-2"><Label htmlFor={`mode-${account.id}`}>Base de cálculo</Label><select id={`mode-${account.id}`} name="allocation_mode" defaultValue={account.allocation_mode} className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"><option value="remaining_savings" disabled={hasRemainingAccount && account.allocation_mode !== "remaining_savings"}>Todo el ahorro disponible</option><option value="specified_amount">Un importe concreto</option></select></div>
          <Button type="submit" variant="outline" disabled={pending}>Guardar cuenta</Button>
          <label className="flex items-center gap-2 text-sm sm:col-span-3"><input type="checkbox" name="active" defaultChecked={account.active} className="size-4 accent-primary" />Incluir esta cuenta en los cálculos históricos y actuales</label>
        </form>

        <div className="grid gap-3 border-t pt-4">
          <div><h4 className="text-sm font-medium">Tipos de interés por periodo</h4><p className="text-xs text-muted-foreground">El porcentaje es anual y se abona cada mes. Puedes indicar cuándo termina; un tipo nuevo también sustituye al anterior.</p></div>
          {activeRate && <p className="text-sm">Tipo vigente: <strong>{Number(activeRate.annual_rate_pct).toLocaleString("es-ES")}%</strong> · Intereses de este mes: <strong>{formatMoney(interestThisMonth)}</strong></p>}
          <form action={submit(saveSavingsInterestRate, "Tipo de interés guardado.")} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
            <input type="hidden" name="account_id" value={account.id} />
            <div className="grid gap-2"><Label htmlFor={`rate-month-${account.id}`}>Desde el mes</Label><Input id={`rate-month-${account.id}`} name="starts_on" type="month" defaultValue={currentMonth.slice(0, 7)} required /></div>
            <div className="grid gap-2"><Label htmlFor={`rate-end-${account.id}`}>Hasta el mes (opcional)</Label><Input id={`rate-end-${account.id}`} name="ends_on" type="month" /></div>
            <div className="grid gap-2"><Label htmlFor={`rate-pct-${account.id}`}>Interés anual (%)</Label><Input id={`rate-pct-${account.id}`} name="annual_rate_pct" type="text" inputMode="decimal" placeholder="2,50" required /></div>
            <Button type="submit" disabled={pending}>Añadir tipo</Button>
          </form>
          {rates.length > 0 ? <ul className="grid gap-2">{rates.map((rate, index) => <li key={rate.id} className="grid gap-3 rounded-lg border px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{ratePeriod(rate, rates[index - 1])}</span>
              <span className="tabular-nums">{Number(rate.annual_rate_pct).toLocaleString("es-ES")}% anual</span>
              <Button type="button" variant="outline" size="sm" className="ml-auto" disabled={pending} onClick={() => setEditingRateId(editingRateId === rate.id ? null : rate.id)}>{editingRateId === rate.id ? "Cancelar" : "Editar"}</Button>
              <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Eliminar tipo desde ${formatMonth(rate.starts_on)}`} disabled={pending} onClick={() => remove(() => deleteSavingsInterestRate(rate.id, account.id), "Tipo eliminado.")}><Trash2 className="size-4" /></Button>
            </div>
            {editingRateId === rate.id && <form action={submit(updateSavingsInterestRate, "Tipo de interés actualizado.", () => setEditingRateId(null))} className="grid gap-3 border-t pt-3 sm:grid-cols-2 xl:grid-cols-4">
              <input type="hidden" name="id" value={rate.id} />
              <div className="grid gap-2"><Label htmlFor={`edit-rate-account-${rate.id}`}>Cuenta</Label><select id={`edit-rate-account-${rate.id}`} name="account_id" defaultValue={account.id} className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm">{accounts.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></div>
              <div className="grid gap-2"><Label htmlFor={`edit-rate-start-${rate.id}`}>Desde el mes</Label><Input id={`edit-rate-start-${rate.id}`} name="starts_on" type="month" defaultValue={rate.starts_on.slice(0, 7)} required /></div>
              <div className="grid gap-2"><Label htmlFor={`edit-rate-end-${rate.id}`}>Hasta el mes</Label><Input id={`edit-rate-end-${rate.id}`} name="ends_on" type="month" defaultValue={rate.ends_on?.slice(0, 7) ?? ""} /></div>
              <div className="grid gap-2"><Label htmlFor={`edit-rate-pct-${rate.id}`}>Interés anual (%)</Label><Input id={`edit-rate-pct-${rate.id}`} name="annual_rate_pct" type="text" inputMode="decimal" defaultValue={String(rate.annual_rate_pct)} required /></div>
              <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-4"><Button type="submit" disabled={pending}>Guardar cambios</Button><Button type="button" variant="ghost" onClick={() => setEditingRateId(null)}>Cancelar</Button></div>
            </form>}
          </li>)}</ul> : <p className="text-xs text-muted-foreground">Todavía no has indicado ningún porcentaje para esta cuenta.</p>}
        </div>

        {account.allocation_mode === "specified_amount" && <div className="grid gap-3 border-t pt-4">
          <div><h4 className="text-sm font-medium">Saldo remunerado en esta cuenta</h4><p className="text-xs text-muted-foreground">Indica el saldo real que tenía la cuenta en cada mes de cambio. Entre cambios, los intereses mensuales se suman automáticamente a ese saldo.</p></div>
          <form action={submit(saveSavingsAccountAmount, "Saldo guardado.")} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <input type="hidden" name="account_id" value={account.id} />
            <div className="grid gap-2"><Label htmlFor={`amount-month-${account.id}`}>Desde el mes</Label><Input id={`amount-month-${account.id}`} name="starts_on" type="month" defaultValue={currentMonth.slice(0, 7)} required /></div>
            <div className="grid gap-2"><Label htmlFor={`amount-value-${account.id}`}>Importe (€)</Label><Input id={`amount-value-${account.id}`} name="amount" type="text" inputMode="decimal" placeholder="5.000,00" required /></div>
            <Button type="submit" disabled={pending}>Añadir saldo</Button>
          </form>
          {amounts.length > 0 ? <ul className="grid gap-2">{amounts.map((item, index) => <li key={item.id} className="grid gap-3 rounded-lg border px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{formatMonth(item.starts_on)}{index > 0 ? ` – ${formatMonth(addMonths(amounts[index - 1].starts_on, -1))}` : " en adelante"}</span>
              <span className="tabular-nums">{formatMoney(Number(item.amount))}</span>
              <Button type="button" variant="outline" size="sm" className="ml-auto" disabled={pending} onClick={() => setEditingAmountId(editingAmountId === item.id ? null : item.id)}>{editingAmountId === item.id ? "Cancelar" : "Editar"}</Button>
              <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Eliminar importe desde ${formatMonth(item.starts_on)}`} disabled={pending} onClick={() => remove(() => deleteSavingsAccountAmount(item.id, account.id), "Importe eliminado.")}><Trash2 className="size-4" /></Button>
            </div>
            {editingAmountId === item.id && <form action={submit(updateSavingsAccountAmount, "Saldo actualizado.", () => setEditingAmountId(null))} className="grid gap-3 border-t pt-3 sm:grid-cols-3">
              <input type="hidden" name="id" value={item.id} />
              <div className="grid gap-2"><Label htmlFor={`edit-amount-account-${item.id}`}>Cuenta</Label><select id={`edit-amount-account-${item.id}`} name="account_id" defaultValue={account.id} className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm">{accounts.filter((option) => option.allocation_mode === "specified_amount").map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></div>
              <div className="grid gap-2"><Label htmlFor={`edit-amount-start-${item.id}`}>Desde el mes</Label><Input id={`edit-amount-start-${item.id}`} name="starts_on" type="month" defaultValue={item.starts_on.slice(0, 7)} required /></div>
              <div className="grid gap-2"><Label htmlFor={`edit-amount-value-${item.id}`}>Saldo (€)</Label><Input id={`edit-amount-value-${item.id}`} name="amount" type="text" inputMode="decimal" defaultValue={String(item.amount)} required /></div>
              <div className="flex flex-wrap gap-2 sm:col-span-3"><Button type="submit" disabled={pending}>Guardar cambios</Button><Button type="button" variant="ghost" onClick={() => setEditingAmountId(null)}>Cancelar</Button></div>
            </form>}
          </li>)}</ul> : <p className="text-xs text-muted-foreground">Indica el primer importe y su mes para empezar a calcular intereses.</p>}
        </div>}
      </section>;
    })}
  </div>;
}
