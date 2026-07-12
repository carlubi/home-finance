"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signup } from "../actions";
import { getSafeNextPath } from "@/lib/navigation";
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

function RegistroForm() {
  const [state, formAction, pending] = useActionState(signup, null);
  const success = state && "ok" in state && state.ok;
  const searchParams = useSearchParams();
  const next =
    state && "next" in state && state.next
      ? state.next
      : getSafeNextPath(searchParams.get("next"), "/onboarding");
  const email =
    state && "email" in state && state.email
      ? state.email
      : searchParams.get("email") ?? "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear cuenta</CardTitle>
        <CardDescription>Empieza a controlar tus finanzas en minutos</CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="grid gap-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
              {state.message}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Revisa tu bandeja de entrada y luego{" "}
              <Link
                href={{ pathname: "/login", query: { next, email } }}
                className="text-foreground underline"
              >
                inicia sesión
              </Link>{" "}
              para continuar.
            </p>
          </div>
        ) : (
          <form action={formAction} className="grid gap-4">
            <input type="hidden" name="next" value={next} />
            <div className="grid gap-2">
              <Label htmlFor="full_name">Nombre</Label>
              <Input id="full_name" name="full_name" required autoComplete="name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                defaultValue={email}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña</Label>
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
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? "Creando cuenta…" : "Crear cuenta"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link
                href={{ pathname: "/login", query: { next, email } }}
                className="text-foreground underline"
              >
                Inicia sesión
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function RegistroPage() {
  return (
    <Suspense>
      <RegistroForm />
    </Suspense>
  );
}
