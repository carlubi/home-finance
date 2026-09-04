"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Copy, Mail, UserPlus, UserX } from "lucide-react";
import { toast } from "sonner";
import { inviteFamilyMember, removeFamilyMember } from "@/app/(app)/familia/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Member = { id: string; email: string; display_name: string | null; role: "owner" | "member"; status: "invited" | "active" | "removed"; user_id: string | null };

export function FamilyMembersCard({ unitId, members, isOwner }: { unitId: string; members: Member[]; isOwner: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const active = members.filter((member) => member.status !== "removed");
  return <Card className="gap-0 py-0 ">
    <CardHeader className="p-0">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls="family-members-content"
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset cursor-pointer"
      >
        <CardTitle className="text-base">Miembros de la unidad familiar</CardTitle>
        <ChevronDown className={`size-4 text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>
    </CardHeader>
    {expanded && <CardContent id="family-members-content" className="grid gap-2 px-4 pb-4 pt-0">
      {isOwner && <div className="flex justify-end"><Button size="sm" className="cursor-pointer" onClick={() => setOpen(true)}><UserPlus />Invitar</Button></div>}
      {active.map((member) => <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
        <span className="min-w-0 truncate">{member.display_name || member.email}{member.role === "owner" && " · Propietario"}</span>
        <div className="flex items-center gap-2"><Badge variant={member.status === "active" ? "secondary" : "outline"}>{member.status === "active" ? "Activo" : "Pendiente"}</Badge>{isOwner && member.role !== "owner" && <Button variant="ghost" size="icon" className="cursor-pointer hover:bg-red-500 hover:text-white" aria-label={`Eliminar a ${member.email}`} onClick={() => startTransition(async () => { const result = await removeFamilyMember(unitId, member.id); if (result.error) toast.error(result.error); else toast.success("Miembro eliminado."); })}><UserX /></Button>}</div>
      </div>)}
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Invitar a la unidad familiar</DialogTitle></DialogHeader>{inviteUrl ? <div className="grid gap-3"><p className="text-sm text-muted-foreground">Comparte este enlace si el correo no llega.</p><Input readOnly value={inviteUrl} /><Button onClick={() => { navigator.clipboard.writeText(inviteUrl); toast.success("Enlace copiado."); }}><Copy />Copiar enlace</Button></div> : <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); startTransition(async () => { const result = await inviteFamilyMember(unitId, email); if (result.error) toast.error(result.error); else { setInviteUrl(result.inviteUrl ?? null); toast.success(result.emailSent ? "Invitación enviada." : "Invitación creada."); } }); }}><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="persona@email.com" required /><Button type="submit" disabled={pending}>{pending ? "Invitando…" : <><Mail />Enviar invitación</>}</Button></form>}</DialogContent></Dialog>
    </CardContent>}
  </Card>;
}
