import { createClient } from "@/lib/supabase/server";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

type Draft = { name: string | null; brand: string | null; units: number | null; expiration_date: string | null; confidence: number };

function isDraft(value: unknown): value is Draft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  return (draft.name === null || (typeof draft.name === "string" && draft.name.length <= 180))
    && (draft.brand === null || (typeof draft.brand === "string" && draft.brand.length <= 120))
    && (draft.units === null || (Number.isInteger(draft.units) && Number(draft.units) >= 1 && Number(draft.units) <= 9999))
    && (draft.expiration_date === null || (typeof draft.expiration_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(draft.expiration_date)))
    && typeof draft.confidence === "number" && draft.confidence >= 0 && draft.confidence <= 1;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sesión caducada." }, { status: 401 });
  const key = process.env.OPENAI_API_KEY ?? process.env.OPENAI_KEY;
  if (!key) return Response.json({ error: "Configura OPENAI_API_KEY para analizar fotos." }, { status: 503 });

  const form = await request.formData();
  const image = form.get("image");
  if (!(image instanceof File) || !allowedTypes.has(image.type) || image.size === 0 || image.size > 5 * 1024 * 1024) {
    return Response.json({ error: "Usa una foto JPG, PNG o WebP de hasta 5 MB." }, { status: 422 });
  }
  const base64 = Buffer.from(await image.arrayBuffer()).toString("base64");
  const ai = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL ?? "gpt-5-mini",
      store: false,
      input: [{ role: "user", content: [
        { type: "input_text", text: "Extrae el nombre, la marca, las unidades físicas y la fecha de caducidad visibles. Usa null si un dato no se lee con certeza. No confundas peso o volumen con unidades." },
        { type: "input_image", image_url: `data:${image.type};base64,${base64}`, detail: "high" },
      ] }],
      text: { format: { type: "json_schema", name: "stockalert_product", strict: true, schema: {
        type: "object", properties: {
          name: { type: ["string", "null"] }, brand: { type: ["string", "null"] },
          units: { type: ["integer", "null"] }, expiration_date: { type: ["string", "null"] },
          confidence: { type: "number" },
        },
        required: ["name", "brand", "units", "expiration_date", "confidence"], additionalProperties: false,
      } } },
    }),
  });
  if (!ai.ok) return Response.json({ error: "No se pudo analizar la foto." }, { status: 502 });
  const result = await ai.json() as { output_text?: string; output?: { content?: { type?: string; text?: string }[] }[] };
  const output = result.output_text ?? result.output?.flatMap((item) => item.content ?? []).filter((item) => item.type === "output_text").map((item) => item.text ?? "").join("");
  let parsed: unknown;
  try { parsed = JSON.parse(output ?? ""); } catch { return Response.json({ error: "La foto no produjo datos válidos." }, { status: 502 }); }
  if (!isDraft(parsed)) return Response.json({ error: "No se pudieron leer los datos con suficiente certeza." }, { status: 422 });
  const date = parsed.expiration_date;
  const validDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
  const needsReview = !parsed.name?.trim() || !parsed.units || !validDate;
  const extension = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("stockalert-images").upload(path, image, { contentType: image.type });
  if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 });
  const { data, error } = await supabase.from("stockalert_products").insert({
    owner_id: user.id, name: parsed.name?.trim() || "Producto por identificar", brand: parsed.brand?.trim() || null,
    units: parsed.units, expiration_date: validDate ? date : null, confidence: parsed.confidence,
    needs_review: Boolean(needsReview), status: "pending", source_image_path: path,
  }).select("id").single();
  if (error) {
    await supabase.storage.from("stockalert-images").remove([path]);
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ id: data.id, needs_review: Boolean(needsReview) });
}
