"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileUp, Loader2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";

export function UploadZone({ userId }: { userId: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();

  async function onFile(file: File) {
    const supabase = createClient();
    try {
      setBusy("Subiendo archivo…");
      const path = `${userId}/imports/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: row, error: insertError } = await supabase
        .from("imported_files")
        .insert({
          user_id: userId,
          file_path: path,
          file_name: file.name,
          mime_type: file.type || null,
          status: "pending",
        })
        .select("id")
        .single();
      if (insertError || !row) throw insertError;

      setBusy("Analizando con IA… puede tardar un poco");
      const { data, error } = await supabase.functions.invoke("import-document", {
        body: { import_id: row.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Detectadas ${data.count} transacciones. Revisa y confirma.`);
      router.push(`/importar/${row.id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo procesar.";
      toast.error(message);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Label
        htmlFor="import-file"
        className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed p-10 text-center transition-colors hover:bg-accent/40"
      >
        {busy ? (
          <>
            <Loader2 className="size-7 animate-spin text-muted-foreground" />
            <span className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
              <Sparkles className="size-3.5" />
              {busy}
            </span>
          </>
        ) : (
          <>
            <FileUp className="size-7 text-muted-foreground" />
            <span className="text-sm font-normal text-muted-foreground">
              Pulsa para subir Excel, CSV, PDF, Word o imagen de ticket
            </span>
          </>
        )}
      </Label>
      <input
        id="import-file"
        type="file"
        className="hidden"
        disabled={busy !== null}
        accept=".csv,.xls,.xlsx,.pdf,.doc,.docx,.txt,image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </>
  );
}
