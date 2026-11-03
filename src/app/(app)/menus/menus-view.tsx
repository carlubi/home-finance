"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardCopy, Clock3, BookOpen, ExternalLink, Pencil, Plus, Search, Trash2, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, inputClassName } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { normalizeRecipeUrl } from "@/lib/menu-recipes";
import { MEAL_TYPES, sortMeals, type MealType } from "@/lib/meals";
import { MenuPdfDialog } from "./menu-pdf-dialog";
import { deleteMeal, deleteRecipe, duplicateMeal, saveMeal, saveRecipe } from "./actions";

export type MenuRecipe = { id: string; name: string; ingredients: string | null; instructions: string | null; source_url: string | null };
export type MenuMeal = { id: string; meal_date: string; meal_type: MealType; title: string; notes: string | null; recipe_id: string | null; source_url: string | null };

// Orden fijo (desayuno → comida → merienda → cena) definido en lib/meals.
const MEAL_DOTS: Record<MealType, string> = {
  breakfast: "bg-yellow",
  lunch: "bg-orange",
  snack: "bg-green",
  dinner: "bg-blue",
};
const types = MEAL_TYPES.map((type) => ({ ...type, color: "", dot: MEAL_DOTS[type.id] }));
const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const today = new Date();
const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function shiftMonth(month: string, change: number) {
  const date = new Date(Number(month.slice(0, 4)), Number(month.slice(5)) - 1 + change, 1);
  return dateKey(date.getFullYear(), date.getMonth() + 1, 1).slice(0, 7);
}

function dayLabel(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(new Date(year, month - 1, day));
}

export function MenusView({ month, recipes, meals, loadError }: { month: string; recipes: MenuRecipe[]; meals: MenuMeal[]; loadError: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5));
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const firstOffset = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7;
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, index) => dateKey(year, monthNumber, index + 1)), [daysInMonth, year, monthNumber]);
  const [selectedDay, setSelectedDay] = useState(todayKey.startsWith(month) ? todayKey : days[0]);
  const [selectedDayOpen, setSelectedDayOpen] = useState(false);
  const [mealDraft, setMealDraft] = useState<{ id?: string; mealDate: string; mealType: MealType; title: string; recipeId: string; notes: string; sourceUrl: string } | null>(null);
  const [recipeDraft, setRecipeDraft] = useState<{ id?: string; name: string; ingredients: string; instructions: string; sourceUrl: string } | null>(null);
  const [copyDraft, setCopyDraft] = useState<{ meal: MenuMeal; date: string; type: MealType } | null>(null);
  const [search, setSearch] = useState("");
  const [showRecipes, setShowRecipes] = useState(false);
  const monthTitle = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(new Date(year, monthNumber - 1, 1));
  const byDay = useMemo(() => {
    const map = new Map<string, MenuMeal[]>();
    for (const meal of meals) map.set(meal.meal_date, [...(map.get(meal.meal_date) ?? []), meal]);
    for (const [day, dayMeals] of map) map.set(day, sortMeals(dayMeals));
    return map;
  }, [meals]);
  const selectedMeals = byDay.get(selectedDay) ?? [];
  const filteredRecipes = recipes.filter((recipe) => recipe.name.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")));
  const selectedMealUrl = normalizeRecipeUrl(mealDraft?.sourceUrl ?? "");

  function run(operation: () => Promise<{ error?: string; ok?: boolean }>, success: string, close?: () => void) {
    startTransition(async () => {
      try {
        const result = await operation();
        if (result.error) { toast.error(result.error); return; }
        toast.success(success);
        close?.();
        router.refresh();
      } catch { toast.error("No se pudo completar la operación. Inténtalo de nuevo."); }
    });
  }

  function openMeal(day: string, type: MealType = "lunch", meal?: MenuMeal) {
    setSelectedDayOpen(false);
    setSelectedDay(day);
    const linkedRecipe = recipes.find((recipe) => recipe.id === meal?.recipe_id);
    setMealDraft({ id: meal?.id, mealDate: day, mealType: meal?.meal_type ?? type, title: meal?.title ?? "", recipeId: meal?.recipe_id ?? "", notes: meal?.notes ?? "", sourceUrl: meal?.source_url ?? linkedRecipe?.source_url ?? "" });
  }

  function mealBadge(meal: MenuMeal, compact = false) {
    const type = types.find((item) => item.id === meal.meal_type)!;
    return <button key={meal.id} type="button" onClick={() => openMeal(meal.meal_date, meal.meal_type, meal)}
      className={cn("pointer-events-auto relative z-10 flex w-full items-center gap-1.5 rounded-sm border border-border-primary bg-bg-tertiary px-1.5 py-1 text-left text-2xs text-text-primary transition-fast outline-none hover:border-border-secondary hover:bg-bg-quaternary focus-visible:ring-2 focus-visible:ring-accent", type.color)}
      title={`${type.label}: ${meal.title}`}>
      <span className={cn("size-1.5 shrink-0 rounded-full", type.dot)} />
      <span className="truncate">{compact ? `${type.short} · ` : ""}{meal.title}</span>
    </button>;
  }

  return <div className="mx-auto max-w-[1600px] space-y-5 [&_a]:cursor-pointer [&_button:not(:disabled)]:cursor-pointer">
    <PageHeader
      title="Menús"
      description="Organiza desayunos, comidas y cenas. Guarda tus recetas favoritas y reutilízalas cuando quieras."
      actions={<>
        <MenuPdfDialog month={month} monthTitle={monthTitle} meals={meals} />
        <Button variant="outline" aria-pressed={showRecipes} onClick={() => setShowRecipes((value) => !value)}><BookOpen /> Recetario <span className="rounded-full bg-bg-quaternary px-1.5 text-xs text-text-secondary tabular-nums">{recipes.length}</span></Button>
        <Button onClick={() => openMeal(selectedDay)}><Plus /> Añadir comida</Button>
      </>}
    />

    {loadError && <div role="alert" className="rounded-lg border border-red/20 bg-red/10 p-3 text-sm text-red">No se pudieron cargar los menús: {loadError}</div>}

    <div className={cn("grid gap-5", showRecipes && "xl:grid-cols-[minmax(0,1fr)_320px]")}>
      <section className="min-w-0 overflow-hidden rounded-lg border border-border-primary bg-bg-secondary linear-shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-primary px-4 py-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-text-tertiary" />
            <h2 className="text-base font-medium capitalize">{monthTitle}</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="Mes anterior" render={<Link href={`/menus?mes=${shiftMonth(month, -1)}`} />}><ChevronLeft /></Button>
            <Button variant="outline" size="sm" render={<Link href="/menus" />}>Hoy</Button>
            <Button variant="ghost" size="icon" aria-label="Mes siguiente" render={<Link href={`/menus?mes=${shiftMonth(month, 1)}`} />}><ChevronRight /></Button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-border-primary text-center text-xs font-medium text-text-tertiary">
          {weekdays.map((day) => <div className="py-2" key={day}>{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-px bg-border-primary">
          {Array.from({ length: firstOffset }, (_, index) => <div key={`blank-${index}`} className="min-h-14 bg-bg-primary/40 md:min-h-32" />)}
          {days.map((day) => {
            const dayMeals = byDay.get(day) ?? [];
            const active = selectedDay === day;
            return <div key={day} className={cn("relative min-h-14 bg-bg-secondary p-1 transition-fast hover:bg-bg-tertiary/60 md:min-h-32 md:p-1.5", active && "bg-bg-tertiary/80")}>
              <button type="button" onClick={() => openMeal(day)} aria-label={`Añadir comida el ${dayLabel(day)}`} className="absolute inset-0 z-0 size-full outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent" />
              <span className={cn("pointer-events-none relative z-10 flex size-6 items-center justify-center rounded-full text-xs font-medium text-text-secondary tabular-nums", day === todayKey && "bg-accent text-white", active && day !== todayKey && "text-text-primary ring-1 ring-border-secondary")}>
                {Number(day.slice(-2))}
              </span>
              <div className="pointer-events-none relative z-10 mt-1 hidden space-y-1 md:block">{dayMeals.slice(0, 4).map((meal) => mealBadge(meal, true))}
                {dayMeals.length > 4 && <button type="button" onClick={() => { setSelectedDay(day); setSelectedDayOpen(true); }} className="pointer-events-auto text-2xs text-text-tertiary hover:text-text-primary">+{dayMeals.length - 4} más</button>}</div>
              {dayMeals.length > 0 && <button type="button" onClick={() => { setSelectedDay(day); setSelectedDayOpen(true); }} aria-label={`Ver comidas del ${dayLabel(day)}`} className="relative z-10 mt-1 flex min-h-5 w-full items-center justify-center gap-0.5 md:hidden">{types.map((type) => dayMeals.some((meal) => meal.meal_type === type.id) && <span key={type.id} className={cn("size-1.5 rounded-full", type.dot)} />)}</button>}
            </div>;
          })}
        </div>
      </section>

      {showRecipes && <aside className="h-fit rounded-lg border border-border-primary bg-bg-secondary p-4 linear-shadow-sm xl:sticky xl:top-3">
        <div className="flex items-center justify-between gap-2"><div><p className="eyebrow">Para volver a cocinar</p><h2 className="text-base font-medium">Recetario</h2></div><Button size="icon" variant="outline" aria-label="Nueva receta" onClick={() => setRecipeDraft({ name: "", ingredients: "", instructions: "", sourceUrl: "" })}><Plus /></Button></div>
        <div className="relative mt-4"><Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-text-tertiary" /><Input className="pl-8" placeholder="Buscar recetas" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <div className="mt-3 max-h-[55vh] space-y-px overflow-y-auto">
          {filteredRecipes.map((recipe) => {
            const sourceUrl = normalizeRecipeUrl(recipe.source_url ?? "");
            return <div key={recipe.id} className="group flex items-center rounded-md transition-fast hover:bg-bg-tertiary">
              <button type="button" onClick={() => setRecipeDraft({ id: recipe.id, name: recipe.name, ingredients: recipe.ingredients ?? "", instructions: recipe.instructions ?? "", sourceUrl: recipe.source_url ?? "" })} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <UtensilsCrossed className="size-4 shrink-0 text-text-tertiary" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{recipe.name}</span>
                <Pencil className="size-3.5 text-text-tertiary opacity-0 transition-fast group-hover:opacity-100" />
              </button>
              {sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`Abrir receta de ${recipe.name} en internet`} title="Abrir receta en internet" className="mr-2 rounded-md p-2 text-text-secondary transition-fast hover:bg-bg-tertiary hover:text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent"><ExternalLink className="size-3.5" /></a>}
            </div>;
          })}
          {!filteredRecipes.length && <p className="rounded-md border border-dashed border-border-secondary p-5 text-center text-[13px] text-text-secondary">{recipes.length ? "No hay recetas con ese nombre." : "Todavía no hay recetas. Crea la primera para reutilizarla en tu calendario."}</p>}
        </div>
        <Button variant="outline" className="mt-4 w-full" onClick={() => setRecipeDraft({ name: "", ingredients: "", instructions: "", sourceUrl: "" })}><Plus /> Nueva receta</Button>
      </aside>}
    </div>

    <Dialog open={selectedDayOpen} onOpenChange={setSelectedDayOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle className="capitalize">{dayLabel(selectedDay)}</DialogTitle><DialogDescription>Comidas planificadas para este día.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          {types.map((type) => {
            const entries = selectedMeals.filter((meal) => meal.meal_type === type.id);
            return entries.length ? <div key={type.id} className="space-y-1"><p className="flex items-center gap-1.5 text-xs font-medium text-text-secondary"><span className={cn("size-1.5 rounded-full", type.dot)} />{type.label}</p>{entries.map((meal) => mealBadge(meal))}</div> : null;
          })}
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={!!mealDraft} onOpenChange={(open) => !open && setMealDraft(null)}>
      <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{mealDraft?.id ? "Editar comida" : "Añadir comida"}</DialogTitle><DialogDescription>Elige el día, el momento y una receta guardada o escribe un plato nuevo.</DialogDescription></DialogHeader>
        {mealDraft && <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); run(() => saveMeal(mealDraft), mealDraft.id ? "Comida actualizada." : "Comida añadida.", () => setMealDraft(null)); }}>
          <div className="grid grid-cols-2 gap-3"><div className="grid gap-1.5"><Label htmlFor="meal-date">Fecha</Label><Input id="meal-date" type="date" required value={mealDraft.mealDate} onChange={(event) => setMealDraft({ ...mealDraft, mealDate: event.target.value })} /></div><div className="grid gap-1.5"><Label htmlFor="meal-type">Comida</Label><select id="meal-type" className={cn(inputClassName, "h-11 md:h-8")} value={mealDraft.mealType} onChange={(event) => setMealDraft({ ...mealDraft, mealType: event.target.value as MealType })}>{types.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}</select></div></div>
          <div className="grid gap-1.5"><Label htmlFor="meal-recipe">Usar receta guardada</Label><select id="meal-recipe" className={cn(inputClassName, "h-11 md:h-8")} value={mealDraft.recipeId} onChange={(event) => { const recipe = recipes.find((item) => item.id === event.target.value); setMealDraft({ ...mealDraft, recipeId: event.target.value, title: recipe?.name ?? mealDraft.title, sourceUrl: recipe ? recipe.source_url ?? "" : mealDraft.sourceUrl }); }}><option value="">Plato sin receta</option>{recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}</select></div>
          <div className="grid gap-1.5"><Label htmlFor="meal-title">Plato</Label><Input id="meal-title" required maxLength={120} placeholder="Ej. Pasta con verduras" value={mealDraft.title} onChange={(event) => setMealDraft({ ...mealDraft, title: event.target.value })} /></div>
          <div className="grid gap-1.5"><Label htmlFor="meal-source-url">Enlace a la receta (opcional)</Label><Input id="meal-source-url" type="url" inputMode="url" maxLength={2048} placeholder="https://ejemplo.com/receta" value={mealDraft.sourceUrl} onChange={(event) => setMealDraft({ ...mealDraft, sourceUrl: event.target.value })} /></div>
          {selectedMealUrl && <a href={selectedMealUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"><ExternalLink className="size-4" /> Abrir receta en internet</a>}
          <div className="grid gap-1.5"><Label htmlFor="meal-notes">Notas opcionales</Label><Textarea id="meal-notes" maxLength={2000} placeholder="Preparar con antelación, ingredientes pendientes…" value={mealDraft.notes} onChange={(event) => setMealDraft({ ...mealDraft, notes: event.target.value })} /></div>
          <div className="flex flex-wrap items-center gap-2 border-t border-border-primary pt-3"><Button disabled={pending} type="submit">{pending ? "Guardando…" : "Guardar comida"}</Button>{mealDraft.id && <><Button type="button" variant="outline" disabled={pending} onClick={() => { const meal = meals.find((item) => item.id === mealDraft.id); if (meal) { setMealDraft(null); setCopyDraft({ meal, date: meal.meal_date, type: meal.meal_type }); } }}><ClipboardCopy /> Duplicar</Button><Button type="button" variant="destructive" disabled={pending} className="ml-auto" onClick={() => { if (confirm("¿Eliminar esta comida del calendario?")) run(() => deleteMeal(mealDraft.id!), "Comida eliminada.", () => setMealDraft(null)); }}><Trash2 /> Eliminar</Button></>}</div>
          {mealDraft.id && <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-3" /> Cambia la fecha y guarda para mover esta comida a otro día.</p>}
        </form>}
      </DialogContent>
    </Dialog>

    <Dialog open={!!copyDraft} onOpenChange={(open) => !open && setCopyDraft(null)}><DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>Duplicar comida</DialogTitle><DialogDescription>Se creará una copia de «{copyDraft?.meal.title}» en el día que elijas.</DialogDescription></DialogHeader>
      {copyDraft && <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); run(() => duplicateMeal(copyDraft.meal.id, copyDraft.date, copyDraft.type), "Comida duplicada.", () => setCopyDraft(null)); }}><div className="grid gap-1.5"><Label htmlFor="copy-date">Fecha</Label><Input id="copy-date" type="date" required value={copyDraft.date} onChange={(event) => setCopyDraft({ ...copyDraft, date: event.target.value })} /></div><div className="grid gap-1.5"><Label htmlFor="copy-type">Comida</Label><select id="copy-type" className={cn(inputClassName, "h-11 md:h-8")} value={copyDraft.type} onChange={(event) => setCopyDraft({ ...copyDraft, type: event.target.value as MealType })}>{types.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}</select></div><Button type="submit" disabled={pending}>Crear copia</Button></form>}
    </DialogContent></Dialog>

    <Dialog open={!!recipeDraft} onOpenChange={(open) => !open && setRecipeDraft(null)}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{recipeDraft?.id ? "Editar receta" : "Nueva receta"}</DialogTitle><DialogDescription>Guárdala para usarla tantas veces como quieras en tus menús.</DialogDescription></DialogHeader>
      {recipeDraft && <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); run(() => saveRecipe(recipeDraft), recipeDraft.id ? "Receta actualizada." : "Receta guardada.", () => setRecipeDraft(null)); }}><div className="grid gap-1.5"><Label htmlFor="recipe-name">Nombre</Label><Input id="recipe-name" required maxLength={120} placeholder="Ej. Tortilla de patatas" value={recipeDraft.name} onChange={(event) => setRecipeDraft({ ...recipeDraft, name: event.target.value })} /></div><div className="grid gap-1.5"><Label htmlFor="recipe-source-url">Enlace a la receta (opcional)</Label><Input id="recipe-source-url" type="url" inputMode="url" maxLength={2048} placeholder="https://ejemplo.com/receta" value={recipeDraft.sourceUrl} onChange={(event) => setRecipeDraft({ ...recipeDraft, sourceUrl: event.target.value })} /></div><div className="grid gap-1.5"><Label htmlFor="ingredients">Ingredientes</Label><Textarea id="ingredients" className="min-h-24" maxLength={10000} placeholder="Un ingrediente por línea" value={recipeDraft.ingredients} onChange={(event) => setRecipeDraft({ ...recipeDraft, ingredients: event.target.value })} /></div><div className="grid gap-1.5"><Label htmlFor="instructions">Preparación</Label><Textarea id="instructions" className="min-h-28" maxLength={20000} placeholder="Pasos para preparar la receta" value={recipeDraft.instructions} onChange={(event) => setRecipeDraft({ ...recipeDraft, instructions: event.target.value })} /></div><div className="flex gap-2 border-t pt-3"><Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar receta"}</Button>{recipeDraft.id && <Button type="button" variant="destructive" className="ml-auto" disabled={pending} onClick={() => { if (confirm("¿Eliminar esta receta? Las comidas ya planificadas conservarán su nombre.")) run(() => deleteRecipe(recipeDraft.id!), "Receta eliminada.", () => setRecipeDraft(null)); }}><Trash2 /> Eliminar</Button>}</div></form>}
    </DialogContent></Dialog>
  </div>;
}
