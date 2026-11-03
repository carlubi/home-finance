"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { downloadMenuPdf, monthWeeks, type MenuPdfMeal } from "@/lib/menu-pdf";

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Exporta el menú a PDF: el mes completo o una semana concreta. */
export function MenuPdfDialog({ month, monthTitle, meals }: { month: string; monthTitle: string; meals: MenuPdfMeal[] }) {
  const weeks = useMemo(() => monthWeeks(month), [month]);
  const currentWeek = weeks.find((week) => week.days.includes(todayKey()))?.id ?? weeks[0]?.id ?? "";
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"month" | "week">("month");
  const [weekId, setWeekId] = useState(currentWeek);
  const [pending, setPending] = useState(false);

  const countFor = (days: (string | null)[]) => meals.filter((meal) => days.includes(meal.meal_date)).length;

  async function download() {
    setPending(true);
    try {
      await downloadMenuPdf({
        month,
        monthTitle,
        meals,
        scope: scope === "month" ? { kind: "month" } : { kind: "week", weekId },
      });
      setOpen(false);
    } catch {
      toast.error("No se pudo generar el PDF. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Download /> PDF
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Descargar menú en PDF</DialogTitle>
          <DialogDescription className="first-letter:uppercase">{monthTitle}. Elige qué quieres incluir.</DialogDescription>
        </DialogHeader>

        <RadioGroup value={scope} onValueChange={(value) => setScope(value as "month" | "week")} className="gap-1">
          <label htmlFor="pdf-month" className={cn("flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 transition-fast hover:bg-bg-tertiary/60", scope === "month" ? "border-accent/40 bg-accent/5" : "border-border-primary")}>
            <RadioGroupItem value="month" id="pdf-month" />
            <span className="grid flex-1">
              <span className="text-[13px] font-medium">Mes completo</span>
              <span className="text-xs text-text-tertiary">{weeks.length} semanas · {meals.length} {meals.length === 1 ? "comida" : "comidas"}</span>
            </span>
          </label>
          <label htmlFor="pdf-week" className={cn("flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 transition-fast hover:bg-bg-tertiary/60", scope === "week" ? "border-accent/40 bg-accent/5" : "border-border-primary")}>
            <RadioGroupItem value="week" id="pdf-week" />
            <span className="grid flex-1">
              <span className="text-[13px] font-medium">Una semana</span>
              <span className="text-xs text-text-tertiary">De lunes a domingo</span>
            </span>
          </label>
        </RadioGroup>

        {scope === "week" && (
          <div role="radiogroup" aria-label="Semana" className="grid gap-px overflow-hidden rounded-md border border-border-primary">
            {weeks.map((week, index) => {
              const selected = week.id === weekId;
              const count = countFor(week.days);
              return (
                <button
                  key={week.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setWeekId(week.id)}
                  className={cn(
                    "flex items-center justify-between gap-3 px-3 py-2 text-left text-[13px] transition-fast outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
                    selected ? "bg-accent/10 text-text-primary" : "text-text-secondary hover:bg-bg-tertiary/60 hover:text-text-primary"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className={cn("size-1.5 rounded-full", selected ? "bg-accent" : "bg-transparent")} aria-hidden />
                    Semana {index + 1} · {week.label}
                    {week.id === currentWeek && <span className="text-xs text-text-tertiary">· esta semana</span>}
                  </span>
                  <span className="text-xs text-text-tertiary tabular-nums">{count} {count === 1 ? "comida" : "comidas"}</span>
                </button>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={download} disabled={pending}>
            <Download /> {pending ? "Generando…" : "Descargar PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
