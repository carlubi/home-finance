"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createGroup } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateGroupForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Crear grupo
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo grupo de gastos compartidos</DialogTitle>
          </DialogHeader>
          <form
            action={(formData) =>
              startTransition(async () => {
                const r = await createGroup(formData);
                if (r.error) toast.error(r.error);
                else {
                  setOpen(false);
                  router.push(`/compartidos/${r.groupId}`);
                }
              })
            }
            className="grid gap-4"
          >
            <div className="grid gap-2">
              <Label htmlFor="group-name">Nombre del grupo</Label>
              <Input
                id="group-name"
                name="name"
                required
                placeholder="Piso de la calle Mayor"
              />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Creando…" : "Crear grupo"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
