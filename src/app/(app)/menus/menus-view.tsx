"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardCopy, Clock3, BookOpen, ExternalLink, Pencil, Plus, Search, Trash2, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input, inputClassName } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { normalizeRecipeUrl } from "@/lib/menu-recipes";
import { MEAL_TYPES, sortMeals, type MealType } from "@/lib/meals";
import { formatDate } from "@/lib/format";
import { useLanguage } from "@/components/layout/language-provider";
import { MealIcon } from "@/components/menus/meal-icon";
import { monthWeeks } from "@/lib/menu-pdf";
import { MenuPdfDialog } from "./menu-pdf-dialog";
import { deleteMeal, deleteRecipe, duplicateMeal, moveMeal, saveMeal, saveRecipe } from "./actions";

export type MenuRecipe = { id: string; name: string; ingredients: string | null; instructions: string | null; source_url: string | null };
export type MenuMeal = { id: string; meal_date: string; meal_type: MealType; title: string; notes: string | null; recipe_id: string | null; source_url: string | null };
type MealDraft = { id?: string; mealDate: string; mealType: MealType; title: string; recipeId: string; notes: string; sourceUrl: string };

const types = MEAL_TYPES;
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

function shiftDay(day: string, change: number) {
  const [year, month, date] = day.split("-").map(Number);
  const next = new Date(year, month - 1, date + change);
  return dateKey(next.getFullYear(), next.getMonth() + 1, next.getDate());
}

function dayLabel(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(new Date(year, month - 1, day));
}

export function MenusView({ month, recipes, meals, loadError, canEdit = true }: { month: string; recipes: MenuRecipe[]; meals: MenuMeal[]; loadError: string | null; canEdit?: boolean }) {
  const router = useRouter();
  const { language } = useLanguage();
  const [pending, startTransition] = useTransition();
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5));
  const [selectedDay, setSelectedDay] = useState(todayKey.startsWith(month) ? todayKey : `${month}-01`);
  const [selectedMeal, setSelectedMeal] = useState<MenuMeal | null>(null);
  const weeks = useMemo(() => monthWeeks(month, language), [month, language]);
  const selectedWeekIndex = Math.max(0, weeks.findIndex((week) => week.days.includes(selectedDay)));
  const selectedWeek = weeks[selectedWeekIndex];
  const [mealDraft, setMealDraft] = useState<MealDraft | null>(null);
  const [originalMealDraft, setOriginalMealDraft] = useState<MealDraft | null>(null);
  const [mealLeaveOpen, setMealLeaveOpen] = useState(false);
  const [mealDeleteOpen, setMealDeleteOpen] = useState(false);
  const [duplicateAfterLeave, setDuplicateAfterLeave] = useState(false);
  const mealFormRef = useRef<HTMLFormElement>(null);
  const [recipeDraft, setRecipeDraft] = useState<{ id?: string; name: string; ingredients: string; instructions: string; sourceUrl: string } | null>(null);
  const [copyDraft, setCopyDraft] = useState<{ meal: MenuMeal; date: string; type: MealType } | null>(null);
  const [search, setSearch] = useState("");
  const [showRecipes, setShowRecipes] = useState(false);
  const [draggedMealId, setDraggedMealId] = useState<string | null>(null);
  const [keyboardMove, setKeyboardMove] = useState<{ id: string; day: string } | null>(null);
  const [dropDay, setDropDay] = useState<string | null>(null);
  const [movingMealId, setMovingMealId] = useState<string | null>(null);
  const [movedDates, setMovedDates] = useState<Record<string, { from: string; to: string }>>({});
  const monthTitle = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(new Date(year, monthNumber - 1, 1));
  const displayedMeals = useMemo(() => meals.map((meal) => ({ ...meal, meal_date: movedDates[meal.id]?.from === meal.meal_date ? movedDates[meal.id].to : meal.meal_date })), [meals, movedDates]);
  const byDay = useMemo(() => {
    const map = new Map<string, MenuMeal[]>();
    for (const meal of displayedMeals) map.set(meal.meal_date, [...(map.get(meal.meal_date) ?? []), meal]);
    for (const [day, dayMeals] of map) map.set(day, sortMeals(dayMeals));
    return map;
  }, [displayedMeals]);
  const selectedRecipe = recipes.find((recipe) => recipe.id === selectedMeal?.recipe_id);
  const selectedDetailUrl = normalizeRecipeUrl(selectedMeal?.source_url ?? "") ?? normalizeRecipeUrl(selectedRecipe?.source_url ?? "");
  const filteredRecipes = recipes.filter((recipe) => recipe.name.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")));
  const selectedMealUrl = normalizeRecipeUrl(mealDraft?.sourceUrl ?? "");
  const mealChanged = !!mealDraft && !!originalMealDraft && Object.keys(originalMealDraft).some((key) => mealDraft[key as keyof MealDraft] !== originalMealDraft[key as keyof MealDraft]);

  function closeMeal() {
    if (pending) return;
    setDuplicateAfterLeave(false);
    if (mealChanged) setMealLeaveOpen(true);
    else setMealDraft(null);
  }

  function openCopyFromDraft(draft: MealDraft) {
    const meal = meals.find((item) => item.id === draft.id);
    if (!meal) return;
    setMealDraft(null);
    setCopyDraft({ meal: { ...meal, title: draft.title, meal_date: draft.mealDate, meal_type: draft.mealType }, date: draft.mealDate, type: draft.mealType });
  }

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
    setKeyboardMove(null);
    setDropDay(null);
    setSelectedDay(day);
    const linkedRecipe = recipes.find((recipe) => recipe.id === meal?.recipe_id);
    const draft = { id: meal?.id, mealDate: day, mealType: meal?.meal_type ?? type, title: meal?.title ?? "", recipeId: meal?.recipe_id ?? "", notes: meal?.notes ?? "", sourceUrl: meal?.source_url ?? linkedRecipe?.source_url ?? "" };
    setMealDraft(draft);
    setOriginalMealDraft(draft);
  }

  function dropMeal(day: string, id: string, restoreFocus = false) {
    if (!canEdit) return;
    setDraggedMealId(null);
    setKeyboardMove(null);
    setDropDay(null);
    const meal = displayedMeals.find((item) => item.id === id);
    if (!meal || meal.meal_date === day || movingMealId || pending) return;
    const previousDate = meal.meal_date;
    const sourceDate = meals.find((item) => item.id === id)?.meal_date ?? previousDate;
    const restoreDate = () => setMovedDates((current) => {
      const next = { ...current };
      if (previousDate === sourceDate) delete next[id];
      else next[id] = { from: sourceDate, to: previousDate };
      return next;
    });
    setMovedDates((current) => ({ ...current, [id]: { from: sourceDate, to: day } }));
    if (restoreFocus) {
      requestAnimationFrame(() => {
        const moved = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-meal-id]"))
          .find((element) => element.dataset.mealId === id);
        moved?.focus();
      });
    }
    setSelectedDay(day);
    setMovingMealId(id);
    startTransition(async () => {
      try {
        const result = await moveMeal(id, day);
        if (result.error) {
          restoreDate();
          toast.error(result.error);
        } else {
          toast.success("Comida movida.");
          router.refresh();
        }
      } catch {
        restoreDate();
        toast.error("No se pudo mover la comida.");
      } finally {
        setMovingMealId(null);
      }
    });
  }

  function handleMealKeyDown(event: KeyboardEvent<HTMLButtonElement>, meal: MenuMeal) {
    if (pending || movingMealId) return;
    if (!keyboardMove) {
      if (event.key === " ") {
        event.preventDefault();
        setKeyboardMove({ id: meal.id, day: meal.meal_date });
        setDropDay(meal.meal_date);
      }
      return;
    }
    if (keyboardMove.id !== meal.id) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setKeyboardMove(null);
      setDropDay(null);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      dropMeal(keyboardMove.day, meal.id, true);
      return;
    }
    const change = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    if (change === undefined) return;
    event.preventDefault();
    const next = shiftDay(keyboardMove.day, change);
    if (!next.startsWith(month)) return;
    setKeyboardMove({ id: meal.id, day: next });
    setDropDay(next);
  }

  function mealBadge(meal: MenuMeal, canDrag = true) {
    canDrag = canDrag && canEdit;
    const type = types.find((item) => item.id === meal.meal_type)!;
    const titleHint = canDrag
      ? language === "ca" ? "Arrossega-la o prem Espai per moure-la." : "Arrástrala o pulsa Espacio para moverla."
      : canEdit ? language === "ca" ? "Prem per editar-la i canviar-ne la data." : "Pulsa para editarla y cambiar la fecha." : "Solo lectura";
    const keyboardHint = canDrag
      ? language === "ca" ? "Prem Espai per moure-la amb les fletxes o Intro per editar-la." : "Pulsa Espacio para moverla con las flechas o Intro para editarla."
      : titleHint;
    return <button key={meal.id} type="button" data-meal-id={meal.id} data-meal-draggable={canDrag ? "" : undefined} data-dragging={draggedMealId === meal.id} draggable={canDrag && !movingMealId && !pending} aria-pressed={canDrag ? keyboardMove?.id === meal.id : undefined} onClick={() => { if (keyboardMove?.id !== meal.id) { setSelectedDay(meal.meal_date); setSelectedMeal(meal); } }}
      onKeyDown={canDrag ? (event) => handleMealKeyDown(event, meal) : undefined}
      onBlur={() => { if (keyboardMove?.id === meal.id) { setKeyboardMove(null); setDropDay(null); } }}
      onDragStart={(event) => { event.dataTransfer.setData("application/x-home-brain-meal", meal.id); event.dataTransfer.effectAllowed = "move"; setKeyboardMove(null); setDraggedMealId(meal.id); }}
      onDragEnd={() => { setDraggedMealId(null); setDropDay(null); }}
      className={cn("menu-meal-interactive group/meal pointer-events-auto relative z-10 flex w-full min-w-0 items-center gap-1 rounded-sm border border-border-primary bg-bg-tertiary px-1.5 py-1 text-left text-2xs text-text-primary transition-fast outline-none hover:border-accent/50 hover:bg-accent/5 hover:ring-1 hover:ring-inset hover:ring-accent/40 focus-visible:border-accent/50 focus-visible:bg-accent/5 focus-visible:ring-2 focus-visible:ring-accent active:bg-accent/10", canDrag ? "" : "cursor-pointer", draggedMealId === meal.id && "opacity-40", keyboardMove?.id === meal.id && "border-accent bg-accent/10 ring-2 ring-inset ring-accent")}
      title={`${type.label}: ${meal.title}. ${titleHint}`} aria-label={`${type.label}: ${meal.title}. ${keyboardHint}`}>
      <MealIcon type={type.id} />
      <span className="shrink-0 font-semibold">{type.label}</span>
      <span className="min-w-0 truncate text-text-secondary group-hover/meal:text-text-primary group-focus-visible/meal:text-text-primary">· {meal.title}</span>
    </button>;
  }

  return <div className="menus-page mx-auto max-w-[1600px] space-y-5 [&_a]:cursor-pointer">
    <PageHeader
      title="Menús"
      description="Organiza desayunos, comidas, meriendas y cenas. Guarda tus recetas favoritas y reutilízalas cuando quieras."
      actions={<>
        <MenuPdfDialog month={month} monthTitle={monthTitle} meals={displayedMeals.map((meal) => ({ ...meal, source_url: normalizeRecipeUrl(meal.source_url ?? "") ?? recipes.find((recipe) => recipe.id === meal.recipe_id)?.source_url }))} />
        <Button variant="outline" aria-pressed={showRecipes} onClick={() => setShowRecipes((value) => !value)}><BookOpen /> Recetario <span className="rounded-full bg-bg-quaternary px-1.5 text-xs text-text-secondary tabular-nums">{recipes.length}</span></Button>
        {canEdit ? <Button onClick={() => openMeal(selectedDay)}><Plus /> Añadir comida</Button> : <span className="text-[13px] text-text-secondary">Solo lectura</span>}
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

        {keyboardMove && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-2 border-b border-accent/20 bg-accent/5 px-4 py-2 text-xs text-text-secondary">
            <span className="font-medium text-text-primary">
              {language === "ca" ? "Movent" : "Moviendo"} {displayedMeals.find((meal) => meal.id === keyboardMove.id)?.title} → {formatDate(keyboardMove.day, language)}
            </span>
            <span>{language === "ca" ? "Fletxes: triar el dia · Intro: desar · Esc: cancel·lar" : "Flechas: elegir día · Intro: guardar · Esc: cancelar"}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-b border-border-primary px-4 py-2">
          <Button variant="ghost" size="icon" disabled={selectedWeekIndex === 0} aria-label="Semana anterior" onClick={() => setSelectedDay(weeks[selectedWeekIndex - 1]?.days.find((day): day is string => !!day) ?? selectedDay)}><ChevronLeft /></Button>
          <span className="text-center text-sm font-medium">Semana {selectedWeekIndex + 1} · {selectedWeek.label}</span>
          <Button variant="ghost" size="icon" disabled={selectedWeekIndex === weeks.length - 1} aria-label="Semana siguiente" onClick={() => setSelectedDay(weeks[selectedWeekIndex + 1]?.days.find((day): day is string => !!day) ?? selectedDay)}><ChevronRight /></Button>
        </div>
        <div className="overflow-x-auto" aria-label={`Calendario de la semana ${selectedWeek.label}`}>
          <div className="grid min-w-[1050px] grid-cols-7 gap-px bg-border-primary">
            {selectedWeek.days.map((day, index) => {
              const dayMeals = day ? byDay.get(day) ?? [] : [];
              return <div key={day ?? `empty-${index}`} onDragOver={(event) => { if (!day || !draggedMealId) return; event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropDay(day); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropDay(null); }} onDrop={(event) => { if (!day) return; event.preventDefault(); dropMeal(day, event.dataTransfer.getData("application/x-home-brain-meal") || draggedMealId || ""); }} className={cn("group/day min-h-72 min-w-0 bg-bg-secondary p-2 transition-fast", day && "hover:bg-bg-tertiary/60", day === todayKey && "bg-accent/5", !day && "bg-bg-primary/40", dropDay === day && "bg-accent/10 ring-2 ring-inset ring-accent")}>
                <div className="mb-3 flex min-h-10 items-start justify-between gap-1 border-b border-border-primary pb-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums", day === todayKey ? "bg-accent text-white" : "text-text-primary")}>{day ? Number(day.slice(-2)) : "·"}</span>
                    <span className="text-xs font-medium text-text-secondary">{weekdays[index]}</span>
                  </div>
                  {day && canEdit && <button type="button" onClick={() => openMeal(day)} aria-label={`Añadir comida el ${dayLabel(day)}`} title="Añadir comida" className="flex size-8 shrink-0 items-center justify-center rounded-md text-text-tertiary transition-fast hover:bg-bg-quaternary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent"><Plus className="size-4" aria-hidden="true" /></button>}
                </div>
                {day && <div className="space-y-1.5">
                  {dayMeals.map((meal) => mealBadge(meal))}
                  {!dayMeals.length && <p className="px-1 py-2 text-xs text-text-tertiary">Sin comidas</p>}
                </div>}
              </div>;
            })}
          </div>
        </div>
      </section>

      {showRecipes && <aside className="h-fit rounded-lg border border-border-primary bg-bg-secondary p-4 linear-shadow-sm xl:sticky xl:top-3">
        <div className="flex items-center justify-between gap-2"><div><p className="eyebrow">Para volver a cocinar</p><h2 className="text-base font-medium">Recetario</h2></div>{canEdit && <Button size="icon" variant="outline" aria-label="Nueva receta" onClick={() => setRecipeDraft({ name: "", ingredients: "", instructions: "", sourceUrl: "" })}><Plus /></Button>}</div>
        <div className="relative mt-4"><Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-text-tertiary" /><Input className="pl-8" placeholder="Buscar recetas" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <div className="mt-3 max-h-[55vh] space-y-px overflow-y-auto">
          {filteredRecipes.map((recipe) => {
            const sourceUrl = normalizeRecipeUrl(recipe.source_url ?? "");
            return <div key={recipe.id} className="group flex items-center rounded-md transition-fast hover:bg-bg-tertiary">
              <button type="button" disabled={!canEdit} onClick={() => setRecipeDraft({ id: recipe.id, name: recipe.name, ingredients: recipe.ingredients ?? "", instructions: recipe.instructions ?? "", sourceUrl: recipe.source_url ?? "" })} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <UtensilsCrossed className="size-4 shrink-0 text-text-tertiary" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{recipe.name}</span>
                {canEdit && <Pencil className="size-3.5 text-text-tertiary opacity-0 transition-fast group-hover:opacity-100" />}
              </button>
              {sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`Abrir receta de ${recipe.name} en internet`} title="Abrir receta en internet" className="mr-2 rounded-md p-2 text-text-secondary transition-fast hover:bg-bg-tertiary hover:text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent"><ExternalLink className="size-3.5" /></a>}
            </div>;
          })}
          {!filteredRecipes.length && <p className="rounded-md border border-dashed border-border-secondary p-5 text-center text-[13px] text-text-secondary">{recipes.length ? "No hay recetas con ese nombre." : "Todavía no hay recetas. Crea la primera para reutilizarla en tu calendario."}</p>}
        </div>
        {canEdit && <Button variant="outline" className="mt-4 w-full" onClick={() => setRecipeDraft({ name: "", ingredients: "", instructions: "", sourceUrl: "" })}><Plus /> Nueva receta</Button>}
      </aside>}
    </div>

    <Dialog open={!!selectedMeal} onOpenChange={(open) => !open && setSelectedMeal(null)}><DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md"><DialogHeader><DialogTitle className="flex items-center gap-2"><MealIcon type={selectedMeal?.meal_type ?? "lunch"} />{selectedMeal?.title}</DialogTitle><DialogDescription className="capitalize">{selectedMeal ? `${dayLabel(selectedMeal.meal_date)} · ${types.find((type) => type.id === selectedMeal.meal_type)?.label}` : ""}</DialogDescription></DialogHeader>{selectedMeal && <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none">{selectedRecipe && <div className="space-y-3 rounded-md border border-border-primary bg-bg-tertiary p-3"><p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Receta · {selectedRecipe.name}</p>{selectedRecipe.ingredients && <div><p className="text-xs font-medium">Ingredientes</p><p className="whitespace-pre-wrap text-sm text-text-secondary">{selectedRecipe.ingredients}</p></div>}{selectedRecipe.instructions && <div><p className="text-xs font-medium">Preparación</p><p className="whitespace-pre-wrap text-sm text-text-secondary">{selectedRecipe.instructions}</p></div>}</div>}{selectedMeal.notes && <div><p className="text-xs font-medium">Notas</p><p className="whitespace-pre-wrap text-sm text-text-secondary">{selectedMeal.notes}</p></div>}{selectedDetailUrl && <Button variant="outline" className="w-full" render={<a href={selectedDetailUrl} target="_blank" rel="noopener noreferrer" />}><ExternalLink /> Abrir enlace de la receta</Button>}{canEdit && <div className="flex gap-2 border-t border-border-primary pt-3"><Button className="flex-1 transition-transform duration-200 active:scale-95 motion-reduce:transition-none" onClick={() => { const meal = selectedMeal; setSelectedMeal(null); openMeal(meal.meal_date, meal.meal_type, meal); }}><Pencil /> Editar</Button><Button variant="destructive" size="icon" aria-label="Eliminar comida" title="Eliminar comida" className="transition-transform duration-200 hover:rotate-[-8deg] active:scale-90 motion-reduce:transition-none" onClick={() => { const meal = selectedMeal; setSelectedMeal(null); openMeal(meal.meal_date, meal.meal_type, meal); setMealDeleteOpen(true); }}><Trash2 /></Button></div>}</div>}</DialogContent></Dialog>

    <Dialog open={!!mealDraft} onOpenChange={(open) => !open && closeMeal()}>
      <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{mealDraft?.id ? "Editar comida" : "Añadir comida"}</DialogTitle><DialogDescription>Elige el día, el momento y una receta guardada o escribe un plato nuevo.</DialogDescription></DialogHeader>
        {mealDraft?.id && <Button type="button" variant="ghost" size="icon-sm" aria-label="Eliminar comida" title="Eliminar comida" disabled={pending} className="absolute right-12 top-3 text-red hover:bg-red/10 hover:text-red" onClick={() => setMealDeleteOpen(true)}><Trash2 /></Button>}
        {mealDraft && <form ref={mealFormRef} className="grid gap-4" onSubmit={(event) => { event.preventDefault(); run(() => saveMeal(mealDraft), mealDraft.id ? "Comida actualizada." : "Comida añadida.", () => { setMealLeaveOpen(false); if (duplicateAfterLeave) openCopyFromDraft(mealDraft); else setMealDraft(null); setDuplicateAfterLeave(false); }); }}>
          <div className="grid grid-cols-2 gap-3"><div className="grid gap-1.5"><Label htmlFor="meal-date">Fecha</Label><Input id="meal-date" type="date" required value={mealDraft.mealDate} onChange={(event) => setMealDraft({ ...mealDraft, mealDate: event.target.value })} /></div><div className="grid gap-1.5"><Label htmlFor="meal-type">Comida</Label><div className="menu-meal-interactive relative"><span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"><MealIcon type={mealDraft.mealType} /></span><select id="meal-type" className={cn(inputClassName, "h-11 pl-9 md:h-8")} value={mealDraft.mealType} onChange={(event) => setMealDraft({ ...mealDraft, mealType: event.target.value as MealType })}>{types.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}</select></div></div></div>
          <div className="grid gap-1.5"><Label htmlFor="meal-recipe">Usar receta guardada</Label><select id="meal-recipe" className={cn(inputClassName, "h-11 md:h-8")} value={mealDraft.recipeId} onChange={(event) => { const recipe = recipes.find((item) => item.id === event.target.value); setMealDraft({ ...mealDraft, recipeId: event.target.value, title: recipe?.name ?? mealDraft.title, sourceUrl: recipe ? recipe.source_url ?? "" : mealDraft.sourceUrl }); }}><option value="">Plato sin receta</option>{recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}</select></div>
          <div className="grid gap-1.5"><Label htmlFor="meal-title">Plato</Label><Input id="meal-title" required maxLength={120} placeholder="Ej. Pasta con verduras" value={mealDraft.title} onChange={(event) => setMealDraft({ ...mealDraft, title: event.target.value })} /></div>
          <div className="grid gap-1.5"><Label htmlFor="meal-source-url">Enlace a la receta (opcional)</Label><Input id="meal-source-url" type="url" inputMode="url" maxLength={2048} placeholder="https://ejemplo.com/receta" value={mealDraft.sourceUrl} onChange={(event) => setMealDraft({ ...mealDraft, sourceUrl: event.target.value })} /></div>
          {selectedMealUrl && <a href={selectedMealUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"><ExternalLink className="size-4" /> Abrir receta en internet</a>}
          <div className="grid gap-1.5"><Label htmlFor="meal-notes">Notas opcionales</Label><Textarea id="meal-notes" maxLength={2000} placeholder="Preparar con antelación, ingredientes pendientes…" value={mealDraft.notes} onChange={(event) => setMealDraft({ ...mealDraft, notes: event.target.value })} /></div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border-primary pt-3">{mealDraft.id && <Button type="button" variant="outline" disabled={pending} onClick={() => { if (mealChanged) { setDuplicateAfterLeave(true); setMealLeaveOpen(true); } else openCopyFromDraft(mealDraft); }}><ClipboardCopy /> Duplicar</Button>}<Button disabled={pending} type="submit">{pending ? "Guardando…" : "Guardar"}</Button></div>
          {mealDraft.id && <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-3" /> Cambia la fecha y guarda para mover esta comida a otro día.</p>}
        </form>}
      </DialogContent>
    </Dialog>

    <AlertDialog open={mealDeleteOpen} onOpenChange={setMealDeleteOpen}><AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>¿Eliminar esta comida?</AlertDialogTitle><AlertDialogDescription>Se quitará «{mealDraft?.title}» del calendario. Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={pending} onClick={() => { if (mealDraft?.id) run(() => deleteMeal(mealDraft.id!), "Comida eliminada.", () => { setMealDeleteOpen(false); setMealDraft(null); }); }}>Eliminar</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>

    <AlertDialog open={mealLeaveOpen} onOpenChange={(open) => { if (!pending) { setMealLeaveOpen(open); if (!open) setDuplicateAfterLeave(false); } }}><AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>¿Guardar los cambios?</AlertDialogTitle><AlertDialogDescription>Has modificado esta comida. Guarda los cambios antes de salir o descártalos.</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel onClick={() => setDuplicateAfterLeave(false)}>Seguir editando</AlertDialogCancel><Button variant="outline" disabled={pending} onClick={() => { setMealLeaveOpen(false); if (duplicateAfterLeave && originalMealDraft) openCopyFromDraft(originalMealDraft); else setMealDraft(null); setDuplicateAfterLeave(false); }}>Descartar</Button><Button disabled={pending} onClick={() => { mealFormRef.current?.requestSubmit(); }}>{pending ? "Guardando…" : "Guardar cambios"}</Button></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>

    <Dialog open={!!copyDraft} onOpenChange={(open) => !open && setCopyDraft(null)}><DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>Duplicar comida</DialogTitle><DialogDescription>Se creará una copia de «{copyDraft?.meal.title}» en el día que elijas.</DialogDescription></DialogHeader>
      {copyDraft && <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); run(() => duplicateMeal(copyDraft.meal.id, copyDraft.date, copyDraft.type), "Comida duplicada.", () => setCopyDraft(null)); }}><div className="grid gap-1.5"><Label htmlFor="copy-date">Fecha</Label><Input id="copy-date" type="date" required value={copyDraft.date} onChange={(event) => setCopyDraft({ ...copyDraft, date: event.target.value })} /></div><div className="grid gap-1.5"><Label htmlFor="copy-type">Comida</Label><div className="menu-meal-interactive relative"><span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"><MealIcon type={copyDraft.type} /></span><select id="copy-type" className={cn(inputClassName, "h-11 pl-9 md:h-8")} value={copyDraft.type} onChange={(event) => setCopyDraft({ ...copyDraft, type: event.target.value as MealType })}>{types.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}</select></div></div><Button type="submit" disabled={pending}>Crear copia</Button></form>}
    </DialogContent></Dialog>

    <Dialog open={!!recipeDraft} onOpenChange={(open) => !open && setRecipeDraft(null)}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{recipeDraft?.id ? "Editar receta" : "Nueva receta"}</DialogTitle><DialogDescription>Guárdala para usarla tantas veces como quieras en tus menús.</DialogDescription></DialogHeader>
      {recipeDraft && <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); run(() => saveRecipe(recipeDraft), recipeDraft.id ? "Receta actualizada." : "Receta guardada.", () => setRecipeDraft(null)); }}><div className="grid gap-1.5"><Label htmlFor="recipe-name">Nombre</Label><Input id="recipe-name" required maxLength={120} placeholder="Ej. Tortilla de patatas" value={recipeDraft.name} onChange={(event) => setRecipeDraft({ ...recipeDraft, name: event.target.value })} /></div><div className="grid gap-1.5"><Label htmlFor="recipe-source-url">Enlace a la receta (opcional)</Label><Input id="recipe-source-url" type="url" inputMode="url" maxLength={2048} placeholder="https://ejemplo.com/receta" value={recipeDraft.sourceUrl} onChange={(event) => setRecipeDraft({ ...recipeDraft, sourceUrl: event.target.value })} /></div><div className="grid gap-1.5"><Label htmlFor="ingredients">Ingredientes</Label><Textarea id="ingredients" className="min-h-24" maxLength={10000} placeholder="Un ingrediente por línea" value={recipeDraft.ingredients} onChange={(event) => setRecipeDraft({ ...recipeDraft, ingredients: event.target.value })} /></div><div className="grid gap-1.5"><Label htmlFor="instructions">Preparación</Label><Textarea id="instructions" className="min-h-28" maxLength={20000} placeholder="Pasos para preparar la receta" value={recipeDraft.instructions} onChange={(event) => setRecipeDraft({ ...recipeDraft, instructions: event.target.value })} /></div><div className="flex gap-2 border-t pt-3"><Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar receta"}</Button>{recipeDraft.id && <Button type="button" variant="destructive" className="ml-auto" disabled={pending} onClick={() => { if (confirm("¿Eliminar esta receta? Las comidas ya planificadas conservarán su nombre.")) run(() => deleteRecipe(recipeDraft.id!), "Receta eliminada.", () => setRecipeDraft(null)); }}><Trash2 /> Eliminar</Button>}</div></form>}
    </DialogContent></Dialog>
  </div>;
}
