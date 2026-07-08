// Edge Function: genera el informe financiero mensual personalizado con
// OpenAI, teniendo en cuenta el informe anterior, el objetivo del usuario,
// sus hábitos, gastos fijos, inversiones y su evolución histórica.

import OpenAI from "npm:openai";
import { corsHeaders, json, requireUser } from "../_shared/utils.ts";

const MODEL = "gpt-4.1";

const REPORT_SCHEMA = {
  type: "object",
  properties: {
    resumen_ejecutivo: { type: "string" },
    diagnostico: { type: "string" },
    gastos_evitables: { type: "array", items: { type: "string" } },
    gastos_impulsivos: { type: "array", items: { type: "string" } },
    patrones: { type: "array", items: { type: "string" } },
    recomendaciones: { type: "array", items: { type: "string" } },
    plan_accion: { type: "array", items: { type: "string" } },
    comparacion_informe_anterior: { type: "string" },
    conclusion: { type: "string" },
  },
  required: [
    "resumen_ejecutivo",
    "diagnostico",
    "gastos_evitables",
    "gastos_impulsivos",
    "patrones",
    "recomendaciones",
    "plan_accion",
    "comparacion_informe_anterior",
    "conclusion",
  ],
  additionalProperties: false,
} as const;

interface Report {
  resumen_ejecutivo: string;
  diagnostico: string;
  gastos_evitables: string[];
  gastos_impulsivos: string[];
  patrones: string[];
  recomendaciones: string[];
  plan_accion: string[];
  comparacion_informe_anterior: string;
  conclusion: string;
}

function toMarkdown(month: string, r: Report): string {
  const list = (items: string[]) =>
    items.length ? items.map((i) => `- ${i}`).join("\n") : "_Nada destacable._";
  return `# Informe financiero · ${month.slice(0, 7)}

## Resumen ejecutivo
${r.resumen_ejecutivo}

## Diagnóstico financiero
${r.diagnostico}

## Gastos evitables
${list(r.gastos_evitables)}

## Gastos que parecen impulsivos
${list(r.gastos_impulsivos)}

## Patrones detectados
${list(r.patrones)}

## Recomendaciones prácticas
${list(r.recomendaciones)}

## Plan de acción para el próximo mes
${list(r.plan_accion)}

## Comparación con el informe anterior
${r.comparacion_informe_anterior}

## Conclusión
${r.conclusion}
`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { supabase, user } = await requireUser(req);
  if (!user) return json({ error: "No autorizado" }, 401);

  const { month } = await req.json();
  if (!/^\d{4}-\d{2}-01$/.test(month ?? "")) {
    return json({ error: "Mes no válido (YYYY-MM-01)" }, 400);
  }

  try {
    const [y, m] = month.split("-").map(Number);
    const nextMonth = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`;
    const prevReportMonth = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}-01`;

    const [expenses, income, summaries, onboarding, fixed, investments, prevReport] =
      await Promise.all([
        supabase
          .from("expenses")
          .select("name, amount, occurred_at, payment_method, categories(name)")
          .gte("occurred_at", month)
          .lt("occurred_at", nextMonth)
          .order("occurred_at"),
        supabase
          .from("income")
          .select("name, amount, occurred_at, is_recurring, categories(name)")
          .gte("occurred_at", month)
          .lt("occurred_at", nextMonth),
        supabase
          .from("monthly_summary")
          .select("*")
          .eq("user_id", user.id)
          .order("month", { ascending: false })
          .limit(13),
        supabase.from("onboarding_answers").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("fixed_expenses").select("name, amount").eq("user_id", user.id),
        supabase.from("investments").select("name, monthly_amount, accumulated_capital"),
        supabase
          .from("monthly_reports")
          .select("content_md")
          .eq("user_id", user.id)
          .eq("month", prevReportMonth)
          .maybeSingle(),
      ]);

    if ((expenses.data ?? []).length === 0 && (income.data ?? []).length === 0) {
      return json({ error: "No hay movimientos en ese mes." }, 400);
    }

    const context = {
      mes: month,
      objetivo_financiero: onboarding.data?.financial_goal ?? null,
      habitos_declarados: onboarding.data?.consumption_habits ?? [],
      gastos_fijos_declarados: fixed.data ?? [],
      inversiones: investments.data ?? [],
      gastos_del_mes: expenses.data ?? [],
      ingresos_del_mes: income.data ?? [],
      resumen_ultimos_meses: summaries.data ?? [],
      informe_anterior: prevReport.data?.content_md ?? null,
    };

    const openai = new OpenAI({ apiKey: Deno.env.get("OPEN_AI_API_KEY")! });

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `Eres un asesor financiero personal cercano y práctico. Escribes en español, en segunda persona, con cifras concretas en euros.
Analiza los datos del usuario y genera su informe mensual. Sé específico: cita nombres de gastos e importes reales de los datos. Evita generalidades.
Ten en cuenta su objetivo financiero declarado y compara con meses anteriores y con el informe anterior si existe.
No inventes datos que no estén en el contexto.`,
        },
        {
          role: "user",
          content: `Datos financieros del usuario (JSON):\n${JSON.stringify(context)}\n\nGenera el informe del mes ${month.slice(0, 7)}.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "informe_mensual",
          strict: true,
          schema: REPORT_SCHEMA,
        },
      },
    });

    const choice = completion.choices[0];
    if (choice.finish_reason === "content_filter" || !choice.message.content) {
      throw new Error("No se pudo generar el informe.");
    }

    const report: Report = JSON.parse(choice.message.content);
    const markdown = toMarkdown(month, report);

    const { error: upsertError } = await supabase
      .from("monthly_reports")
      .upsert(
        {
          user_id: user.id,
          month,
          content_md: markdown,
          content_json: report,
        },
        { onConflict: "user_id,month" }
      );
    if (upsertError) throw new Error(upsertError.message);

    return json({ ok: true, markdown });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return json({ error: message }, 500);
  }
});
