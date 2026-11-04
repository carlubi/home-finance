"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { MortgageFields } from "@/components/mortgage/mortgage-fields";
import { draftFromMortgage, emptyMortgageDraft } from "@/lib/mortgage-config";
import type { MortgageTerms } from "@/lib/mortgage";
import { saveMortgageConfiguration } from "./actions";
import { FinancialPrivacyButton } from "@/components/layout/financial-privacy";

export function MortgageConfiguration({ mortgage }: { mortgage: MortgageTerms | null }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(mortgage ? draftFromMortgage(mortgage) : { ...emptyMortgageDraft });
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const button = <button
    type="button"
    onClick={() => setOpen(true)}
    className={mortgage
      ? buttonVariants({ variant: "outline" })
      : buttonVariants({ variant: "default", size: "lg" })}
  >
    {mortgage ? <Pencil className="size-4" /> : <Plus className="size-4" />}
    {mortgage ? "Editar datos" : "Configurar hipoteca"}
  </button>;

  return <>
    {mortgage ? button : <section className="rounded-lg border bg-card p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3"><h1 className="text-2xl font-medium">Tu hipoteca</h1><FinancialPrivacyButton /></div>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Si tienes una hipoteca, añade sus datos para consultar el saldo, las cuotas y las simulaciones. Puedes hacerlo más adelante.</p>
      <div className="mt-5">{button}</div>
    </section>}

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mortgage ? "Editar datos de la hipoteca" : "Configurar hipoteca"}</DialogTitle>
          <DialogDescription>Los cambios se comparten con tu unidad familiar.</DialogDescription>
        </DialogHeader>
        <MortgageFields value={draft} onChange={setDraft} idPrefix="mortgage-page" />
        <div className="flex justify-end border-t pt-4">
          <button type="button" disabled={pending} onClick={() => startTransition(async () => {
            const result = await saveMortgageConfiguration(draft);
            if ("error" in result && result.error) toast.error(result.error);
            else {
              toast.success("Hipoteca guardada para la unidad familiar.");
              setOpen(false);
              router.refresh();
            }
          })} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {pending ? "Guardando…" : "Guardar hipoteca"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
