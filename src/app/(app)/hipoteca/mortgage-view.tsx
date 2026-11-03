"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDownRight, CalendarDays, CircleHelp, Landmark, TrendingDown } from "lucide-react";
import { formatDate, formatMoney, parseMoneyInput } from "@/lib/format";
import { projectMortgage, recordedTotals, roundCents, type AmortizationMode, type MortgageTerms, type MortgagePayment } from "@/lib/mortgage";
import { saveMortgageShare } from "./actions";
import { MortgageConfiguration } from "./mortgage-configuration";

function formatPercent(value: number) {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(value) + " %";
}

function formatProjectedMonth(month: string) {
  const [year, number] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, number - 1, 1)));
}

function InfoCard({ label, value, detail, tone = "default" }: { label: string; value: string; detail: string; tone?: "default" | "violet" }) {
  return (
    <div className="rounded-lg border border-border-primary bg-bg-secondary p-4 linear-shadow-sm">
      <p className="flex items-center gap-1.5 text-[13px] font-medium text-text-secondary">{tone === "violet" && <span className="size-1.5 rounded-full bg-accent" aria-hidden />}{label}</p>
      <p className="mt-2 text-2xl font-medium text-text-primary">{value}</p>
      <p className="mt-1 text-xs text-text-tertiary">{detail}</p>
    </div>
  );
}

export function MortgageView({ mortgage, recordedPayments }: { mortgage: MortgageTerms; recordedPayments: MortgagePayment[] }) {
  const totals = recordedTotals(mortgage, recordedPayments);
  const percentPaid = totals.capital / mortgage.principal * 100;
  const fixedStage = mortgage.rateKind === "fixed" || (mortgage.rateKind === "mixed" && new Date().toISOString().slice(0, 10) <= mortgage.fixedUntil);
  const kindLabel = { fixed: "Hipoteca fija", mixed: "Hipoteca mixta", variable: "Hipoteca variable" }[mortgage.rateKind];
  const [euriborInput, setEuriborInput] = useState("2,00");
  const [extraInput, setExtraInput] = useState("5.000");
  const [mode, setMode] = useState<AmortizationMode>("term");
  const [firstSharePercent, setFirstSharePercent] = useState(mortgage.firstSharePercent);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const euribor = parseMoneyInput(euriborInput);
  const extra = parseMoneyInput(extraInput);
  const validEuribor = mortgage.rateKind === "fixed" || (euribor !== null && euribor >= -mortgage.spread && euribor <= 15);
  const validExtra = extra !== null && extra >= 50 && extra <= totals.balance;
  const projection = useMemo(() => validEuribor ? projectMortgage(mortgage, euribor ?? 0) : null, [mortgage, euribor, validEuribor]);
  const amortization = useMemo(() => validEuribor && validExtra ? projectMortgage(mortgage, euribor ?? 0, extra!, mode) : null, [mortgage, euribor, extra, mode, validEuribor, validExtra]);
  const shareFirst = roundCents(mortgage.currentPayment * firstSharePercent / 100);
  const shareSecond = roundCents(mortgage.currentPayment - shareFirst);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-8">
      <header className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="eyebrow mb-1 flex items-center gap-1.5"><Landmark className="size-3.5" /> {mortgage.lender} · {kindLabel}</p>
            <h1 className="text-2xl font-medium text-text-primary">Tu hipoteca</h1>
            <p className="mt-1 max-w-2xl text-sm text-text-secondary">Seguimiento del capital, los intereses y las cuotas según los datos registrados hasta el {formatDate(mortgage.lastRecordedOn)}.</p>
          </div>
          <MortgageConfiguration mortgage={mortgage} />
        </div>
        <dl className="grid overflow-hidden rounded-lg border border-border-primary bg-bg-secondary text-sm sm:grid-cols-3 sm:divide-x sm:divide-border-primary max-sm:divide-y max-sm:divide-border-primary">
          <div className="px-4 py-3"><dt className="text-xs text-text-tertiary">Precio de compra</dt><dd className="mt-0.5 text-base font-medium tabular-nums">{formatMoney(mortgage.purchasePrice)}</dd></div>
          <div className="px-4 py-3"><dt className="text-xs text-text-tertiary">Financiación · {formatPercent(mortgage.principal / mortgage.purchasePrice * 100)}</dt><dd className="mt-0.5 text-base font-medium tabular-nums">{formatMoney(mortgage.principal)}</dd></div>
          <div className="px-4 py-3"><dt className="text-xs text-text-tertiary">Firma del préstamo</dt><dd className="mt-0.5 text-base font-medium">{formatDate(mortgage.startedOn)}</dd></div>
        </dl>
      </header>

      <section aria-labelledby="progress-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="eyebrow">Situación real</p><h2 id="progress-heading" className="mt-0.5 text-lg font-medium">Así va el préstamo</h2></div><span className="text-xs text-muted-foreground">Último movimiento: {formatDate(mortgage.lastRecordedOn)}</span></div>
        <div className="grid gap-3 md:grid-cols-3">
          <InfoCard label="Capital amortizado" value={formatMoney(totals.capital)} detail={`${formatPercent(percentPaid)} del préstamo inicial`} tone="violet" />
          <InfoCard label="Intereses pagados" value={totals.interest === null ? "Sin datos" : formatMoney(totals.interest)} detail={totals.interest === null ? "Introduce el total abonado para calcularlos" : "Total abonado menos capital amortizado"} />
          <InfoCard label="Capital pendiente" value={formatMoney(totals.balance)} detail={`Saldo tras la cuota del ${formatDate(mortgage.lastRecordedOn)}`} />
        </div>
        <div className="rounded-lg border border-border-primary bg-bg-secondary p-5 linear-shadow-sm">
          <div className="flex justify-between gap-3 text-sm"><strong>Capital devuelto</strong><span className="font-semibold tabular-nums">{formatPercent(percentPaid)}</span></div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg-quaternary" role="progressbar" aria-label="Capital amortizado" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(percentPaid.toFixed(2))}><div className="h-full min-w-1 rounded-full bg-accent" style={{ width: `${percentPaid}%` }} /></div>
          <div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>{formatMoney(totals.capital)} amortizados</span><span>{formatMoney(mortgage.principal)} iniciales</span></div>
          <p className="mt-4 border-t border-border-primary pt-4 text-[13px] text-text-secondary">{totals.paid === null ? "Aún no se ha indicado el total abonado." : <>Total abonado hasta la fecha: <strong className="text-foreground">{formatMoney(totals.paid)}</strong>.</>} {recordedPayments.length > 0 && <>Hay {recordedPayments.length} cuotas desglosadas; la primera fue de <strong className="text-foreground">{formatMoney(recordedPayments[0].payment)}</strong>.</>}</p>
        </div>
      </section>

      <section className="rounded-lg border border-border-primary bg-bg-secondary p-5 linear-shadow-sm"><div className="flex items-center gap-2"><CalendarDays className="size-4 text-text-tertiary" /><h2 className="text-lg font-medium">Fechas y condiciones</h2></div><div className="mt-5 grid gap-4 text-sm sm:grid-cols-3"><div><span className="text-muted-foreground">Firma</span><p className="mt-0.5 font-medium">{formatDate(mortgage.startedOn)}</p></div>{mortgage.rateKind === "mixed" && <div><span className="text-muted-foreground">Fin del tramo fijo</span><p className="mt-0.5 font-medium">{formatDate(mortgage.fixedUntil)}</p></div>}<div><span className="text-muted-foreground">Fin indicado por {mortgage.lender}</span><p className="mt-0.5 font-medium">{formatDate(mortgage.endsOn)}</p></div></div></section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-border-primary bg-bg-secondary p-5 linear-shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><p className="eyebrow">Cuota actual</p><h2 className="mt-0.5 text-lg font-medium">{fixedStage ? "Tramo fijo" : "Tramo variable"}</h2></div><span className="inline-flex h-5 items-center rounded-full border border-green/20 bg-green/10 px-2 text-xs font-medium text-green">En vigor</span></div>
          <div className="mt-6 flex items-baseline gap-2"><strong className="text-3xl font-semibold">{formatMoney(mortgage.currentPayment)}</strong><span className="text-muted-foreground">/ mes</span></div>
          {fixedStage ? <p className="mt-2 text-sm text-muted-foreground">Tipo fijo del {formatPercent(mortgage.fixedRate)} hasta el {formatDate(mortgage.fixedUntil)}.</p> : <p className="mt-2 text-sm text-muted-foreground">Euríbor + {formatPercent(mortgage.spread)} según la última revisión de tu entidad.</p>}
          {mortgage.rateKind === "mixed" && <div className="mt-6 grid gap-3 rounded-md border border-border-primary bg-bg-tertiary p-4 text-sm sm:grid-cols-2"><div><span className="text-muted-foreground">Tramo variable desde {formatDate(mortgage.variableFrom)}</span><strong className="mt-1 block">Euríbor + {formatPercent(mortgage.spread)}</strong></div><div><span className="text-muted-foreground">Fecha final</span><strong className="mt-1 block">{formatDate(mortgage.endsOn)}</strong></div></div>}
        </div>
        <div className="rounded-lg border border-border-primary bg-bg-secondary p-5 linear-shadow-sm">
          <p className="eyebrow">Aportación mensual</p><h2 className="mt-0.5 text-lg font-medium">Reparto entre titulares</h2>
          <p className="mt-2 text-sm text-muted-foreground">Reparto de la cuota actual entre los titulares.</p>
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-3"><span>{mortgage.firstBorrower}</span><strong className="text-lg font-medium tabular-nums">{formatMoney(shareFirst)}</strong></div>
            {mortgage.secondBorrower && <><div className="flex items-center justify-between gap-3"><span>{mortgage.secondBorrower}</span><strong className="text-lg font-medium tabular-nums">{formatMoney(shareSecond)}</strong></div>
            <label htmlFor="first-share" className="block pt-2 text-sm font-medium">Porcentaje de {mortgage.firstBorrower}: {firstSharePercent} %</label>
            <input id="first-share" type="range" min="0" max="100" step="1" value={firstSharePercent} onChange={(event) => setFirstSharePercent(Number(event.target.value))} className="w-full accent-accent" />
            <div className="flex justify-between text-xs text-muted-foreground"><span>0 %</span><span>100 %</span></div>
            <button type="button" disabled={pending || firstSharePercent === mortgage.firstSharePercent} onClick={() => startTransition(async () => { const result = await saveMortgageShare(firstSharePercent); if (result.error) toast.error(result.error); else { toast.success("Reparto guardado para la unidad familiar"); router.refresh(); } })} className="min-h-8 rounded-lg bg-accent px-3 text-sm font-medium text-white transition-fast outline-none hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:pointer-events-none disabled:opacity-50 max-md:min-h-11">{pending ? "Guardando…" : "Guardar reparto"}</button></>}
          </div>
          <p className="mt-5 text-xs text-muted-foreground">El reparto guardado se verá en las cuentas de esta unidad familiar.</p>
        </div>
      </section>

      {recordedPayments.length > 0 && <details className="rounded-lg border border-border-primary bg-bg-secondary p-5 linear-shadow-sm"><summary className="cursor-pointer rounded-sm text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent">Ver cuotas registradas ({recordedPayments.length})</summary><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[440px] text-left text-sm"><thead className="border-b border-border-primary text-xs text-text-secondary"><tr><th className="pb-3 font-medium">Mes</th><th className="pb-3 text-right font-medium">Cuota cobrada</th><th className="pb-3 text-right font-medium">Capital pendiente</th></tr></thead><tbody>{[...recordedPayments].reverse().map((payment) => <tr key={payment.month} className="border-b border-border-primary last:border-0"><td className="py-3 capitalize">{formatProjectedMonth(payment.month)}</td><td className="py-3 text-right tabular-nums">{formatMoney(payment.payment)}</td><td className="py-3 text-right tabular-nums">{formatMoney(payment.balance)}</td></tr>)}</tbody></table></div></details>}

      <section className="space-y-4" aria-labelledby="simulators-heading"><div><p className="eyebrow">Planificación</p><h2 id="simulators-heading" className="mt-0.5 text-lg font-medium">Explora escenarios</h2></div>
          <div className="grid gap-4 lg:grid-cols-2">
          {mortgage.rateKind !== "fixed" ? <div className="rounded-lg border border-border-primary bg-bg-secondary p-5 linear-shadow-sm">
            <div className="flex items-center gap-2"><ArrowDownRight className="size-4 text-text-tertiary" /><h3 className="text-base font-medium">Cuota según el euríbor</h3></div>
            <p className="mt-1 text-[13px] text-text-secondary">Estima la cuota {mortgage.rateKind === "mixed" ? `desde ${formatDate(mortgage.variableFrom)}` : "variable"} con el euríbor que elijas y el diferencial de {formatPercent(mortgage.spread)}.</p>
            <label htmlFor="euribor" className="mt-6 block text-sm font-medium">¿Con qué euríbor quieres calcular?</label>
            <div className="relative mt-2"><input id="euribor" inputMode="decimal" value={euriborInput} onChange={(event) => setEuriborInput(event.target.value)} className="h-11 w-full rounded-md border border-border-secondary bg-bg-tertiary px-3 pr-10 text-base tabular-nums outline-none transition-fast focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent aria-invalid:border-red" aria-invalid={!validEuribor} /><span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-text-tertiary">%</span></div>
            {!validEuribor && <p className="mt-2 text-sm text-destructive">Introduce un porcentaje entre {formatPercent(-mortgage.spread)} y 15 %.</p>}
            <div className="mt-6 rounded-md border border-border-primary bg-bg-tertiary p-4"><span className="text-sm text-muted-foreground">Tu cuota variable sería</span><strong className="mt-1 block text-2xl font-medium">{projection ? formatMoney(projection.variablePayment) : "—"}<span className="ml-1 text-base font-normal text-muted-foreground">/ mes</span></strong><p className="mt-2 text-xs text-muted-foreground">Tipo simulado: {validEuribor ? formatPercent(euribor! + mortgage.spread) : "—"}. Se supone constante durante el resto del préstamo.</p></div>
          </div> : <div className="rounded-lg border border-border-primary bg-bg-secondary p-5 linear-shadow-sm"><div className="flex items-center gap-2"><ArrowDownRight className="size-4 text-text-tertiary" /><h3 className="text-base font-medium">Cuota fija</h3></div><p className="mt-1 text-[13px] text-text-secondary">El préstamo mantiene el tipo fijo del {formatPercent(mortgage.fixedRate)} hasta el final previsto.</p><strong className="mt-6 block text-2xl font-medium">{formatMoney(mortgage.currentPayment)}<span className="ml-1 text-base font-normal text-muted-foreground">/ mes</span></strong></div>}
          <div className="rounded-lg border border-border-primary bg-bg-secondary p-5 linear-shadow-sm">
            <div className="flex items-center gap-2"><TrendingDown className="size-4 text-text-tertiary" /><h3 className="text-base font-medium">Amortización anticipada</h3></div>
            <p className="mt-1 text-[13px] text-text-secondary">Simula una aportación extraordinaria aplicada ahora al capital pendiente.</p>
            <label htmlFor="extra" className="mt-5 block text-sm font-medium">¿Qué cantidad quieres aportar?</label>
            <div className="relative mt-2"><input id="extra" inputMode="decimal" value={extraInput} onChange={(event) => setExtraInput(event.target.value)} className="h-11 w-full rounded-md border border-border-secondary bg-bg-tertiary px-3 pr-10 text-base tabular-nums outline-none transition-fast focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent aria-invalid:border-red" aria-invalid={!validExtra} /><span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-text-tertiary">€</span></div>
            {!validExtra && <p className="mt-2 text-sm text-destructive">Introduce entre 50 € y {formatMoney(totals.balance)}.</p>}
            <p className="mt-4 text-sm font-medium">¿Qué quieres hacer?</p>
            <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Objetivo de amortización">
              <button type="button" onClick={() => setMode("term")} aria-pressed={mode === "term"} className={`min-h-10 rounded-md border px-3 text-sm font-medium transition-fast outline-none focus-visible:ring-2 focus-visible:ring-accent ${mode === "term" ? "border-accent/40 bg-accent/10 text-text-primary" : "border-border-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"}`}>Terminar antes</button>
              <button type="button" onClick={() => setMode("payment")} aria-pressed={mode === "payment"} className={`min-h-10 rounded-md border px-3 text-sm font-medium transition-fast outline-none focus-visible:ring-2 focus-visible:ring-accent ${mode === "payment" ? "border-accent/40 bg-accent/10 text-text-primary" : "border-border-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"}`}>Reducir cuota</button>
            </div>
            <div className="mt-5 grid gap-3 rounded-md border border-border-primary bg-bg-tertiary p-4 sm:grid-cols-2"><div><span className="text-xs text-muted-foreground">Pagarías ahora</span><strong className="mt-1 block text-lg font-medium tabular-nums">{amortization ? formatMoney(fixedStage ? amortization.fixedPayment : amortization.variablePayment) : "—"}<span className="text-sm font-normal"> / mes</span></strong></div><div><span className="text-xs text-muted-foreground">Terminarías en</span><strong className="mt-1 block text-lg font-medium capitalize">{amortization ? formatProjectedMonth(amortization.payoffMonth) : "—"}</strong></div></div>
            {amortization && mortgage.rateKind === "mixed" && fixedStage && <p className="mt-3 text-xs text-muted-foreground">Desde {formatDate(mortgage.variableFrom)}, la cuota variable simulada sería {formatMoney(amortization.variablePayment)}.</p>}
          </div>
        </div>
        <p className="flex items-start gap-2 rounded-md border border-border-primary bg-bg-tertiary/50 px-4 py-3 text-xs leading-5 text-text-secondary"><CircleHelp className="mt-0.5 size-4 shrink-0" />Las simulaciones son orientativas: parten del saldo registrado el {formatDate(mortgage.lastRecordedOn)} y no incluyen gastos ni posibles comisiones.{mortgage.rateKind !== "fixed" && " El euríbor introducido se supone constante; el banco aplicará las revisiones reales."}</p>
      </section>

    </div>
  );
}
