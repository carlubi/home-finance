// Edge Function: genera informes financieros personalizados por mes o rango
// de meses con OpenAI, teniendo en cuenta el informe anterior, el objetivo del
// usuario, sus hábitos, gastos fijos, inversiones y su evolución histórica.

import OpenAI from "npm:openai";
import { adminClient, corsHeaders, json, requireUser } from "../_shared/utils.ts";

const MODEL = "gpt-4.1";

const REPORT_SCHEMA = {
  type: "object",
  properties: {
    resumen_ejecutivo: { type: "string" },
    diagnostico: { type: "string" },
    presupuesto_planificado: { type: "string" },
    desviaciones_presupuesto: { type: "array", items: { type: "string" } },
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
    "presupuesto_planificado",
    "desviaciones_presupuesto",
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
  presupuesto_planificado: string;
  desviaciones_presupuesto: string[];
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

## Presupuesto planificado vs gasto real
${r.presupuesto_planificado}

## Desviaciones del presupuesto
${list(r.desviaciones_presupuesto)}

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

function currentQuotaMonth() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}-01`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { supabase, user } = await requireUser(req);
  if (!user) return json({ error: "No autorizado" }, 401);
  const admin = adminClient();

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

  let usageId: string | null = null;

  try {
    const [startY, startM] = startMonth.split("-").map(Number);
    const [endY, endM] = endMonth.split("-").map(Number);
    const startDate = new Date(startY, startM - 1, 1);
    const endDate = new Date(endY, endM - 1, 1);
    if (startDate > endDate) {
      return json({ error: "El mes inicial no puede ser posterior al final." }, 400);
    }

    const existingReport =
      startMonth === endMonth
        ? await supabase
            .from("monthly_reports")
            .select("id")
            .eq("user_id", user.id)
            .eq("month", startMonth)
            .maybeSingle()
        : await supabase
            .from("range_reports")
            .select("id")
            .eq("user_id", user.id)
            .eq("start_month", startMonth)
            .eq("end_month", endMonth)
            .maybeSingle();

    if (existingReport.error) throw new Error(existingReport.error.message);
    if (existingReport.data) {
      return json(
        {
          error:
            "Ya existe un informe para ese periodo. Para controlar el coste de IA, no se puede volver a generar.",
        },
        409
      );
    }

    const nextAfterEnd = `${endM === 12 ? endY + 1 : endY}-${String(
      endM === 12 ? 1 : endM + 1
    ).padStart(2, "0")}-01`;

    const [
      expenses,
      income,
      summaries,
      budgetPlans,
      onboarding,
      fixed,
      investments,
      prevMonthly,
      prevRange,
    ] =
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
        supabase
          .from("monthly_budget_plans")
          .select(
            "month, outcome, notes, monthly_budget_items(name, planned_amount, categories(name))"
          )
          .eq("user_id", user.id)
          .gte("month", startMonth)
          .lte("month", endMonth)
          .order("month", { ascending: true }),
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

    if (
      (expenses.data ?? []).length === 0 &&
      (income.data ?? []).length === 0 &&
      (budgetPlans.data ?? []).length === 0
    ) {
      return json(
        { error: "No hay movimientos ni presupuesto en ese periodo." },
        400
      );
    }

    const quotaMonth = currentQuotaMonth();
    const reportKind = startMonth === endMonth ? "month" : "range";
    const { data: usage, error: usageError } = await admin
      .from("report_generation_usage")
      .insert({
        user_id: user.id,
        quota_month: quotaMonth,
        requested_start_month: startMonth,
        requested_end_month: endMonth,
        report_kind: reportKind,
        status: "generating",
      })
      .select("id")
      .single();

    if (usageError) {
      if (usageError.code === "23505") {
        return json(
          {
            error:
              "Ya has generado un informe este mes. Para controlar el coste de IA, solo se permite un informe por mes.",
          },
          429
        );
      }
      throw new Error(usageError.message);
    }
    if (!usage) throw new Error("No se pudo reservar la generación del informe.");
    usageId = usage.id;

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
      presupuesto_planificado: budgetPlans.data ?? [],
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
Ten en cuenta su objetivo financiero declarado, su presupuesto planificado, el resultado de cierre del presupuesto si existe, y compara con meses anteriores y con el informe anterior si existe.
Cuando haya presupuesto planificado, compara cada mes con el gasto real y señala desviaciones por categoría o partida prevista.
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

    const { data: savedReport, error: upsertError } = await supabase
      .from(targetTable)
      .upsert(payload as never, {
        onConflict:
          startMonth === endMonth
            ? "user_id,month"
            : "user_id,start_month,end_month",
      })
      .select("id")
      .single();
    if (upsertError) throw new Error(upsertError.message);
    if (!savedReport) throw new Error("No se pudo guardar el informe.");

    await admin
      .from("report_generation_usage")
      .update({
        status: "completed",
        report_table: targetTable,
        report_id: savedReport.id,
      })
      .eq("id", usageId);

    return json({ ok: true, markdown, kind: reportKind });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    if (usageId) {
      await admin
        .from("report_generation_usage")
        .update({
          status: "failed",
          error_message: message,
        })
        .eq("id", usageId);
    }
    return json({ error: message }, 500);
  }
});
