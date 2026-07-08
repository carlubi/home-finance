"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, formatMonth, monthStart } from "@/lib/format";
import { Button } from "@/components/ui/button";

export function MonthSwitcher({ month }: { month: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const currentMonth = monthStart(new Date());

  function go(target: string) {
    const next = new URLSearchParams(params);
    if (target === currentMonth) next.delete("mes");
    else next.set("mes", target.slice(0, 7));
    router.push(`?${next.toString()}`);
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" className="size-8" onClick={() => go(addMonths(month, -1))}>
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-36 text-center text-sm font-medium">
        {formatMonth(month)}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="size-8"
        disabled={month >= currentMonth}
        onClick={() => go(addMonths(month, 1))}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
