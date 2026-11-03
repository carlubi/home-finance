"use client";

import { useRef } from "react";
import { Download } from "lucide-react";
import { exportChartAsPng } from "@/lib/export-png";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ChartCard({
  title,
  description,
  fileName,
  exportSubtitle,
  children,
}: {
  title: string;
  description?: string;
  fileName: string;
  exportSubtitle?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <Card>
      <CardHeader className="flex items-start justify-between gap-2">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-text-tertiary"
          title="Exportar como PNG"
          aria-label="Exportar como PNG"
          onClick={() =>
            ref.current &&
            exportChartAsPng(ref.current, fileName, {
              title: exportSubtitle ? `${title} · ${exportSubtitle}` : title,
              subtitle: description,
            })
          }
        >
          <Download className="size-3.5" />
        </Button>
      </CardHeader>
      <CardContent>
        <div ref={ref}>{children}</div>
      </CardContent>
    </Card>
  );
}
