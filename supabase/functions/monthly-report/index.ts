// Edge Function: genera informes financieros personalizados por mes o rango
// de meses con OpenAI, teniendo en cuenta el informe anterior, el objetivo del
// usuario, sus hábitos, gastos fijos, inversiones y su evolución histórica.

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

function toMarkdown(periodLabel: string, r: Report): string {
  const list = (items: string[]) =>
    items.length ? items.map((i) => `- ${i}`).join("\n") : "_Nada destacable._";
  return `# Informe financiero · ${periodLabel}

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

  const payload = await req.json();
  const month = typeof payload?.month === "string" ? payload.month : null;
  const startMonth =
    typeof payload?.start_month === "string" ? payload.start_month : month;
  const endMonth =
    typeof payload?.end_month === "string" ? payload.end_month : month;

  if (!/^\d{4}-\d{2}-01$/.test(startMonth ?? "")) {
    return json({ error: "Mes inicial no válido (YYYY-MM-01)" }, 400);
  }
  if (!/^\d{4}-\d{2}-01$/.test(endMonth ?? "")) {
    return json({ error: "Mes final no válido (YYYY-MM-01)" }, 400);
  }

  try {
    const [startY, startM] = startMonth.split("-").map(Number);
    const [endY, endM] = endMonth.split("-").map(Number);
    const startDate = new Date(startY, startM - 1, 1);
    const endDate = new Date(endY, endM - 1, 1);
    if (startDate > endDate) {
      return json({ error: "El mes inicial no puede ser posterior al final." }, 400);
    }

    const nextAfterEnd = `${endM === 12 ? endY + 1 : endY}-${String(
      endM === 12 ? 1 : endM + 1
    ).padStart(2, "0")}-01`;

    const [expenses, income, summaries, onboarding, fixed, investments, prevMonthly, prevRange] =
      await Promise.all([
        supabase
          .from("expenses")
          .select("name, amount, occurred_at, payment_method, categories(name)")
          .gte("occurred_at", startMonth)
          .lt("occurred_at", nextAfterEnd)
          .order("occurred_at"),
        supabase
          .from("income")
          .select("name, amount, occurred_at, is_recurring, categories(name)")
          .gte("occurred_at", startMonth)
          .lt("occurred_at", nextAfterEnd),
        supabase
          .from("monthly_summary")
          .select("*")
          .eq("user_id", user.id)
          .gte("month", startMonth)
          .lte("month", endMonth)
          .order("month", { ascending: false })
          .limit(24),
        supabase.from("onboarding_answers").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("fixed_expenses").select("name, amount").eq("user_id", user.id),
        supabase.from("investments").select("name, monthly_amount, accumulated_capital"),
        supabase
          .from("monthly_reports")
          .select("content_md, month, created_at")
          .eq("user_id", user.id)
          .lt("month", startMonth)
          .order("month", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("range_reports")
          .select("content_md, start_month, end_month, created_at")
          .eq("user_id", user.id)
          .lt("end_month", startMonth)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if ((expenses.data ?? []).length === 0 && (income.data ?? []).length === 0) {
      return json({ error: "No hay movimientos en ese periodo." }, 400);
    }

    const context = {
      periodo: {
        inicio: startMonth,
        fin: endMonth,
      },
      objetivo_financiero: onboarding.data?.financial_goal ?? null,
      habitos_declarados: onboarding.data?.consumption_habits ?? [],
      gastos_fijos_declarados: fixed.data ?? [],
      inversiones: investments.data ?? [],
      gastos_del_mes: expenses.data ?? [],
      ingresos_del_mes: income.data ?? [],
      resumen_ultimos_meses: summaries.data ?? [],
      informe_anterior:
        (prevMonthly.data?.created_at &&
          prevRange.data?.created_at &&
          prevMonthly.data.created_at > prevRange.data.created_at)
          ? prevMonthly.data?.content_md ?? null
          : prevRange.data?.content_md ?? prevMonthly.data?.content_md ?? null,
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
          content: `Datos financieros del usuario (JSON):\n${JSON.stringify(context)}\n\nGenera el informe del periodo ${startMonth.slice(0, 7)} a ${endMonth.slice(0, 7)}.`,
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
    const periodLabel =
      startMonth === endMonth
        ? startMonth.slice(0, 7)
        : `${startMonth.slice(0, 7)} - ${endMonth.slice(0, 7)}`;
    const markdown = toMarkdown(periodLabel, report);

    const targetTable =
      startMonth === endMonth ? "monthly_reports" : "range_reports";
    const payload =
      startMonth === endMonth
        ? {
            user_id: user.id,
            month: startMonth,
            content_md: markdown,
            content_json: report,
          }
        : {
            user_id: user.id,
            start_month: startMonth,
            end_month: endMonth,
            content_md: markdown,
            content_json: report,
          };

    const { error: upsertError } = await supabase
      .from(targetTable)
      .upsert(payload as never, {
        onConflict:
          startMonth === endMonth
            ? "user_id,month"
            : "user_id,start_month,end_month",
      });
    if (upsertError) throw new Error(upsertError.message);

    return json({ ok: true, markdown, kind: startMonth === endMonth ? "month" : "range" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return json({ error: message }, 500);
  }
});
