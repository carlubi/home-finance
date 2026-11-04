"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight, Copy, Plus, UserPlus, Trash2 } from "lucide-react";
import { inviteFamilyMember, removeFamilyMember } from "@/app/(app)/familia/actions";
import { createFamily, renameFamily, selectFamily, setMemberPermission } from "./actions";
import { type FamilyAccess, type FamilySection, type FamilyUnit } from "@/lib/family-unit";
import { PageHeader } from "@/components/layout/page-header";
import { useLanguage } from "@/components/layout/language-provider";
import { translateUiText } from "@/lib/language";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, inputClassName } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export type ManagedMember = { id: string; email: string; display_name: string | null; role: "owner" | "member"; status: "invited" | "active" | "removed"; user_id: string | null };
export type ManagedPermission = { member_id: string; section: FamilySection; access: FamilyAccess };

const SECTIONS: { id: FamilySection; label: string }[] = [
  { id: "expenses", label: "Gastos" }, { id: "menus", label: "Menús" },
  { id: "pantry", label: "Despensa" }, { id: "mortgage", label: "Hipoteca" },
  { id: "tasks", label: "Tareas domésticas" }, { id: "overview", label: "Visión global" },
];

export function MembersManagementView({ unit, units, ownerCount, isOwner, members, permissions }: {
  unit: FamilyUnit; units: FamilyUnit[]; ownerCount: number; isOwner: boolean;
  members: ManagedMember[]; permissions: ManagedPermission[];
}) {
  const router = useRouter();
  const { language } = useLanguage();
  const t = (value: string) => translateUiText(value, language);
  const [busy, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [name, setName] = useState(unit.name);
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ManagedMember | null>(null);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [access, setAccess] = useState<Record<string, FamilyAccess>>(() => Object.fromEntries(permissions.map((row) => [`${row.member_id}:${row.section}`, row.access])));

  function changeFamily(id: string) {
    if (id === unit.id) return;
    startTransition(async () => {
      try {
        const result = await selectFamily(id);
        if (result.error) toast.error(t(result.error));
        else router.refresh();
      } catch { toast.error(t("No se pudo cambiar de unidad familiar.")); }
    });
  }

  function create() {
    startTransition(async () => {
      try {
        const result = await createFamily(newName);
        if (result.error) { toast.error(t(result.error)); return; }
        setCreateOpen(false);
        setNewName("");
        toast.success(t("Unidad familiar creada"));
        router.refresh();
      } catch { toast.error(t("No se pudo crear la unidad familiar.")); }
    });
  }

  function rename() {
    startTransition(async () => {
      try {
        const result = await renameFamily(name);
        if (result.error) toast.error(t(result.error));
        else { toast.success(t("Nombre actualizado")); router.refresh(); }
      } catch { toast.error(t("No se pudo cambiar el nombre.")); }
    });
  }

  function invite() {
    startTransition(async () => {
      try {
        const result = await inviteFamilyMember(unit.id, email);
        if (result.error) { toast.error(t(result.error)); return; }
        setEmail("");
        setInviteUrl(result.inviteUrl ?? null);
        toast.success(t(result.emailSent ? "Invitación enviada" : "Invitación creada. Copia el enlace para compartirla."));
        router.refresh();
      } catch { toast.error(t("No se pudo invitar a esa persona.")); }
    });
  }

  function changePermission(memberId: string, section: FamilySection, next: FamilyAccess) {
    const key = `${memberId}:${section}`;
    const previous = access[key] ?? "none";
    setAccess((current) => ({ ...current, [key]: next }));
    startTransition(async () => {
      try {
        const result = await setMemberPermission(memberId, section, next);
        if (result.error) throw new Error(result.error);
        toast.success(t("Permiso actualizado"));
        router.refresh();
      } catch (error) {
        setAccess((current) => ({ ...current, [key]: previous }));
        toast.error(t(error instanceof Error ? error.message : "No se pudo actualizar el permiso."));
      }
    });
  }

  function remove() {
    if (!removeTarget) return;
    startTransition(async () => {
      try {
        const result = await removeFamilyMember(unit.id, removeTarget.id);
        if (result.error) { toast.error(t(result.error)); return; }
        setRemoveTarget(null);
        toast.success(t("Miembro eliminado de la unidad"));
        router.refresh();
      } catch { toast.error(t("No se pudo eliminar al miembro.")); }
    });
  }

  return <div className="space-y-6">
    <PageHeader eyebrow="Familia" title="Gestión de miembros" description="Elige la unidad familiar y controla el acceso a cada sección."
      actions={ownerCount < 3 ? <Button onClick={() => setCreateOpen(true)}><Plus /> Nueva familia</Button> : undefined} />

    <Card className="gap-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="family-selector">Unidad familiar activa</Label>
          <select id="family-selector" value={unit.id} disabled={busy} onChange={(event) => changeFamily(event.target.value)} className={cn(inputClassName, "h-11 max-w-sm md:h-8")}>
            {units.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
        </div>
        <span className="text-[13px] text-text-tertiary">{ownerCount} de 3 familias creadas</span>
      </div>
      {isOwner && <form onSubmit={(event) => { event.preventDefault(); rename(); }} className="flex flex-wrap items-end gap-2 border-t border-border-primary pt-4">
        <div className="min-w-0 flex-1 space-y-1.5"><Label htmlFor="family-name">Nombre de esta familia</Label><Input id="family-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} /></div>
        <Button type="submit" variant="outline" disabled={busy || name.trim() === unit.name}>Guardar nombre</Button>
      </form>}
    </Card>

    {isOwner ? <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-base font-medium text-text-primary">Miembros y permisos</h2><p className="mt-1 text-[13px] text-text-secondary">Los cambios de acceso se aplican al instante.</p></div>
      </div>
      <Card className="gap-0 p-4">
        <form onSubmit={(event) => { event.preventDefault(); invite(); }} className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1 space-y-1.5"><Label htmlFor="invite-email">Añadir usuario por correo</Label><Input id="invite-email" type="email" required placeholder="persona@email.com" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
          <Button type="submit" disabled={busy}><UserPlus /> Invitar</Button>
        </form>
        <p className="mt-2 text-xs text-text-tertiary">Las personas nuevas empiezan sin acceso. Puedes darles permisos antes de que acepten la invitación.</p>
        {inviteUrl && <div className="mt-3 flex items-center gap-2 border-t border-border-primary pt-3"><Input readOnly aria-label="Enlace de invitación" value={inviteUrl} /><Button variant="outline" size="icon" aria-label="Copiar enlace" onClick={async () => { await navigator.clipboard.writeText(inviteUrl); toast.success(t("Enlace copiado")); }}><Copy /></Button></div>}
      </Card>

      <div className="space-y-2">{members.map((member) => {
        const expanded = expandedMemberId === member.id;
        return <Card key={member.id} className="gap-0 py-0">
        <div className={cn("flex items-center gap-2 pr-3", expanded && "border-b border-border-primary")}>
          <button type="button" aria-expanded={expanded} aria-controls={`member-permissions-${member.id}`}
            onClick={() => setExpandedMemberId(expanded ? null : member.id)}
            className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-md px-4 py-2 text-left transition-fast outline-none hover:bg-bg-tertiary/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
          >
            <ChevronRight aria-hidden className={cn("size-4 shrink-0 text-text-tertiary transition-transform duration-150", expanded && "rotate-90")} />
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-text-primary">{member.display_name || member.email}</span><span className="block truncate text-xs text-text-tertiary">{member.email}</span></span>
            <Badge variant={member.role === "owner" ? "secondary" : member.status === "active" ? "success" : "neutral"}>{member.role === "owner" ? "Propietario" : member.status === "active" ? "Activo" : "Invitado"}</Badge>
          </button>
          {member.role !== "owner" && <Button variant="ghost" size="icon-sm" aria-label={t(`Eliminar a ${member.email}`)} onClick={() => setRemoveTarget(member)}><Trash2 /></Button>}
        </div>
        <div id={`member-permissions-${member.id}`} hidden={!expanded}>
        {member.role === "owner" ? <p className="px-4 py-3 text-[13px] text-text-secondary">Acceso completo a todas las secciones.</p> : <div className="divide-y divide-border-primary px-4">
          {SECTIONS.map((section) => <div key={section.id} className="flex min-h-12 items-center justify-between gap-3 py-2">
            <Label htmlFor={`permission-${member.id}-${section.id}`} className="text-[13px]">{section.label}</Label>
            <select id={`permission-${member.id}-${section.id}`} value={access[`${member.id}:${section.id}`] ?? "none"} disabled={busy}
              onChange={(event) => changePermission(member.id, section.id, event.target.value as FamilyAccess)}
              className={cn(inputClassName, "h-11 w-36 shrink-0 md:h-8 md:w-40")}>
              <option value="none">Sin acceso</option><option value="view">Solo ver</option><option value="edit">Ver y editar</option>
            </select>
          </div>)}
        </div>}
        </div>
      </Card>;
      })}</div>
    </> : <Card className="p-4"><p className="text-sm text-text-secondary">Solo quien creó esta unidad familiar puede gestionar sus miembros y permisos.</p></Card>}

    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent>
      <DialogHeader><DialogTitle>Nueva unidad familiar</DialogTitle><DialogDescription>Puedes crear hasta tres unidades familiares. El nombre es opcional.</DialogDescription></DialogHeader>
      <form onSubmit={(event) => { event.preventDefault(); create(); }} className="space-y-4"><div className="space-y-1.5"><Label htmlFor="new-family-name">Nombre</Label><Input id="new-family-name" value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={80} placeholder="Mi unidad familiar" /></div><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button><Button type="submit" disabled={busy}>Crear familia</Button></div></form>
    </DialogContent></Dialog>
    <AlertDialog open={removeTarget !== null} onOpenChange={(open) => { if (!open) setRemoveTarget(null); }}><AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>¿Eliminar a esta persona?</AlertDialogTitle><AlertDialogDescription>Perderá el acceso a «{unit.name}». Sus datos ya registrados se conservarán.</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={busy} onClick={remove}>Eliminar miembro</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </div>;
}
