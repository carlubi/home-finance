"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { saveAs } from "file-saver";
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
} from "docx";
import {
  CheckCircle2,
  FileDown,
  FileText,
  LineChart,
  Loader2,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import { downloadReportPdf } from "@/lib/report-pdf";
import { createClient } from "@/lib/supabase/client";
import { addMonths, formatMonth, formatMonthRange, monthStart } from "@/lib/format";
import type { MonthlyReport, ReportGenerationUsage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/layout/language-provider";
import { translateUiText, type AppLanguage } from "@/lib/language";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Convierte el markdown del informe a un .docx sencillo */
async function downloadWord(report: MonthlyReport, language: AppLanguage) {
  const lines = report.content_md.split("\n");
  const paragraphs: Paragraph[] = [];
  for (const line of lines) {
    if (line.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({ text: translateUiText(line.slice(2), language), heading: HeadingLevel.TITLE })
      );
    } else if (line.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({ text: translateUiText(line.slice(3), language), heading: HeadingLevel.HEADING_1 })
      );
    } else if (line.startsWith("- ")) {
      paragraphs.push(new Paragraph({ text: translateUiText(line.slice(2), language), bullet: { level: 0 } }));
    } else if (line.trim()) {
      paragraphs.push(new Paragraph({ text: translateUiText(line.replace(/[*_]/g, ""), language) }));
    }
  }
  const doc = new Document({ sections: [{ children: paragraphs }] });
  const blob = await Packer.toBlob(doc);
  const suffix =
    report.end_month && report.end_month !== report.month
      ? `${report.month.slice(0, 7)}_a_${report.end_month.slice(0, 7)}`
      : report.month.slice(0, 7);
  saveAs(blob, `informe-${suffix}.docx`);
}

function buildMonthOptions(earliestMonth: string | null) {
  const current = monthStart(new Date());
  const first = earliestMonth ?? current;
  const options: string[] = [];
  let cursor = first;
  while (cursor <= current) {
    options.push(cursor);
    cursor = addMonths(cursor, 1);
  }
  return options.reverse();
}

export function ReportsView({
  reports,
  earliestMonth,
  quotaMonth,
  reportUsage,
}: {
  reports: MonthlyReport[];
  earliestMonth: string | null;
  quotaMonth: string;
  reportUsage: ReportGenerationUsage | null;
}) {
  const router = useRouter();
  const { language } = useLanguage();
  const [, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);

  const monthOptions = buildMonthOptions(earliestMonth);
  const [selectedStartMonth, setSelectedStartMonth] = useState(monthOptions[0]);
  const [selectedEndMonth, setSelectedEndMonth] = useState(monthOptions[0]);
  const [openReport, setOpenReport] = useState<MonthlyReport | null>(
    reports[0] ?? null
  );
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translationError, setTranslationError] = useState(false);
  const openReportIsCatalan = openReport ? /^# Informe financer\b/m.test(openReport.content_md) : false;
  const needsTranslation = Boolean(openReport && ((language === "ca") !== openReportIsCatalan));
  const translationKey = openReport ? `${openReport.id}:${language}` : "";
  const translatedContent = translations[translationKey];
  const visibleReport = openReport && (!needsTranslation || translatedContent)
    ? { ...openReport, content_md: needsTranslation ? translatedContent : openReport.content_md }
    : null;

  useEffect(() => {
    if (!openReport || !needsTranslation || translatedContent) return;
    let active = true;
    const load = async () => {
      setTranslationError(false);
      try {
        const supabase = createClient();
        const { data, error } = await supabase.functions.invoke("monthly-report", {
          body: { action: "translate-report", report_id: openReport.id, kind: openReport.kind, language },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (typeof data?.content_md !== "string" || !data.content_md.trim()) throw new Error("Empty translation");
        if (active) setTranslations((current) => ({ ...current, [translationKey]: data.content_md }));
      } catch {
        if (active) setTranslationError(true);
      }
    };
    void load();
    return () => { active = false; };
  }, [openReport, needsTranslation, translatedContent, translationKey, language]);

  async function generate() {
    setGenerating(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("monthly-report", {
        body: {
          start_month: selectedStartMonth,
          end_month: selectedEndMonth,
          language,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Informe generado.");
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar el informe.");
    } finally {
      setGenerating(false);
    }
  }

  const canGenerate = reportUsage === null;
  const existing = new Map(
    reports.map((r) => [
      `${r.kind}:${r.month}:${r.end_month ?? r.month}`,
      r,
    ])
  );
  const selectedKey = `${selectedStartMonth === selectedEndMonth ? "month" : "range"}:${selectedStartMonth}:${selectedEndMonth}`;
  const selectedReportExists = existing.has(selectedKey);
  const generationAllowed = canGenerate && !selectedReportExists;
  const quotaLabel = canGenerate
    ? "Puedes generar 1 informe IA este mes."
    : "Ya has utilizado el informe IA de este mes.";
  const quotaDetail = canGenerate
    ? "Para controlar el coste de IA, la app permite solo un informe por mes natural y no permite repetir informes ya creados."
    : `Próxima generación disponible el mes siguiente. Último intento: ${formatMonth(reportUsage.quota_month)}.`;

  return (
    <div className="grid gap-4">
      {/* Generador */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <LineChart className="size-4" />
                Generar informes
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Solo se puede generar un informe con IA por mes.
              </p>
            </div>
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium",
                canGenerate
                  ? "border-green/20 bg-green/10 text-green"
                  : "border-orange/30 bg-orange/10 text-orange"
              )}
            >
              {canGenerate ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <LockKeyhole className="size-4" />
              )}
              {canGenerate ? "Disponible" : "Usado"}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-sm font-medium">{quotaLabel}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {quotaDetail} Mes de cuota: {formatMonth(quotaMonth)}.
            </p>
            {selectedReportExists && (
              <p className="mt-2 text-xs font-medium text-orange">
                Ya existe un informe para el periodo seleccionado. Puedes verlo en
                el historial, pero no volver a generarlo.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Desde</span>
              <Select
                value={selectedStartMonth}
                onValueChange={(v) => {
                  setSelectedStartMonth(String(v));
                  if (String(v) > selectedEndMonth) {
                    setSelectedEndMonth(String(v));
                  }
                }}
                items={monthOptions.map((m) => ({
                  value: m,
                  label: formatMonth(m),
                }))}
              >
                <SelectTrigger className="min-w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((m) => (
                    <SelectItem key={m} value={m}>
                      {formatMonth(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Hasta</span>
              <Select
                value={selectedEndMonth}
                onValueChange={(v) => setSelectedEndMonth(String(v))}
                items={monthOptions
                  .filter((m) => m >= selectedStartMonth)
                  .map((m) => ({
                    value: m,
                    label: formatMonth(m),
                  }))}
              >
                <SelectTrigger className="min-w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions
                    .filter((m) => m >= selectedStartMonth)
                    .map((m) => (
                      <SelectItem key={m} value={m}>
                        {formatMonth(m)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={generate}
              disabled={generating || !generationAllowed}
              title={
                generationAllowed
                  ? "Generar informe"
                  : selectedReportExists
                    ? "Ya existe un informe para este periodo."
                    : "Ya has generado el informe IA permitido este mes."
              }
            >
              {generating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : generationAllowed ? (
                <Sparkles className="size-4" />
              ) : (
                <LockKeyhole className="size-4" />
              )}
              {generating
                ? "Analizando tus finanzas…"
                : generationAllowed
                  ? "Generar informe"
                  : selectedReportExists
                    ? "Informe ya creado"
                    : "Informe mensual usado"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Historial */}
      {reports.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {reports.map((r) => (
            <Button
              key={r.id}
              variant={openReport?.id === r.id ? "default" : "outline"}
              size="sm"
              onClick={() => setOpenReport(r)}
            >
              {formatMonth(r.month)}
            </Button>
          ))}
        </div>
      )}

      {/* Informe */}
      {openReport ? (
        <Card className="print-report">
          <CardHeader className="flex-row items-center justify-between space-y-0 print:hidden">
            <CardTitle className="text-base">
              Informe de {formatMonthRange(openReport.month, openReport.end_month)}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => visibleReport && downloadReportPdf(visibleReport, language)}
                disabled={!visibleReport}
              >
                <FileText className="size-4" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => visibleReport && downloadWord(visibleReport, language)}
                disabled={!visibleReport}
              >
                <FileDown className="size-4" />
                Word
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {visibleReport ? (
              <article className="prose-finance" data-no-translate>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{visibleReport.content_md}</ReactMarkdown>
              </article>
            ) : (
              <p className="text-sm text-muted-foreground">
                {translationError
                  ? language === "ca" ? "No s'ha pogut traduir l'informe. Torna-ho a provar més tard." : "No se pudo traducir el informe. Vuelve a intentarlo más tarde."
                  : language === "ca" ? "S'està traduint l'informe…" : "Traduciendo el informe…"}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <p className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          Aún no has generado ningún informe. Elige un mes con movimientos y pulsa
          «Generar informe».
        </p>
      )}
    </div>
  );
}
