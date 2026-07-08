"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  Copy,
  MoreVertical,
  Paperclip,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  UserPlus,
  UserX,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatMoney } from "@/lib/format";
import type { MemberPosition, Transfer } from "@/lib/finance";
import type {
  Category,
  DebtSettlement,
  GroupMember,
  SharedExpense,
  SharedGroup,
} from "@/lib/types";
import {
  deleteSharedExpense,
  inviteMember,
  registerDebtPayment,
  removeMember,
  saveSharedExpense,
} from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

function memberName(members: GroupMember[], id: string) {
  const m = members.find((x) => x.id === id);
  return m?.display_name || m?.email || "Miembro";
}

export function GroupView({
  group,
  members,
  expenses,
  payments,
  positions,
  transfers,
  categories,
  month,
  currentUserId,
}: {
  group: SharedGroup;
  members: GroupMember[];
  expenses: SharedExpense[];
  payments: DebtSettlement[];
  positions: MemberPosition[];
  transfers: Transfer[];
  categories: Category[];
  month: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isOwner = group.owner_id === currentUserId;
  const activeMembers = members.filter((m) => m.status === "active");
  const myMember = members.find((m) => m.user_id === currentUserId);

  // Diálogo de gasto
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editing, setEditing] = useState<SharedExpense | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [parsingReceipt, setParsingReceipt] = useState(false);
  const [uploadedReceiptPath, setUploadedReceiptPath] = useState<string | null>(null);
  const expenseFormRef = useRef<HTMLFormElement>(null);

  // Pago parcial
  const [payTransfer, setPayTransfer] = useState<Transfer | null>(null);
  const [payAmount, setPayAmount] = useState("");

  // Invitación
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  // Filtros del historial
  const [filterMember, setFilterMember] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((e) => {
        if (filterMember !== "all") {
          const involved =
            e.paid_by === filterMember ||
            (e.shared_expense_participants ?? []).some(
              (p) => p.member_id === filterMember
            );
          if (!involved) return false;
        }
        if (filterCategory !== "all" && e.category_id !== filterCategory) {
          return false;
        }
        return true;
      }),
    [expenses, filterMember, filterCategory]
  );

  function openNewExpense() {
    setEditing(null);
    setParticipants(activeMembers.map((m) => m.id));
    setUploadedReceiptPath(null);
    setExpenseOpen(true);
  }

  function openEditExpense(e: SharedExpense) {
    setEditing(e);
    setParticipants((e.shared_expense_participants ?? []).map((p) => p.member_id));
    setUploadedReceiptPath(null);
    setExpenseOpen(true);
  }

  /** Sube el ticket, lo lee con IA y prerrellena el formulario */
  async function onReceiptSelected(file: File) {
    setParsingReceipt(true);
    try {
      const supabase = createClient();
      const path = `${group.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(path, file);
      if (uploadError) throw uploadError;
      setUploadedReceiptPath(path);

      const { data, error } = await supabase.functions.invoke("parse-receipt", {
        body: { path, group_id: group.id },
      });
      if (error || data?.error) throw new Error(data?.error ?? "Fallo al leer");

      const form = expenseFormRef.current;
      if (form) {
        const set = (name: string, value: string) => {
          const el = form.elements.namedItem(name);
          if (el instanceof HTMLInputElement && value) el.value = value;
        };
        if (data.merchant) set("name", data.merchant);
        if (data.total) set("total_amount", String(data.total));
        if (data.date) set("occurred_at", data.date);
      }
      toast.success("Ticket leído. Revisa los datos antes de guardar.");
    } catch {
      toast.error(
        "No se pudo leer el ticket con IA. El archivo queda adjunto igualmente."
      );
    } finally {
      setParsingReceipt(false);
    }
  }

  async function onSubmitExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const form = new FormData(e.currentTarget);

      let receiptPath = uploadedReceiptPath ?? editing?.receipt_path ?? null;
      const file = form.get("receipt") as File | null;
      if (!uploadedReceiptPath && file && file.size > 0) {
        const supabase = createClient();
        const path = `${group.id}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("receipts").upload(path, file);
        if (error) {
          toast.error("No se pudo subir el ticket.");
          return;
        }
        receiptPath = path;
      }

      const result = await saveSharedExpense({
        id: editing?.id,
        group_id: group.id,
        name: String(form.get("name") ?? ""),
        total_amount: Number(form.get("total_amount")),
        occurred_at: String(form.get("occurred_at") ?? ""),
        paid_by: String(form.get("paid_by") ?? ""),
        category_id: String(form.get("category") ?? "") || null,
        notes: String(form.get("notes") ?? "") || null,
        receipt_path: receiptPath,
        participant_ids: participants,
      });
      if (result.error) toast.error(result.error);
      else {
        toast.success("Gasto guardado.");
        setExpenseOpen(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  function payFull(t: Transfer) {
    startTransition(async () => {
      const r = await registerDebtPayment({
        group_id: group.id,
        from_member: t.from,
        to_member: t.to,
        amount: t.amount,
        pending_amount: t.amount,
        month,
      });
      if (r.error) toast.error(r.error);
      else {
        toast.success("Deuda marcada como pagada.");
        router.refresh();
      }
    });
  }

  function payPartial() {
    if (!payTransfer) return;
    const amount = Number(payAmount);
    if (!(amount > 0) || amount > payTransfer.amount + 0.004) {
      toast.error("Importe no válido.");
      return;
    }
    startTransition(async () => {
      const r = await registerDebtPayment({
        group_id: group.id,
        from_member: payTransfer.from,
        to_member: payTransfer.to,
        amount,
        pending_amount: payTransfer.amount,
        month,
      });
      if (r.error) toast.error(r.error);
      else {
        toast.success("Pago registrado.");
        setPayTransfer(null);
        setPayAmount("");
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-4">
      {/* Resumen por integrante */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen del mes</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-96 text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1.5 font-medium">Integrante</th>
                <th className="py-1.5 text-right font-medium">Pagado</th>
                <th className="py-1.5 text-right font-medium">Le corresponde</th>
                <th className="py-1.5 text-right font-medium">Balance</th>
                <th className="py-1.5 text-right font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => {
                const settled = Math.abs(p.net) < 0.005;
                return (
                  <tr key={p.memberId} className="border-t">
                    <td className="py-2">
                      {memberName(members, p.memberId)}
                      {members.find((m) => m.id === p.memberId)?.user_id ===
                        currentUserId && (
                        <span className="text-muted-foreground"> (tú)</span>
                      )}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatMoney(p.paid)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatMoney(p.owes)}
                    </td>
                    <td
                      className={
                        "py-2 text-right font-medium tabular-nums " +
                        (settled
                          ? ""
                          : p.net > 0
                            ? "text-green-700 dark:text-green-500"
                            : "text-red-700 dark:text-red-400")
                      }
                    >
                      {p.net > 0 ? "+" : ""}
                      {formatMoney(p.net)}
                    </td>
                    <td className="py-2 text-right">
                      <Badge variant={settled ? "secondary" : "outline"}>
                        {settled ? "Al día" : p.net > 0 ? "Le deben" : "Debe"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Deudas pendientes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deudas pendientes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {transfers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todo saldado este mes. 🎉
            </p>
          ) : (
            transfers.map((t, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm"
              >
                <span className="font-medium">{memberName(members, t.from)}</span>
                <ArrowRight className="size-4 text-muted-foreground" />
                <span className="font-medium">{memberName(members, t.to)}</span>
                <span className="ml-auto font-semibold tabular-nums">
                  {formatMoney(t.amount)}
                </span>
                <Badge variant="outline">Pendiente</Badge>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      setPayTransfer(t);
                      setPayAmount("");
                    }}
                  >
                    Pago parcial
                  </Button>
                  <Button size="sm" disabled={pending} onClick={() => payFull(t)}>
                    <Check className="size-4" />
                    Pagada
                  </Button>
                </div>
              </div>
            ))
          )}
          {payments.length > 0 && (
            <div className="mt-2 grid gap-1">
              <p className="text-xs font-medium text-muted-foreground">
                Pagos registrados este mes
              </p>
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <Check className="size-3 text-green-600" />
                  {memberName(members, p.from_member)} pagó{" "}
                  {formatMoney(Number(p.paid_amount))} a{" "}
                  {memberName(members, p.to_member)}
                  {p.paid_at && <> · {formatDate(p.paid_at.slice(0, 10))}</>}
                  <Badge variant="outline" className="ml-auto">
                    {p.status === "partial" ? "Parcial" : "Pagada"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gastos + miembros */}
      <Tabs defaultValue="gastos">
        <TabsList>
          <TabsTrigger value="gastos">Gastos ({expenses.length})</TabsTrigger>
          <TabsTrigger value="miembros">
            Integrantes ({activeMembers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gastos" className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filterMember}
              onValueChange={(v) => setFilterMember(String(v))}
              items={[
                { value: "all", label: "Todos los integrantes" },
                ...activeMembers.map((m) => ({
                  value: m.id,
                  label: m.display_name || m.email,
                })),
              ]}
            >
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los integrantes</SelectItem>
                {activeMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.display_name || m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterCategory}
              onValueChange={(v) => setFilterCategory(String(v))}
              items={[
                { value: "all", label: "Todas las categorías" },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            >
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="ml-auto" onClick={openNewExpense}>
              <Plus className="size-4" />
              Añadir gasto
            </Button>
          </div>

          {filteredExpenses.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No hay gastos compartidos este mes.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {filteredExpenses.map((e) => (
                <li key={e.id} className="flex items-center gap-3 p-3">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: e.categories?.color ?? "#898781" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {e.name}
                      {e.receipt_path && (
                        <Paperclip className="ml-1 inline size-3 text-muted-foreground" />
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(e.occurred_at)} · pagó{" "}
                      {memberName(members, e.paid_by)} · entre{" "}
                      {(e.shared_expense_participants ?? []).length}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatMoney(Number(e.total_amount))}
                  </span>
                  {(e.created_by === currentUserId || isOwner) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreVertical className="size-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditExpense(e)}>
                          <Pencil />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() =>
                            startTransition(async () => {
                              const r = await deleteSharedExpense(e.id);
                              if (r.error) toast.error(r.error);
                              else router.refresh();
                            })
                          }
                        >
                          <Trash2 />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="miembros" className="grid gap-3">
          {isOwner && (
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)}>
                <UserPlus className="size-4" />
                Invitar
              </Button>
            </div>
          )}
          <ul className="divide-y rounded-md border">
            {members
              .filter((m) => m.status !== "removed")
              .map((m) => (
                <li key={m.id} className="flex items-center gap-3 p-3 text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{m.display_name || m.email}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <Badge variant={m.status === "active" ? "secondary" : "outline"}>
                    {m.role === "owner"
                      ? "Propietario"
                      : m.status === "invited"
                        ? "Invitación pendiente"
                        : "Integrante"}
                  </Badge>
                  {isOwner && m.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const r = await removeMember(group.id, m.id);
                          if (r.error) toast.error(r.error);
                          else router.refresh();
                        })
                      }
                    >
                      <UserX className="size-4" />
                    </Button>
                  )}
                </li>
              ))}
          </ul>
        </TabsContent>
      </Tabs>

      {/* Diálogo: gasto compartido */}
      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar gasto compartido" : "Nuevo gasto compartido"}
            </DialogTitle>
          </DialogHeader>
          <form ref={expenseFormRef} onSubmit={onSubmitExpense} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="se-name">Nombre</Label>
              <Input
                id="se-name"
                name="name"
                required
                defaultValue={editing?.name ?? ""}
                placeholder="Compra supermercado"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="se-amount">Importe total (€)</Label>
                <Input
                  id="se-amount"
                  name="total_amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  defaultValue={editing?.total_amount ?? ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="se-date">Fecha real</Label>
                <Input
                  id="se-date"
                  name="occurred_at"
                  type="date"
                  required
                  defaultValue={
                    editing?.occurred_at ?? new Date().toISOString().slice(0, 10)
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Pagado por</Label>
              <Select
                name="paid_by"
                defaultValue={editing?.paid_by ?? myMember?.id}
                items={activeMembers.map((m) => ({
                  value: m.id,
                  label: m.display_name || m.email,
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activeMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.display_name || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Se comparte entre</Label>
              <div className="grid gap-1.5">
                {activeMembers.map((m) => (
                  <Label
                    key={m.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border p-2.5 font-normal"
                  >
                    <Checkbox
                      checked={participants.includes(m.id)}
                      onCheckedChange={() =>
                        setParticipants((ps) =>
                          ps.includes(m.id)
                            ? ps.filter((x) => x !== m.id)
                            : [...ps, m.id]
                        )
                      }
                    />
                    {m.display_name || m.email}
                  </Label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                El importe se reparte a partes iguales entre los seleccionados.
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Categoría</Label>
              <Select
                name="category"
                defaultValue={editing?.category_id ?? undefined}
                items={categories.map((c) => ({ value: c.id, label: c.name }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="se-receipt">Ticket o comprobante (opcional)</Label>
              <Input
                id="se-receipt"
                name="receipt"
                type="file"
                accept="image/*,.pdf"
                disabled={parsingReceipt}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onReceiptSelected(f);
                }}
              />
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="size-3" />
                {parsingReceipt
                  ? "Leyendo el ticket con IA…"
                  : "Al subir un ticket, la IA rellenará comercio, fecha e importe."}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="se-notes">Notas (opcional)</Label>
              <Textarea id="se-notes" name="notes" defaultValue={editing?.notes ?? ""} />
            </div>
            <Button type="submit" disabled={saving || participants.length === 0}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo: pago parcial */}
      <Dialog
        open={payTransfer !== null}
        onOpenChange={(open) => !open && setPayTransfer(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar pago parcial</DialogTitle>
          </DialogHeader>
          {payTransfer && (
            <div className="grid gap-4">
              <p className="text-sm text-muted-foreground">
                {memberName(members, payTransfer.from)} debe{" "}
                {formatMoney(payTransfer.amount)} a{" "}
                {memberName(members, payTransfer.to)}.
              </p>
              <div className="grid gap-2">
                <Label htmlFor="pay-amount">Importe pagado (€)</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  min="0.01"
                  max={payTransfer.amount}
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </div>
              <Button onClick={payPartial} disabled={pending}>
                Registrar pago
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo: invitar */}
      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) setInviteUrl(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Invitar al grupo</DialogTitle>
          </DialogHeader>
          {inviteUrl ? (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">
                Invitación creada. Comparte este enlace (también hemos intentado
                enviarlo por email):
              </p>
              <div className="flex items-center gap-2">
                <Input readOnly value={inviteUrl} className="text-xs" />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteUrl);
                    toast.success("Enlace copiado.");
                  }}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>
          ) : (
            <form
              action={(formData) =>
                startTransition(async () => {
                  const r = await inviteMember(
                    group.id,
                    String(formData.get("email") ?? "")
                  );
                  if (r.error) toast.error(r.error);
                  else {
                    setInviteUrl(r.inviteUrl ?? null);
                    router.refresh();
                  }
                })
              }
              className="grid gap-4"
            >
              <div className="grid gap-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  name="email"
                  type="email"
                  required
                  placeholder="ana@email.com"
                />
              </div>
              <Button type="submit" disabled={pending}>
                {pending ? "Invitando…" : "Enviar invitación"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
