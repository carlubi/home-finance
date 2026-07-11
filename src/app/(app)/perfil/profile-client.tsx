"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";
import { logout } from "@/app/(auth)/actions";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { updateProfileName, deleteAccount } from "./actions";

type GroupRow = {
  id: string;
  name: string;
  role: "owner" | "member";
  status: "active" | "invited" | "removed";
  joined_at: string | null;
  created_at: string;
};

export function ProfileClient({
  fullName,
  email,
  monthlyIncome,
  groups,
}: {
  fullName: string;
  email: string;
  monthlyIncome: number | null;
  groups: GroupRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  const initials = useMemo(
    () =>
      (fullName
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "U"),
    [fullName]
  );

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
          {initials}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Perfil</h1>
          <p className="text-sm text-muted-foreground">
            Edita tu nombre, revisa tu correo y gestiona tu cuenta.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos personales</CardTitle>
          <CardDescription>
            El correo se usa para iniciar sesión y confirmar cambios importantes.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form
            action={(formData) =>
              startTransition(async () => {
                const r = await updateProfileName(formData);
                if (r.error) toast.error(r.error);
                else {
                  toast.success("Nombre actualizado.");
                  router.refresh();
                }
              })
            }
            className="grid gap-4 sm:grid-cols-[1fr_auto]"
          >
            <div className="grid gap-2">
              <Label htmlFor="full_name">Nombre</Label>
              <Input id="full_name" name="full_name" defaultValue={fullName} />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={pending}>
                Guardar
              </Button>
            </div>
          </form>

          <div className="grid gap-1 rounded-xl border bg-muted/30 p-4 text-sm">
            <span className="text-muted-foreground">Correo asociado</span>
            <span className="font-medium">{email}</span>
          </div>

          <div className="grid gap-1 rounded-xl border bg-muted/30 p-4 text-sm">
            <span className="text-muted-foreground">Ingreso mensual</span>
            <span className="font-medium">
              {monthlyIncome ? formatMoney(monthlyIncome) : "No configurado"}
            </span>
            <span className="text-xs text-muted-foreground">
              Puedes editarlo desde Ajustes.
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grupos asociados</CardTitle>
          <CardDescription>
            Estos son los grupos de gastos compartidos en los que participas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tienes grupos asociados todavía.
            </p>
          ) : (
            <div className="grid gap-2">
              {groups.map((group) => (
                <Link
                  key={group.id}
                  href={`/compartidos/${group.id}`}
                  className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-accent/40"
                >
                  <Users className="size-5 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{group.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.role === "owner" ? "Propietario" : "Miembro"}
                      {group.joined_at ? ` · desde ${group.joined_at.slice(0, 10)}` : ""}
                    </p>
                  </div>
                  <Badge variant={group.role === "owner" ? "default" : "secondary"}>
                    {group.status === "active" ? "Activo" : "Pendiente"}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sesión</CardTitle>
          <CardDescription>
            Cierra sesión en este dispositivo o elimina tu cuenta de forma permanente.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setLogoutOpen(true)}>
            <LogOut className="size-4" />
            Cerrar sesión
          </Button>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <ShieldAlert className="size-4" />
            Eliminar cuenta
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a salir de tu sesión actual en este dispositivo. Podrás volver a entrar
              cuando quieras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                startTransition(async () => {
                  await logout();
                })
              }
            >
              Cerrar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cuenta permanentemente</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción borrará tu cuenta y todo lo asociado: perfil, datos personales,
              grupos que hayas creado y registros vinculados. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="confirm-email">
              Escribe tu correo para confirmar
            </Label>
            <Input
              id="confirm-email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={email}
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={confirmEmail.trim().toLowerCase() !== email.toLowerCase()}
              onClick={() =>
                startTransition(async () => {
                  const r = await deleteAccount(confirmEmail);
                  if (r?.error) {
                    toast.error(r.error);
                  }
                })
              }
            >
              Eliminar mi cuenta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
