"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileDown, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Row = Record<string, string | number | null>;

async function download(rows: Row[], name: string, format: "csv" | "xlsx") {
  if (rows.length === 0) {
    toast.info("No hay datos con esos filtros.");
    return;
  }
  const [XLSX, { saveAs }] = await Promise.all([
    import("xlsx"),
    import("file-saver"),
  ]);
  const sheet = XLSX.utils.json_to_sheet(rows);
  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(sheet);
    saveAs(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }), `${name}.csv`);
  } else {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Datos");
    const out = XLSX.write(book, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([out]), `${name}.xlsx`);
  }
}

export function ExportData({ categories }: { categories: Category[] }) {
  const [scope, setScope] = useState("personal");
  const [kind, setKind] = useState("both");
  const [period, setPeriod] = useState(""); // YYYY-MM, YYYY o vacío (todo)
  const [category, setCategory] = useState("all");
  const [busy, setBusy] = useState(false);

  function periodRange(): { from: string; to: string } | null {
    if (/^\d{4}-\d{2}$/.test(period)) {
      const [y, m] = period.split("-").map(Number);
      const from = `${period}-01`;
      const to = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`;
      return { from, to };
    }
    if (/^\d{4}$/.test(period)) {
      return { from: `${period}-01-01`, to: `${Number(period) + 1}-01-01` };
    }
    return null;
  }

  async function exportMovimientos(format: "csv" | "xlsx") {
    setBusy(true);
    try {
      const supabase = createClient();
      const range = periodRange();
      const rows: Row[] = [];

      if (scope === "personal") {
        for (const table of ["expenses", "income"] as const) {
          if (kind !== "both" && kind !== (table === "expenses" ? "expense" : "income")) {
            continue;
          }
          let q = supabase
            .from(table)
            .select("name, amount, occurred_at, notes, categories(name)")
            .order("occurred_at");
          if (range) q = q.gte("occurred_at", range.from).lt("occurred_at", range.to);
          if (category !== "all") q = q.eq("category_id", category);
          const { data, error } = await q;
          if (error) throw error;
          for (const r of data ?? []) {
            rows.push({
              Tipo: table === "expenses" ? "Gasto" : "Ingreso",
              Concepto: r.name,
              Categoría:
                (r.categories as unknown as { name: string } | null)?.name ?? "",
              Fecha: r.occurred_at,
              Importe: Number(r.amount),
              Notas: r.notes ?? "",
            });
          }
        }
      } else {
        let q = supabase
          .from("shared_expenses")
          .select(
            "name, total_amount, occurred_at, notes, categories(name), shared_groups(name)"
          )
          .order("occurred_at");
        if (range) q = q.gte("occurred_at", range.from).lt("occurred_at", range.to);
        if (category !== "all") q = q.eq("category_id", category);
        const { data, error } = await q;
        if (error) throw error;
        for (const r of data ?? []) {
          rows.push({
            Grupo: (r.shared_groups as unknown as { name: string } | null)?.name ?? "",
            Concepto: r.name,
            Categoría:
              (r.categories as unknown as { name: string } | null)?.name ?? "",
            Fecha: r.occurred_at,
            "Importe total": Number(r.total_amount),
            Notas: r.notes ?? "",
          });
        }
      }

      await download(rows, `movimientos${period ? "-" + period : ""}`, format);
    } catch {
      toast.error("No se pudo exportar.");
    } finally {
      setBusy(false);
    }
  }

  async function exportResumen() {
    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("monthly_summary")
        .select("*")
        .order("month");
      if (error) throw error;
      const rows: Row[] = (data ?? []).map((m) => ({
        Mes: String(m.month).slice(0, 7),
        Ingresos: Number(m.total_income),
        Gastos: Number(m.total_expenses),
        Ahorro: Number(m.savings),
        "% ahorro": m.savings_pct === null ? "" : Number(m.savings_pct),
      }));
      await download(rows, "resumen-mensual", "xlsx");
    } catch {
      toast.error("No se pudo exportar el resumen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Ámbito</Label>
          <Select
            value={scope}
            onValueChange={(v) => setScope(String(v))}
            items={[
              { value: "personal", label: "Finanzas personales" },
              { value: "shared", label: "Gastos compartidos" },
            ]}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="personal">Finanzas personales</SelectItem>
              <SelectItem value="shared">Gastos compartidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Tipo de dato</Label>
          <Select
            value={kind}
            onValueChange={(v) => setKind(String(v))}
            items={[
              { value: "both", label: "Gastos e ingresos" },
              { value: "expense", label: "Solo gastos" },
              { value: "income", label: "Solo ingresos" },
            ]}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="both">Gastos e ingresos</SelectItem>
              <SelectItem value="expense">Solo gastos</SelectItem>
              <SelectItem value="income">Solo ingresos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="export-period">Periodo (mes o año, vacío = todo)</Label>
          <Input
            id="export-period"
            placeholder="2026-06 o 2026"
            value={period}
            onChange={(e) => setPeriod(e.target.value.trim())}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Categoría</Label>
          <Select
            value={category}
            onValueChange={(v) => setCategory(String(v))}
            items={[
              { value: "all", label: "Todas" },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy} onClick={() => exportMovimientos("csv")}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
          Exportar CSV
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => exportMovimientos("xlsx")}>
          <FileDown className="size-4" />
          Exportar Excel
        </Button>
        <Button variant="outline" disabled={busy} onClick={exportResumen}>
          <FileDown className="size-4" />
          Resumen mensual (Excel)
        </Button>
      </div>
    </div>
  );
}
