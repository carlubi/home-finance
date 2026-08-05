import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronRight, FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import type { ImportedFile } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UploadZone } from "./upload-zone";

export const metadata = { title: "Importar" };

const STATUS_LABEL: Record<ImportedFile["status"], string> = {
  pending: "Pendiente",
  processing: "Analizando…",
  ready: "Listo para revisar",
  confirmed: "Importado",
  error: "Error",
};

export default async function ImportarPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const backHref = /^\d{4}-\d{2}$/.test(mes ?? "")
    ? { pathname: "/", query: { mes } }
    : "/";
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { data: files } = await supabase
    .from("imported_files")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (files ?? []) as ImportedFile[];

  return (
    <div className="grid max-w-2xl gap-4">
      <div className="grid gap-3">
        <Button
          nativeButton={false}
          render={<Link href={backHref} />}
          variant="ghost"
          className="w-fit px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver al resumen
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Importar documentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sube un extracto bancario, un Excel de gastos o la foto de un ticket. La
            IA extraerá las transacciones y podrás revisarlas antes de guardarlas.
          </p>
        </div>
      </div>

      <UploadZone userId={user.id} />

      {list.length > 0 && (
        <ul className="divide-y rounded-md border">
          {list.map((f) => {
            const inner = (
              <>
                <FileText className="size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(f.created_at.slice(0, 10))}
                    {f.status === "error" && f.error_message
                      ? ` · ${f.error_message}`
                      : ""}
                  </p>
                </div>
                <Badge
                  variant={
                    f.status === "ready"
                      ? "default"
                      : f.status === "error"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {STATUS_LABEL[f.status]}
                </Badge>
              </>
            );
            return (
              <li key={f.id}>
                {f.status === "ready" || f.status === "confirmed" ? (
                  <Link
                    href={`/importar/${f.id}`}
                    className="row-hover flex items-center gap-3 p-3"
                  >
                    {inner}
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 p-3">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
