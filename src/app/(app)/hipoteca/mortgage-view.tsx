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
    <div className={`rounded-2xl border p-5 shadow-sm ${tone === "violet" ? "border-primary/20 bg-primary/5" : "bg-card"}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums sm:text-[2rem]">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p>
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
      <header className="relative overflow-hidden rounded-[1.75rem] bg-[#211a3c] px-6 py-7 text-white shadow-xl shadow-primary/10 sm:px-9 sm:py-9">
        <div className="pointer-events-none absolute -right-16 -top-28 size-80 rounded-full border-[50px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-36 right-32 size-72 rounded-full border-[40px] border-[#a48bec]/10" />
        <div className="relative">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2 pt-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#c9baf5]"><Landmark className="size-4" /> {mortgage.lender} · {kindLabel}</div>
            <MortgageConfiguration mortgage={mortgage} />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Tu hipoteca,<br /><span className="text-[#c7b5ff]">de un vistazo.</span></h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">Seguimiento del capital, los intereses y las cuotas según los datos registrados hasta el {formatDate(mortgage.lastRecordedOn)}.</p>
          <div className="mt-8 grid gap-4 border-t border-white/15 pt-5 text-sm sm:grid-cols-3">
            <div><span className="block text-xs text-white/55">Precio de compra</span><strong className="mt-1 block text-lg tabular-nums">{formatMoney(mortgage.purchasePrice)}</strong></div>
            <div><span className="block text-xs text-white/55">Financiación · {formatPercent(mortgage.principal / mortgage.purchasePrice * 100)}</span><strong className="mt-1 block text-lg tabular-nums">{formatMoney(mortgage.principal)}</strong></div>
            <div><span className="block text-xs text-white/55">Firma del préstamo</span><strong className="mt-1 block text-lg">{formatDate(mortgage.startedOn)}</strong></div>
          </div>
        </div>
      </header>

      <section aria-labelledby="progress-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Situación real</p><h2 id="progress-heading" className="mt-1 text-2xl font-semibold tracking-tight">Así va el préstamo</h2></div><span className="text-xs text-muted-foreground">Último movimiento: {formatDate(mortgage.lastRecordedOn)}</span></div>
        <div className="grid gap-3 md:grid-cols-3">
          <InfoCard label="Capital amortizado" value={formatMoney(totals.capital)} detail={`${formatPercent(percentPaid)} del préstamo inicial`} tone="violet" />
          <InfoCard label="Intereses pagados" value={totals.interest === null ? "Sin datos" : formatMoney(totals.interest)} detail={totals.interest === null ? "Introduce el total abonado para calcularlos" : "Total abonado menos capital amortizado"} />
          <InfoCard label="Capital pendiente" value={formatMoney(totals.balance)} detail={`Saldo tras la cuota del ${formatDate(mortgage.lastRecordedOn)}`} />
        </div>
        <div className="rounded-2xl border bg-card p-5 sm:p-6">
          <div className="flex justify-between gap-3 text-sm"><strong>Capital devuelto</strong><span className="font-semibold tabular-nums">{formatPercent(percentPaid)}</span></div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Capital amortizado" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(percentPaid.toFixed(2))}><div className="h-full min-w-1 rounded-full bg-primary" style={{ width: `${percentPaid}%` }} /></div>
          <div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>{formatMoney(totals.capital)} amortizados</span><span>{formatMoney(mortgage.principal)} iniciales</span></div>
          <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">{totals.paid === null ? "Aún no se ha indicado el total abonado." : <>Total abonado hasta la fecha: <strong className="text-foreground">{formatMoney(totals.paid)}</strong>.</>} {recordedPayments.length > 0 && <>Hay {recordedPayments.length} cuotas desglosadas; la primera fue de <strong className="text-foreground">{formatMoney(recordedPayments[0].payment)}</strong>.</>}</p>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 sm:p-6"><div className="flex items-center gap-2"><CalendarDays className="size-5 text-primary" /><h2 className="text-xl font-semibold">Fechas y condiciones</h2></div><div className="mt-5 grid gap-4 text-sm sm:grid-cols-3"><div><span className="text-muted-foreground">Firma</span><p className="mt-1 font-semibold">{formatDate(mortgage.startedOn)}</p></div>{mortgage.rateKind === "mixed" && <div><span className="text-muted-foreground">Fin del tramo fijo</span><p className="mt-1 font-semibold">{formatDate(mortgage.fixedUntil)}</p></div>}<div><span className="text-muted-foreground">Fin indicado por {mortgage.lender}</span><p className="mt-1 font-semibold">{formatDate(mortgage.endsOn)}</p></div></div></section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border bg-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Cuota actual</p><h2 className="mt-1 text-2xl font-semibold">{fixedStage ? "Tramo fijo" : "Tramo variable"}</h2></div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">En vigor</span></div>
          <div className="mt-6 flex items-baseline gap-2"><strong className="text-4xl tracking-tight tabular-nums">{formatMoney(mortgage.currentPayment)}</strong><span className="text-muted-foreground">/ mes</span></div>
          {fixedStage ? <p className="mt-2 text-sm text-muted-foreground">Tipo fijo del {formatPercent(mortgage.fixedRate)} hasta el {formatDate(mortgage.fixedUntil)}.</p> : <p className="mt-2 text-sm text-muted-foreground">Euríbor + {formatPercent(mortgage.spread)} según la última revisión de tu entidad.</p>}
          {mortgage.rateKind === "mixed" && <div className="mt-6 grid gap-3 rounded-xl bg-muted/55 p-4 text-sm sm:grid-cols-2"><div><span className="text-muted-foreground">Tramo variable desde {formatDate(mortgage.variableFrom)}</span><strong className="mt-1 block">Euríbor + {formatPercent(mortgage.spread)}</strong></div><div><span className="text-muted-foreground">Fecha final</span><strong className="mt-1 block">{formatDate(mortgage.endsOn)}</strong></div></div>}
        </div>
        <div className="rounded-2xl border bg-card p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Aportación mensual</p><h2 className="mt-1 text-2xl font-semibold">Reparto entre titulares</h2>
          <p className="mt-2 text-sm text-muted-foreground">Reparto de la cuota actual entre los titulares.</p>
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-3"><span>{mortgage.firstBorrower}</span><strong className="text-xl tabular-nums">{formatMoney(shareFirst)}</strong></div>
            {mortgage.secondBorrower && <><div className="flex items-center justify-between gap-3"><span>{mortgage.secondBorrower}</span><strong className="text-xl tabular-nums">{formatMoney(shareSecond)}</strong></div>
            <label htmlFor="first-share" className="block pt-2 text-sm font-medium">Porcentaje de {mortgage.firstBorrower}: {firstSharePercent} %</label>
            <input id="first-share" type="range" min="0" max="100" step="1" value={firstSharePercent} onChange={(event) => setFirstSharePercent(Number(event.target.value))} className="w-full accent-primary" />
            <div className="flex justify-between text-xs text-muted-foreground"><span>0 %</span><span>100 %</span></div>
            <button type="button" disabled={pending || firstSharePercent === mortgage.firstSharePercent} onClick={() => startTransition(async () => { const result = await saveMortgageShare(firstSharePercent); if (result.error) toast.error(result.error); else { toast.success("Reparto guardado para la unidad familiar"); router.refresh(); } })} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">{pending ? "Guardando…" : "Guardar reparto"}</button></>}
          </div>
          <p className="mt-5 text-xs text-muted-foreground">El reparto guardado se verá en las cuentas de esta unidad familiar.</p>
        </div>
      </section>

      {recordedPayments.length > 0 && <details className="rounded-2xl border bg-card p-5 sm:p-6"><summary className="cursor-pointer font-semibold">Ver cuotas registradas ({recordedPayments.length})</summary><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[440px] text-left text-sm"><thead className="border-b text-xs text-muted-foreground"><tr><th className="pb-3 font-medium">Mes</th><th className="pb-3 text-right font-medium">Cuota cobrada</th><th className="pb-3 text-right font-medium">Capital pendiente</th></tr></thead><tbody>{[...recordedPayments].reverse().map((payment) => <tr key={payment.month} className="border-b last:border-0"><td className="py-3 capitalize">{formatProjectedMonth(payment.month)}</td><td className="py-3 text-right tabular-nums">{formatMoney(payment.payment)}</td><td className="py-3 text-right tabular-nums">{formatMoney(payment.balance)}</td></tr>)}</tbody></table></div></details>}

      <section className="space-y-4" aria-labelledby="simulators-heading"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Planificación</p><h2 id="simulators-heading" className="mt-1 text-2xl font-semibold tracking-tight">Explora escenarios</h2></div>
          <div className="grid gap-4 lg:grid-cols-2">
          {mortgage.rateKind !== "fixed" ? <div className="rounded-2xl border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2"><ArrowDownRight className="size-5 text-primary" /><h3 className="text-lg font-semibold">Cuota según el euríbor</h3></div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Estima la cuota {mortgage.rateKind === "mixed" ? `desde ${formatDate(mortgage.variableFrom)}` : "variable"} con el euríbor que elijas y el diferencial de {formatPercent(mortgage.spread)}.</p>
            <label htmlFor="euribor" className="mt-6 block text-sm font-medium">¿Con qué euríbor quieres calcular?</label>
            <div className="relative mt-2"><input id="euribor" inputMode="decimal" value={euriborInput} onChange={(event) => setEuriborInput(event.target.value)} className="h-12 w-full rounded-xl border bg-background px-4 pr-10 text-lg outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-invalid={!validEuribor} /><span className="absolute right-4 top-3 text-muted-foreground">%</span></div>
            {!validEuribor && <p className="mt-2 text-sm text-destructive">Introduce un porcentaje entre {formatPercent(-mortgage.spread)} y 15 %.</p>}
            <div className="mt-6 rounded-xl bg-primary/8 p-4"><span className="text-sm text-muted-foreground">Tu cuota variable sería</span><strong className="mt-1 block text-3xl tracking-tight tabular-nums">{projection ? formatMoney(projection.variablePayment) : "—"}<span className="ml-1 text-base font-normal text-muted-foreground">/ mes</span></strong><p className="mt-2 text-xs text-muted-foreground">Tipo simulado: {validEuribor ? formatPercent(euribor! + mortgage.spread) : "—"}. Se supone constante durante el resto del préstamo.</p></div>
          </div> : <div className="rounded-2xl border bg-card p-5 sm:p-6"><div className="flex items-center gap-2"><ArrowDownRight className="size-5 text-primary" /><h3 className="text-lg font-semibold">Cuota fija</h3></div><p className="mt-2 text-sm leading-6 text-muted-foreground">El préstamo mantiene el tipo fijo del {formatPercent(mortgage.fixedRate)} hasta el final previsto.</p><strong className="mt-6 block text-3xl tabular-nums">{formatMoney(mortgage.currentPayment)}<span className="ml-1 text-base font-normal text-muted-foreground">/ mes</span></strong></div>}
          <div className="rounded-2xl border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2"><TrendingDown className="size-5 text-primary" /><h3 className="text-lg font-semibold">Amortización anticipada</h3></div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Simula una aportación extraordinaria aplicada ahora al capital pendiente.</p>
            <label htmlFor="extra" className="mt-5 block text-sm font-medium">¿Qué cantidad quieres aportar?</label>
            <div className="relative mt-2"><input id="extra" inputMode="decimal" value={extraInput} onChange={(event) => setExtraInput(event.target.value)} className="h-12 w-full rounded-xl border bg-background px-4 pr-10 text-lg outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-invalid={!validExtra} /><span className="absolute right-4 top-3 text-muted-foreground">€</span></div>
            {!validExtra && <p className="mt-2 text-sm text-destructive">Introduce entre 50 € y {formatMoney(totals.balance)}.</p>}
            <p className="mt-4 text-sm font-medium">¿Qué quieres hacer?</p>
            <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Objetivo de amortización">
              <button type="button" onClick={() => setMode("term")} aria-pressed={mode === "term"} className={`min-h-12 rounded-xl border px-3 text-sm font-medium transition-colors ${mode === "term" ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}>Terminar antes</button>
              <button type="button" onClick={() => setMode("payment")} aria-pressed={mode === "payment"} className={`min-h-12 rounded-xl border px-3 text-sm font-medium transition-colors ${mode === "payment" ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}>Reducir cuota</button>
            </div>
            <div className="mt-5 grid gap-3 rounded-xl bg-primary/8 p-4 sm:grid-cols-2"><div><span className="text-xs text-muted-foreground">Pagarías ahora</span><strong className="mt-1 block text-xl tabular-nums">{amortization ? formatMoney(fixedStage ? amortization.fixedPayment : amortization.variablePayment) : "—"}<span className="text-sm font-normal"> / mes</span></strong></div><div><span className="text-xs text-muted-foreground">Terminarías en</span><strong className="mt-1 block text-xl capitalize">{amortization ? formatProjectedMonth(amortization.payoffMonth) : "—"}</strong></div></div>
            {amortization && mortgage.rateKind === "mixed" && fixedStage && <p className="mt-3 text-xs text-muted-foreground">Desde {formatDate(mortgage.variableFrom)}, la cuota variable simulada sería {formatMoney(amortization.variablePayment)}.</p>}
          </div>
        </div>
        <p className="flex items-start gap-2 rounded-xl border bg-muted/40 px-4 py-3 text-xs leading-5 text-muted-foreground"><CircleHelp className="mt-0.5 size-4 shrink-0" />Las simulaciones son orientativas: parten del saldo registrado el {formatDate(mortgage.lastRecordedOn)} y no incluyen gastos ni posibles comisiones.{mortgage.rateKind !== "fixed" && " El euríbor introducido se supone constante; el banco aplicará las revisiones reales."}</p>
      </section>

    </div>
  );
}
