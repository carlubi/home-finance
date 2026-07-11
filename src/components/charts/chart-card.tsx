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
    <Card className="card-lift">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          title="Exportar como PNG"
          onClick={() =>
            ref.current &&
            exportChartAsPng(ref.current, fileName, {
              title: exportSubtitle ? `${title} · ${exportSubtitle}` : title,
              subtitle: description,
            })
          }
        >
          <Download className="size-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div ref={ref}>{children}</div>
      </CardContent>
    </Card>
  );
}
