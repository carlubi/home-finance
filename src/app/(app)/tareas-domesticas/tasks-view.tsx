"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, inputClassName } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { dateAfterDays, dueDateForWeek, weekdayOf, WEEKDAYS } from "@/lib/domestic-tasks";
import { deleteDomesticTask, saveDomesticTask, setDomesticTaskDone } from "./actions";

export type FamilyMember = { id: string; user_id: string | null; display_name: string | null; email: string; role: string; status: string };
export type DomesticTask = { id: string; title: string; weekday: number; starts_on: string; assignee_member_id: string };
export type TaskCompletion = { task_id: string; due_date: string; completed_at: string };
type Draft = { id?: string; title: string; weekday: number; memberId: string };

function readableDate(date: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00Z`));
}

export function DomesticTasksView({ week, today, currentUserId, members, tasks, completions, loadError, canEdit = true, editableMemberIds }: {
  week: string; today: string; currentUserId: string; members: FamilyMember[]; tasks: DomesticTask[];
  completions: TaskCompletion[]; loadError: string | null; canEdit?: boolean; editableMemberIds: string[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<DomesticTask | null>(null);
  const [busy, startTransition] = useTransition();
  const [checks, setChecks] = useState(() => new Set(completions.map((item) => `${item.task_id}:${item.due_date}`)));
  const eligibleMembers = members.filter((member) => member.status === "active" && editableMemberIds.includes(member.id));
  const memberName = (id: string) => {
    const member = members.find((item) => item.id === id);
    return member?.display_name?.trim() || member?.email.split("@")[0] || "Miembro";
  };
  const total = tasks.filter((task) => dueDateForWeek(week, task.weekday) >= task.starts_on).length;
  const doneCount = tasks.filter((task) => checks.has(`${task.id}:${dueDateForWeek(week, task.weekday)}`)).length;

  function submit() {
    if (!draft) return;
    startTransition(async () => {
      try {
        const result = await saveDomesticTask(draft);
        if (result.error) { toast.error(result.error); return; }
        setDraft(null);
        toast.success(draft.id ? "Tarea actualizada" : "Tarea añadida");
        router.refresh();
      } catch { toast.error("No se pudo guardar la tarea."); }
    });
  }

  function remove() {
    if (!taskToDelete) return;
    startTransition(async () => {
      try {
        const result = await deleteDomesticTask(taskToDelete.id);
        if (result.error) { toast.error(result.error); return; }
        setTaskToDelete(null);
        toast.success("Tarea eliminada");
        router.refresh();
      } catch { toast.error("No se pudo eliminar la tarea."); }
    });
  }

  function toggle(task: DomesticTask, date: string, next: boolean) {
    const key = `${task.id}:${date}`;
    setChecks((current) => { const copy = new Set(current); if (next) copy.add(key); else copy.delete(key); return copy; });
    startTransition(async () => {
      try {
        const result = await setDomesticTaskDone(task.id, date, next);
        if (result.error) throw new Error(result.error);
        router.refresh();
      } catch (error) {
        setChecks((current) => { const copy = new Set(current); if (next) copy.delete(key); else copy.add(key); return copy; });
        toast.error(error instanceof Error ? error.message : "No se pudo actualizar la tarea.");
      }
    });
  }

  return <div className="space-y-6">
    <PageHeader eyebrow="Familia · Organización" title="Tareas Domésticas"
      description="Organiza quién hace cada tarea y cuándo se repite."
      actions={canEdit ? <Button onClick={() => setDraft({ title: "", weekday: weekdayOf(today), memberId: eligibleMembers.find((m) => m.user_id === currentUserId)?.id ?? eligibleMembers[0]?.id ?? "" })} disabled={eligibleMembers.length === 0}><Plus /> Nueva tarea</Button> : <span className="text-[13px] text-text-secondary">Solo lectura</span>} />

    {loadError && <p role="alert" className="rounded-lg border border-red/30 bg-red/10 p-3 text-sm text-red">No se pudieron cargar las tareas: {loadError}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-primary pb-4">
      <div>
        <p className="text-[13px] font-medium text-text-primary">Semana del {readableDate(week)}</p>
        <p className="mt-0.5 text-[13px] text-text-secondary">{doneCount} de {total} tareas completadas</p>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" render={<Link href={`/tareas-domesticas?semana=${dateAfterDays(week, -7)}`} aria-label="Semana anterior" />}><ChevronLeft /></Button>
        <Button variant="outline" size="sm" render={<Link href="/tareas-domesticas" />}>Hoy</Button>
        <Button variant="ghost" size="icon" render={<Link href={`/tareas-domesticas?semana=${dateAfterDays(week, 7)}`} aria-label="Semana siguiente" />}><ChevronRight /></Button>
      </div>
    </div>

    {tasks.length === 0 && !loadError ? <Card className="items-center gap-0 px-6 py-12 text-center">
      <ClipboardList className="size-6 text-text-tertiary" />
      <h2 className="mt-3 text-base font-medium text-text-primary">Aún no hay tareas semanales</h2>
      <p className="mt-1 text-[13px] text-text-secondary">Crea la primera tarea y asígnala a alguien de la familia.</p>
    </Card> : <Card className="gap-0 py-0">
      {WEEKDAYS.map((day, weekday) => {
        const date = dueDateForWeek(week, weekday);
        const dayTasks = tasks.filter((task) => task.weekday === weekday && task.starts_on <= date);
        return <section key={day} aria-label={`${day} ${readableDate(date)}`} className={cn("px-4 py-3 first:rounded-t-lg last:rounded-b-lg not-first:border-t not-first:border-border-primary sm:flex sm:gap-4", date === today && "bg-bg-tertiary/50")}>
          <div className="mb-2 flex items-center gap-2 sm:mb-0 sm:w-44 sm:shrink-0 sm:items-start">
            <div><h2 className="text-[13px] font-medium text-text-primary">{day}</h2><p className="text-xs text-text-tertiary">{readableDate(date)}</p></div>
            {date === today && <Badge variant="neutral">Hoy</Badge>}
          </div>
          {dayTasks.length === 0 ? <p className="py-1 text-[13px] text-text-tertiary">Sin tareas</p> : <div className="min-w-0 flex-1 divide-y divide-border-primary">{dayTasks.map((task) => {
            const checked = checks.has(`${task.id}:${date}`);
            return <div key={task.id} className="flex min-h-10 items-center gap-3 py-1.5 first:pt-0 last:pb-0">
              <Checkbox checked={checked} disabled={!canEdit || date > today || busy}
                aria-label={`${checked ? "Desmarcar" : "Marcar como hecha"} ${task.title} del ${day}`}
                onCheckedChange={(value) => toggle(task, date, value === true)} />
              <div className="min-w-0 flex-1"><p className={cn("text-[13px] text-text-primary", checked && "text-text-tertiary line-through")}>{task.title}</p><p className="text-xs text-text-tertiary">{memberName(task.assignee_member_id)}</p></div>
              {canEdit && <div className="flex shrink-0 gap-0.5">
                <Button variant="ghost" size="icon-sm" aria-label={`Editar ${task.title}`} onClick={() => setDraft({ id: task.id, title: task.title, weekday: task.weekday, memberId: editableMemberIds.includes(task.assignee_member_id) ? task.assignee_member_id : eligibleMembers[0]?.id ?? "" })}><Pencil /></Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Eliminar ${task.title}`} onClick={() => setTaskToDelete(task)}><Trash2 /></Button>
              </div>}
            </div>;
          })}</div>}
        </section>;
      })}
    </Card>}
    {eligibleMembers.length === 0 && canEdit && <p className="text-[13px] text-text-secondary">Da permiso para editar tareas a un miembro antes de asignarle una.</p>}
    <p className="text-[13px] text-text-tertiary">La persona asignada recibirá un aviso en la app y por correo el día de la tarea. Si sigue pendiente, recibirá otro al día siguiente.</p>

    <Dialog open={draft !== null} onOpenChange={(open) => { if (!open) setDraft(null); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{draft?.id ? "Editar tarea" : "Nueva tarea"}</DialogTitle><DialogDescription>La tarea se repetirá cada semana.</DialogDescription></DialogHeader>
        {draft && <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="domestic-title">Tarea</Label><Input id="domestic-title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} maxLength={120} placeholder="Por ejemplo, sacar la basura" required /></div>
          <div className="space-y-1.5"><Label htmlFor="domestic-member">Responsable</Label><select id="domestic-member" value={draft.memberId} onChange={(event) => setDraft({ ...draft, memberId: event.target.value })} className={cn(inputClassName, "h-11 md:h-8")} required>{eligibleMembers.map((member) => <option key={member.id} value={member.id}>{memberName(member.id)}</option>)}</select></div>
          <div className="space-y-1.5"><Label htmlFor="domestic-day">Día de la semana</Label><select id="domestic-day" value={draft.weekday} onChange={(event) => setDraft({ ...draft, weekday: Number(event.target.value) })} className={cn(inputClassName, "h-11 md:h-8")}>{WEEKDAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setDraft(null)}>Cancelar</Button><Button type="submit" disabled={busy}>Guardar tarea</Button></div>
        </form>}
      </DialogContent>
    </Dialog>

    <AlertDialog open={taskToDelete !== null} onOpenChange={(open) => { if (!open) setTaskToDelete(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>¿Eliminar esta tarea?</AlertDialogTitle><AlertDialogDescription>Se borrará «{taskToDelete?.title}» y su historial de checks.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={busy} onClick={remove}>Eliminar tarea</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
