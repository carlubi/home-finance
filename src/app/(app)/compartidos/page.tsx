import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { CreateGroupForm } from "./create-group-form";

export const metadata = { title: "Gastos compartidos" };

export default async function CompartidosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: groups } = await supabase
    .from("shared_groups")
    .select("id, name, shared_group_members(id, status)")
    .order("created_at");

  const list = (groups ?? []) as {
    id: string;
    name: string;
    shared_group_members: { id: string; status: string }[];
  }[];

  return (
    <div className="grid max-w-2xl gap-4">
      <h1 className="text-2xl font-semibold">Gastos compartidos</h1>

      {list.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <Users className="mx-auto mb-2 size-8 text-muted-foreground" />
          <p className="mb-4 text-sm text-muted-foreground">
            Crea un grupo para compartir gastos con las personas con las que
            convives: alquiler, luz, agua, supermercado…
          </p>
          <CreateGroupForm />
        </div>
      ) : (
        <>
          <div className="grid gap-2">
            {list.map((g) => (
              <Link key={g.id} href={`/compartidos/${g.id}`}>
                <Card className="card-lift">
                  <CardContent className="flex items-center gap-3">
                    <Users className="size-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">{g.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {
                          g.shared_group_members.filter((m) => m.status === "active")
                            .length
                        }{" "}
                        integrantes
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <div>
            <CreateGroupForm />
          </div>
        </>
      )}
    </div>
  );
}
