"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Info } from "lucide-react";
import { toast } from "sonner";
import { setPersonalSharing } from "@/app/(app)/familia/actions";
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";

export function PersonalSharingControl({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return <section className="inline-flex max-w-full items-center gap-2.5 justify-self-start rounded-xl border border-border/70 bg-muted/25 px-3 py-2">
    {enabled ? <Eye className="size-4 shrink-0 text-primary" aria-hidden="true" /> : <EyeOff className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
    <span className="min-w-0 text-xs font-medium leading-4 sm:text-sm">Compartir mis finanzas</span>
    <Popover>
      <PopoverTrigger aria-label="Qué se comparte" className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><Info className="size-3.5" /></PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        <PopoverTitle>Qué se comparte</PopoverTitle>
        <PopoverDescription>Los miembros activos verán tus gastos, ingresos e inversiones en modo lectura. Tus datos también se incluirán en la Visión global común.</PopoverDescription>
      </PopoverContent>
    </Popover>
    <button type="button" role="switch" aria-checked={enabled} aria-label="Compartir mis finanzas personales con la unidad familiar" disabled={pending} onClick={() => startTransition(async () => { const next = !enabled; const result = await setPersonalSharing(next); if (result.error) toast.error(result.error); else { setEnabled(next); router.refresh(); } })} className={`relative ml-0.5 h-6 w-10 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60 ${enabled ? "bg-primary" : "bg-muted-foreground/40"}`}><span className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-4" : ""}`} /></button>
  </section>;
}
