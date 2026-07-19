// Edge Function: analiza un documento financiero (PDF, CSV, Excel, Word,
// imagen) con OpenAI y guarda las transacciones extraídas en la tabla de
// staging ai_extracted_transactions. Nunca escribe en expenses/income:
// el usuario revisa y confirma en la vista previa.
//
// Los archivos tabulares (CSV/Excel/TXT) se trocean en bloques de filas y se
// extraen en paralelo: con el archivo entero en un solo prompt el modelo
// tiende a resumir y omite transacciones en listados largos.

import OpenAI from "npm:openai";
import * as XLSX from "npm:xlsx@0.18.5";
import { corsHeaders, json, requireUser, toBase64 } from "../_shared/utils.ts";

const MODEL = "gpt-4.1";
const ROWS_PER_CHUNK = 40;
const PARALLEL_CALLS = 4;

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    transactions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["expense", "income"] },
          name: { type: "string", description: "Concepto claro y corto" },
          amount: { type: "number", description: "Importe positivo en euros" },
          occurred_at: {
            type: "string",
            description: "Fecha real de la operación (YYYY-MM-DD)",
          },
          category: {
            type: "string",
            description: "Una categoría de la lista proporcionada",
          },
          is_recurring: {
            type: "boolean",
            description: "true si parece un cargo/ingreso recurrente mensual",
          },
          notes: { type: ["string", "null"] },
        },
        required: [
          "kind",
          "name",
          "amount",
          "occurred_at",
          "category",
          "is_recurring",
          "notes",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["transactions"],
  additionalProperties: false,
} as const;

type Transaction = {
  kind: "expense" | "income";
  name: string;
  amount: number;
  occurred_at: string;
  category: string;
  is_recurring: boolean;
  notes: string | null;
};

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

function systemPrompt() {
  return `Eres un asistente financiero que extrae transacciones de documentos bancarios españoles.
Reglas:
- Devuelve UNA transacción por CADA fila u operación del documento. No resumas, no agrupes y no omitas ninguna: si hay 40 filas de datos, devuelve ~40 transacciones (menos solo las filas no transaccionales o anuladas).
- Omite filas con estado REVERTED, FAILED, DECLINED o PENDING, y líneas de saldo/totales/cabeceras.
- occurred_at es la FECHA REAL de la operación (si hay fecha de inicio y de liquidación, usa la de inicio). Las fechas pueden venir como YYYY-MM-DD o DD/MM/YYYY; devuélvelas siempre como YYYY-MM-DD.
- Importes: 1.234,56 en formato español significa 1234.56. Devuelve siempre números positivos; el signo lo determina "kind".
- Cargos, pagos, compras, recibos y transferencias/Bizum enviados son kind=expense. Abonos, nóminas, recargas, devoluciones (refunds) y transferencias/Bizum recibidos son kind=income (las devoluciones, con categoría "Reembolsos").
- category debe ser EXACTAMENTE una de las listas dadas (según kind). Si dudas, usa "Otros".
- Marca is_recurring=true en suscripciones, domiciliaciones, nóminas y cargos que se repiten cada mes.
- No inventes transacciones que no estén en el documento.`;
}

/** Divide un archivo tabular en bloques de filas, repitiendo la cabecera. */
function chunkTextRows(text: string, rowsPerChunk: number): string[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length <= rowsPerChunk + 1) return [lines.join("\n")];
  const header = lines[0];
  const chunks: string[] = [];
  for (let i = 1; i < lines.length; i += rowsPerChunk) {
    chunks.push([header, ...lines.slice(i, i + rowsPerChunk)].join("\n"));
  }
  return chunks;
}

async function extractFromContent(
  openai: OpenAI,
  content: ContentPart[],
  categoriesText: string
): Promise<Transaction[]> {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 16000,
    messages: [
      { role: "system", content: systemPrompt() },
      {
        role: "user",
        content: [
          ...content,
          { type: "text", text: categoriesText },
        ] as ContentPart[],
      },
    ] as OpenAI.Chat.ChatCompletionMessageParam[],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "transacciones_extraidas",
        strict: true,
        schema: EXTRACTION_SCHEMA,
      },
    },
  });

  const choice = completion.choices[0];
  if (choice.finish_reason === "content_filter" || !choice.message.content) {
    throw new Error("La IA no pudo procesar este documento.");
  }
  if (choice.finish_reason === "length") {
    throw new Error(
      "El documento tiene demasiadas operaciones para un solo análisis. Divide el archivo e inténtalo de nuevo."
    );
  }
  return (JSON.parse(choice.message.content) as { transactions: Transaction[] })
    .transactions;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { supabase, user } = await requireUser(req);
  if (!user) return json({ error: "No autorizado" }, 401);

  const { import_id } = await req.json();
  if (!import_id) return json({ error: "Falta import_id" }, 400);

  const { data: file } = await supabase
    .from("imported_files")
    .select("*")
    .eq("id", import_id)
    .single();
  if (!file) return json({ error: "Archivo no encontrado" }, 404);

  await supabase
    .from("imported_files")
    .update({ status: "processing", error_message: null })
    .eq("id", import_id);

  try {
    const { data: blob, error: downloadError } = await supabase.storage
      .from("documents")
      .download(file.file_path);
    if (downloadError || !blob) throw new Error("No se pudo descargar el archivo");

    const buffer = await blob.arrayBuffer();
    const name: string = (file.file_name ?? "").toLowerCase();

    // Contenido textual (CSV/Excel/TXT) o binario (PDF/imagen)
    let textContent: string | null = null;
    let binaryBlock: ContentPart | null = null;

    if (name.endsWith(".pdf")) {
      binaryBlock = {
        type: "file",
        file: {
          filename: file.file_name,
          file_data: `data:application/pdf;base64,${toBase64(buffer)}`,
        },
      };
    } else if (/\.(png|jpe?g|gif|webp)$/.test(name)) {
      const mediaType = name.endsWith(".png")
        ? "image/png"
        : name.endsWith(".webp")
          ? "image/webp"
          : name.endsWith(".gif")
            ? "image/gif"
            : "image/jpeg";
      binaryBlock = {
        type: "image_url",
        image_url: { url: `data:${mediaType};base64,${toBase64(buffer)}` },
      };
    } else if (/\.(xlsx?|xls)$/.test(name)) {
      const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
      textContent = workbook.SheetNames.map((sheet: string) =>
        XLSX.utils.sheet_to_csv(workbook.Sheets[sheet])
      ).join("\n\n");
    } else {
      // CSV, TXT y resto de formatos basados en texto
      textContent = new TextDecoder().decode(buffer);
    }

    const { data: categories } = await supabase
      .from("categories")
      .select("id, name, kind");
    const expenseCats = (categories ?? []).filter((c) => c.kind === "expense");
    const incomeCats = (categories ?? []).filter((c) => c.kind === "income");
    const categoriesText = `Extrae todas las transacciones.
Categorías de gasto: ${expenseCats.map((c) => c.name).join(", ")}
Categorías de ingreso: ${incomeCats.map((c) => c.name).join(", ")}`;

    const openai = new OpenAI({ apiKey: Deno.env.get("OPEN_AI_API_KEY")! });

    let transactions: Transaction[] = [];
    if (textContent !== null) {
      // Tabular: extraer por bloques de filas, en tandas paralelas
      const chunks = chunkTextRows(textContent, ROWS_PER_CHUNK);
      for (let i = 0; i < chunks.length; i += PARALLEL_CALLS) {
        const batch = chunks.slice(i, i + PARALLEL_CALLS);
        const results = await Promise.all(
          batch.map((chunk) =>
            extractFromContent(
              openai,
              [
                {
                  type: "text",
                  text: `Fragmento de un archivo tabular (la primera línea es la cabecera):\n${chunk}`,
                },
              ],
              categoriesText
            )
          )
        );
        transactions = transactions.concat(...results);
      }
    } else if (binaryBlock !== null) {
      transactions = await extractFromContent(openai, [binaryBlock], categoriesText);
    }

    const byName = new Map(
      (categories ?? []).map((c) => [`${c.kind}:${c.name.toLowerCase()}`, c.id])
    );

    const rows = transactions
      .filter((t) => t.amount > 0 && t.name && t.occurred_at)
      .map((t) => ({
        import_id,
        user_id: user.id,
        kind: t.kind,
        name: t.name.slice(0, 200),
        suggested_category_id:
          byName.get(`${t.kind}:${t.category?.toLowerCase()}`) ??
          byName.get(`${t.kind}:otros`) ??
          null,
        amount: t.amount,
        occurred_at: t.occurred_at,
        is_recurring: t.is_recurring ?? false,
        notes: t.notes,
        status: "pending",
      }));

    if (rows.length > 0) {
      const { error: insertError } = await supabase
        .from("ai_extracted_transactions")
        .insert(rows);
      if (insertError) throw new Error(insertError.message);
    }

    await supabase
      .from("imported_files")
      .update({ status: "ready" })
      .eq("id", import_id);

    return json({ ok: true, count: rows.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    await supabase
      .from("imported_files")
      .update({ status: "error", error_message: message })
      .eq("id", import_id);
    return json({ error: message }, 500);
  }
});
