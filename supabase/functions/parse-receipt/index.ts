// Edge Function: lee un ticket o factura (imagen/PDF del bucket receipts)
// con OpenAI y devuelve los datos extraídos para prellenar el formulario.
// El usuario siempre revisa antes de guardar.

import OpenAI from "npm:openai";
import { corsHeaders, json, requireUser, toBase64 } from "../_shared/utils.ts";

const MODEL = "gpt-4.1";

const RECEIPT_SCHEMA = {
  type: "object",
  properties: {
    merchant: { type: ["string", "null"], description: "Nombre del comercio" },
    date: {
      type: ["string", "null"],
      description: "Fecha del ticket (YYYY-MM-DD)",
    },
    total: { type: ["number", "null"], description: "Importe total en euros" },
    category: {
      type: ["string", "null"],
      description: "Una categoría de la lista dada",
    },
    items: {
      type: "array",
      items: { type: "string" },
      description: "Productos o conceptos detectados (máx. 15)",
    },
  },
  required: ["merchant", "date", "total", "category", "items"],
  additionalProperties: false,
} as const;

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { supabase, user } = await requireUser(req);
  if (!user) return json({ error: "No autorizado" }, 401);

  const { path, group_id } = await req.json();
  if (!path || !group_id) return json({ error: "Faltan parámetros" }, 400);

  try {
    const { data: blob, error } = await supabase.storage
      .from("receipts")
      .download(path);
    if (error || !blob) throw new Error("No se pudo descargar el ticket");

    const buffer = await blob.arrayBuffer();
    const lower = String(path).toLowerCase();

    const fileBlock: ContentPart = lower.endsWith(".pdf")
      ? {
          type: "file",
          file: {
            filename: "ticket.pdf",
            file_data: `data:application/pdf;base64,${toBase64(buffer)}`,
          },
        }
      : {
          type: "image_url",
          image_url: {
            url: `data:${
              lower.endsWith(".png")
                ? "image/png"
                : lower.endsWith(".webp")
                  ? "image/webp"
                  : "image/jpeg"
            };base64,${toBase64(buffer)}`,
          },
        };

    const { data: categories } = await supabase
      .from("categories")
      .select("id, name")
      .eq("kind", "expense");

    const openai = new OpenAI({ apiKey: Deno.env.get("OPEN_AI_API_KEY")! });

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: [
            fileBlock,
            {
              type: "text",
              text: `Lee este ticket o factura y extrae comercio, fecha real (YYYY-MM-DD), importe total, productos y categoría.
Formato español: fechas DD/MM/YYYY y decimales con coma.
Categorías posibles: ${(categories ?? []).map((c) => c.name).join(", ")}.`,
            },
          ] as ContentPart[],
        },
      ] as OpenAI.Chat.ChatCompletionMessageParam[],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ticket_extraido",
          strict: true,
          schema: RECEIPT_SCHEMA,
        },
      },
    });

    const choice = completion.choices[0];
    if (choice.finish_reason === "content_filter" || !choice.message.content) {
      throw new Error("La IA no pudo leer este ticket.");
    }

    const parsed = JSON.parse(choice.message.content);

    const category = (categories ?? []).find(
      (c) => c.name.toLowerCase() === String(parsed.category ?? "").toLowerCase()
    );

    // Guardar registro del ticket con lo extraído
    await supabase.from("uploaded_receipts").insert({
      group_id,
      uploader_id: user.id,
      file_path: path,
      parsed,
    });

    return json({
      ok: true,
      merchant: parsed.merchant ?? null,
      date: parsed.date ?? null,
      total: parsed.total ?? null,
      category_id: category?.id ?? null,
      items: parsed.items ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return json({ error: message }, 500);
  }
});
