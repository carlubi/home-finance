import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronRight, FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import type { ImportScope, ImportedFile } from "@/lib/types";
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
  searchParams: Promise<{ mes?: string; scope?: string }>;
}) {
  const { mes, scope } = await searchParams;
  const importScope: ImportScope = scope === "family" ? "family" : "personal";
  const validMonth = /^\d{4}-\d{2}$/.test(mes ?? "");
  const backHref = importScope === "family"
    ? validMonth
      ? { pathname: "/familia", query: { mes } }
      : "/familia"
    : validMonth
      ? { pathname: "/", query: { mes } }
      : "/";
  const scopeHref = (nextScope: ImportScope) => {
    const params = new URLSearchParams({ scope: nextScope });
    if (validMonth) params.set("mes", mes!);
    return `/importar?${params.toString()}`;
  };
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { data: files } = await supabase
    .from("imported_files")
    .select("*")
    .eq("import_scope", importScope)
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
          Volver a {importScope === "family" ? "gastos familiares" : "gastos personales"}
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">
            Importar {importScope === "family" ? "gastos familiares" : "gastos personales"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sube un extracto bancario, un Excel de gastos o la foto de un ticket. La IA
            extraerá las operaciones y podrás revisarlas antes de guardarlas.
          </p>
        </div>
      </div>

      <div className="grid gap-2 rounded-xl border bg-muted/20 p-3">
        <div>
          <p className="text-sm font-medium">Guardar documento en</p>
          <p className="text-xs text-muted-foreground">
            Esta elección determina dónde se guardarán los movimientos al confirmar.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            nativeButton={false}
            render={<Link href={scopeHref("personal")} />}
            variant={importScope === "personal" ? "default" : "outline"}
          >
            Gastos personales
          </Button>
          <Button
            nativeButton={false}
            render={<Link href={scopeHref("family")} />}
            variant={importScope === "family" ? "default" : "outline"}
          >
            Gastos unidad familiar
          </Button>
        </div>
      </div>

      <UploadZone userId={user.id} importScope={importScope} />

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
                    {" · "}
                    {f.import_scope === "family" ? "Gastos familiares" : "Gastos personales"}
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
