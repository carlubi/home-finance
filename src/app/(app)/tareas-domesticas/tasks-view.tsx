"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
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
import { useLanguage } from "@/components/layout/language-provider";
import { translateUiText, type AppLanguage } from "@/lib/language";
import { cn } from "@/lib/utils";
import { dateAfterDays, dueDateForWeek, taskDueDateForWeek, weekStart, weekdayOf, WEEKDAYS } from "@/lib/domestic-tasks";
import { deleteDomesticTask, saveDomesticTask, setDomesticTaskDone } from "./actions";

export type FamilyMember = { id: string; user_id: string | null; display_name: string | null; email: string; role: string; status: string };
export type DomesticTask = { id: string; title: string; weekday: number | null; scheduled_date: string | null; starts_on: string; assignee_member_id: string };
export type TaskCompletion = { task_id: string; due_date: string; completed_at: string };
type Draft = { id?: string; title: string; schedule: "weekly" | "once"; weekday: number; scheduledDate: string; memberId: string };

function readableDate(date: string, language: AppLanguage) {
  return new Intl.DateTimeFormat(language === "ca" ? "ca-ES" : "es-ES", { day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00Z`));
}

export function DomesticTasksView({ week, today, currentUserId, members, tasks, completions, loadError, canEdit = true, editableMemberIds }: {
  week: string; today: string; currentUserId: string; members: FamilyMember[]; tasks: DomesticTask[];
  completions: TaskCompletion[]; loadError: string | null; canEdit?: boolean; editableMemberIds: string[];
}) {
  const router = useRouter();
  const { language } = useLanguage();
  const t = (value: string) => translateUiText(value, language);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<DomesticTask | null>(null);
  const [busy, startTransition] = useTransition();
  const [checks, setChecks] = useState(() => new Set(completions.map((item) => `${item.task_id}:${item.due_date}`)));
  const eligibleMembers = members.filter((member) => member.status === "active" && editableMemberIds.includes(member.id));
  const memberName = (id: string) => {
    const member = members.find((item) => item.id === id);
    return member?.display_name?.trim() || member?.email.split("@")[0] || "Miembro";
  };
  const weekTasks = tasks.flatMap((task) => {
    const dueDate = taskDueDateForWeek(task, week);
    return dueDate ? [{ task, dueDate }] : [];
  });
  const total = weekTasks.length;
  const doneCount = weekTasks.filter(({ task, dueDate }) => checks.has(`${task.id}:${dueDate}`)).length;

  function submit() {
    if (!draft) return;
    startTransition(async () => {
      try {
        const result = await saveDomesticTask(draft);
        if (result.error) { toast.error(t(result.error)); return; }
        setDraft(null);
        toast.success(t(draft.id ? "Tarea actualizada" : "Tarea añadida"));
        if (draft.schedule === "once" && weekStart(draft.scheduledDate) !== week) router.push(`/tareas-domesticas?semana=${weekStart(draft.scheduledDate)}`);
        else router.refresh();
      } catch { toast.error(t("No se pudo guardar la tarea.")); }
    });
  }

  function remove() {
    if (!taskToDelete) return;
    startTransition(async () => {
      try {
        const result = await deleteDomesticTask(taskToDelete.id);
        if (result.error) { toast.error(t(result.error)); return; }
        setTaskToDelete(null);
        toast.success(t("Tarea eliminada"));
        router.refresh();
      } catch { toast.error(t("No se pudo eliminar la tarea.")); }
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
        toast.error(t(error instanceof Error ? error.message : "No se pudo actualizar la tarea."));
      }
    });
  }

  return <div className="space-y-6">
    <PageHeader eyebrow="Familia · Organización" title="Tareas Domésticas"
      description="Organiza quién hace cada tarea y cuándo se hace."
      actions={canEdit ? <Button onClick={() => setDraft({ title: "", schedule: "once", scheduledDate: today >= week && today <= dateAfterDays(week, 6) ? today : week, weekday: weekdayOf(today), memberId: eligibleMembers.find((m) => m.user_id === currentUserId)?.id ?? eligibleMembers[0]?.id ?? "" })} disabled={eligibleMembers.length === 0}><Plus /> Nueva tarea</Button> : <span className="text-[13px] text-text-secondary">Solo lectura</span>} />

    {loadError && <p role="alert" className="rounded-lg border border-red/30 bg-red/10 p-3 text-sm text-red">No se pudieron cargar las tareas: {loadError}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-primary pb-4">
      <div>
        <p className="text-[13px] font-medium text-text-primary">Semana del {readableDate(week, language)} al {readableDate(dateAfterDays(week, 6), language)}</p>
        <p className="mt-0.5 text-[13px] text-text-secondary">{doneCount} de {total} tareas completadas</p>
      </div>
      <div className="flex items-center gap-1">
        <Button nativeButton={false} variant="ghost" size="icon" render={<Link href={`/tareas-domesticas?semana=${dateAfterDays(week, -7)}`} aria-label="Semana anterior" />}><ChevronLeft /></Button>
        <Button nativeButton={false} variant="outline" size="sm" render={<Link href="/tareas-domesticas" />}>Esta semana</Button>
        <Button nativeButton={false} variant="ghost" size="icon" render={<Link href={`/tareas-domesticas?semana=${dateAfterDays(week, 7)}`} aria-label="Semana siguiente" />}><ChevronRight /></Button>
      </div>
    </div>

    {weekTasks.length === 0 && !loadError && <p className="text-[13px] text-text-secondary">No hay tareas esta semana. Programa una tarea para un día concreto o repítela cada semana.</p>}
    <Card className="gap-0 overflow-x-auto py-0">
      <div className="grid min-w-[840px] grid-cols-7 divide-x divide-border-primary">
      {WEEKDAYS.map((day, weekday) => {
        const date = dueDateForWeek(week, weekday);
        const dayTasks = weekTasks.filter((item) => item.dueDate === date);
        return <section key={day} aria-label={`${t(day)} ${readableDate(date, language)}`} className={cn("min-h-44 min-w-0 px-2.5 py-3", date === today && "bg-bg-tertiary/50")}>
          <div className="mb-3 flex items-start justify-between gap-1">
            <div><h2 className="text-[13px] font-medium text-text-primary">{t(day)}</h2><p className="text-xs text-text-tertiary">{readableDate(date, language)}</p></div>
            {date === today && <Badge variant="neutral">Hoy</Badge>}
          </div>
          {dayTasks.length === 0 ? <p className="py-1 text-xs text-text-tertiary">Sin tareas</p> : <div className="space-y-2">{dayTasks.map(({ task }) => {
            const checked = checks.has(`${task.id}:${date}`);
            return <div key={task.id} className="rounded-md border border-border-primary bg-bg-secondary p-2">
              <div className="flex items-start gap-2">
              <Checkbox checked={checked} disabled={!canEdit || date > today || busy}
                aria-label={t(`${checked ? "Desmarcar" : "Marcar como hecha"} ${task.title} del ${day}`)}
                onCheckedChange={(value) => toggle(task, date, value === true)} />
              <div className="min-w-0 flex-1"><p className={cn("break-words text-[13px] leading-snug text-text-primary", checked && "text-text-tertiary line-through")}>{task.title}</p><p className="mt-1 truncate text-xs text-text-tertiary">{memberName(task.assignee_member_id)}</p></div>
              </div>
              {canEdit && <div className="mt-1 flex justify-end gap-0.5">
                <Button variant="ghost" size="icon-sm" aria-label={t(`Editar ${task.title}`)} onClick={() => setDraft({ id: task.id, title: task.title, schedule: task.scheduled_date ? "once" : "weekly", scheduledDate: task.scheduled_date ?? date, weekday: task.weekday ?? weekday, memberId: editableMemberIds.includes(task.assignee_member_id) ? task.assignee_member_id : eligibleMembers[0]?.id ?? "" })}><Pencil /></Button>
                <Button variant="ghost" size="icon-sm" aria-label={t(`Eliminar ${task.title}`)} onClick={() => setTaskToDelete(task)}><Trash2 /></Button>
              </div>}
            </div>;
          })}</div>}
        </section>;
      })}
      </div>
    </Card>
    {eligibleMembers.length === 0 && canEdit && <p className="text-[13px] text-text-secondary">Da permiso para editar tareas a un miembro antes de asignarle una.</p>}
    <p className="text-[13px] text-text-tertiary">La persona asignada recibirá un aviso en la app y por correo el día de la tarea. Si sigue pendiente, recibirá otro al día siguiente.</p>

    <Dialog open={draft !== null} onOpenChange={(open) => { if (!open) setDraft(null); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{draft?.id ? "Editar tarea" : "Nueva tarea"}</DialogTitle><DialogDescription>Elige una fecha concreta o un día que se repita cada semana.</DialogDescription></DialogHeader>
        {draft && <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="domestic-title">Tarea</Label><Input id="domestic-title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} maxLength={120} placeholder="Por ejemplo, sacar la basura" required /></div>
          <div className="space-y-1.5"><Label htmlFor="domestic-member">Responsable</Label><select id="domestic-member" value={draft.memberId} onChange={(event) => setDraft({ ...draft, memberId: event.target.value })} className={cn(inputClassName, "h-11 md:h-8")} required>{eligibleMembers.map((member) => <option key={member.id} value={member.id}>{memberName(member.id)}</option>)}</select></div>
          <div className="space-y-1.5"><Label htmlFor="domestic-schedule">Programación</Label><select id="domestic-schedule" value={draft.schedule} onChange={(event) => setDraft({ ...draft, schedule: event.target.value as Draft["schedule"] })} className={cn(inputClassName, "h-11 md:h-8")}>
            <option value="once">Fecha concreta</option><option value="weekly">Cada semana</option>
          </select></div>
          {draft.schedule === "once" ? <div className="space-y-1.5"><Label htmlFor="domestic-date">Fecha</Label><Input id="domestic-date" type="date" value={draft.scheduledDate} onChange={(event) => setDraft({ ...draft, scheduledDate: event.target.value })} required /></div>
            : <div className="space-y-1.5"><Label htmlFor="domestic-day">Día de la semana</Label><select id="domestic-day" value={draft.weekday} onChange={(event) => setDraft({ ...draft, weekday: Number(event.target.value) })} className={cn(inputClassName, "h-11 md:h-8")}>{WEEKDAYS.map((day, index) => <option key={day} value={index}>{t(day)}</option>)}</select></div>}
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
