"use client";

import { useState, useTransition } from "react";
import { Copy, Mail, UserPlus, UserX } from "lucide-react";
import { toast } from "sonner";
import { inviteFamilyMember, removeFamilyMember } from "@/app/(app)/familia/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Member = { id: string; email: string; display_name: string | null; role: "owner" | "member"; status: "invited" | "active" | "removed"; user_id: string | null };

export function FamilyMembersCard({ unitId, members, isOwner }: { unitId: string; members: Member[]; isOwner: boolean }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const active = members.filter((member) => member.status !== "removed");
  return <Card>
    <CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle className="text-base">Miembros de la unidad familiar</CardTitle>{isOwner && <Button size="sm" onClick={() => setOpen(true)}><UserPlus />Invitar</Button>}</CardHeader>
    <CardContent className="grid gap-2">
      {active.map((member) => <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
        <span className="min-w-0 truncate">{member.display_name || member.email}{member.role === "owner" && " · Propietario"}</span>
        <div className="flex items-center gap-2"><Badge variant={member.status === "active" ? "secondary" : "outline"}>{member.status === "active" ? "Activo" : "Pendiente"}</Badge>{isOwner && member.role !== "owner" && <Button variant="ghost" size="icon" aria-label={`Eliminar a ${member.email}`} onClick={() => startTransition(async () => { const result = await removeFamilyMember(unitId, member.id); if (result.error) toast.error(result.error); else toast.success("Miembro eliminado."); })}><UserX /></Button>}</div>
      </div>)}
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Invitar a la unidad familiar</DialogTitle></DialogHeader>{inviteUrl ? <div className="grid gap-3"><p className="text-sm text-muted-foreground">Comparte este enlace si el correo no llega.</p><Input readOnly value={inviteUrl} /><Button onClick={() => { navigator.clipboard.writeText(inviteUrl); toast.success("Enlace copiado."); }}><Copy />Copiar enlace</Button></div> : <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); startTransition(async () => { const result = await inviteFamilyMember(unitId, email); if (result.error) toast.error(result.error); else { setInviteUrl(result.inviteUrl ?? null); toast.success(result.emailSent ? "Invitación enviada." : "Invitación creada."); } }); }}><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="persona@email.com" required /><Button type="submit" disabled={pending}>{pending ? "Invitando…" : <><Mail />Enviar invitación</>}</Button></form>}</DialogContent></Dialog>
    </CardContent>
  </Card>;
}
