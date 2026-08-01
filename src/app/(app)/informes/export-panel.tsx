"use client";

import { useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ExportData } from "@/components/export/export-data";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ExportPanel({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="size-4" />
            Exportación de datos
          </CardTitle>
          <CardDescription>Descarga tus movimientos y resúmenes.</CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          {open ? "Ocultar" : "Ver opciones"}
          <ChevronDown
            className={cn("size-4 transition-transform", open && "rotate-180")}
          />
        </Button>
      </CardHeader>
      {open && (
        <CardContent>
          <ExportData categories={categories} />
        </CardContent>
      )}
    </Card>
  );
}
