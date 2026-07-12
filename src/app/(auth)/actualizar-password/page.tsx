"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updatePassword } from "../actions";
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

export default function ActualizarPasswordPage() {
  const [state, formAction, pending] = useActionState(updatePassword, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva contraseña</CardTitle>
        <CardDescription>Elige una contraseña nueva para tu cuenta</CardDescription>
      </CardHeader>
      <CardContent>
        {state?.ok ? (
          <div className="grid gap-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
              Contraseña actualizada. Ya puedes iniciar sesión con la nueva clave.
            </div>
            <Button render={<Link href="/login" />} className="w-full">
              Iniciar sesión
            </Button>
          </div>
        ) : (
          <form action={formAction} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password">Nueva contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm_password">Confirmar contraseña</Label>
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Guardar contraseña"}
            </Button>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/recuperar" className="text-foreground underline">
            Solicitar otro enlace
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
