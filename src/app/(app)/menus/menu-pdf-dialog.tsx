"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { MEAL_TYPES, type MealType } from "@/lib/meals";
import { MealIcon } from "@/components/menus/meal-icon";
import { downloadMenuPdf, monthWeeks, type MenuPdfLayout, type MenuPdfMeal } from "@/lib/menu-pdf";
import { downloadMenuPng } from "@/lib/menu-png";
import { useLanguage } from "@/components/layout/language-provider";

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Exporta el menú a PDF o PNG con las mismas selecciones. */
export function MenuPdfDialog({ month, monthTitle, meals }: { month: string; monthTitle: string; meals: MenuPdfMeal[] }) {
  const { language } = useLanguage();
  const weeks = useMemo(() => monthWeeks(month, language), [month, language]);
  const currentWeek = weeks.find((week) => week.days.includes(todayKey()))?.id ?? weeks[0]?.id ?? "";
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"month" | "week">("month");
  const [layout, setLayout] = useState<MenuPdfLayout>("calendar");
  const [format, setFormat] = useState<"pdf" | "png">("pdf");
  const [mealTypes, setMealTypes] = useState<MealType[]>(MEAL_TYPES.map((type) => type.id));
  const [weekId, setWeekId] = useState(currentWeek);
  const [pending, setPending] = useState(false);

  const includedMeals = meals.filter((meal) => mealTypes.includes(meal.meal_type as MealType));
  const countFor = (days: (string | null)[]) => includedMeals.filter((meal) => days.includes(meal.meal_date)).length;

  function toggleMealType(type: MealType) {
    setMealTypes((current) => current.includes(type)
      ? current.filter((selected) => selected !== type)
      : [...current, type]);
  }

  async function download() {
    setPending(true);
    try {
      await (format === "pdf" ? downloadMenuPdf : downloadMenuPng)({
        month,
        language,
        meals: includedMeals,
        scope: scope === "month" ? { kind: "month" } : { kind: "week", weekId },
        layout,
        mealTypes,
      });
      setOpen(false);
    } catch {
      toast.error(`No se pudo generar el ${format.toUpperCase()}. Inténtalo de nuevo.`);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Download /> Exportar
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Exportar menú</DialogTitle>
          <DialogDescription className="first-letter:uppercase">{monthTitle}. Elige qué quieres incluir.</DialogDescription>
        </DialogHeader>

        <section className="grid gap-2" aria-labelledby="export-format-title">
          <h3 id="export-format-title" className="text-[13px] font-medium text-text-primary">Tipo de archivo</h3>
          <RadioGroup value={format} onValueChange={(value) => setFormat(value as "pdf" | "png")} className="grid grid-cols-2 gap-2">
            <label htmlFor="menu-format-pdf" className={cn("flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-[13px] transition-fast hover:bg-bg-tertiary/60", format === "pdf" ? "border-accent/40 bg-accent/5" : "border-border-primary")}><RadioGroupItem id="menu-format-pdf" value="pdf" />PDF</label>
            <label htmlFor="menu-format-png" className={cn("flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-[13px] transition-fast hover:bg-bg-tertiary/60", format === "png" ? "border-accent/40 bg-accent/5" : "border-border-primary")}><RadioGroupItem id="menu-format-png" value="png" />PNG</label>
          </RadioGroup>
        </section>

        <RadioGroup value={scope} onValueChange={(value) => setScope(value as "month" | "week")} className="gap-1">
          <label htmlFor="pdf-month" className={cn("flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 transition-fast hover:bg-bg-tertiary/60", scope === "month" ? "border-accent/40 bg-accent/5" : "border-border-primary")}>
            <RadioGroupItem value="month" id="pdf-month" />
            <span className="grid flex-1">
              <span className="text-[13px] font-medium">Mes completo</span>
              <span className="text-xs text-text-tertiary">{weeks.length} semanas · {includedMeals.length} {includedMeals.length === 1 ? "plato" : "platos"}</span>
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

        {scope === "month" && (
          <section className="grid gap-2" aria-labelledby="pdf-layout-title">
            <h3 id="pdf-layout-title" className="text-[13px] font-medium text-text-primary">Formato del mes</h3>
            <RadioGroup value={layout} onValueChange={(value) => setLayout(value as MenuPdfLayout)} className="grid gap-2 sm:grid-cols-2">
              <label htmlFor="pdf-calendar" className={cn("flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-3 transition-fast hover:bg-bg-tertiary/60", layout === "calendar" ? "border-accent/40 bg-accent/5" : "border-border-primary")}>
                <RadioGroupItem value="calendar" id="pdf-calendar" className="mt-0.5" />
                <span className="grid gap-0.5"><span className="text-[13px] font-medium text-text-primary">Calendario unido</span><span className="text-xs text-text-tertiary">Todo el mes en una vista.</span></span>
              </label>
              <label htmlFor="pdf-weeks" className={cn("flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-3 transition-fast hover:bg-bg-tertiary/60", layout === "weeks" ? "border-accent/40 bg-accent/5" : "border-border-primary")}>
                <RadioGroupItem value="weeks" id="pdf-weeks" className="mt-0.5" />
                <span className="grid gap-0.5"><span className="text-[13px] font-medium text-text-primary">Semana por semana</span><span className="text-xs text-text-tertiary">{format === "pdf" ? "Cada semana empieza en una página nueva." : "Semanas ordenadas en una imagen vertical."}</span></span>
              </label>
            </RadioGroup>
          </section>
        )}

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

        <section className="grid gap-2" aria-labelledby="pdf-meal-types-title">
          <div>
            <h3 id="pdf-meal-types-title" className="text-[13px] font-medium text-text-primary">Tipos de comida</h3>
            <p className="text-xs text-text-tertiary">Elige cuáles aparecerán en el archivo.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {MEAL_TYPES.map((type) => (
              <label key={type.id} htmlFor={`pdf-type-${type.id}`} className="menu-meal-interactive flex cursor-pointer items-center gap-2 rounded-md border border-border-primary px-3 py-2 text-[13px] text-text-primary transition-fast hover:bg-bg-tertiary/60 focus-within:ring-2 focus-within:ring-accent">
                <Checkbox id={`pdf-type-${type.id}`} checked={mealTypes.includes(type.id)} onCheckedChange={() => toggleMealType(type.id)} />
                <MealIcon type={type.id} size="md" />{type.label}
              </label>
            ))}
          </div>
          {mealTypes.length === 0 && <p role="alert" className="text-xs text-red">Selecciona al menos un tipo de comida.</p>}
        </section>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={download} disabled={pending || mealTypes.length === 0}>
            <Download /> {pending ? "Generando…" : `Descargar ${format.toUpperCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
