"use client";

import type { MortgageDraft } from "@/lib/mortgage-config";

type FieldKey = Exclude<keyof MortgageDraft, "rateKind">;

export function MortgageFields({ value, onChange, idPrefix }: {
  value: MortgageDraft;
  onChange: (next: MortgageDraft) => void;
  idPrefix: string;
}) {
  const change = <K extends keyof MortgageDraft>(key: K, next: MortgageDraft[K]) => onChange({ ...value, [key]: next });
  const field = (key: FieldKey, label: string, type: "text" | "date" = "text", hint?: string) => <div className="grid gap-1.5" key={key}>
    <label htmlFor={`${idPrefix}-${key}`} className="text-sm font-medium">{label}</label>
    <input id={`${idPrefix}-${key}`} type={type} inputMode={type === "text" && !["lender", "firstBorrower", "secondBorrower"].includes(key) ? "decimal" : undefined}
      value={value[key]} onChange={(event) => change(key, event.target.value)}
      className="h-11 min-w-0 rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>;

  return <div className="grid gap-6">
    <section className="grid gap-3"><div><h3 className="font-semibold">Préstamo y titulares</h3><p className="text-xs text-muted-foreground">La hipoteca se compartirá con los miembros de esta unidad familiar.</p></div>
      <div className="grid gap-3 sm:grid-cols-2">{field("lender", "Entidad bancaria")}{field("firstBorrower", "Primer titular")}{field("secondBorrower", "Segundo titular (opcional)")}{field("purchasePrice", "Precio de compra (€)")}{field("principal", "Capital concedido (€)")}{field("startedOn", "Fecha de inicio", "date")}{field("endsOn", "Fecha de finalización", "date")}</div>
    </section>
    <section className="grid gap-3 border-t pt-5"><h3 className="font-semibold">Tipo de interés</h3>
      <div className="grid gap-1.5"><label htmlFor={`${idPrefix}-rateKind`} className="text-sm font-medium">Modalidad</label><select id={`${idPrefix}-rateKind`} value={value.rateKind} onChange={(event) => change("rateKind", event.target.value as MortgageDraft["rateKind"])} className="h-11 rounded-xl border bg-background px-3 text-sm"><option value="mixed">Mixta</option><option value="fixed">Fija</option><option value="variable">Variable</option></select></div>
      <div className="grid gap-3 sm:grid-cols-2">
        {value.rateKind !== "variable" && field("fixedRate", "Tipo fijo anual (%)")}
        {value.rateKind !== "variable" && field("fixedPayment", "Cuota fija mensual (€)")}
        {value.rateKind === "mixed" && field("fixedUntil", "Fin del tramo fijo", "date")}
        {value.rateKind === "mixed" && field("variableFrom", "Inicio del tramo variable", "date")}
        {value.rateKind !== "fixed" && field("spread", "Diferencial sobre euríbor (puntos)")}
      </div>
    </section>
    <section className="grid gap-3 border-t pt-5"><div><h3 className="font-semibold">Situación actual</h3><p className="text-xs text-muted-foreground">Puedes actualizar estos datos cuando recibas un nuevo extracto.</p></div>
      <div className="grid gap-3 sm:grid-cols-2">{field("currentPayment", "Cuota que pagas ahora (€/mes)")}{field("lastRecordedOn", "Fecha del último saldo", "date", "Si aún no has pagado cuotas, déjalo vacío.")}{field("lastRecordedBalance", "Capital pendiente (€)", "text", "Si no has pagado cuotas, déjalo vacío.")}{field("paidTotalToDate", "Total abonado hasta hoy (€)", "text", "Opcional. Se usa para calcular los intereses ya pagados.")}</div>
      {value.secondBorrower && <div className="max-w-xs">{field("firstSharePercent", `Aportación del primer titular (%)`)}</div>}
    </section>
  </div>;
}
