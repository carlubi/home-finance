"use client";

import { useState, useTransition } from "react";
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
import { FileDown, Loader2, Printer, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addMonths, formatMonth, formatMonthRange, monthStart } from "@/lib/format";
import type { MonthlyReport } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Convierte el markdown del informe a un .docx sencillo */
async function downloadWord(report: MonthlyReport) {
  const lines = report.content_md.split("\n");
  const paragraphs: Paragraph[] = [];
  for (const line of lines) {
    if (line.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({ text: line.slice(2), heading: HeadingLevel.TITLE })
      );
    } else if (line.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_1 })
      );
    } else if (line.startsWith("- ")) {
      paragraphs.push(new Paragraph({ text: line.slice(2), bullet: { level: 0 } }));
    } else if (line.trim()) {
      paragraphs.push(new Paragraph({ text: line.replace(/[*_]/g, "") }));
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
}: {
  reports: MonthlyReport[];
  earliestMonth: string | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);

  const monthOptions = buildMonthOptions(earliestMonth);
  const [selectedStartMonth, setSelectedStartMonth] = useState(monthOptions[0]);
  const [selectedEndMonth, setSelectedEndMonth] = useState(monthOptions[0]);
  const [openReport, setOpenReport] = useState<MonthlyReport | null>(
    reports[0] ?? null
  );

  async function generate() {
    setGenerating(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("monthly-report", {
        body: {
          start_month: selectedStartMonth,
          end_month: selectedEndMonth,
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

  const existing = new Map(
    reports.map((r) => [
      `${r.kind}:${r.month}:${r.end_month ?? r.month}`,
      r,
    ])
  );
  const selectedKey = `${selectedStartMonth === selectedEndMonth ? "month" : "range"}:${selectedStartMonth}:${selectedEndMonth}`;

  return (
    <div className="grid gap-4">
      {/* Generador */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3">
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
                    {existing.has(m) ? " ✓" : ""}
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
          <Button onClick={generate} disabled={generating}>
            {generating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {generating
              ? "Analizando tus finanzas…"
              : existing.has(selectedKey)
                ? "Regenerar informe"
                : "Generar informe"}
          </Button>
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
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="size-4" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadWord(openReport)}
              >
                <FileDown className="size-4" />
                Word
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <article className="prose-finance">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {openReport.content_md}
              </ReactMarkdown>
            </article>
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
